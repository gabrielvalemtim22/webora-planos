/* =========================================================
   Webora — via do contrato assinado (Vercel Function)
   GET /api/via?n=<nº>&k=<chave>
   Devolve o contrato assinado para a página /contrato, onde o cliente vê, imprime
   e salva o PDF. Só abre com a chave do link (api/_lib/acesso.js).
   ========================================================= */
const C = require('../assets/js/contrato.js');
const { armazem } = require('./_lib/armazem.js');
const { viaConfere } = require('./_lib/acesso.js');

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(JSON.stringify(body));
};

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, erro: 'Método não permitido.' });
  }
  const url = new URL(req.url, 'http://x');
  const numero = url.searchParams.get('n') || '', k = url.searchParams.get('k') || '';
  if (!C.NUMERO.test(numero) || !viaConfere(numero, k)) return json(res, 404, { ok: false, erro: 'Link inválido ou expirado.' });
  const loja = armazem();
  if (!loja) return json(res, 503, { ok: false, erro: 'Contrato indisponível no momento.' });
  try {
    const [registro, assinado] = await Promise.all([loja.ler(`contratos/${numero}.json`), loja.ler(`assinaturas/${numero}.json`)]);
    if (!registro || !assinado) return json(res, 404, { ok: false, erro: 'Contrato não encontrado.' });
    // a via mostra o contrato e a assinatura; o IP e o navegador ficam só no painel
    const { origem, ...publico } = registro;
    return json(res, 200, { ok: true, registro: publico, blocks: assinado.blocks, assinatura: assinado.assinatura });
  } catch (e) {
    console.error('via:', numero, e && e.message);
    return json(res, 502, { ok: false, erro: 'Não foi possível abrir o contrato agora. Tente de novo.' });
  }
};
