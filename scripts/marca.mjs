/* =========================================================
   Webora — gera os arquivos da marca a partir das imagens originais
   (marca/webora-simbolo-original.webp e marca/webora-logotipo-original.webp).

   Saída:
     assets/img/marca/   símbolo e logotipo (branco+verde e preto+verde), PNG para o PDF
     favicon.ico, icon.png, icon-192.png, icon-maskable.png, apple-icon.png   (raiz do site)
     assets/img/og.jpg   imagem de compartilhamento (1200×630), a partir de scripts/og.html

   Usa o Chrome (ou Edge) instalado, sem dependências: node scripts/marca.mjs
   Para outro navegador: CHROME="/caminho/do/navegador" node scripts/marca.mjs
   ========================================================= */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEON = [0x9B, 0xFF, 0x00];
const BLACK = [0x08, 0x08, 0x08];
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find(p => existsSync(p));

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Chrome via DevTools Protocol ---------- */
async function launch() {
  if (!CHROME) throw new Error('Chrome não encontrado. Defina CHROME com o caminho do navegador.');
  const dir = await mkdtemp(path.join(tmpdir(), 'webora-marca-'));
  const port = 9300 + Math.floor(Math.random() * 600);
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) { /* ainda abrindo */ }
    if (!target) await sleep(150);
  }
  if (!target) { proc.kill(); throw new Error('Não foi possível conectar ao Chrome.'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map(), waiters = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    else if (m.method) waiters.filter(w => w.method === m.method).forEach(w => { waiters.splice(waiters.indexOf(w), 1); w.res(m.params); });
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const once = method => new Promise(res => waiters.push({ method, res }));
  const evaluate = async (fn, arg) => {
    const r = await send('Runtime.evaluate', { expression: `(${fn})(${JSON.stringify(arg)})`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return { send, once, evaluate, close: async () => { ws.close(); proc.kill(); await sleep(300); await rm(dir, { recursive: true, force: true }).catch(() => {}); } };
}

/* ---------- processamento das imagens (roda dentro do Chrome) ---------- */
async function processar({ simbolo, logotipo, neon, black }) {
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('imagem')); i.src = src; });
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const read = img => { const c = canvas(img.width, img.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
  const toCanvas = data => { const c = canvas(data.width, data.height); c.getContext('2d').putImageData(data, 0, 0); return c; };
  const bbox = (data, test) => {
    const { width: W, height: H, data: d } = data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (test(d, (y * W + x) * 4)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  // redução em etapas (metade por vez) para manter as bordas nítidas
  const resize = (src, w, h) => {
    let cur = src;
    while (cur.width / 2 > w && cur.height / 2 > h) {
      const n = canvas(Math.round(cur.width / 2), Math.round(cur.height / 2)), x = n.getContext('2d');
      x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, n.width, n.height); cur = n;
    }
    const out = canvas(w, h), x = out.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, w, h);
    return out;
  };
  const fit = (src, size, scale, bg) => {
    const out = canvas(size, size), x = out.getContext('2d');
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, size, size); }
    const s = Math.round(size * scale), r = resize(src, s, Math.round(s * src.height / src.width));
    x.drawImage(r, Math.round((size - r.width) / 2), Math.round((size - r.height) / 2));
    return out;
  };
  const url = (c, type = 'image/png', q) => c.toDataURL(type, q);

  /* símbolo: o fundo preto de fora do hexágono vira transparente; o interior preto continua */
  const s = read(await load(simbolo)), W = s.width, H = s.height, d = s.data;
  const outside = new Uint8Array(W * H), stack = [];
  const dark = i => d[i * 4 + 1] < 200;   // canal verde baixo: fundo ou borda suavizada do anel
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (outside[p] || !dark(p)) continue;
    outside[p] = 1;
    const x = p % W, y = (p - x) / W;
    if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
  }
  for (let p = 0; p < W * H; p++) {
    const i = p * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    if (outside[p]) {           // fora: cor do anel com transparência proporcional ao verde
      const a = g < 24 ? 0 : g;
      d[i] = neon[0]; d[i + 1] = neon[1]; d[i + 2] = neon[2]; d[i + 3] = a;
    } else if (g > 150 && r < g * .85 && b < 90) {   // anel verde → verde oficial
      d[i] = neon[0]; d[i + 1] = neon[1]; d[i + 2] = neon[2];
    }
  }
  const sb = bbox(s, (dd, i) => dd[i + 3] > 8);
  const side = Math.round(Math.max(sb.w, sb.h) * 1.04);
  const sq = canvas(side, side);
  sq.getContext('2d').drawImage(toCanvas(s), sb.x0, sb.y0, sb.w, sb.h, Math.round((side - sb.w) / 2), Math.round((side - sb.h) / 2), sb.w, sb.h);

  /* logotipo: separa do fundo preto (des-multiplica o alfa) e normaliza as cores */
  const l = read(await load(logotipo)), ld = l.data;
  for (let i = 0; i < ld.length; i += 4) {
    const r = ld[i], g = ld[i + 1], b = ld[i + 2], m = Math.max(r, g, b);
    if (m < 16) { ld[i + 3] = 0; continue; }
    const branco = r / m > .78 && b / m > .78;
    const c = branco ? [255, 255, 255] : neon;
    ld[i] = c[0]; ld[i + 1] = c[1]; ld[i + 2] = c[2]; ld[i + 3] = m;
  }
  const lb = bbox(l, (dd, i) => dd[i + 3] > 40);
  const pad = Math.round(lb.h * .04);
  const lw = lb.w + pad * 2, lh = lb.h + pad * 2;
  const logoBranco = canvas(lw, lh);
  logoBranco.getContext('2d').drawImage(toCanvas(l), lb.x0, lb.y0, lb.w, lb.h, pad, pad, lb.w, lb.h);
  const pd = logoBranco.getContext('2d').getImageData(0, 0, lw, lh);
  for (let i = 0; i < pd.data.length; i += 4) if (pd.data[i] === 255 && pd.data[i + 2] === 255) { pd.data[i] = black[0]; pd.data[i + 1] = black[1]; pd.data[i + 2] = black[2]; }
  const logoPreto = toCanvas(pd);
  const logoW = 560, logoH = Math.round(560 * lh / lw);

  const ico = [16, 32, 48].map(n => ({ size: n, png: url(fit(sq, n, 1)) }));
  return {
    ratio: lw / lh,
    simbolo: url(resize(sq, 192, 192), 'image/webp', .92),
    simbolo512: url(resize(sq, 512, 512)),
    icon192: url(fit(sq, 192, 1)),
    maskable: url(fit(sq, 512, .64, '#080808')),
    apple: url(fit(sq, 180, .74, '#080808')),
    ico,
    logoBranco: url(resize(logoBranco, logoW, logoH), 'image/webp', .92),
    logoPreto: url(resize(logoPreto, logoW, logoH), 'image/webp', .92),
    logoBrancoPng: url(resize(logoBranco, 420, Math.round(420 * lh / lw)))
  };
}

