/* HiParcelo illustrative scroll animation. No tracking data or shipment state is used. */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * clamp(t);
  const progress = (v, a, b) => clamp((v - a) / (b - a));
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const fade = (v, a, b, c, d) => progress(v, a, b) * (1 - progress(v, c, d));
  const percent = v => (v * 100).toFixed(2) + '%';
  const px = v => v.toFixed(1) + 'px';
  const select = (root, selector) => root.querySelector(selector);
  const setScene = (element, opacity, active) => {
    if (!element) return;
    element.style.opacity = opacity.toFixed(3);
    element.setAttribute('aria-hidden', active ? 'false' : 'true');
  };
  function setup(section) {
    if (section.dataset.hpjMounted === 'true' || reduced.matches) return;
    const track = select(section, '[data-hpj-track]');
    const worlds = ['warehouse', 'flight', 'road', 'home'].map(name => select(section, '[data-hpj-world="' + name + '"]'));
    const chapters = [...section.querySelectorAll('[data-hpj-chapter]')];
    const counter = select(section, '[data-hpj-counter]');
    const fill = select(section, '[data-hpj-fill]');
    const sceneName = select(section, '[data-hpj-scene-name]');
    const warehouse = select(section, '.hpj-world__warehouse');
    const packageOut = select(section, '.hpj-world__package');
    const plane = select(section, '.hpj-flight__plane');
    const customs = select(section, '.hpj-flight__customs');
    const road = select(section, '.hpj-road__surface');
    const roadLines = select(section, '.hpj-road__lines');
    const truck = select(section, '.hpj-road__truck');
    const transferPackage = select(section, '.hpj-road__package');
    const house = select(section, '.hpj-home__house');
    const doorstep = select(section, '.hpj-home__box');
    const check = select(section, '.hpj-home__check');
    const arrival = select(section, '.hpj-home__delivered');
    if (!track || worlds.some(v => !v) || chapters.length !== 3) return;
    section.dataset.hpjMounted = 'true';
    section.classList.add('is-ready');
    let scheduled = false;
    let chapterIndex = -1;
    let frameProgress = -1;
    function render() {
      scheduled = false;
      if (!section.isConnected || reduced.matches) return;
      const rect = track.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const p = clamp(-rect.top / travel);
      if (p === frameProgress) return;
      frameProgress = p;
      if (fill) fill.style.width = percent(p);
      // Warehouse: pull out and zoom into the package before the flight reveal.
      const depart = smooth(progress(p, 0.045, 0.29));
      setScene(worlds[0], 1 - smooth(progress(p, 0.265, 0.35)), p < 0.325);
      warehouse.style.transform = 'translateY(' + px(mix(0, -70, depart)) + ') scale(' + mix(0.94, 1.24, depart).toFixed(3) + ')';
      packageOut.style.opacity = (fade(p, 0.075, 0.125, 0.282, 0.345)).toFixed(3);
      packageOut.style.transform = 'translate(' + px(mix(-45, 8, depart)) + ', ' + px(mix(55, -80, depart)) + ') scale(' + mix(0.30, 2.25, depart).toFixed(3) + ')';
      // Long-distance transit: camera pulls back; aircraft travels downward as the page scrolls.
      const fly = smooth(progress(p, 0.32, 0.63));
      setScene(worlds[1], fade(p, 0.27, 0.355, 0.617, 0.71), p >= 0.315 && p < 0.673);
      plane.style.transform = 'translateY(' + px(mix(-165, 142, fly)) + ') scale(' + mix(0.70, 1.10, fly).toFixed(3) + ') rotate(180deg)';
      customs.style.opacity = fade(p, 0.45, 0.49, 0.605, 0.68).toFixed(3);
      customs.style.transform = 'translateY(' + px(mix(18, 0, smooth(progress(p, 0.45, 0.53)))) + ')';
      // At the destination hub the package becomes visible then gets smaller as it loads into the local truck.
      const drive = smooth(progress(p, 0.66, 0.89));
      setScene(worlds[2], fade(p, 0.62, 0.71, 0.842, 0.915), p >= 0.68 && p < 0.895);
      transferPackage.style.opacity = fade(p, 0.625, 0.665, 0.73, 0.775).toFixed(3);
      transferPackage.style.transform = 'translateY(' + px(mix(-85, 23, smooth(progress(p, 0.62, 0.76)))) + ') scale(' + mix(1.25, 0.30, smooth(progress(p, 0.62, 0.76))).toFixed(3) + ')';
      truck.style.transform = 'translateY(' + px(mix(-155, 150, drive)) + ') scale(' + mix(0.85, 1.02, drive).toFixed(3) + ')';
      road.style.transform = 'translateY(' + px(mix(22, -14, drive)) + ')';
      roadLines.style.transform = 'translate(-50%, ' + px(mix(-100, 140, drive)) + ')';
      // Home: reveal the house and move the same box toward its entrance.
      const arrive = smooth(progress(p, 0.85, 1));
      setScene(worlds[3], smooth(progress(p, 0.83, 0.925)), p >= 0.88);
      house.style.transform = 'translateY(' + px(mix(36, -12, arrive)) + ') scale(' + mix(0.84, 1.04, arrive).toFixed(3) + ')';
      doorstep.style.opacity = progress(p, 0.897, 0.932).toFixed(3);
      doorstep.style.transform = 'translate(' + px(mix(-48, 0, arrive)) + ', ' + px(mix(40, 0, arrive)) + ') scale(' + mix(0.6, 0.9, arrive).toFixed(3) + ')';
      const done = smooth(progress(p, 0.951, 0.992));
      check.style.opacity = done.toFixed(3);
      check.style.transform = 'scale(' + mix(0.55, 1, done).toFixed(3) + ')';
      arrival.style.opacity = done.toFixed(3);
      arrival.style.transform = 'translate(-50%, ' + px(mix(18, 0, done)) + ')';
      // The three captions match the three proposed time windows; no realtime status data.
      const nextChapter = p < 0.336 ? 0 : p < 0.665 ? 1 : 2;
      if (nextChapter !== chapterIndex) {
        chapterIndex = nextChapter;
        if (counter) counter.textContent = String(chapterIndex + 1).padStart(2, '0') + ' / 03';
        if (sceneName) sceneName.textContent = ['DISPATCH', 'INTERNATIONAL TRANSIT', 'LOCAL DELIVERY'][chapterIndex];
      }
      chapters.forEach((chapter, index) => {
        let opacity = 0;
        if (index === 0) opacity = 1 - smooth(progress(p, 0.30, 0.37));
        else if (index === 1) opacity = smooth(progress(p, 0.30, 0.37)) * (1 - smooth(progress(p, 0.635, 0.71)));
        else opacity = smooth(progress(p, 0.635, 0.71));
        chapter.style.opacity = opacity.toFixed(3);
        chapter.style.transform = 'translateY(' + px(mix(13, 0, opacity)) + ')';
        chapter.setAttribute('aria-hidden', index === nextChapter ? 'false' : 'true');
      });
    }
    function requestRender() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(render);
    }
    window.addEventListener('scroll', requestRender, { passive: true });
    window.addEventListener('resize', requestRender, { passive: true });
    reduced.addEventListener?.('change', () => {
      if (reduced.matches) {
        section.classList.remove('is-ready');
        section.querySelectorAll('[aria-hidden]').forEach(element => {
          if (element.classList.contains('hpj-chapter')) element.removeAttribute('aria-hidden');
        });
      } else { section.classList.add('is-ready'); requestRender(); }
    });
    render();
  }
  function boot(root) {
    root.querySelectorAll('.hpj[data-hpj]').forEach(setup);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(document), { once: true });
  else boot(document);
  document.addEventListener('shopify:section:load', e => boot(e.target));
})();