/* =========================================================
   Webora — página, vitrine de projetos, planos e contratação digital
   Tudo o que tem preço vem de assets/js/config.js (em centavos).
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => mqReduce.matches;
  const W = window.WEBORA, PLANOS = window.PLANOS, C = window.Contrato;
  const LISTA = Object.values(PLANOS), PROJETOS = window.PROJETOS || [];
  const TOP = (LISTA.find(P => P.destaque) || LISTA[0]).id;
  const wa = text => `https://wa.me/${W.whatsapp}?text=${encodeURIComponent(text)}`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } }
  };

  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  $$('[data-wa]').forEach(a => { a.href = wa(a.dataset.wa); });
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  $$('[data-preco]').forEach(el => { const P = PLANOS[el.dataset.preco]; if (P) el.textContent = C.brl(P.centavos); });
  $$('[data-preco-min]').forEach(el => { el.textContent = C.brl(Math.min(...LISTA.map(P => P.centavos))); });

  /* ---------- cabeçalho, menu e seção ativa ---------- */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 12);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const menuBtn = $('[data-menu]');
  const setMenu = open => {
    header.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    $('use', menuBtn).setAttribute('href', open ? '#i-x' : '#i-menu');
  };
  menuBtn.addEventListener('click', () => setMenu(!header.classList.contains('is-open')));
  $$('.nav a', header).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && header.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', e => { if (!header.contains(e.target)) setMenu(false); });
  matchMedia('(min-width: 1001px)').addEventListener('change', e => { if (e.matches) setMenu(false); });

  const navLinks = $$('.nav a[href^="#"]:not(.btn)');
  const spy = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => { if (a.getAttribute('href') === `#${e.target.id}`) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach(s => spy.observe(s));

  /* ---------- topo: os projetos em anel, em profundidade, ao redor do título ---------- */
  (function orbit() {
    const hero = $('.hero--ring');
    if (!hero) return;
    const box = $('.orbit', hero), core = $('[data-orbit-core]', hero);
    const rings = $$('[data-orbit]', hero).map(el => ({ el, back: el.dataset.orbit === 'back', frames: $$('.orb', el) }));
    let R = 500, K = .6, persp = 2300, phone = false, spin = 0, last = 0, running = false, mx = 0, my = 0, tmx = 0, tmy = 0;

    // caixas do texto em relação ao centro do anel, medidas sem as transformações da entrada
    function textBoxes() {
      const b = box.getBoundingClientRect(), c = core.getBoundingClientRect();
      const ox = c.left - (b.left + b.width / 2), oy = c.top - (b.top + b.height / 2);
      return $$('.hero__title .line > span, .hero__lead, .hero__cta > *, .hero__trust li', core).map(e => {
        let x = 0, y = 0;
        for (let n = e; n && n !== core; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
        return [ox + x, oy + y, ox + x + e.offsetWidth, oy + y + e.offsetHeight];
      });
    }

    // o card percorre a elipse inteira; em nenhum ponto pode encostar no texto
    function clears(T, fw, r, v, zA) {
      for (let i = 0; i < 48; i++) {
        const a = i / 48 * Math.PI * 2, c = Math.cos(a), sc = persp / (persp - c * r * zA);
        const x = Math.sin(a) * r, hw = fw * sc / 2 + 14, hh = fw * .625 * sc / 2 + 14;
        for (const y of [c * v * .95, c * v * 1.05]) {
          if (T.some(t => x + hw > t[0] && x - hw < t[2] && y + hh > t[1] && y - hh < t[3])) return false;
        }
      }
      return true;
    }

    function layout() {
      const W = innerWidth, H = box.clientHeight;
      phone = W <= 760;
      persp = (phone ? 2.4 : 1.7) * W;
      const zA = phone ? .45 : .85, T = textBoxes();
      const r0 = phone ? .62 * W : Math.min(.4 * W, (H / 2 - 60) / .6), rMax = phone ? .95 * W : .62 * W;
      // procura o anel mais justo que contorna o texto: primeiro abre para os lados, depois diminui os cards
      let fit = null;
      search: for (let fw = (phone ? .44 : .38) * r0; fw >= (phone ? 60 : 96); fw *= .92) {
        for (let r = r0; r <= rMax; r *= 1.04) {
          const vMax = H / 2 - fw * .3125 * persp / (persp - r * zA) - 6;
          for (let v = r * (phone ? .5 : .42); v <= vMax; v += 4) {
            if (clears(T, fw, r, v, zA)) { fit = [fw, r, v]; break search; }
          }
        }
      }
      const [fw, r, v] = fit || [phone ? 60 : 96, rMax, H / 2 - (phone ? 30 : 48)];
      R = r; K = v / r;
      rings.forEach(g => {
        g.el.style.perspective = persp + 'px';
        g.frames.forEach(f => { f.style.width = (g.back ? fw * .62 : fw) + 'px'; });
      });
    }

    function place(p) {
      rings.forEach(r => {
        const step = 360 / r.frames.length;
        const rr = R * (r.back ? 1.17 : 1) * (1 + .5 * p);
        const k = K * (r.back ? .95 : 1) * (1 + my * .05) * (1 - .2 * p);
        const zA = (phone ? .45 : .85) * (r.back ? .6 : 1);
        const zoff = p * .55 * R - (r.back ? R * .5 : 0);
        const base = (r.back ? 15 - spin * .6 : spin) + p * 80 + mx * 8;
        r.frames.forEach((f, i) => {
          const a = (i * step + base) * Math.PI / 180, s = Math.sin(a), c = Math.cos(a);
          const z = c * rr * zA + zoff, back = (persp - z) / persp;
          f.style.transform = `translate(-50%, -50%) translate3d(${(s * rr * back).toFixed(1)}px, ${(c * rr * k * back).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${(-s * (r.back ? 14 : 24)).toFixed(1)}deg) rotateX(${(c * 10).toFixed(1)}deg)`;
          f.style.zIndex = String(Math.round(z + 4000));
          if (!r.back) f.style.opacity = (.72 + .28 * (c + 1) / 2).toFixed(3);
        });
      });
    }

    const progress = () => {
      if (reduce()) return 0;
      const r = hero.getBoundingClientRect();
      return Math.max(0, Math.min(1, -r.top / r.height));
    };
    function tick(t) {
      if (!running) return;
      const dt = Math.min(64, t - (last || t)) / 1000;
      last = t;
      if (!reduce()) spin += 3 * dt;
      mx += (tmx - mx) * .06; my += (tmy - my) * .06;
      place(progress());
      requestAnimationFrame(tick);
    }
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      hero.addEventListener('pointermove', e => { tmx = e.clientX / innerWidth * 2 - 1; tmy = e.clientY / innerHeight * 2 - 1; });
      hero.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; });
    }
    layout();
    place(0);
    addEventListener('resize', () => { layout(); place(progress()); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); place(progress()); });
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) { running = true; last = 0; requestAnimationFrame(tick); }
      else if (!e.isIntersecting) running = false;
    }).observe(hero);
  })();

  const track = $('.marquee__track');
  if (track) track.append(...[...track.children].map(n => n.cloneNode(true)));

  /* ---------- números ---------- */
  const prazos = LISTA.map(P => P.prazo), prazoMin = Math.min(...prazos), prazoMax = Math.max(...LISTA.map(P => P.prazoMax || P.prazo));
  $$('[data-stat="projetos"]').forEach(el => { el.textContent = PROJETOS.length; });
  $$('[data-stat="prazo"]').forEach(el => { el.textContent = (Math.max(...prazos) > prazoMin ? 'a partir de ' : '') + C.dias(prazoMin); });
  $$('[data-stat="prazo-max"]').forEach(el => { el.textContent = C.dias(prazoMax); });
  $$('[data-prazo-extra]').forEach(el => { el.hidden = prazoMax <= prazoMin; });

  /* ---------- portfólio: um projeto por vez, no notebook e no celular ---------- */
  // os prints mantêm as cores próprias de cada site; a moldura é a da Webora
  const tags = p => [p.categoria === 'loja' ? 'E-commerce' : p.tipo, 'Responsivo'];
  const pfTrack = $('[data-pf-track]');
  pfTrack.innerHTML = PROJETOS.map((p, i) => {
    const P = PLANOS[p.plano];
    return `<article class="pf__slide" aria-roledescription="slide" aria-label="${i + 1} de ${PROJETOS.length}: ${esc(p.nome)}">
      <div class="pf__media">
        <div class="laptop"><div class="laptop__screen"><img src="${esc(p.imagem)}" alt="Página inicial do site ${esc(p.nome)} no computador" width="1280" height="800" loading="${i ? 'lazy' : 'eager'}" decoding="async"></div><div class="laptop__base"></div></div>
        ${p.imagemCelular ? `<figure class="device pf__phone"><img src="${esc(p.imagemCelular)}" alt="${esc(p.nome)} no celular" width="450" height="900" loading="lazy" decoding="async"></figure>` : ''}
      </div>
      <div class="pf__body">
        <div class="pf__info">
          <h3 class="pf__name">${esc(p.nome)}</h3>
          <p class="pf__type">${esc(p.tipo)} · ${esc(p.segmento)}</p>
          <p class="pf__desc">${esc(p.descricao)}</p>
        </div>
        <ul class="pf__tags">${tags(p).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
        <div class="pf__actions">
          <a class="btn btn--primary btn--lg" href="${esc(p.url)}" target="_blank" rel="noopener">Ver projeto ${icon('ext', 'i i--up')}<span class="sr-only"> ${esc(p.nome)} (abre em nova aba)</span></a>
          ${P ? `<a class="btn btn--ghost-blue btn--lg" href="#contratar" data-choose="${P.id}">Quero um assim</a>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');

  const slides = $$('.pf__slide', pfTrack);
  const dotsBox = $('[data-pf-dots]'), pfPrev = $('[data-pf-prev]'), pfNext = $('[data-pf-next]');
  dotsBox.innerHTML = slides.map((s, i) => `<button class="pf__dot" type="button" aria-label="Ver o projeto ${i + 1}: ${esc(PROJETOS[i].nome)}"></button>`).join('');
  const dots = $$('.pf__dot', dotsBox);
  // o deslize é animado aqui: o smooth nativo, num carrossel com snap, para no meio quando muda de direção.
  // enquanto anda, as setas contam a partir do destino, não do meio do caminho
  let target = -1, anim = 0;
  const current = () => target >= 0 ? target : slides.reduce((best, s, i) => Math.abs(s.offsetLeft - pfTrack.scrollLeft) < Math.abs(slides[best].offsetLeft - pfTrack.scrollLeft) ? i : best, 0);
  const stop = () => {
    if (target < 0) return;
    cancelAnimationFrame(anim);
    target = -1;
    pfTrack.style.scrollSnapType = '';
    pfUpdate();
  };
  const goTo = i => {
    cancelAnimationFrame(anim);
    target = Math.max(0, Math.min(slides.length - 1, i));
    const from = pfTrack.scrollLeft, to = slides[target].offsetLeft, t0 = performance.now();
    pfUpdate();
    if (reduce() || from === to) { pfTrack.scrollLeft = to; stop(); return; }
    pfTrack.style.scrollSnapType = 'none';
    const step = now => {
      const k = Math.min(1, (now - t0) / 560);
      pfTrack.scrollLeft = from + (to - from) * (1 - (1 - k) ** 3);
      if (k < 1) anim = requestAnimationFrame(step); else stop();
    };
    anim = requestAnimationFrame(step);
  };
  // quem arrasta ou rola o carrossel assume o controle
  ['pointerdown', 'wheel', 'touchstart'].forEach(t => pfTrack.addEventListener(t, stop, { passive: true }));
  function pfUpdate() {
    const c = current();
    dots.forEach((d, i) => { if (i === c) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    slides.forEach((s, i) => { s.inert = i !== c; });
    pfPrev.disabled = c === 0;
    pfNext.disabled = c === slides.length - 1;
  }
  let pfRaf = 0;
  pfTrack.addEventListener('scroll', () => { if (!pfRaf) pfRaf = requestAnimationFrame(() => { pfRaf = 0; pfUpdate(); }); }, { passive: true });
  pfPrev.addEventListener('click', () => goTo(current() - 1));
  pfNext.addEventListener('click', () => goTo(current() + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
  pfTrack.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    goTo(current() + (e.key === 'ArrowRight' ? 1 : -1));
  });
  addEventListener('resize', () => { pfTrack.scrollLeft = slides[current()].offsetLeft; pfUpdate(); });
  pfUpdate();

  /* ---------- planos ---------- */
  const VISIVEIS = 6;   // no celular, os demais itens ficam em "Ver todos os recursos"
  const valor = c => { const [int, dec] = C.reais(c).split('.'); return `${Number(int).toLocaleString('pt-BR')},${dec}`; };
  const numero = i => String(i + 1).padStart(2, '0');
  $('[data-plans]').innerHTML = LISTA.map((P, i) => {
    const top = P.id === TOP, extra = Math.max(0, P.destaques.length - VISIVEIS);
    const chamada = P.chamada ? P.chamada.replace('{preco}', C.brl(P.centavos)) : '';
    return `<article class="plan plan--${P.id}${top ? ' plan--top' : ''}" data-reveal style="--d:${i * .08}s" aria-labelledby="plano-${P.id}">
      <div class="plan__top"><span class="plan__n" aria-hidden="true">${numero(i)}</span><span class="plan__badge">${P.premium ? icon('spark') : ''}${esc(P.selo)}</span></div>
      <h3 class="plan__name" id="plano-${P.id}">${esc(P.nome)}</h3>
      <p class="plan__desc">${esc(P.descricao)}</p>
      <div class="plan__pricebox">
        ${P.oferta ? `<p class="plan__offer">${icon('spark')}${esc(P.oferta)}</p>` : ''}
        <p class="plan__price"><span class="sr-only">${C.brl(P.centavos)}</span><span class="cur" aria-hidden="true">R$</span><b aria-hidden="true">${valor(P.centavos)}</b></p>
        <p class="plan__terms"><b>Preço único</b> · Sem mensalidade da Webora</p>
        <p class="plan__terms">Pix à vista ou 50% + 50%</p>
        ${chamada ? `<p class="plan__call">${icon('spark')}<span>${esc(chamada)}</span></p>` : ''}
      </div>
      <ul class="plan__keys">${(P.chaves || []).map(k => `<li>${icon(k.icone)}<span>${esc(k.texto)}</span></li>`).join('')}</ul>
      <a class="btn ${P.destaque ? 'btn--white' : 'btn--primary'} btn--lg btn--block" href="#contratar" data-choose="${P.id}">${esc(P.botao)} ${icon('arrow', 'i i--move')}</a>
      <div class="plan__features">
        ${P.lista ? `<p class="plan__lead">${esc(P.lista)}</p>` : ''}
        <ul class="plan__list" id="lista-${P.id}">${P.destaques.map((d, j) => `<li${j >= VISIVEIS ? ' class="is-extra"' : ''}>${icon('check')}<span>${esc(d)}</span></li>`).join('')}</ul>
        ${extra ? `<button class="plan__more" type="button" aria-expanded="false" aria-controls="lista-${P.id}" data-more="${extra}">Ver todos os recursos (+${extra})</button>` : ''}
        ${P.nota ? `<p class="plan__note">${esc(P.nota)}</p>` : ''}
      </div>
      <ul class="plan__meta">
        <li>${icon('truck')}<span><small>Entrega</small><b>${C.dias(P.prazo)}</b></span></li>
        <li>${icon('refresh')}<span><small>Revisões</small><b>${P.revisoes} rodadas</b></span></li>
        <li>${icon('headset')}<span><small>Suporte</small><b>${P.suporte} dias</b></span></li>
      </ul>
      <p class="plan__ideal"><b>Ideal para:</b> ${esc(P.ideal)}.</p>
    </article>`;
  }).join('');
  $$('[data-more]').forEach(b => b.addEventListener('click', () => {
    const open = b.closest('.plan').classList.toggle('is-open');
    b.setAttribute('aria-expanded', open);
    b.textContent = open ? 'Mostrar menos' : `Ver todos os recursos (+${b.dataset.more})`;
  }));

  /* ---------- comparação ---------- */
  const cell = v => v === true ? `<span class="yes" role="img" aria-label="Incluído">${icon('check')}</span>`
    : v === false ? `<span class="no" role="img" aria-label="Não incluído">${icon('dash')}</span>` : esc(v);
  const porPlano = fn => Object.fromEntries(LISTA.map(P => [P.id, fn(P)]));
  const grupos = window.COMPARATIVO.concat([{ grupo: 'Atendimento', linhas: [
    { item: 'Rodadas de revisão', ...porPlano(P => String(P.revisoes)) },
    { item: 'Prazo de entrega', ...porPlano(P => C.dias(P.prazo)) },
    { item: 'Suporte após a entrega', ...porPlano(P => `${P.suporte} dias${P.suportePrioritario ? ', prioritário' : ''}`) }
  ] }]);
  const topCls = P => (P.id === TOP ? ' class="is-top"' : '');
  $('[data-compare-head]').innerHTML = `<tr role="row"><th scope="col" role="columnheader">Recurso</th>${LISTA.map(P => `<th scope="col" role="columnheader"${topCls(P)}>${P.id === TOP ? `<em>${esc(P.selo)}</em>` : ''}<b><span class="nm-long">${esc(P.nome)}</span><span class="nm-short" aria-hidden="true">${esc(P.nomeCurto || P.nome)}</span></b><small>${C.brl(P.centavos)}</small></th>`).join('')}</tr>`;
  $('[data-compare]').innerHTML = grupos.map(g =>
    `<tr class="grp" role="row"><th colspan="${LISTA.length + 1}" scope="colgroup" role="rowheader">${esc(g.grupo)}</th></tr>` +
    g.linhas.map(l => `<tr role="row"><th scope="row" role="rowheader">${esc(l.item)}</th>${LISTA.map(P => `<td role="cell"${topCls(P)}>${cell(l[P.id])}</td>`).join('')}</tr>`).join('')
  ).join('');

  $('[data-pick]').innerHTML = LISTA.map((P, i) => `<label class="pick__opt">
      <input type="radio" name="plano" value="${P.id}"${P.id === TOP ? ' checked' : ''}>
      <span class="pick__card">${P.destaque ? `<i>${esc(P.selo)}</i>` : ''}<span class="pick__n" aria-hidden="true">${numero(i)}</span><b>${esc(P.nome)}</b><em>${C.brl(P.centavos)}</em><span class="pick__terms">Pagamento único</span><small>${esc(P.descricao)}</small></span>
    </label>`).join('');

  /* ---------- entrada das seções ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .06 });
  $$('[data-reveal]').forEach(el => io.observe(el));

  /* ---------- dúvidas: uma aberta por vez ---------- */
  $$('.faq__list details').forEach(d => d.addEventListener('toggle', () => { if (d.open) $$('.faq__list details').forEach(o => { if (o !== d) o.open = false; }); }));

  /* ---------- botão do WhatsApp sai da frente na contratação (celular) ---------- */
  const waFloat = $('.wa-float');
  if (waFloat) new IntersectionObserver(es => es.forEach(e => waFloat.classList.toggle('is-hidden', e.isIntersecting && innerWidth < 760)), { threshold: .02 }).observe($('#contratar'));

  /* =========================================================
     Contratação digital
     ========================================================= */
  const wiz = $('[data-wizard]');
  const panels = $$('.panel', wiz);
  const inds = $$('.wizard__steps li', wiz);
  const form = $('#dados');
  const FIELDS = C.CAMPOS, REQ = ['nome', 'doc', 'tel', 'email', 'cidade'];
  const state = { step: 1, numero: null, data: null, built: null, signed: null };
  const DRAFT = 'webora-rascunho', SIGNED = 'webora-contrato';

  const plano = () => $('input[name="plano"]:checked', wiz).value;
  const pagamento = () => $('input[name="pagamento"]:checked', wiz).value;
  const out = (k, v) => $$(`[data-out="${k}"]`, wiz).forEach(el => { el.textContent = v; });

  function updatePlanUI() {
    const P = PLANOS[plano()];
    const av = C.condicoes(P, 'avista'), pc = C.condicoes(P, 'parcelado');
    $('[data-pay="avista"]', wiz).textContent = `${C.brl(av.agora)} no Pix`;
    $('[data-pay="parcelado"]', wiz).textContent = `${C.brl(pc.agora)} agora + ${C.brl(pc.depois)} na entrega`;
    $('[data-total]', wiz).textContent = C.brl(P.centavos);
  }

  function go(n, scroll = true) {
    state.step = n;
    panels.forEach(p => p.classList.toggle('is-active', +p.dataset.step === n));
    inds.forEach(li => {
      const i = +li.dataset.ind;
      li.classList.toggle('is-active', i === n); li.classList.toggle('is-done', i < n);
      if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('[data-progress]', wiz).style.width = `${((n - 1) / (inds.length - 1)) * 100}%`;
    if (scroll) {
      const top = wiz.getBoundingClientRect().top + scrollY - header.offsetHeight - 16;
      scrollTo({ top, behavior: reduce() ? 'auto' : 'smooth' });
      const title = $(`[data-step="${n}"] .panel__title`, wiz);
      if (title) title.focus({ preventScroll: true });
    }
    if (n === 3) requestAnimationFrame(sizePad);
    if (n >= 2) loadLibs().catch(() => {});
  }

  // escolher o plano pelos cards (planos e projetos)
  $$('[data-choose]').forEach(a => a.addEventListener('click', () => {
    $(`input[name="plano"][value="${a.dataset.choose}"]`, wiz).checked = true;
    updatePlanUI(); saveDraft(); state.numero = null;
    if (state.step === 4) restart(false);
    go(1, false);
  }));
  $$('input[name="plano"], input[name="pagamento"]', wiz).forEach(r => r.addEventListener('change', () => { updatePlanUI(); saveDraft(); state.numero = null; }));
  $$('[data-next]', wiz).forEach(b => b.addEventListener('click', () => go(state.step + 1)));
  $$('[data-prev]', wiz).forEach(b => b.addEventListener('click', () => go(state.step - 1)));

  /* ---------- bibliotecas do QR Code e do PDF: só quando precisar ---------- */
  const LIBS = [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', sri: 'sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1', ok: () => typeof window.qrcode === 'function' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', sri: 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk', ok: () => !!(window.jspdf && window.jspdf.jsPDF) }
  ];
  let libsP = null;
  function loadLibs() {
    if (!libsP) {
      libsP = Promise.all(LIBS.map(l => l.ok() ? null : new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = l.src; s.async = true; s.integrity = l.sri; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
        s.onload = res; s.onerror = () => { s.remove(); rej(new Error(`Falha ao carregar ${l.src}`)); };
        document.head.append(s);
      }))).catch(e => { libsP = null; throw e; });
    }
    return libsP;
  }
  let logoP = null;
  const loadLogo = () => logoP || (logoP = fetch('/assets/img/marca/webora-logotipo.png?v=6')
    .then(r => (r.ok ? r.blob() : Promise.reject(new Error('logo'))))
    .then(b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); }))
    .then(async data => { const img = new Image(); img.src = data; await img.decode(); return { data, ratio: img.naturalWidth / img.naturalHeight }; })
    .catch(() => { logoP = null; return null; }));

  /* ---------- rascunho ---------- */
  function saveDraft() {
    const d = { plano: plano(), pagamento: pagamento() };
    FIELDS.forEach(f => { d[f] = form.elements[f].value; });
    store.set(DRAFT, d);
  }
  (function loadDraft() {
    const d = store.get(DRAFT); if (!d) return;
    if (d.plano && PLANOS[d.plano]) $(`input[name="plano"][value="${d.plano}"]`, wiz).checked = true;
    if (C.PAGAMENTOS.includes(d.pagamento)) $(`input[name="pagamento"][value="${d.pagamento}"]`, wiz).checked = true;
    FIELDS.forEach(f => { if (typeof d[f] === 'string') form.elements[f].value = d[f]; });
  })();
  updatePlanUI();

  /* ---------- máscaras e validação ---------- */
  form.elements.doc.addEventListener('input', e => { e.target.value = C.maskDoc(e.target.value); });
  form.elements.tel.addEventListener('input', e => { e.target.value = C.maskPhone(e.target.value); });
  form.addEventListener('input', e => {
    const f = e.target.closest('.field');
    if (f && f.classList.contains('is-invalid')) { f.classList.remove('is-invalid'); e.target.setAttribute('aria-invalid', 'false'); $('.field__err', f).textContent = ''; }
    saveDraft();
  });

  function collect() {
    const raw = {};
    FIELDS.forEach(f => { raw[f] = form.elements[f].value; });
    return Object.assign({ plano: plano(), pagamento: pagamento() }, C.limpar(raw));
  }
  function showErrors(erros) {
    let first = null;
    REQ.forEach(k => {
      const input = form.elements[k], f = input.closest('.field'), msg = erros[k] || '';
      f.classList.toggle('is-invalid', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      $('.field__err', f).textContent = msg;
      if (msg && !first) first = input;
    });
    return first;
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    const first = showErrors(C.validar(collect()));
    if (first) { first.focus(); return; }
    buildContract();
    go(3);
  });

  /* ---------- contrato ---------- */
  function buildContract() {
    const now = new Date();
    if (!state.numero) state.numero = C.numeroContrato(now);
    const d = Object.assign(collect(), { numero: state.numero, dataLonga: C.dataLonga(now) });
    state.data = d;
    state.built = C.build(d);
    const paper = $('[data-paper]', wiz);
    C.renderHTML(paper, state.built.blocks);
    paper.scrollTop = 0;
    $('[data-paper-num]', wiz).textContent = d.numero;
    $('[data-sign-name]', wiz).textContent = `${d.nome} · ${state.built.docTipo} ${C.maskDoc(d.doc)}`;
    $$('[data-agree]', wiz).forEach(c => { c.checked = false; });
    $('.sign__err', wiz).textContent = '';
    clearPad();
  }

  /* ---------- assinatura desenhada ---------- */
  const INK = '#080808';
  const pad = $('[data-pad]', wiz), pctx = pad.getContext('2d');
  let ink = 0, drawing = false, last = null;
  function sizePad() {
    const r = pad.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.max(1, Math.min(3, devicePixelRatio || 1));
    const keep = ink ? pad.toDataURL() : null;
    pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr);
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.lineCap = 'round'; pctx.lineJoin = 'round'; pctx.strokeStyle = INK; pctx.lineWidth = 2.6;
    if (keep) { const i = new Image(); i.onload = () => pctx.drawImage(i, 0, 0, r.width, r.height); i.src = keep; }
  }
  function clearPad() { pctx.clearRect(0, 0, pad.width, pad.height); ink = 0; }
  const pos = e => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  pad.addEventListener('pointerdown', e => {
    e.preventDefault(); drawing = true;
    try { pad.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
    last = pos(e); pctx.beginPath(); pctx.arc(last.x, last.y, 1.2, 0, 7); pctx.fillStyle = INK; pctx.fill();
  });
  pad.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pos(e);
    pctx.beginPath(); pctx.moveTo(last.x, last.y);
    const mx = (last.x + p.x) / 2, my = (last.y + p.y) / 2;
    pctx.quadraticCurveTo(last.x, last.y, mx, my); pctx.lineTo(p.x, p.y); pctx.stroke();
    ink += Math.hypot(p.x - last.x, p.y - last.y); last = p;
    $('.sign__err', wiz).textContent = '';
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => pad.addEventListener(t, () => { drawing = false; }));
  $('[data-clear]', wiz).addEventListener('click', clearPad);
  addEventListener('resize', () => { if (state.step === 3) sizePad(); });

  function busy(btn, on, label) {
    if (on) { btn.dataset.html = btn.innerHTML; btn.setAttribute('aria-busy', 'true'); btn.innerHTML = `<span class="spin" aria-hidden="true"></span><span>${label}</span>`; }
    else if (btn.dataset.html != null) { btn.innerHTML = btn.dataset.html; delete btn.dataset.html; btn.removeAttribute('aria-busy'); }
  }

  /* ---------- conferência no servidor (api/contrato.js) ----------
     O servidor recalcula os valores a partir da mesma tabela de planos e valida os dados.
     Se os valores divergirem (página desatualizada), a assinatura é bloqueada.
     Se o servidor não responder, a contratação segue com os valores locais. */
  async function conferir(d, pg, hash) {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const body = { plano: d.plano, pagamento: d.pagamento, numero: d.numero, hash };
      REQ.forEach(k => { body[k] = d[k]; });
      const r = await fetch('/api/contrato', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal, cache: 'no-store' });
      if (r.status === 400 || r.status === 422) {
        const j = await r.json().catch(() => ({}));
        if (j.erros) { showErrors(j.erros); return { status: 'invalido', mensagem: 'Confira seus dados na etapa anterior.', voltar: true }; }
        return { status: 'invalido', mensagem: j.erro || 'Não foi possível conferir o contrato. Atualize a página e tente novamente.' };
      }
      if (!r.ok) return null;
      const j = await r.json();
      const p = j.pagamento || {};
      if (p.total !== pg.total || p.agora !== pg.agora || p.depois !== pg.depois) return { status: 'divergente' };
      return { status: 'ok', conferidoEm: j.conferidoEm, recibo: j.recibo || null };
    } catch (e) {
      return null;
    } finally { clearTimeout(timer); }
  }

  /* ---------- assinar ---------- */
  $('[data-sign]', wiz).addEventListener('click', async e => {
    const btn = e.currentTarget, err = $('.sign__err', wiz);
    if (!$$('[data-agree]', wiz).every(c => c.checked)) { err.textContent = 'Marque as duas confirmações para assinar.'; return; }
    if (ink < 60) { err.textContent = 'Faça sua assinatura no quadro branco.'; return; }
    err.textContent = '';
    busy(btn, true, 'Assinando…');
    try {
      const d = state.data, b = state.built, P = b.plano;
      const assinatura = trimSignature();
      const quando = new Date();
      const assinadoEm = C.dataHora(quando);
      const text = C.toText(b.blocks) + `\nAssinado eletronicamente por ${d.nome} (${b.docTipo} ${C.maskDoc(d.doc)}) em ${assinadoEm}.\n` + assinatura;
      const hash = await C.sha256(text);
      const [servidor] = await Promise.all([conferir(d, b.pagamento, hash), loadLibs()]);
      if (servidor && servidor.status === 'divergente') { err.textContent = 'Os valores dos planos foram atualizados. Recarregue a página para assinar com os valores corretos.'; return; }
      if (servidor && servidor.status === 'invalido') { err.textContent = servidor.mensagem; if (servidor.voltar) go(2); return; }
      const pix = C.pixWebora(b.pagamento.agora, d.numero);
      state.signed = {
        v: 1, ...d,
        plano: { id: P.id, nome: P.nome, centavos: P.centavos, prazo: P.prazo, prazoMax: P.prazoMax },
        blocks: b.blocks, docTipo: b.docTipo, pagamento: b.pagamento,
        assinatura, assinadoEm, hash, codigo: hash.slice(0, 16).match(/.{4}/g).join('-'),
        pix, qr: qrCanvas(pix).toDataURL('image/png'),
        servidor: servidor && servidor.status === 'ok' ? { conferidoEm: servidor.conferidoEm, recibo: servidor.recibo } : null
      };
      store.set(SIGNED, state.signed);
      showDone();
      go(4);
      celebrate();
    } catch (ex) {
      err.textContent = 'Não foi possível concluir a assinatura. Verifique sua conexão e tente novamente.';
      console.error(ex);
    } finally { busy(btn, false); }
  });

  // recorta a assinatura para o PDF
  function trimSignature() {
    const w = pad.width, h = pad.height, data = pctx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const m = 12; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w, x1 + m); y1 = Math.min(h, y1 + m);
    const cw = x1 - x0, ch = y1 - y0, ratio = 70 / 26;
    const outC = document.createElement('canvas');
    const ow = Math.max(cw, ch * ratio), oh = ow / ratio;
    outC.width = Math.round(ow); outC.height = Math.round(oh);
    outC.getContext('2d').drawImage(pad, x0, y0, cw, ch, (ow - cw) / 2, (oh - ch) / 2, cw, ch);
    return outC.toDataURL('image/png');
  }

  function qrCanvas(text) {
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), cellSize = 8, quiet = 2, size = (n + quiet * 2) * cellSize;
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.fillStyle = '#080808';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect((c + quiet) * cellSize, (r + quiet) * cellSize, cellSize, cellSize);
    return cv;
  }

  function showDone() {
    const s = state.signed, P = s.plano;
    const curto = s.assinadoEm.replace(' (horário de Brasília)', '');
    out('numero', s.numero);
    out('data', s.assinadoEm);
    out('data-curta', curto);
    out('codigo', s.codigo);
    out('agora', C.brl(s.pagamento.agora));
    out('saldo', s.pagamento.depois ? `Entrada de 50%. O saldo de ${C.brl(s.pagamento.depois)} é pago na entrega.` : `Valor total do plano ${P.nome}.`);
    out('chave', W.pix.chaveFormatada);
    out('favorecido', `${W.responsavel} (${W.marca})`);
    out('prazo', `Em até ${C.dias(P.prazo)} após o pagamento e o material${P.prazoMax > P.prazo ? ` (até ${C.dias(P.prazoMax)} em alta demanda)` : ''}`);
    const v = $('[data-verify]', wiz);
    v.hidden = !s.servidor;
    if (s.servidor) $('[data-verify-text]', wiz).textContent = 'Valores conferidos pelo servidor da Webora' + (s.servidor.recibo ? ` · Recibo ${s.servidor.recibo}` : '');
    $('[data-out-input="pix"]', wiz).value = s.pix;
    const box = $('[data-qr]', wiz); box.replaceChildren();
    const img = new Image(); img.src = s.qr; img.alt = `QR Code Pix de ${C.brl(s.pagamento.agora)}`; box.append(img);
    $('[data-pdf-err]', wiz).textContent = '';
    const msg = [
      'Olá, Webora! Acabei de assinar o contrato pelo site.', '',
      `Contrato: ${s.numero}`,
      `Nome: ${s.nome}`,
      `${s.docTipo}: ${C.maskDoc(s.doc)}`,
      `Plano: ${P.nome} (${C.brl(P.centavos)})`,
      `Pagamento: ${s.pagamento.rotulo}`,
      `Valor a pagar agora: ${C.brl(s.pagamento.agora)}`,
      `Código de verificação: ${s.codigo}`,
      s.servidor && s.servidor.recibo ? `Recibo do servidor: ${s.servidor.recibo}` : null, '',
      'Vou enviar o comprovante do Pix e o PDF do contrato.'
    ].filter(l => l !== null).join('\n');
    $('[data-send]', wiz).href = wa(msg);
  }

  /* ---------- PDF, cópia do Pix e acompanhamento ---------- */
  const fileName = () => `Contrato-Webora-${state.signed.numero}.pdf`;
  $('[data-pdf]', wiz).addEventListener('click', async e => {
    const btn = e.currentTarget, errEl = $('[data-pdf-err]', wiz);
    errEl.textContent = '';
    busy(btn, true, 'Gerando PDF…');
    try {
      const [, logo] = await Promise.all([loadLibs(), loadLogo()]);
      const s = state.signed;
      const doc = C.pdf({ ...s, logo, servidor: s.servidor ? { ...s.servidor, conferidoEmTexto: C.dataHora(new Date(s.servidor.conferidoEm)) } : null });
      // no celular, oferece compartilhar o PDF direto (WhatsApp, e-mail…)
      const file = new File([doc.output('blob')], fileName(), { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
        try { await navigator.share({ files: [file], title: 'Contrato Webora', text: `Contrato ${s.numero} assinado.` }); return; } catch (ex) { if (ex.name === 'AbortError') return; }
      }
      doc.save(fileName());
    } catch (ex) {
      errEl.textContent = 'Não foi possível gerar o PDF. Verifique sua conexão e tente novamente.';
      console.error(ex);
    } finally { busy(btn, false); }
  });
  $('[data-copy]', wiz).addEventListener('click', async e => {
    const input = $('[data-out-input="pix"]', wiz), b = e.currentTarget, label = $('span', b);
    try { await navigator.clipboard.writeText(input.value); } catch (err) { input.select(); document.execCommand('copy'); }
    label.textContent = 'Copiado!'; setTimeout(() => { label.textContent = 'Copiar'; }, 1800);
  });

  function showResume() {
    const s = store.get(SIGNED), box = $('[data-resume]', wiz);
    const ok = s && s.v === 1 && s.numero && s.plano && s.pagamento && s.qr;
    box.hidden = !ok;
    if (ok) $('[data-resume-info]', wiz).textContent = `${s.numero} · ${s.plano.nome} · ${C.brl(s.pagamento.agora)} a pagar agora · assinado em ${s.assinadoEm.replace(' (horário de Brasília)', '')}`;
  }
  $('[data-resume-open]', wiz).addEventListener('click', () => { state.signed = store.get(SIGNED); showDone(); go(4); });
  $('[data-resume-clear]', wiz).addEventListener('click', () => { store.del(SIGNED); showResume(); });
  showResume();

  function restart(scroll = true) {
    state.numero = null; state.signed = null; clearPad();
    showResume();
    go(1, scroll);
  }
  $('[data-restart]', wiz).addEventListener('click', () => restart());

  /* ---------- confete ---------- */
  function celebrate() {
    if (reduce()) return;
    const cv = document.createElement('canvas'); cv.className = 'confetti';
    cv.setAttribute('aria-hidden', 'true');
    document.body.append(cv);
    const x = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
    const badge = $('.done__badge', wiz).getBoundingClientRect();
    const ox = badge.left + badge.width / 2, oy = badge.top + badge.height / 2;
    const cores = ['#0754FA', '#0754FA', '#FFFFFF', '#5C8DFF', '#080808'];
    const parts = Array.from({ length: 120 }, () => ({ x: ox, y: oy, vx: (Math.random() - .5) * 15, vy: Math.random() * -13 - 3, s: Math.random() * 7 + 3, r: Math.random() * 6, c: cores[Math.floor(Math.random() * cores.length)] }));
    const t0 = performance.now();
    (function tick(t) {
      const k = (t - t0) / 1700;
      x.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(p => { p.vy += .42; p.x += p.vx; p.y += p.vy; p.r += .1; x.save(); x.globalAlpha = Math.max(0, 1 - k); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
      if (k < 1) requestAnimationFrame(tick); else cv.remove();
    })(t0);
  }
})();
