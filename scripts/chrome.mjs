/* =========================================================
   Chrome (ou Edge) instalado, controlado pelo DevTools Protocol, sem dependências.
   Usado por scripts/marca.mjs e scripts/print-projeto.mjs.
   Para outro navegador: CHROME="/caminho/do/navegador"
   ========================================================= */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find(p => existsSync(p));

export const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Chrome via DevTools Protocol ---------- */
export async function launch() {
  if (!CHROME) throw new Error('Chrome não encontrado. Defina CHROME com o caminho do navegador.');
  const dir = await mkdtemp(path.join(tmpdir(), 'webora-chrome-'));
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
