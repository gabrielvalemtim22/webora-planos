/* =========================================================
   Servidor local: arquivos do site + /api/contrato, como na Vercel.
   Uso: npm run dev   (porta 3000, ou PORT=4000 npm run dev)
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
const rewrites = new Map((vercel.rewrites || []).map(r => [r.source, r.destination]));

async function file(p) {
  try { const s = await stat(p); return s.isFile() ? p : null; } catch { return null; }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/contrato') {
    delete require.cache[require.resolve('../api/contrato.js')];
    return require('../api/contrato.js')(req, res);
  }
  let pathname = decodeURIComponent(rewrites.get(url.pathname) || url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = path.join(ROOT, pathname);
  // pastas que a Vercel não publica (.vercelignore) também ficam fora daqui
  if (!target.startsWith(ROOT) || /^[\\/](scripts|marca|tests|api|node_modules|\.git|\.claude)([\\/]|$)/.test(target.slice(ROOT.length))) { res.writeHead(404).end(); return; }
  const found = await file(target) || await file(target + '.html');
  if (!found) {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    return res.end(await readFile(path.join(ROOT, '404.html')).catch(() => 'Não encontrado'));
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(found)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(await readFile(found));
}).listen(PORT, () => console.log(`Webora local: http://localhost:${PORT}`));
