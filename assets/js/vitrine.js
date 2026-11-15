(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(pointer: fine)');
  const spotlight = document.querySelector('[data-spotlight]');
  const rail = spotlight.querySelector('[data-project-tabs]');
  const tabs = Array.from(rail.querySelectorAll('[role="tab"]'));
  const slides = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const playButton = spotlight.querySelector('[data-slide-playback]');
  const duration = 9000;

  let index = 0;
  let auto = !reduce.matches;
  let visible = false;
  let hovering = false;
  let timer = null;
  let startedAt = 0;
  let remaining = duration;

  function stopClock() {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
  }

  function syncClock() {
    const canPlay = auto && visible && !document.hidden && !hovering && !spotlight.contains(document.activeElement);
    spotlight.toggleAttribute('data-rotating', canPlay);
    if (!canPlay) {
      stopClock();
      return;
    }
    if (timer !== null) return;
    startedAt = performance.now();
    timer = setTimeout(() => {
      timer = null;
      select(index + 1);
    }, remaining);
  }

  function setAuto(value) {
    auto = value;
    playButton.setAttribute('aria-label', auto ? 'Pausar carrossel' : 'Reproduzir carrossel');
    playButton.toggleAttribute('data-paused', !auto);
    syncClock();
  }

  function revealTab(tab) {
    const list = rail.getBoundingClientRect();
    const item = tab.getBoundingClientRect();
    if (item.left < list.left) rail.scrollLeft += item.left - list.left;
    if (item.right > list.right) rail.scrollLeft += item.right - list.right;
  }

  function select(next, focus = false) {
    const target = (next + tabs.length) % tabs.length;
    if (target !== index) {
      stopClock();
      remaining = duration;
      tabs[index].setAttribute('aria-selected', 'false');
      tabs[index].tabIndex = -1;
      slides[index].hidden = true;
      index = target;
      tabs[index].setAttribute('aria-selected', 'true');
      tabs[index].tabIndex = 0;
      slides[index].hidden = false;
    }
    revealTab(tabs[index]);
    if (focus) tabs[index].focus({ preventScroll: true });
    syncClock();
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i)));
  rail.addEventListener('keydown', event => {
    const offset = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (offset === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = offset !== undefined ? index + offset : event.key === 'Home' ? 0 : tabs.length - 1;
    select(next, true);
  });
  spotlight.querySelectorAll('[data-slide-step]').forEach(button => {
    button.addEventListener('click', () => select(index + Number(button.dataset.slideStep)));
  });
  playButton.addEventListener('click', () => setAuto(!auto));
  spotlight.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hovering = true;
    syncClock();
  });
  spotlight.addEventListener('pointerleave', () => {
    hovering = false;
    syncClock();
  });
  spotlight.addEventListener('focusin', syncClock);
  spotlight.addEventListener('focusout', () => requestAnimationFrame(syncClock));
  document.addEventListener('visibilitychange', syncClock);
  reduce.addEventListener('change', () => { if (reduce.matches) setAuto(false); });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncClock();
  }, { threshold: 0.15 }).observe(spotlight);

  spotlight.querySelector('[data-spotlight-navigation]').hidden = false;
  setAuto(auto);

  document.querySelectorAll('[data-show-project]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const item = slides.findIndex(slide => slide.id === link.dataset.showProject);
      if (item < 0) return;
      setAuto(false);
      select(item);
    });
  });

  // Menu responsivo de categorias.
  const header = document.querySelector('[data-site-header]');
  const menu = header.querySelector('[data-mega]');
  const scrim = header.querySelector('[data-menu-dismiss]');
  const mobileToggle = header.querySelector('[data-menu-toggle]');
  const menuButtons = Array.from(header.querySelectorAll('[data-menu-button]'));
  const categories = Array.from(header.querySelectorAll('[data-menu-switch]'));
  const menuPanels = Array.from(menu.querySelectorAll('[data-menu-panel]'));
  let openCategory = '';
  let opener = null;

  function openMenu(category) {
    openCategory = category;
    menu.hidden = false;
    scrim.hidden = false;
    mobileToggle.setAttribute('aria-expanded', 'true');
    mobileToggle.setAttribute('aria-label', 'Fechar menu');
    menuButtons.forEach(button => button.setAttribute('aria-expanded', String(button.dataset.menuButton === category)));
    categories.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.menuSwitch === category)));
    menuPanels.forEach(panel => { panel.hidden = panel.dataset.menuPanel !== category; });
  }

  function closeMenu(returnFocus = false) {
    if (!openCategory) return;
    openCategory = '';
    menu.hidden = true;
    scrim.hidden = true;
    mobileToggle.setAttribute('aria-expanded', 'false');
    mobileToggle.setAttribute('aria-label', 'Abrir menu');
    menuButtons.forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (returnFocus && opener) opener.focus();
    opener = null;
  }

  function toggleMenu(category, button, keyboard) {
    if (openCategory === category || (button === mobileToggle && openCategory)) {
      closeMenu(keyboard);
      return;
    }
    opener = button;
    openMenu(category);
    if (keyboard) categories.find(item => item.dataset.menuSwitch === category).focus();
  }

  menuButtons.forEach(button => button.addEventListener('click', event => toggleMenu(button.dataset.menuButton, button, event.detail === 0)));
  mobileToggle.addEventListener('click', event => toggleMenu('servicos', mobileToggle, event.detail === 0));
  categories.forEach(button => button.addEventListener('click', () => openMenu(button.dataset.menuSwitch)));
  header.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  scrim.addEventListener('click', () => closeMenu());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && openCategory) {
      event.preventDefault();
      closeMenu(true);
    }
  });
  header.addEventListener('focusout', () => {
    requestAnimationFrame(() => { if (!header.contains(document.activeElement)) closeMenu(); });
  });
  header.querySelector('[data-menu-primary]').hidden = false;
  mobileToggle.hidden = false;

  // Navegação horizontal dos cartões de projetos.
  const track = document.querySelector('[data-portfolio-track]');
  const cardButtons = document.querySelector('[data-portfolio-buttons]');
  const previous = cardButtons.querySelector('[data-portfolio-step="-1"]');
  const next = cardButtons.querySelector('[data-portfolio-step="1"]');
  const meter = document.querySelector('[data-portfolio-meter]');
  const thumb = meter.firstElementChild;

  function syncTrack() {
    const width = track.clientWidth;
    const total = track.scrollWidth;
    const scroll = track.scrollLeft;
    previous.disabled = scroll <= 2;
    next.disabled = scroll >= total - width - 2;
    meter.hidden = total - width < 3;
    thumb.style.width = (width * 100 / total) + '%';
    thumb.style.left = (scroll * 100 / total) + '%';
  }

  cardButtons.querySelectorAll('[data-portfolio-step]').forEach(button => {
    button.addEventListener('click', () => {
      const [first, second] = track.children;
      const distance = second.offsetLeft - first.offsetLeft;
      track.scrollBy({ left: Number(button.dataset.portfolioStep) * distance, behavior: reduce.matches ? 'instant' : 'smooth' });
    });
  });
  cardButtons.hidden = false;
  track.addEventListener('scroll', syncTrack, { passive: true });
  new ResizeObserver(syncTrack).observe(track);
  syncTrack();

  // Inclinação das molduras com o mouse.
  document.querySelectorAll('[data-scene]').forEach(scene => {
    scene.addEventListener('pointermove', event => {
      if (reduce.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
      const bounds = scene.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      scene.style.setProperty('--tilt-y', (x * 9).toFixed(1) + 'deg');
      scene.style.setProperty('--tilt-x', (-y * 6).toFixed(1) + 'deg');
    });
    scene.addEventListener('pointerleave', () => {
      scene.style.removeProperty('--tilt-y');
      scene.style.removeProperty('--tilt-x');
    });
  });
})();
