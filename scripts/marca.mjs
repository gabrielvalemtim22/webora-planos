/* Gera os ícones, as assinaturas e a imagem de compartilhamento da Webora
   a partir das duas imagens fornecidas em marca/. Usa o Chrome instalado. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function processar({ simbolo, logotipo }) {
  const load = async src => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
  };
  const canvas = (width, height) => {
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    return out;
  };
  const [mark, lockup] = await Promise.all([load(simbolo), load(logotipo)]);
  const blue = '#1022dd';

  // Mantém a arte da janela e das mãos inteira, com mais respiro nos ícones
  // que podem receber uma máscara circular do sistema operacional.
  const tile = (size, padding = 0) => {
    const out = canvas(size, size);
    const ctx = out.getContext('2d');
    const crop = mark.width * .9;
    ctx.fillStyle = blue;
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mark, (mark.width - crop) / 2, (mark.height - crop) / 2, crop, crop,
      padding * size, padding * size, (1 - padding * 2) * size, (1 - padding * 2) * size);
    return out;
  };

  // A palavra branca do original é isolada pelo canal vermelho, quase
  // ausente no fundo royal. O alfa mantém as bordas suavizadas da fonte.
  const wordmark = (w, color) => {
    const out = canvas(w, Math.round(w * .225));
    const ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(lockup, lockup.width * .121, lockup.height * .594, lockup.width * .758, lockup.height * .171,
      0, 0, out.width, out.height);
    const pixels = ctx.getImageData(0, 0, out.width, out.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const red = pixels.data[i];
      pixels.data.fill(color, i, i + 3);
      pixels.data[i + 3] = Math.max(0, Math.min(255, Math.round((red - 13) * 255 / 233)));
    }
    ctx.putImageData(pixels, 0, 0);
    return out;
  };

  const paper = canvas(440, 112);
  const paperCtx = paper.getContext('2d');
  paperCtx.fillStyle = '#fff';
  paperCtx.fillRect(0, 0, paper.width, paper.height);
  paperCtx.save();
  paperCtx.beginPath();
  paperCtx.roundRect(4, 6, 100, 100, 23);
  paperCtx.clip();
  paperCtx.drawImage(tile(100), 4, 6);
  paperCtx.restore();
  paperCtx.drawImage(wordmark(306, 8), 125, 22);

  const square = canvas(520, 520);
  const squareCtx = square.getContext('2d');
  squareCtx.imageSmoothingQuality = 'high';
  squareCtx.drawImage(lockup, 0, 0, 520, 520);
  const webp = (img, quality = .91) => img.toDataURL('image/webp', quality);

  return {
    simbolo: webp(tile(192)),
    icon512: tile(512).toDataURL(),
    icon192: tile(192).toDataURL(),
    maskable: tile(512, .16).toDataURL(),
    apple: tile(180).toDataURL(),
    ico: [16, 32, 48].map(size => ({ size, png: tile(size).toDataURL() })),
    logoPreto: webp(wordmark(560, 8)),
    logoBranco: webp(wordmark(560, 255)),
    logoPdf: paper.toDataURL(),
    lockup: webp(square)
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
    logotipo: await dataURL('marca/webora-logotipo-original.webp', 'image/webp')
  });
  await out('assets/img/marca/webora-simbolo.webp', fromDataURL(r.simbolo));
  await out('assets/img/marca/webora-logotipo-preto.webp', fromDataURL(r.logoPreto));
  await out('assets/img/marca/webora-logotipo-branco.webp', fromDataURL(r.logoBranco));
  await out('assets/img/marca/webora-logotipo.png', fromDataURL(r.logoPdf));
  await out('icon.png', fromDataURL(r.icon512));
  await out('icon-192.png', fromDataURL(r.icon192));
  await out('icon-maskable.png', fromDataURL(r.maskable));
  await out('apple-icon.png', fromDataURL(r.apple));
  await out('favicon.ico', ico(r.ico.map(i => ({ size: i.size, buf: fromDataURL(i.png) }))));
  await out('assets/img/marca/webora-royal-lockup.webp', fromDataURL(r.lockup));
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
