(() => {
  'use strict';

  const switcher = document.querySelector('[data-project-tabs]');
  const tabs = Array.from(switcher.querySelectorAll('[role="tab"]'));
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

  function select(tab) {
    tabs.forEach((current, index) => {
      const active = current === tab;
      current.setAttribute('aria-selected', String(active));
      current.tabIndex = active ? 0 : -1;
      panels[index].hidden = !active;
    });
  }

  tabs.forEach(tab => tab.addEventListener('click', () => select(tab)));
  switcher.addEventListener('keydown', event => {
    const current = tabs.indexOf(event.target);
    if (current < 0) return;

    let next;
    switch (event.key) {
      case 'ArrowLeft':
        next = (current - 1 + tabs.length) % tabs.length;
        break;
      case 'ArrowRight':
        next = (current + 1) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    select(tabs[next]);
    tabs[next].focus();
  });
  switcher.hidden = false;

  const motion = matchMedia('(prefers-reduced-motion: no-preference) and (pointer: fine)');
  document.querySelectorAll('[data-scene]').forEach(scene => {
    scene.addEventListener('pointermove', event => {
      if (!motion.matches || event.pointerType !== 'mouse') return;
      const box = scene.getBoundingClientRect();
      const horizontal = (event.clientX - box.left) / box.width - 0.5;
      const vertical = (event.clientY - box.top) / box.height - 0.5;
      scene.style.setProperty('--tilt-y', (horizontal * 9).toFixed(1) + 'deg');
      scene.style.setProperty('--tilt-x', (-vertical * 6).toFixed(1) + 'deg');
    });
    scene.addEventListener('pointerleave', () => {
      scene.style.removeProperty('--tilt-y');
      scene.style.removeProperty('--tilt-x');
    });
  });
})();
