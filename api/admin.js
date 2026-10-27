/* =========================================================
   Webora — painel de contratos (Vercel Function)
   POST /api/admin   Authorization: Bearer <ADMIN_SENHA>
   { acao: 'listar' }                          todos os contratos assinados, do mais novo
   { acao: 'ver', numero }                     contrato, assinatura, histórico e link da via
   { acao: 'status', numero, status, nota }    registra uma mudança de status
   { acao: 'excluir', numero }                 apaga o contrato (testes, duplicados)
   ========================================================= */
const crypto = require('node:crypto');
const C = require('../assets/js/contrato.js');
const { armazem, lerVarios } = require('./_lib/armazem.js');
const { senhaConfere, linkVia, ipDe } = require('./_lib/acesso.js');

// bloqueio: 5 senhas erradas em 15 minutos, do mesmo IP, travam o painel por 15 minutos
const LIMITE = 5, JANELA = 15 * 60 * 1000;
const arqBloqueio = req => `bloqueio/${crypto.createHash('sha256').update(ipDe(req) || 'sem-ip').digest('hex').slice(0, 32)}.json`;

const STATUS = ['assinado', 'entrada', 'pago', 'producao', 'entregue', 'cancelado'];
const ARQ_STATUS = /^status\/(WB-\d{6}-[A-Z0-9]{4})\/(\d{13})-([a-z]+)\.json$/;

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(JSON.stringify(body));
};
const espera = ms => new Promise(r => setTimeout(r, ms));

async function lerCorpo(req) {
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 5000) throw new Error('grande'); }
  return JSON.parse(raw || 'null');
}

// último status de cada contrato, lido só pelos nomes dos arquivos
function ultimos(caminhos) {
  const m = new Map();
  caminhos.forEach(p => {
    const r = ARQ_STATUS.exec(p);
    if (!r) return;
    const em = +r[2], atual = m.get(r[1]);
    if (!atual || em > atual.em) m.set(r[1], { em, status: r[3] });
  });
  return m;
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  }
  if (!process.env.ADMIN_SENHA) return json(res, 503, { ok: false, erro: 'O painel ainda não tem senha configurada na Vercel (ADMIN_SENHA).' });
  const loja = armazem();
  if (!loja) return json(res, 503, { ok: false, erro: 'O armazenamento dos contratos não está configurado.' });

  const senha = String((req.headers && req.headers.authorization) || '').replace(/^Bearer\s+/i, '');
  const agora = Date.now(), arq = arqBloqueio(req);
  const tent = await loja.ler(arq).catch(() => null);
  if (tent && tent.ate > agora) {
    const min = Math.ceil((tent.ate - agora) / 60000);
    return json(res, 429, { ok: false, erro: `Muitas senhas erradas. O painel foi bloqueado por segurança; tente de novo em ${min} min.` });
  }
  if (!senhaConfere(senha)) {
    const recente = tent && agora - tent.desde < JANELA;
    const falhas = (recente ? tent.falhas : 0) + 1;
    await loja.salvar(arq, { falhas, desde: recente ? tent.desde : agora, ate: falhas >= LIMITE ? agora + JANELA : 0 }).catch(() => {});
    await espera(700);
    const resta = LIMITE - falhas;
    return json(res, resta > 0 ? 401 : 429, { ok: false, erro: resta > 0 ? `Senha incorreta. ${resta === 1 ? 'Resta 1 tentativa' : `Restam ${resta} tentativas`} antes do bloqueio.` : 'Muitas senhas erradas. O painel foi bloqueado por segurança por 15 min.' });
  }
  if (tent) await loja.apagar([arq]).catch(() => {});

  let body;
  try { body = await lerCorpo(req); } catch (e) { return json(res, 400, { ok: false, erro: 'Pedido inválido.' }); }
  if (!body || typeof body !== 'object') return json(res, 400, { ok: false, erro: 'Pedido inválido.' });
  const numero = String(body.numero || '');
  if (body.acao !== 'listar' && !C.NUMERO.test(numero)) return json(res, 400, { ok: false, erro: 'Número de contrato inválido.' });

  try {
    if (body.acao === 'listar') {
      const [arquivos, status] = await Promise.all([loja.listar('contratos/'), loja.listar('status/')]);
      const st = ultimos(status);
      const itens = (await lerVarios(loja, arquivos.filter(p => p.endsWith('.json')))).filter(Boolean).map(r => {
        const s = st.get(r.numero);
        return { ...r, status: s ? s.status : 'assinado', statusEm: s ? new Date(s.em).toISOString() : r.criadoEm };
      }).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
      return json(res, 200, { ok: true, itens });
    }

    if (body.acao === 'ver') {
      const [registro, assinado, status] = await Promise.all([
        loja.ler(`contratos/${numero}.json`), loja.ler(`assinaturas/${numero}.json`), loja.listar(`status/${numero}/`)
      ]);
      if (!registro) return json(res, 404, { ok: false, erro: 'Contrato não encontrado.' });
      const historico = (await lerVarios(loja, status.filter(p => ARQ_STATUS.test(p)).sort())).filter(Boolean);
      return json(res, 200, { ok: true, registro, blocks: assinado ? assinado.blocks : null, assinatura: assinado ? assinado.assinatura : null, historico, via: linkVia(numero, req) });
    }

    if (body.acao === 'status') {
      if (!STATUS.includes(body.status)) return json(res, 400, { ok: false, erro: 'Status inválido.' });
      if (!(await loja.ler(`contratos/${numero}.json`))) return json(res, 404, { ok: false, erro: 'Contrato não encontrado.' });
      const em = Date.now();
      const item = { status: body.status, nota: String(body.nota || '').trim().slice(0, 500), em: new Date(em).toISOString() };
      await loja.salvar(`status/${numero}/${em}-${body.status}.json`, item);
      return json(res, 200, { ok: true, item });
    }

    if (body.acao === 'excluir') {
      const status = await loja.listar(`status/${numero}/`);
      await loja.apagar([`contratos/${numero}.json`, `assinaturas/${numero}.json`, ...status]);
      return json(res, 200, { ok: true });
    }
  } catch (e) {
    console.error('admin:', body.acao, numero, e && e.message);
    return json(res, 502, { ok: false, erro: 'Não foi possível acessar os contratos agora. Tente de novo.' });
  }
  return json(res, 400, { ok: false, erro: 'Ação desconhecida.' });
};

module.exports.STATUS = STATUS;
