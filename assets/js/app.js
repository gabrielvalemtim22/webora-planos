/* Webora — página de projetos, planos e contratação */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const W = window.WEBORA, PLANOS = window.PLANOS, C = window.Contrato;
  const LISTA = Object.values(PLANOS), PROJETOS = window.PROJETOS || [];
  const TOP = (LISTA.find(P => P.destaque) || LISTA[0]).id;
  const wa = (text, num = W.whatsapp) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  requestAnimationFrame(() => root.classList.add('is-ready'));
  $$('[data-wa]').forEach(a => { a.href = wa(a.dataset.wa); });
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- header e menu do celular ---------- */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 20);
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
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', e => { if (!header.contains(e.target)) setMenu(false); });

  /* ---------- números do topo ---------- */
  const prazos = LISTA.map(P => P.prazo), prazoMin = Math.min(...prazos), prazoMax = Math.max(...LISTA.map(P => P.prazoMax || P.prazo));
  $$('[data-stat="projetos"]').forEach(el => { el.textContent = PROJETOS.length; });
  $$('[data-stat="prazo"]').forEach(el => { el.textContent = (Math.max(...prazos) > prazoMin ? 'a partir de ' : '') + C.dias(prazoMin); });
  $$('[data-stat="prazo-max"]').forEach(el => { el.textContent = C.dias(prazoMax); });
  $$('[data-prazo-extra]').forEach(el => { el.hidden = prazoMax <= prazoMin; });

  /* ---------- projetos ---------- */
  const browser = (p, eager) => `<figure class="browser">
        <div class="browser__bar"><i></i><i></i><i></i><span class="browser__url">${p.dominio}</span></div>
        <img src="${p.imagem}" alt="Página inicial do site ${p.nome}" width="1280" height="800"${eager ? '' : ' loading="lazy"'}>
      </figure>`;
  $('[data-work]').innerHTML = PROJETOS.map((p, i) => {
    const P = PLANOS[p.plano], feature = i === 0;
    return `<article class="case${feature ? ' case--feature' : ''}" data-reveal${feature ? '' : ` style="--d:${((i - 1) % 2) * .08}s"`}>
      <a class="case__media" href="${p.url}" target="_blank" rel="noopener" aria-label="Abrir o site ${p.nome} em nova aba">
        ${browser(p)}
        ${feature && p.imagemCelular ? `<figure class="phone"><img src="${p.imagemCelular}" alt="" width="450" height="900" loading="lazy"></figure>` : ''}
      </a>
      <div class="case__body">
        <p class="case__tag">${p.tipo}</p>
        <h3 class="case__name">${p.nome}</h3>
        <p class="case__seg">${p.segmento}</p>
        <p class="case__desc">${p.descricao}</p>
        <ul class="case__feats">${p.recursos.map(r => `<li>${r}</li>`).join('')}</ul>
        <div class="case__foot">
          <a class="case__link" href="${p.url}" target="_blank" rel="noopener">Ver site no ar <svg class="i"><use href="#i-ext"/></svg></a>
          ${P ? `<a class="case__plan" href="#planos" data-choose="${P.id}">Plano indicado: <b>${P.nome}</b></a>` : ''}
        </div>
      </div>
    </article>`;
  }).join('');

  /* ---------- planos, comparação e opções do assistente ---------- */
  $('[data-plans]').innerHTML = LISTA.map((P, i) => {
    const [int, dec] = P.valor.toFixed(2).split('.');
    const top = P.id === TOP;
    return `<article class="plan${top ? ' plan--top' : ''}" data-reveal style="--d:${i * .08}s">
      <span class="plan__badge">${P.selo}</span>
      <h3 class="plan__name">${P.nome}</h3>
      <p class="plan__tagline">${P.chamada}</p>
      <p class="plan__price"><small>R$</small><b>${Number(int).toLocaleString('pt-BR')}</b>${dec !== '00' ? `<sup>,${dec}</sup>` : ''}</p>
      <p class="plan__terms">Pagamento único · Pix à vista ou 50% + 50%</p>
      <a class="btn ${top ? 'btn--white' : 'btn--dark'} btn--lg" href="#contratar" data-choose="${P.id}">Escolher ${P.artigo} ${P.nome}</a>
      <ul class="plan__list">${P.destaques.map(d => /:$/.test(d) ? `<li class="is-head">${d}</li>` : `<li><svg class="i"><use href="#i-check"/></svg>${d}</li>`).join('')}</ul>
      <dl class="plan__meta">
        <div><dt>Entrega</dt><dd>${C.dias(P.prazo)}</dd></div>
        <div><dt>Revisões</dt><dd>${P.revisoes} rodadas</dd></div>
        <div><dt>Suporte</dt><dd>${P.suporte} dias</dd></div>
      </dl>
      <p class="plan__ideal"><b>Ideal para:</b> ${P.ideal}.</p>
    </article>`;
  }).join('');

  const cell = v => v === true ? '<span class="yes" aria-label="Incluído"><svg class="i"><use href="#i-check"/></svg></span>'
    : v === false ? '<span class="no" aria-label="Não incluído"><svg class="i"><use href="#i-x"/></svg></span>' : v;
  const topCls = i => (LISTA[i] && LISTA[i].id === TOP ? ' class="is-top"' : '');
  $('[data-compare-head]').innerHTML = `<tr><th scope="col">Recurso</th>${LISTA.map((P, i) => `<th scope="col"${topCls(i)}>${P.nome}<small>${C.brl(P.valor)}</small></th>`).join('')}</tr>`;
  $('[data-compare]').innerHTML = window.COMPARATIVO.map(([item, ...vals]) => `<tr><th scope="row">${item}</th>${vals.map((v, i) => `<td${topCls(i)}>${cell(v)}</td>`).join('')}</tr>`).join('');

  $('[data-pick]').innerHTML = LISTA.map(P => `<label class="pick__opt">
      <input type="radio" name="plano" value="${P.id}"${P.id === TOP ? ' checked' : ''}>
      <span class="pick__card"><b>${P.nome}</b><em>${C.brl(P.valor)}</em><small>${P.chamada}</small></span>
    </label>`).join('');

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('[data-reveal]').forEach(el => io.observe(el));

  /* ---------- FAQ: só um aberto por vez ---------- */
  $$('.faq__list details').forEach(d => d.addEventListener('toggle', () => { if (d.open) $$('.faq__list details').forEach(o => { if (o !== d) o.open = false; }); }));

  /* =========================================================
     Assistente de contratação
     ========================================================= */
  const wiz = $('[data-wizard]');
  const panels = $$('.panel', wiz);
  const inds = $$('.wizard__steps li', wiz);
  const form = $('#dados');
  const fields = ['nome', 'doc', 'tel', 'email', 'cidade', 'empresa', 'dominio', 'endereco', 'obs'];
  const state = { step: 1, numero: null, data: null, built: null, signed: null };
  const DRAFT = 'webora-rascunho';

  const plano = () => $('input[name="plano"]:checked', wiz).value;
  const pagamento = () => $('input[name="pagamento"]:checked', wiz).value;

  function updatePlanUI() {
    const P = PLANOS[plano()];
    const av = C.condicoes(P, 'avista'), pc = C.condicoes(P, 'parcelado');
    $('[data-pay="avista"]', wiz).textContent = `${C.brl(av.agora)} no Pix`;
    $('[data-pay="parcelado"]', wiz).textContent = `${C.brl(pc.agora)} agora + ${C.brl(pc.depois)} na entrega`;
    $('[data-total]', wiz).textContent = C.brl(P.valor);
  }

  function go(n, scroll = true) {
    state.step = n;
    panels.forEach(p => p.classList.toggle('is-active', +p.dataset.step === n));
    inds.forEach(li => { const i = +li.dataset.ind; li.classList.toggle('is-active', i === n); li.classList.toggle('is-done', i < n); });
    if (scroll) { const top = wiz.getBoundingClientRect().top + scrollY - 90; scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' }); }
    if (n === 3) requestAnimationFrame(sizePad);
  }

  // escolher plano pelos cards (planos e projetos)
  $$('[data-choose]').forEach(a => a.addEventListener('click', () => {
    $(`input[name="plano"][value="${a.dataset.choose}"]`, wiz).checked = true;
    updatePlanUI(); saveDraft();
    if (state.step === 4) restart(false);
    go(1, false);
  }));
  $$('input[name="plano"], input[name="pagamento"]', wiz).forEach(r => r.addEventListener('change', () => { updatePlanUI(); saveDraft(); state.numero = null; }));
  $$('[data-next]', wiz).forEach(b => b.addEventListener('click', () => go(state.step + 1)));
  $$('[data-prev]', wiz).forEach(b => b.addEventListener('click', () => go(state.step - 1)));

  /* ---------- rascunho ---------- */
  function saveDraft() {
    const d = { plano: plano(), pagamento: pagamento() };
    fields.forEach(f => { d[f] = form.elements[f].value; });
    store.set(DRAFT, d);
  }
  (function loadDraft() {
    const d = store.get(DRAFT); if (!d) return;
    if (d.plano && PLANOS[d.plano]) $(`input[name="plano"][value="${d.plano}"]`, wiz).checked = true;
    if (d.pagamento) { const r = $(`input[name="pagamento"][value="${d.pagamento}"]`, wiz); if (r) r.checked = true; }
    fields.forEach(f => { if (typeof d[f] === 'string') form.elements[f].value = d[f]; });
  })();
  updatePlanUI();

  /* ---------- máscaras e validação ---------- */
  form.elements.doc.addEventListener('input', e => { e.target.value = C.maskDoc(e.target.value); });
  form.elements.tel.addEventListener('input', e => { e.target.value = C.maskPhone(e.target.value); });
  form.addEventListener('input', e => { const f = e.target.closest('.field'); if (f) { f.classList.remove('is-invalid'); const s = $('.field__err', f); if (s) s.textContent = ''; } saveDraft(); });

  const rules = {
    nome: v => v.trim().split(/\s+/).length >= 2 && v.trim().length >= 5 ? '' : 'Informe seu nome completo.',
    doc: v => { const n = C.digits(v).length; return n === 11 ? (C.validCPF(v) ? '' : 'CPF inválido.') : n === 14 ? (C.validCNPJ(v) ? '' : 'CNPJ inválido.') : 'Informe um CPF ou CNPJ.'; },
    tel: v => C.digits(v).length >= 10 ? '' : 'Informe um WhatsApp com DDD.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Informe um e-mail válido.',
    cidade: v => v.trim().length >= 3 ? '' : 'Informe sua cidade e estado.'
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    let first = null;
    Object.entries(rules).forEach(([k, fn]) => {
      const input = form.elements[k], msg = fn(input.value), f = input.closest('.field');
      f.classList.toggle('is-invalid', !!msg); $('.field__err', f).textContent = msg;
      if (msg && !first) first = input;
    });
    if (first) { first.focus(); return; }
    buildContract();
    go(3);
  });

  /* ---------- contrato ---------- */
  function collect() {
    const d = { plano: plano(), pagamento: pagamento() };
    fields.forEach(f => { d[f] = form.elements[f].value.trim(); });
    d.email = d.email.toLowerCase();
    return d;
  }
  function buildContract() {
    const now = new Date();
    if (!state.numero) state.numero = C.numeroContrato(now);
    const d = Object.assign(collect(), { numero: state.numero, dataLonga: C.dataLonga(now) });
    state.data = d;
    state.built = C.build(d);
    C.renderHTML($('[data-paper]', wiz), state.built.blocks);
    $('[data-paper]', wiz).scrollTop = 0;
    $('[data-sign-name]', wiz).textContent = `${d.nome} · ${state.built.docTipo} ${C.maskDoc(d.doc)}`;
    $$('[data-agree]', wiz).forEach(c => { c.checked = false; });
    $('.sign__err', wiz).textContent = '';
    clearPad();
  }

  /* ---------- assinatura ---------- */
  const pad = $('[data-pad]', wiz), pctx = pad.getContext('2d');
  let ink = 0, drawing = false, last = null;
  function sizePad() {
    const r = pad.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.max(1, Math.min(3, devicePixelRatio || 1));
    const keep = ink ? pad.toDataURL() : null;
    pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr);
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.lineCap = 'round'; pctx.lineJoin = 'round'; pctx.strokeStyle = '#10204a'; pctx.lineWidth = 2.6;
    if (keep) { const i = new Image(); i.onload = () => pctx.drawImage(i, 0, 0, r.width, r.height); i.src = keep; }
  }
  function clearPad() { pctx.clearRect(0, 0, pad.width, pad.height); ink = 0; }
  const pos = e => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); drawing = true; try { pad.setPointerCapture(e.pointerId); } catch (err) {} last = pos(e); pctx.beginPath(); pctx.arc(last.x, last.y, 1.2, 0, 7); pctx.fillStyle = '#10204a'; pctx.fill(); });
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

  /* ---------- assinar ---------- */
  $('[data-sign]', wiz).addEventListener('click', async () => {
    const err = $('.sign__err', wiz);
    if (!$$('[data-agree]', wiz).every(c => c.checked)) { err.textContent = 'Marque as duas confirmações para assinar.'; return; }
    if (ink < 60) { err.textContent = 'Faça sua assinatura no quadro branco.'; return; }
    const btn = $('[data-sign]', wiz); btn.disabled = true;
    try {
      const d = state.data, b = state.built;
      const assinatura = trimSignature();
      const assinadoEm = C.dataHora(new Date());
      const text = C.toText(b.blocks) + `\nAssinado eletronicamente por ${d.nome} (${b.docTipo} ${C.maskDoc(d.doc)}) em ${assinadoEm}.\n` + assinatura;
      const hash = await C.sha256(text);
      const codigo = hash.slice(0, 16).match(/.{4}/g).join('-');
      const pix = C.pixPayload({ chave: W.pix.chave, nome: W.pix.nome, cidade: W.pix.cidade, valor: b.pagamento.agora, txid: d.numero });
      const qr = qrCanvas(pix);
      state.signed = { ...d, blocks: b.blocks, docTipo: b.docTipo, pagamento: b.pagamento, plano: b.plano, assinatura, assinadoEm, hash, codigo, pix, qr: qr.toDataURL('image/png') };
      showDone(qr);
      go(4);
      celebrate();
    } catch (e) {
      err.textContent = 'Não foi possível assinar. Atualize a página e tente novamente.';
      console.error(e);
    } finally { btn.disabled = false; }
  });

  // recorta a assinatura para o PDF
  function trimSignature() {
    const w = pad.width, h = pad.height, data = pctx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const m = 12; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w, x1 + m); y1 = Math.min(h, y1 + m);
    const cw = x1 - x0, ch = y1 - y0, ratio = 70 / 26;
    const out = document.createElement('canvas');
    const ow = Math.max(cw, ch * ratio), oh = ow / ratio;
    out.width = Math.round(ow); out.height = Math.round(oh);
    out.getContext('2d').drawImage(pad, x0, y0, cw, ch, (ow - cw) / 2, (oh - ch) / 2, cw, ch);
    return out.toDataURL('image/png');
  }

  function qrCanvas(text) {
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), cell = 8, size = n * cell;
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.fillStyle = '#050505';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect(c * cell, r * cell, cell, cell);
    return cv;
  }

  function showDone(qr) {
    const s = state.signed;
    const out = (k, v) => $$(`[data-out="${k}"]`, wiz).forEach(el => { el.textContent = v; });
    out('numero', s.numero);
    out('data', s.assinadoEm);
    out('codigo', s.codigo);
    out('agora', C.brl(s.pagamento.agora));
    out('saldo', s.pagamento.depois ? `Entrada de 50%. O saldo de ${C.brl(s.pagamento.depois)} é pago na entrega.` : `Valor total do plano ${s.plano.nome}.`);
    out('chave', W.pix.chaveFormatada);
    out('favorecido', `${W.responsavel} (${W.marca})`);
    $('[data-out-input="pix"]', wiz).value = s.pix;
    const box = $('[data-qr]', wiz); box.replaceChildren();
    const img = new Image(); img.src = s.qr; img.alt = `QR Code Pix de ${C.brl(s.pagamento.agora)}`; box.append(img);
    const msg = [
      'Olá, Webora! Acabei de assinar o contrato pelo site.', '',
      `Contrato: ${s.numero}`,
      `Nome: ${s.nome}`,
      `${s.docTipo}: ${C.maskDoc(s.doc)}`,
      `Plano: ${s.plano.nome} (${C.brl(s.plano.valor)})`,
      `Pagamento: ${s.pagamento.rotulo}`,
      `Valor pago agora: ${C.brl(s.pagamento.agora)}`,
      `Código de verificação: ${s.codigo}`, '',
      'Vou enviar o comprovante do Pix e o PDF do contrato.'
    ].join('\n');
    $('[data-send]', wiz).href = wa(msg);
    store.set('webora-ultimo-contrato', { numero: s.numero, plano: s.plano.id, codigo: s.codigo, assinadoEm: s.assinadoEm });
  }

  function makePDF() { return C.pdf(state.signed); }
  const fileName = () => `Contrato-Webora-${state.signed.numero}.pdf`;
  $('[data-pdf]', wiz).addEventListener('click', async () => {
    const doc = makePDF();
    // no celular, oferece compartilhar o PDF direto (WhatsApp, e-mail…)
    const file = new File([doc.output('blob')], fileName(), { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ files: [file], title: 'Contrato Webora', text: `Contrato ${state.signed.numero} assinado.` }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    doc.save(fileName());
  });
  $('[data-copy]', wiz).addEventListener('click', async e => {
    const input = $('[data-out-input="pix"]', wiz), b = e.currentTarget;
    try { await navigator.clipboard.writeText(input.value); } catch (err) { input.select(); document.execCommand('copy'); }
    const old = b.innerHTML; b.textContent = 'Copiado!'; setTimeout(() => { b.innerHTML = old; }, 1800);
  });

  function restart(scroll = true) {
    state.numero = null; state.signed = null; clearPad();
    go(1, scroll);
  }
  $('[data-restart]', wiz).addEventListener('click', () => restart());

  /* ---------- confete ---------- */
  function celebrate() {
    if (reduce) return;
    const cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200';
    document.body.append(cv);
    const x = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
    const badge = $('.done__badge', wiz).getBoundingClientRect();
    const ox = badge.left + badge.width / 2, oy = badge.top + badge.height / 2;
    const parts = Array.from({ length: 110 }, () => ({ x: ox, y: oy, vx: (Math.random() - .5) * 14, vy: Math.random() * -13 - 3, s: Math.random() * 7 + 3, r: Math.random() * 6, c: Math.random() < .6 ? '#2F6BFF' : '#ffffff' }));
    const t0 = performance.now();
    (function tick(t) {
      const k = (t - t0) / 1600;
      x.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(p => { p.vy += .42; p.x += p.vx; p.y += p.vy; p.r += .1; x.save(); x.globalAlpha = Math.max(0, 1 - k); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
      if (k < 1) requestAnimationFrame(tick); else cv.remove();
    })(t0);
  }
})();
