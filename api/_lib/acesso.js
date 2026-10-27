/* =========================================================
   Webora — senha do painel e link da via do contrato
   ADMIN_SENHA          senha do painel (/admin), configurada na Vercel
   WEBORA_LINK_SEGREDO  assina o link da via de cada contrato (/contrato?n=…&k=…):
                        sem o segredo ninguém consegue montar o link de outro contrato
   ========================================================= */
const crypto = require('node:crypto');

const resumo = s => crypto.createHash('sha256').update(String(s)).digest();

function senhaConfere(dada) {
  const certa = process.env.ADMIN_SENHA;
  if (!certa || !dada) return false;
  return crypto.timingSafeEqual(resumo(dada), resumo(certa));
}

function chaveVia(numero) {
  const segredo = process.env.WEBORA_LINK_SEGREDO;
  if (!segredo) return null;
  return crypto.createHmac('sha256', segredo).update('via|' + numero).digest('base64url').slice(0, 24);
}

function viaConfere(numero, k) {
  const certa = chaveVia(numero);
  if (!certa || typeof k !== 'string' || k.length !== certa.length) return false;
  return crypto.timingSafeEqual(Buffer.from(k), Buffer.from(certa));
}

// endereço do site: o de produção, ou o do servidor local nos testes
function origem(req) {
  if (process.env.WEBORA_DADOS_LOCAL && req && req.headers && req.headers.host) return `http://${req.headers.host}`;
  return 'https://www.weborasites.com.br';
}

function linkVia(numero, req) {
  const k = chaveVia(numero);
  return k ? `${origem(req)}/contrato?n=${encodeURIComponent(numero)}&k=${k}` : null;
}

// IP de quem assinou (registro de autoria da assinatura eletrônica)
const ipDe = req => String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim().slice(0, 64);

module.exports = { senhaConfere, chaveVia, viaConfere, linkVia, ipDe };