/* ---------- ICO com PNGs embutidos ---------- */
function ico(list) {
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(list.length, 4);
  const dir = Buffer.alloc(16 * list.length);
  let offset = 6 + dir.length;
  list.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir[o] = size >= 256 ? 0 : size; dir[o + 1] = size >= 256 ? 0 : size;
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([head, dir, ...list.map(x => x.buf)]);
}

const dataURL = async (file, type) => `data:${type};base64,${(await readFile(path.join(ROOT, file))).toString('base64')}`;
const fromDataURL = u => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');
const out = async (file, buf) => { await writeFile(path.join(ROOT, file), buf); console.log('  ✓', file, `(${(buf.length / 1024).toFixed(1)} KB)`); };

const chrome = await launch();
try {
  console.log('Marca Webora');
  const r = await chrome.evaluate(processar.toString(), {
    simbolo: await dataURL('marca/webora-simbolo-original.webp', 'image/webp'),
    logotipo: await dataURL('marca/webora-logotipo-original.webp', 'image/webp'),
    neon: NEON, black: BLACK
  });
  await out('assets/img/marca/webora-simbolo.webp', fromDataURL(r.simbolo));
  await out('assets/img/marca/webora-logotipo-branco.webp', fromDataURL(r.logoBranco));
  await out('assets/img/marca/webora-logotipo-preto.webp', fromDataURL(r.logoPreto));
  await out('assets/img/marca/webora-logotipo-branco.png', fromDataURL(r.logoBrancoPng));
  await out('icon.png', fromDataURL(r.simbolo512));
  await out('icon-192.png', fromDataURL(r.icon192));
  await out('icon-maskable.png', fromDataURL(r.maskable));
  await out('apple-icon.png', fromDataURL(r.apple));
  await out('favicon.ico', ico(r.ico.map(i => ({ size: i.size, buf: fromDataURL(i.png) }))));
  console.log(`  proporção do logotipo: ${r.ratio.toFixed(4)} (largura/altura)`);

  // imagem de compartilhamento
  await chrome.send('Page.enable');
  await chrome.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  const loaded = chrome.once('Page.loadEventFired');
  await chrome.send('Page.navigate', { url: pathToFileURL(path.join(ROOT, 'scripts/og.html')).href });
  await loaded;
  const fonte = await chrome.evaluate(`async () => { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 8000))]); return document.fonts.check('800 64px Geist'); }`);
  if (!fonte) console.warn('  ! fonte Geist não carregou (sem internet?); a imagem usa a fonte reserva');
  const shot = await chrome.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
  await out('assets/img/og.jpg', Buffer.from(shot.data, 'base64'));
} finally {
  await chrome.close();
}
