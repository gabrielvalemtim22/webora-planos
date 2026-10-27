/* =========================================================
   Webora — conferência e registro do contrato no servidor (Vercel Function)
   POST /api/contrato
   - recalcula os valores a partir de assets/js/config.js (mesma fonte do site);
   - valida os dados obrigatórios com as mesmas regras do navegador;
   - devolve os valores oficiais em centavos e, se WEBORA_RECIBO_SEGREDO estiver
     configurado na Vercel, um recibo assinado (HMAC-SHA256) que comprova a conferência;
   - quando o pedido traz a assinatura, guarda o contrato assinado no armazenamento
     privado (api/_lib/armazem.js), para o painel /admin, e devolve o link da via do cliente.
     O servidor remonta o texto e confere o código de verificação (SHA-256) do navegador.
   ========================================================= */
const crypto = require('node:crypto');
const C = require('../assets/js/contrato.js');
const { PLANOS, WEBORA } = require('../assets/js/config.js');
const { armazem } = require('./_lib/armazem.js');
const { linkVia, ipDe } = require('./_lib/acesso.js');

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

function recibo(dados, segredo) {
  if (!segredo) return null;
  const mac = crypto.createHmac('sha256', segredo).update(C.reciboCanonico(dados)).digest('hex').toUpperCase();
  return mac.slice(0, 20).match(/.{4}/g).join('-');
}

// o corpo traz a imagem da assinatura (PNG em base64), por isso o limite é maior
async function lerCorpo(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 400000) throw new Error('grande'); }
  return JSON.parse(raw || 'null');
}

const ASSINATURA = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;

// guarda o contrato assinado; devolve null quando o pedido não traz a assinatura
async function guardar(loja, req, body, ctx) {
  const { d, P, pg, numero, hash, conferidoEm, reciboServidor } = ctx;
  const assinatura = typeof body.assinatura === 'string' && body.assinatura.length < 300000 && ASSINATURA.test(body.assinatura) ? body.assinatura : null;
  const assinadoEm = typeof body.assinadoEm === 'string' ? body.assinadoEm.slice(0, 80) : '';
  const dataLonga = typeof body.dataLonga === 'string' ? body.dataLonga.slice(0, 40) : '';
  if (!assinatura || !assinadoEm || !dataLonga) return null;

  // o mesmo texto que o navegador assinou, montado aqui a partir da tabela oficial
  const b = C.build({ ...d, plano: P.id, pagamento: pg.tipo, numero, dataLonga });
  const texto = C.toText(b.blocks) + `\nAssinado eletronicamente por ${d.nome} (${b.docTipo} ${C.maskDoc(d.doc)}) em ${assinadoEm}.\n` + assinatura;
  const integridade = (await C.sha256(texto)) === hash;

  const registro = {
    v: 1,
    numero,
    criadoEm: conferidoEm,
    modelo: WEBORA.versaoContrato,
    plano: { id: P.id, nome: P.nome, centavos: P.centavos, prazo: P.prazo, prazoMax: P.prazoMax },
    pagamento: { tipo: pg.tipo, total: pg.total, agora: pg.agora, depois: pg.depois, rotulo: pg.rotulo },
    cliente: { nome: d.nome, docTipo: b.docTipo, doc: d.doc, tel: d.tel, email: d.email, cidade: d.cidade, empresa: d.empresa, dominio: d.dominio, endereco: d.endereco, obs: d.obs },
    assinadoEm,
    dataLonga,
    hash,
    codigo: hash.slice(0, 16).match(/.{4}/g).join('-'),
    integridade,
    recibo: reciboServidor,
    origem: { ip: ipDe(req), agente: String((req.headers && req.headers['user-agent']) || '').slice(0, 300) }
  };
  await Promise.all([
    loja.salvar(`contratos/${numero}.json`, registro),
    loja.salvar(`assinaturas/${numero}.json`, { numero, blocks: b.blocks, assinatura })
  ]);
  return { via: linkVia(numero, req), integridade };
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  }
  let body;
  try { body = await lerCorpo(req); } catch (e) { return json(res, 400, { ok: false, erro: 'Dados inválidos.' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(res, 400, { ok: false, erro: 'Dados inválidos.' });

  const P = Object.prototype.hasOwnProperty.call(PLANOS, body.plano) ? PLANOS[body.plano] : null;
  if (!P) return json(res, 400, { ok: false, erro: 'Plano inválido.' });
  if (!C.PAGAMENTOS.includes(body.pagamento)) return json(res, 400, { ok: false, erro: 'Forma de pagamento inválida.' });
  const numero = String(body.numero || '');
  if (!C.NUMERO.test(numero)) return json(res, 400, { ok: false, erro: 'Número de contrato inválido.' });
  const hash = String(body.hash || '');
  if (!/^[A-F0-9]{64}$/.test(hash)) return json(res, 400, { ok: false, erro: 'Código de verificação inválido.' });

  const d = C.limpar(body);
  const erros = C.validar(d);
  if (Object.keys(erros).length) return json(res, 400, { ok: false, erros });

  const pg = C.condicoes(P, body.pagamento);
  const pagamento = { tipo: pg.tipo, total: pg.total, agora: pg.agora, depois: pg.depois };
  const conferidoEm = new Date().toISOString();
  const dados = { numero, plano: P.id, pagamento, doc: d.doc, hash, conferidoEm };
  const reciboServidor = recibo(dados, process.env.WEBORA_RECIBO_SEGREDO);

  // sem armazenamento (ou com falha nele) a contratação segue: o contrato ainda chega pelo WhatsApp
  let guardado = null;
  const loja = armazem();
  if (loja) {
    try { guardado = await guardar(loja, req, body, { d, P, pg, numero, hash, conferidoEm, reciboServidor }); } catch (e) { console.error('contrato: não foi possível guardar', numero, e && e.message); }
  }

  return json(res, 200, {
    ok: true,
    numero,
    plano: P.id,
    pagamento,
    pix: C.pixWebora(pg.agora, numero),
    conferidoEm,
    recibo: reciboServidor,
    salvo: !!guardado,
    via: guardado ? guardado.via : null
  });
};

module.exports.recibo = recibo;
