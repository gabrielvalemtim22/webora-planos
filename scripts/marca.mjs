/* =========================================================
   Webora — gera os arquivos da marca a partir das imagens originais
   (marca/webora-simbolo-original.jpg: símbolo sobre fundo azul;
    marca/webora-logotipo-original.webp: "web" azul + "ora" preto sobre branco).

   As cores são normalizadas para as oficiais (azul royal #0754FA, preto #080808 e branco),
   sem mudar o desenho.

   Saída:
     assets/img/marca/   símbolo (quadrado azul com o hexágono) e logotipo (preto: fundo claro;
                         branco: fundo escuro), PNG do logotipo para o PDF
     favicon.ico, icon.png, icon-192.png, icon-maskable.png, apple-icon.png   (raiz do site)
     assets/img/og.jpg   imagem de compartilhamento (1200×630), a partir de scripts/og.html

   Usa o Chrome (ou Edge) instalado, sem dependências: npm run marca
   ========================================================= */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BLUE = [0x07, 0x54, 0xFA];
const BLACK = [0x08, 0x08, 0x08];

/* ---------- processamento das imagens (roda dentro do Chrome) ---------- */
async function processar({ simbolo, logotipo, blue, black }) {
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
  const url = (c, type = 'image/png', q) => c.toDataURL(type, q);
  const hex = c => `rgb(${c.join(',')})`;

  /* símbolo: cada pixel é uma mistura de azul (fundo), branco e preto.
     Os pesos saem de mínimos quadrados e recompõem o pixel com as cores oficiais. */
  const s = read(await load(simbolo)), W = s.width, H = s.height, d = s.data;
  const bg = [0, 0, 0];
  for (let y = 8; y < 48; y++) for (let x = 8; x < 48; x++) { const i = (y * W + x) * 4; bg[0] += d[i]; bg[1] += d[i + 1]; bg[2] += d[i + 2]; }
  bg.forEach((v, k) => { bg[k] = v / 1600; });
  const Wv = [255, 255, 255];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const a11 = dot(bg, bg), a12 = dot(bg, Wv), a22 = dot(Wv, Wv), det = a11 * a22 - a12 * a12;
  const wB = new Float32Array(W * H), wW = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const px = [d[p * 4], d[p * 4 + 1], d[p * 4 + 2]], b1 = dot(bg, px), b2 = dot(Wv, px);
    let wb = Math.max(0, (a22 * b1 - a12 * b2) / det), ww = Math.max(0, (a11 * b2 - a12 * b1) / det);
    const t = wb + ww; if (t > 1) { wb /= t; ww /= t; }
    wB[p] = wb; wW[p] = ww;
  }
  // fundo azul: tudo o que é azul e encosta na borda da imagem
  const outside = new Uint8Array(W * H), stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (outside[p] || wB[p] < .5) continue;
    outside[p] = 1;
    const x = p % W, y = (p - x) / W;
    if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
  }
  // o emblema é a maior região que não é fundo; pontos soltos (ruído do JPEG) viram fundo
  const comp = new Int32Array(W * H).fill(-1), sizes = [];
  for (let p0 = 0; p0 < W * H; p0++) {
    if (outside[p0] || comp[p0] >= 0) continue;
    const id = sizes.length; let n = 0; stack.push(p0); comp[p0] = id;
    while (stack.length) {
      const p = stack.pop(); n++;
      const x = p % W, y = (p - x) / W;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) if (q >= 0 && !outside[q] && comp[q] < 0) { comp[q] = id; stack.push(q); }
    }
    sizes.push(n);
  }
  const maior = sizes.indexOf(Math.max(...sizes));
  const soltos = sizes.filter((n, i) => i !== maior);
  for (let p = 0; p < W * H; p++) if (!outside[p] && comp[p] !== maior) { outside[p] = 1; wB[p] = 1; wW[p] = 0; }
  // borda suavizada: só os 3 px de cada lado do contorno do emblema têm transparência parcial;
  // o resto do fundo fica transparente (a borda da imagem original é um pouco mais escura)
  const grow = (mask, n) => {
    const m = mask.slice();
    for (let k = 0; k < n; k++) {
      const prev = m.slice();
      for (let p = 0; p < W * H; p++) if (!prev[p]) {
        const x = p % W;
        if ((x > 0 && prev[p - 1]) || (x < W - 1 && prev[p + 1]) || (p >= W && prev[p - W]) || (p < W * (H - 1) && prev[p + W])) m[p] = 1;
      }
    }
    return m;
  };
  const perto = grow(outside.map(v => 1 - v), 3), borda = grow(outside, 3);
  const em = new ImageData(W, H), e = em.data;
  for (let p = 0; p < W * H; p++) {
    const ww = wW[p], wk = Math.max(0, 1 - wB[p] - ww), tot = ww + wk, i = p * 4;
    const a = outside[p] ? (perto[p] ? tot : 0) : (borda[p] ? tot : 1);
    const f = tot > .001 ? ww / tot : 1;              // fração de branco no que não é azul
    e[i] = Math.round(255 * f + black[0] * (1 - f)); e[i + 1] = Math.round(255 * f + black[1] * (1 - f)); e[i + 2] = Math.round(255 * f + black[2] * (1 - f));
    e[i + 3] = a < .04 ? 0 : Math.round(Math.min(1, a) * 255);
  }
  const eb = bbox(em, (dd, i) => dd[i + 3] > 8);

  // símbolo e ícones: o desenho original (emblema sobre o quadrado azul), com cantos
  // arredondados no site, na aba e no app, ou inteiro onde o sistema arredonda (iPhone, Android)
  const tile = (size, scale, raio) => {
    const out = canvas(size, size), x = out.getContext('2d');
    x.fillStyle = hex(blue);
    if (raio) { x.beginPath(); x.roundRect(0, 0, size, size, size * raio); x.fill(); } else x.fillRect(0, 0, size, size);
    const ebW = Math.round(size * scale), crop = canvas(eb.w, eb.h);
    crop.getContext('2d').drawImage(toCanvas(em), eb.x0, eb.y0, eb.w, eb.h, 0, 0, eb.w, eb.h);
    const r = resize(crop, ebW, Math.round(ebW * eb.h / eb.w));
    x.drawImage(r, Math.round((size - r.width) / 2), Math.round((size - r.height) / 2));
    return out;
  };

  /* logotipo: separa do fundo branco (alfa pelo canal vermelho) e normaliza as cores */
  const l = read(await load(logotipo)), ld = l.data;
  const azul = new Uint8Array(ld.length / 4);
  for (let i = 0, p = 0; i < ld.length; i += 4, p++) {
    const r = ld[i], b = ld[i + 2], falta = 255 - r;
    const a = falta / 248;
    if (a < .05) { ld[i + 3] = 0; continue; }
    azul[p] = (b - r) > falta * .5 ? 1 : 0;
    const c = azul[p] ? blue : black;
    ld[i] = c[0]; ld[i + 1] = c[1]; ld[i + 2] = c[2]; ld[i + 3] = Math.round(Math.min(1, a) * 255);
  }
  const lb = bbox(l, (dd, i) => dd[i + 3] > 40);
  const pad = Math.round(lb.h * .04);
  const lw = lb.w + pad * 2, lh = lb.h + pad * 2;
  const logoPreto = canvas(lw, lh);
  logoPreto.getContext('2d').drawImage(toCanvas(l), lb.x0, lb.y0, lb.w, lb.h, pad, pad, lb.w, lb.h);
  const pd = logoPreto.getContext('2d').getImageData(0, 0, lw, lh);
  for (let i = 0; i < pd.data.length; i += 4) if (pd.data[i] === black[0] && pd.data[i + 2] === black[2]) { pd.data[i] = 255; pd.data[i + 1] = 255; pd.data[i + 2] = 255; }
  const logoBranco = toCanvas(pd);
  const logoW = 560, logoH = Math.round(560 * lh / lw);

  const ico = [16, 32, 48].map(n => ({ size: n, png: url(tile(n, .8, .22)) }));
  return {
    fundo: bg.map(Math.round),
    soltos: soltos.length ? `${soltos.length} (maior: ${Math.max(...soltos)} px)` : '0',
    ratio: lw / lh,
    simbolo: url(tile(192, .66, .22), 'image/webp', .92),
    icon512: url(tile(512, .66, .22)),
    icon192: url(tile(192, .68, .22)),
    maskable: url(tile(512, .54, 0)),
    apple: url(tile(180, .62, 0)),
    ico,
    logoPreto: url(resize(logoPreto, logoW, logoH), 'image/webp', .92),
    logoBranco: url(resize(logoBranco, logoW, logoH), 'image/webp', .92),
    logoPdf: url(resize(logoPreto, 420, Math.round(420 * lh / lw)))
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
    simbolo: await dataURL('marca/webora-simbolo-original.jpg', 'image/jpeg'),
    logotipo: await dataURL('marca/webora-logotipo-original.webp', 'image/webp'),
    blue: BLUE, black: BLACK
  });
  console.log(`  azul do original: rgb(${r.fundo.join(', ')}) → #0754FA · pontos soltos removidos: ${r.soltos}`);
  await out('assets/img/marca/webora-simbolo.webp', fromDataURL(r.simbolo));
  await out('assets/img/marca/webora-logotipo-preto.webp', fromDataURL(r.logoPreto));
  await out('assets/img/marca/webora-logotipo-branco.webp', fromDataURL(r.logoBranco));
  await out('assets/img/marca/webora-logotipo.png', fromDataURL(r.logoPdf));
  await out('icon.png', fromDataURL(r.icon512));
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
  const fonte = await chrome.evaluate(`async () => { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 8000))]); return document.fonts.check('800 64px "Plus Jakarta Sans"'); }`);
  if (!fonte) console.warn('  ! fonte Plus Jakarta Sans não carregou (sem internet?); a imagem usa a fonte reserva');
  const shot = await chrome.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
  await out('assets/img/og.jpg', Buffer.from(shot.data, 'base64'));
} finally {
  await chrome.close();
}
