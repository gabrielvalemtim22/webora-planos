/* =========================================================
   Webora — acabamento: pílula que desliza na navegação e
   luz que acompanha o mouse nos cartões de planos.
   Roda depois de app.js e cinema.js. Não mexe em planos, contrato nem Pix.
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const mqDesk = matchMedia('(min-width: 1001px)');
  const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- navegação: a pílula amarela desliza até o link ativo ---------- */
  const nav = $('.nav');
  const pill = $('.nav__pill');
  if (nav && pill) {
    const links = $$('a:not(.btn):not(.nav__wa)', nav);
    const current = () => links.find(a => a.getAttribute('aria-current') === 'true');
    let shown = null;
    const place = a => {
      shown = a || null;
      links.forEach(l => l.classList.toggle('is-on', l === shown));
      if (!mqDesk.matches || !a) { nav.classList.remove('has-pill'); return; }
      pill.style.setProperty('--x', `${a.offsetLeft}px`);
      pill.style.setProperty('--w', `${a.offsetWidth}px`);
      // primeira aparição sem deslizar desde a esquerda
      if (!nav.classList.contains('has-pill')) {
        pill.classList.add('is-instant');
        requestAnimationFrame(() => requestAnimationFrame(() => pill.classList.remove('is-instant')));
      }
      nav.classList.add('has-pill');
    };
    new MutationObserver(() => place(current())).observe(nav, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
    if (mqFine.matches) {
      links.forEach(a => a.addEventListener('pointerenter', () => place(a)));
      nav.addEventListener('pointerleave', () => place(current()));
    }
    const refresh = () => place(shown && shown !== current() ? shown : current());
    addEventListener('resize', refresh, { passive: true });
    mqDesk.addEventListener?.('change', refresh);
    document.fonts?.ready.then(refresh);
    refresh();
  }

  /* ---------- planos: luz suave que segue o mouse ---------- */
  if (mqFine.matches && !mqReduce.matches) {
    $$('.plan').forEach(card => {
      let raf = 0, x = 0, y = 0;
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        x = e.clientX - r.left; y = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(() => {
          raf = 0;
          card.style.setProperty('--mx', `${x.toFixed(0)}px`);
          card.style.setProperty('--my', `${y.toFixed(0)}px`);
        });
      });
    });
  }
})();
