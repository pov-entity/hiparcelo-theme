/**
 * HiParcelo Delivery Journey v2.
 * Scrubbed (not timed) animation inspired by continuous freight-motion storytelling.
 * All visuals and durations are illustrative. No customer shipment data is used.
 */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const range = (p, a, b) => clamp((p - a) / (b - a));
  const smooth = v => {const t = clamp(v); return t * t * (3 - 2 * t)};
  const within = (p, a, b) => smooth(range(p, a, b));
  const mix = (a, b, k) => a + (b - a) * k;
  const pct = n => n.toFixed(3) + '%';
  const px = n => n.toFixed(2) + 'px';
  const alpha = n => clamp(n).toFixed(4);
  const show = (e, n) => {
    if (!e) return;
    const opacity = clamp(n);
    e.style.opacity = alpha(opacity);
    e.setAttribute('aria-hidden', opacity > .06 ? 'false' : 'true');
  };
  const linearPoint = (list, p) => {
    if (p <= list[0][0]) return list[0].slice(1);
    for (let i = 1; i < list.length; i++) {
      if (p <= list[i][0]) {
        const prev = list[i - 1], next = list[i];
        const k = smooth((p - prev[0]) / (next[0] - prev[0]));
        return prev.slice(1).map((x, j) => mix(x, next[j + 1], k));
      }
    }
    return list[list.length - 1].slice(1);
  };
  // [scroll %, centerX %, centerY %, relative zoom, visibility]
  // A single overlay maintains parcel identity between each vehicle and the home.
  const parcelPath = [
    [0.000, 50, 77, .12, 0],
    [0.082, 50, 77, .17, 0],
    [0.150, 50, 75, .30, 1],
    [0.230, 50, 53, 2.75, 1],
    [0.300, 50, 49, .20, 1],
    [0.327, 50, 49, .07, 0],
    [0.615, 50, 49, .07, 0],
    [0.659, 50, 49, 1.80, 1],
    [0.705, 50, 49, .52, 1],
    [0.741, 49, 49, .09, 0],
    [0.860, 65, 71, .09, 0],
    [0.899, 61, 72, .42, 1],
    [0.957, 52, 68, .27, 1],
    [1.000, 52, 68, .27, 1]
  ];
  function init(section) {
    if (!section || section.dataset.hpjMounted === 'v2') return;
    const q = sel => section.querySelector(sel);
    const track = q('[data-hpj-track]');
    const stage = q('.hpj-stage');
    const worlds = ['warehouse', 'flight', 'road', 'home'].map(key => q('[data-hpj-world="' + key + '"]'));
    const chapters = [...section.querySelectorAll('[data-hpj-chapter]')];
    const parcel = q('[data-hpj-parcel]');
    const warehouse = q('.hpj-world__warehouse');
    const plane = q('.hpj-flight__plane');
    const clouds = [q('.hpj-flight__cloud--a'), q('.hpj-flight__cloud--b')];
    const customs = q('.hpj-flight__customs');
    const road = q('[data-hpj-map]');
    const roadPath = q('[data-hpj-roadline]');
    const truck = q('.hpj-road__truck');
    const house = q('.hpj-home__house');
    const check = q('.hpj-home__check');
    const delivered = q('.hpj-home__delivered');
    const counter = q('[data-hpj-counter]');
    const sceneName = q('[data-hpj-scene-name]');
    const fill = q('[data-hpj-fill]');
    if (!track || !stage || !parcel || !roadPath || !truck || worlds.some(x => !x) || chapters.length !== 3) return;
    section.dataset.hpjMounted = 'v2';
    if (reduced.matches) return;
    section.classList.add('is-ready');
    let raf = 0, prev = -1, currentStep = -1, active = true;
    let w = 0, h = 0, pathLength = 0;
    function dimensions() {
      const bounds = stage.getBoundingClientRect();
      w = bounds.width;
      h = bounds.height;
      pathLength = roadPath.getTotalLength();
    }
    function draw() {
      raf = 0;
      if (!section.isConnected || reduced.matches) return;
      const rect = track.getBoundingClientRect();
      const length = Math.max(1, rect.height - innerHeight);
      const p = clamp(-rect.top / length);
      if (p === prev) return;
      prev = p;
      if (fill) fill.style.width = pct(p * 100);

      // Warehouse pull-in: the warehouse recedes while the parcel grows to fill frame.
      const departure = within(p, .045, .235);
      warehouse.style.transform = 'translate3d(0,' + px(mix(0, -65, departure)) + ',0) scale(' + mix(.93, 1.22, departure).toFixed(4) + ')';
      show(worlds[0], 1 - within(p, .245, .324));

      // The aircraft enters at exactly the parcel's center during the pullback.
      // A matched-position transfer replaces an abrupt full-scene crossfade.
      const airborne = within(p, .316, .598);
      const planeScale = p < .338 ? mix(.20, .76, within(p, .267, .34)) : mix(.76, 1.06, airborne);
      const planeY = mix(-95, 151, airborne) + mix(0, 76, within(p, .602, .682));
      plane.style.transform = 'translate3d(0,' + px(planeY) + ',0) rotate(180deg) scale(' + planeScale.toFixed(4) + ')';
      show(worlds[1], within(p, .264, .325) * (1 - within(p, .622, .703)));
      if (clouds[0]) clouds[0].style.transform = 'translateY(' + px(mix(-35, 46, airborne)) + ')';
      if (clouds[1]) clouds[1].style.transform = 'translateY(' + px(mix(42, -55, airborne)) + ')';
      if (customs) {
        show(customs, within(p, .462, .49) * (1 - within(p, .603, .64)));
        customs.style.transform = 'translateY(' + px(mix(15, 0, within(p, .462, .54))) + ')';
      }

      // Local route and vehicle are part of one scene. The truck follows the same
      // road through its right-hand turn instead of jumping into another camera.
      const roadOpacity = within(p, .633, .714) * (1 - within(p, .871, .935));
      show(worlds[2], roadOpacity);
      const travel = within(p, .683, .917);
      const travelDist = mix(pathLength * .17, pathLength * .88, travel);
      const at = roadPath.getPointAtLength(travelDist);
      const before = roadPath.getPointAtLength(Math.max(0, travelDist - 6));
      const after = roadPath.getPointAtLength(Math.min(pathLength, travelDist + 6));
      const x = at.x / 1000 * w, y = at.y / 1000 * h;
      const angle = Math.atan2((after.y - before.y) * h, (after.x - before.x) * w) * 180 / Math.PI - 90;
      truck.style.transform = 'translate3d(' + px(x) + ',' + px(y) + ',0) translate(-50%,-50%) rotate(' + angle.toFixed(3) + 'deg) scale(' + mix(.76, .93, travel).toFixed(3) + ')';
      // Slight moving camera sells progress while the truck stays anchored to the route.
      road.style.transform = 'translateY(' + px(mix(13, -24, travel)) + ')';

      // Home enters underneath the moving truck; the shared parcel takes over at
      // the driveway and travels to the front door without changing artwork.
      const homeReveal = within(p, .856, .932);
      show(worlds[3], homeReveal);
      house.style.transform = 'translate3d(0,' + px(mix(18, -8, homeReveal)) + ',0) scale(' + mix(.84, 1.00, homeReveal).toFixed(3) + ')';
      const done = within(p, .948, .994);
      show(check, done);
      check.style.transform = 'scale(' + mix(.58, 1, done).toFixed(3) + ')';
      show(delivered, done);
      delivered.style.transform = 'translate(-50%,' + px(mix(15, 0, done)) + ')';

      // Cross-vehicle parcel pose, computed from a single timeline and one DOM
      // element. Never create a new package object in the middle of a handoff.
      const [bx, by, scale, visibility] = linearPoint(parcelPath, p);
      parcel.style.left = pct(bx);
      parcel.style.top = pct(by);
      parcel.style.transform = 'translate3d(-50%,-50%,0) scale(' + scale.toFixed(4) + ')';
      parcel.style.opacity = alpha(visibility);

      const step = p < .332 ? 0 : p < .674 ? 1 : 2;
      if (step !== currentStep) {
        currentStep = step;
        if (counter) counter.textContent = String(step + 1).padStart(2, '0') + ' / 03';
      }
      if (sceneName) {
        sceneName.textContent = p >= .935 ? 'AT THE DOOR' : p >= .695 ? 'ON THE ROAD' : p >= .60 ? 'LOCAL TRANSFER' : p >= .36 ? 'IN FLIGHT' : p >= .24 ? 'AIRCRAFT LOADING' : 'WAREHOUSE';
      }
      chapters.forEach((node, i) => {
        const a = i === 0 ? 1 - within(p, .294, .37)
          : i === 1 ? within(p, .294, .37) * (1 - within(p, .635, .711))
          : within(p, .635, .711);
        node.style.opacity = alpha(a);
        node.style.transform = 'translateY(' + px(mix(15, 0, a)) + ')';
        node.setAttribute('aria-hidden', i === step ? 'false' : 'true');
      });
    }
    function queue() {
      if (raf || !active || reduced.matches) return;
      raf = requestAnimationFrame(draw);
    }
    function resize() { dimensions(); prev = -1; queue(); }
    dimensions();
    window.addEventListener('scroll', queue, {passive:true});
    window.addEventListener('resize', resize, {passive:true});
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        active = entries.some(entry => entry.isIntersecting);
        if (active) {prev = -1; queue();}
      }, {rootMargin:'300px 0px'});
      observer.observe(track);
    }
    reduced.addEventListener?.('change', e => {
      section.classList.toggle('is-ready', !e.matches);
      if (!e.matches) {dimensions(); prev = -1; queue();}
    });
    draw();
  }
  function boot(root) {
    if (root.matches?.('[data-hpj]')) init(root);
    root.querySelectorAll?.('[data-hpj]').forEach(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(document), {once:true});
  else boot(document);
  document.addEventListener('shopify:section:load', e => boot(e.target));
})();
