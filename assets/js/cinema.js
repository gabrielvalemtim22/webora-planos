/* =========================================================
   Webora 3D — o filme da abertura anda com a rolagem,
   cartões com profundidade e objetos 3D dos planos.
   Roda depois de app.js (os planos já estão na página).
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t * t * (3 - 2 * t);

  /* ---------- objetos 3D dos planos (ficam fora da grade do card) ---------- */
  const PLAN3D = { essencial: 'plan-essencial', loja: 'plan-loja', premium: 'plan-premium' };
  $$('.plan').forEach(card => {
    const id = Object.keys(PLAN3D).find(k => card.classList.contains(`plan--${k}`));
    if (!id) return;
    const img = new Image(240, 240);
    img.className = 'plan__3d';
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = `/assets/3d/${PLAN3D[id]}.webp?v=1`;
    card.prepend(img);
  });

  /* ---------- cartões que inclinam com o mouse ---------- */
  if (mqFine.matches && !mqReduce.matches) {
    $$('.perk, .step4, .fact').forEach(el => {
      el.classList.add('tilt');
      let raf = 0, x = 0, y = 0;
      const apply = () => {
        raf = 0;
        el.style.setProperty('--gx', x.toFixed(3));
        el.style.setProperty('--gy', y.toFixed(3));
        el.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-6px)`;
      };
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        x = clamp((e.clientX - r.left) / r.width, 0, 1) * 2 - 1;
        y = clamp((e.clientY - r.top) / r.height, 0, 1) * 2 - 1;
        el.classList.add('is-tilting');
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf); raf = 0;
        el.classList.remove('is-tilting');
        el.style.transform = '';
        el.style.setProperty('--gx', 0);
        el.style.setProperty('--gy', 0);
      });
    });
  }

  /* ---------- chamada final: a cena acompanha o mouse ---------- */
  const ctaCine = $('.cta-cine');
  if (ctaCine && mqFine.matches && !mqReduce.matches) {
    ctaCine.addEventListener('pointermove', e => {
      ctaCine.style.setProperty('--px', (e.clientX / innerWidth * 2 - 1).toFixed(3));
      ctaCine.style.setProperty('--py', (e.clientY / innerHeight * 2 - 1).toFixed(3));
    });
    ctaCine.addEventListener('pointerleave', () => { ctaCine.style.setProperty('--px', 0); ctaCine.style.setProperty('--py', 0); });
  }

  /* ---------- abertura: filme 3D controlado pela rolagem ---------- */
  const cine = $('[data-cine]');
  if (!cine) return;
  const media = $('.cine__media', cine);
  const video = $('[data-cine-video]', cine);
  const bar = $('[data-cine-bar]', cine);
  const loadEl = $('[data-cine-load]', cine);
  const goBtns = $$('[data-cine-go]', cine);
  const N = $$('[data-ch]', cine).length || 4;
  const mqWide = matchMedia('(min-width: 900px)');
  const mqSmall = matchMedia('(max-width: 760px), (pointer: coarse)');
  // enquadramento por capítulo no computador: o objeto vai para o lado oposto ao texto
  // x = fração da largura da tela, s = escala, y = fração da altura
  const KEYS = [{ x: .21, s: .84, y: .02 }, { x: -.21, s: .88, y: 0 }, { x: .21, s: .94, y: 0 }, { x: 0, s: .92, y: -.07 }];

  let target = 0, shown = 0, duration = 0, ready = false, running = false, raf = 0;
  let blobUrl = '', kind = '', ctrl = null, primed = false, active = -1;
  let mx = 0, my = 0, tmx = 0, tmy = 0;

  const progress = () => {
    const r = cine.getBoundingClientRect(), span = r.height - innerHeight;
    return span > 0 ? clamp(-r.top / span) : 0;
  };
  const frameAt = q => {
    const n = KEYS.length - 1, f = clamp(q) * n, i = Math.min(n - 1, Math.floor(f)), t = ease(f - i);
    const a = KEYS[i], b = KEYS[i + 1];
    return { x: a.x + (b.x - a.x) * t, s: a.s + (b.s - a.s) * t, y: a.y + (b.y - a.y) * t };
  };
  // o final do filme é quase parado: a curva dá mais rolagem para a abertura da caixa
  const timeFor = q => Math.pow(clamp(q), 1.3) * Math.max(0, duration - .05);

  function paint() {
    const still = mqReduce.matches;
    const k = mqWide.matches && !still ? frameAt(shown) : { x: 0, s: 1, y: 0 };
    media.style.transform = `translate3d(${(k.x * innerWidth - mx * 14).toFixed(1)}px, ${(k.y * innerHeight - my * 10).toFixed(1)}px, 0) scale(${k.s.toFixed(4)})`;
    if (bar) bar.style.transform = `scaleY(${target.toFixed(4)})`;
    cine.classList.toggle('is-moved', target > .015);
    const now = Math.round(target * (N - 1));
    if (now !== active) {
      active = now;
      goBtns.forEach((b, i) => { if (i === now) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    }
  }

  function tick() {
    raf = 0;
    target = progress();
    shown += (target - shown) * (mqReduce.matches ? 1 : .16);
    if (Math.abs(target - shown) < .0004) shown = target;
    mx += (tmx - mx) * .08; my += (tmy - my) * .08;
    paint();
    let behind = false;
    if (ready) {
      const t = timeFor(shown);
      behind = Math.abs(video.currentTime - t) > .01;
      // uma busca por vez: enquanto o vídeo procura o quadro, só acompanhamos o alvo
      if (behind && !video.seeking) video.currentTime = t;
    }
    const moving = shown !== target || Math.abs(tmx - mx) > .002 || Math.abs(tmy - my) > .002 || behind;
    if (running && moving) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) kick(); }).observe(cine);

  if (mqFine.matches) {
    cine.addEventListener('pointermove', e => { tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1; kick(); });
    cine.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; kick(); });
  }

  // capítulos clicáveis no trilho
  goBtns.forEach((b, i) => b.addEventListener('click', () => {
    const top = cine.offsetTop + (i / (N - 1)) * (cine.offsetHeight - innerHeight);
    scrollTo({ top: Math.round(top), behavior: mqReduce.matches ? 'auto' : 'smooth' });
  }));

  /* carrega o filme inteiro em memória (Blob) para a busca de quadros ser instantânea */
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  function setLoad(f) { if (loadEl) loadEl.style.setProperty('--load', f.toFixed(3)); }

  async function load() {
    if (!video || mqReduce.matches || saveData || !window.fetch || !window.URL) return;
    const want = mqSmall.matches ? 'm' : 'd';
    if (want === kind) return;
    kind = want;
    ready = false;
    cine.classList.remove('is-live');
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();
    const url = want === 'm' ? video.dataset.srcMobile : video.dataset.src;
    cine.classList.add('is-loading');
    setLoad(0);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const total = Number(res.headers.get('content-length')) || 0;
      let blob;
      if (res.body && res.body.getReader && total) {
        const reader = res.body.getReader(), parts = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value); got += value.length; setLoad(got / total);
        }
        blob = new Blob(parts, { type: 'video/mp4' });
      } else {
        blob = await res.blob();
      }
      const next = URL.createObjectURL(blob);
      video.addEventListener('loadeddata', onData, { once: true });
      video.addEventListener('error', onFail, { once: true });
      video.src = next;
      video.load();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = next;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      onFail();
    }
  }
  function onFail() { kind = ''; ready = false; cine.classList.remove('is-loading', 'is-live'); }
  function onData() {
    duration = video.duration && isFinite(video.duration) ? video.duration : 15;
    const show = () => {
      ready = true;
      video.currentTime = Math.max(.01, timeFor(shown));
      let done = false;
      const live = () => { if (done) return; done = true; cine.classList.add('is-live'); cine.classList.remove('is-loading'); kick(); };
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(live);
      video.addEventListener('seeked', live, { once: true });
      setTimeout(live, 900);
      kick();
    };
    // iOS só pinta quadros depois de um play: toca mudo por um instante e pausa
    const pr = video.play();
    if (pr && pr.then) pr.then(() => { video.pause(); show(); }).catch(show);
    else { video.pause(); show(); }
  }
  // primeiro toque também destrava o vídeo no iOS
  const prime = () => {
    if (primed || !ready) return;
    primed = true;
    const pr = video.play();
    if (pr && pr.then) pr.then(() => { video.pause(); kick(); }).catch(() => {});
  };
  addEventListener('touchstart', prime, { passive: true, once: false });
  addEventListener('pointerdown', prime, { passive: true });

  mqSmall.addEventListener('change', () => load());
  mqReduce.addEventListener('change', () => { if (!mqReduce.matches) load(); kick(); });

  const start = () => ('requestIdleCallback' in window ? requestIdleCallback(load, { timeout: 1200 }) : setTimeout(load, 300));
  if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
  kick();
})();
