/* =========================================================
   Servidor local: arquivos do site + /api/*, como na Vercel.
   Uso: npm run dev   (porta 3000, ou PORT=4000 npm run dev)
   Os contratos assinados ficam na pasta .dados/ (fora do Git). O painel /admin
   usa a senha de teste "webora-local", a menos que ADMIN_SENHA esteja definida.
   ========================================================= */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};
const vercel = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
process.env.WEBORA_DADOS_LOCAL ||= path.join(ROOT, '.dados');
process.env.ADMIN_SENHA ||= 'webora-local';
process.env.WEBORA_LINK_SEGREDO ||= 'segredo-local-de-teste';
const API = new Set(['contrato', 'admin', 'via']);
const rewrites = new Map((vercel.rewrites || []).map(r => [r.source, r.destination]));

async function file(p) {
  try { const s = await stat(p); return s.isFile() ? p : null; } catch { return null; }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fn = url.pathname.match(/^\/api\/([a-z]+)$/);
  if (fn && API.has(fn[1])) {
    // recarrega a cada pedido, para refletir edições sem reiniciar o servidor
    Object.keys(require.cache).filter(k => k.startsWith(path.join(ROOT, 'api')) || k.includes(`${path.sep}assets${path.sep}js${path.sep}`)).forEach(k => delete require.cache[k]);
    return require(`../api/${fn[1]}.js`)(req, res);
  }
  let pathname = decodeURIComponent(rewrites.get(url.pathname) || url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = path.join(ROOT, pathname);
  // pastas que a Vercel não publica (.vercelignore) também ficam fora daqui
  if (!target.startsWith(ROOT) || /^[\\/](scripts|marca|tests|api|node_modules|\.git|\.claude|\.dados|\.vercel|\.env[^\\/]*)([\\/]|$)/.test(target.slice(ROOT.length))) { res.writeHead(404).end(); return; }
  const found = await file(target) || await file(target + '.html');
  if (!found) {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    return res.end(await readFile(path.join(ROOT, '404.html')).catch(() => 'Não encontrado'));
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(found)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(await readFile(found));
}).listen(PORT, () => console.log(`Webora local: http://localhost:${PORT}`));
