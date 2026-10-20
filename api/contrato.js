/* =========================================================
   Webora — conferência do contrato no servidor (Vercel Function)
   POST /api/contrato
   - recalcula os valores a partir de assets/js/config.js (mesma fonte do site);
   - valida os dados obrigatórios com as mesmas regras do navegador;
   - devolve os valores oficiais em centavos e, se WEBORA_RECIBO_SEGREDO estiver
     configurado na Vercel, um recibo assinado (HMAC-SHA256) que comprova a conferência.
   Nada é armazenado: o contrato continua chegando à Webora pelo WhatsApp.
   ========================================================= */
const crypto = require('node:crypto');
const C = require('../assets/js/contrato.js');
const { PLANOS } = require('../assets/js/config.js');

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

async function lerCorpo(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw new Error('grande'); }
  return JSON.parse(raw || 'null');
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

  return json(res, 200, {
    ok: true,
    numero,
    plano: P.id,
    pagamento,
    pix: C.pixWebora(pg.agora, numero),
    conferidoEm,
    recibo: recibo(dados, process.env.WEBORA_RECIBO_SEGREDO)
  });
};

module.exports.recibo = recibo;
