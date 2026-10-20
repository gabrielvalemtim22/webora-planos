/* =========================================================
   Webora — tira os prints de um projeto para a vitrine.
   Uso: npm run print -- <url> <id>
        ex.: npm run print -- https://conectagoogle.vercel.app conectagoogle
   Saída: assets/img/projetos/<id>.webp (1280×800) e <id>-m.webp (450×900, celular)
   ========================================================= */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, sleep } from './chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [url, id] = process.argv.slice(2);
if (!url || !/^https?:\/\//.test(url) || !id || !/^[a-z0-9-]+$/.test(id)) {
  console.error('Uso: npm run print -- <url> <id>   (id em minúsculas, sem espaços)');
  process.exit(1);
}

const TELAS = [
  { arquivo: `${id}.webp`, width: 1280, height: 800, mobile: false },
  { arquivo: `${id}-m.webp`, width: 450, height: 900, mobile: true }
];

const chrome = await launch();
try {
  await chrome.send('Page.enable');
  for (const t of TELAS) {
    await chrome.send('Emulation.setDeviceMetricsOverride', { width: t.width, height: t.height, deviceScaleFactor: 1, mobile: t.mobile });
    await chrome.send('Emulation.setTouchEmulationEnabled', { enabled: t.mobile, maxTouchPoints: t.mobile ? 5 : 1 });
    const loaded = chrome.once('Page.loadEventFired');
    await chrome.send('Page.navigate', { url });
    await loaded;
    // espera fontes, imagens e animações de entrada
    await chrome.evaluate(`async () => { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 6000))]); scrollTo(0, 0); }`);
    await sleep(3500);
    const shot = await chrome.send('Page.captureScreenshot', { format: 'webp', quality: 82, clip: { x: 0, y: 0, width: t.width, height: t.height, scale: 1 } });
    const buf = Buffer.from(shot.data, 'base64');
    await writeFile(path.join(ROOT, 'assets/img/projetos', t.arquivo), buf);
    console.log('  ✓', `assets/img/projetos/${t.arquivo}`, `(${(buf.length / 1024).toFixed(1)} KB)`);
  }
} finally {
  await chrome.close();
}
