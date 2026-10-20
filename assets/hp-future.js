/* Purposeful, low-cost effects. Reduced motion and no-JS display remain complete. */
(() => {
  'use strict';
  const doc = document.documentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerFine = window.matchMedia('(pointer: fine)');
  let revealObserver;
  let progressFrame = 0;
  let globalBound = false;

  function updateProgress() {
    progressFrame = 0;
    const root = document.scrollingElement || doc;
    const extent = Math.max(0, root.scrollHeight - window.innerHeight);
    doc.style.setProperty('--hp-scroll-progress', extent ? String(Math.min(1,Math.max(0,root.scrollTop / extent))) : '0');
    doc.classList.toggle('hp-scrolled', root.scrollTop > 28);
  }
  function requestProgress() {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  }

  function revealSections(root) {
    if (motion.matches || !('IntersectionObserver' in window)) return;
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('hp-in-view');
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin:'0px 0px -32px 0px', threshold:0.07 });
    }
    root.querySelectorAll('[data-hp-reveal]:not([data-hp-observed])').forEach(el => {
      el.setAttribute('data-hp-observed','');
      if (el.getBoundingClientRect().top < window.innerHeight * .9) el.classList.add('hp-in-view');
      revealObserver.observe(el);
    });
    doc.classList.add('hp-motion-ready');
  }

  function initStage(root) {
    if (motion.matches || !pointerFine.matches) return;
    root.querySelectorAll('[data-hp-stage]:not([data-hp-stage-ready])').forEach(stage => {
      stage.setAttribute('data-hp-stage-ready','');
      let raf = 0;
      stage.addEventListener('pointermove', event => {
        if (raf) return;
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
        const y = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
        raf = requestAnimationFrame(() => {
          stage.style.setProperty('--hp-shift-x', (x * 12).toFixed(1) + 'px');
          stage.style.setProperty('--hp-shift-y', (y * 12).toFixed(1) + 'px');
          raf = 0;
        });
      }, {passive:true});
      stage.addEventListener('pointerleave', () => {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        stage.style.setProperty('--hp-shift-x', '0px');
        stage.style.setProperty('--hp-shift-y', '0px');
      });
    });
  }

  function bindMenu() {
    document.addEventListener('pointerdown', event => {
      document.querySelectorAll('[data-hp-menu][open]').forEach(menu => {
        if (!menu.contains(event.target)) menu.open = false;
      });
    }, {passive:true});
  }
  function init(root = document) {
    revealSections(root);
    initStage(root);
    requestProgress();
    if (!globalBound) {
      globalBound = true;
      window.addEventListener('scroll',requestProgress,{passive:true});
      window.addEventListener('resize',requestProgress,{passive:true});
      bindMenu();
      motion.addEventListener('change',() => {
        if (motion.matches) {
          doc.classList.remove('hp-motion-ready');
          revealObserver?.disconnect();
          revealObserver = null;
          document.querySelectorAll('[data-hp-observed]').forEach(el => el.removeAttribute('data-hp-observed'));
        } else {
          revealSections(document);
        }
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(), {once:true});
  else init();
  document.addEventListener('shopify:section:load', event => init(event.target));
})();