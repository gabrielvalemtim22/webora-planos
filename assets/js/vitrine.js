(() => {
  'use strict';

  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById(menuToggle.getAttribute('aria-controls'));

  function toggleMenu(open) {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }

  menuToggle.hidden = false;
  menuToggle.addEventListener('click', () => toggleMenu(menuToggle.getAttribute('aria-expanded') === 'false'));
  menu.addEventListener('click', event => {
    if (event.target.closest('a')) toggleMenu(false);
  });
  menuToggle.closest('header').addEventListener('keydown', event => {
    if (event.key !== 'Escape' || menuToggle.getAttribute('aria-expanded') !== 'true') return;
    toggleMenu(false);
    menuToggle.focus();
  });

  const tabList = document.querySelector('[data-benefit-tabs]');
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));

  function selectBenefit(selected) {
    tabs.forEach((tab, index) => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[index].hidden = !active;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectBenefit(tab));
    tab.addEventListener('keydown', event => {
      const destination = {
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1
      }[event.key];
      if (!Number.isInteger(destination)) return;
      event.preventDefault();
      selectBenefit(tabs[destination]);
      tabs[destination].focus();
    });
  });

  selectBenefit(tabs[0]);
  tabList.hidden = false;

  const filters = document.querySelector('[data-project-filters]');
  const projects = [...document.querySelectorAll('[data-project]')];
  const count = document.querySelector('[data-project-count]');

  function filterProjects(filter) {
    filters.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    });
    projects.forEach(project => {
      project.hidden = filter !== 'todos' && project.dataset.category !== filter;
    });
    const visible = projects.filter(project => !project.hidden).length;
    count.textContent = visible === 1 ? '1 projeto exibido' : visible + ' projetos exibidos';
  }

  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (button) filterProjects(button.dataset.filter);
  });

  function revealLinkedProject(hash) {
    const project = projects.find(item => '#' + item.id === hash);
    if (!project?.hidden) return;
    filterProjects('todos');
    return project;
  }

  const projectLink = document.querySelector('[data-project-link]');
  projectLink.addEventListener('click', () => revealLinkedProject(projectLink.hash));
  addEventListener('hashchange', () => revealLinkedProject(location.hash)?.scrollIntoView({ block: 'start' }));
  filters.hidden = false;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-scene]').forEach(scene => {
    scene.addEventListener('pointermove', event => {
      if (reducedMotion.matches || event.pointerType !== 'mouse') return;
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
