/* Webora · interações da página inicial */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* topo com fundo depois de rolar + botão flutuante */
  const nav = document.querySelector('[data-nav]');
  const wa = document.querySelector('.wa-float');
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 30);
    wa.classList.toggle('is-on', y > innerHeight * 0.8);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* entrada ao rolar, em cascata dentro de cada grupo */
  const items = document.querySelectorAll('.reveal');
  items.forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 6) * 0.07 + 's');
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(el => io.observe(el));
  } else items.forEach(el => el.classList.add('is-in'));

  /* números que sobem */
  const counters = document.querySelectorAll('[data-count]');
  const run = el => {
    const end = +el.dataset.count, suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = end + suf; return; }
    const t0 = performance.now(), dur = 1400;
    const step = t => {
      const p = Math.min((t - t0) / dur, 1), k = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(end * k) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    setTimeout(() => { el.textContent = end + suf; }, dur + 400); // garante o número final mesmo com a aba em segundo plano
  };
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); co.unobserve(e.target); } }), { threshold: 0.6 });
    counters.forEach(c => co.observe(c)); // o número final já está no HTML; só anima quando aparece
  }

  /* palco do topo: as janelas trocam de lugar e seguem o mouse */
  const stage = document.querySelector('[data-stage]');
  const deck = document.querySelector('[data-deck]');
  if (stage && deck) {
    const wins = [...deck.querySelectorAll('.win')];
    let order = wins.map((_, i) => i);
    const paint = () => wins.forEach((w, i) => w.dataset.pos = order.indexOf(i));
    paint();
    if (!reduce) {
      setInterval(() => { if (!document.hidden) { order.push(order.shift()); paint(); } }, 3200);
      if (matchMedia('(hover: hover)').matches) {
        stage.addEventListener('pointermove', e => {
          const r = stage.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          deck.style.setProperty('--ry', (-10 + x * 16).toFixed(2) + 'deg');
          deck.style.setProperty('--rx', (6 - y * 12).toFixed(2) + 'deg');
        });
        stage.addEventListener('pointerleave', () => { deck.style.removeProperty('--ry'); deck.style.removeProperty('--rx'); });
      }
    }
  }

  /* filtro dos projetos */
  const tabs = document.querySelectorAll('[data-filter]');
  const cards = document.querySelectorAll('[data-project]');
  const empty = document.querySelector('[data-empty]');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    const f = tab.dataset.filter;
    tabs.forEach(t => t.setAttribute('aria-selected', String(t === tab)));
    let shown = 0;
    cards.forEach(c => {
      const on = f === 'todos' || c.dataset.category === f;
      c.classList.toggle('is-hidden', !on);
      if (on) { shown++; c.classList.add('is-in'); }
    });
    if (empty) empty.hidden = shown > 0;
  }));
  // setas do teclado entre as abas
  const list = document.querySelector('.filters');
  list?.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const arr = [...tabs], i = arr.indexOf(document.activeElement);
    if (i < 0) return;
    const n = arr[(i + (e.key === 'ArrowRight' ? 1 : arr.length - 1)) % arr.length];
    n.focus(); n.click();
  });
})();
