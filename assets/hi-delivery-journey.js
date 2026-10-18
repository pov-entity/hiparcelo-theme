(() => {
  'use strict';
  if (window.hiParceloJourneyMounted) return;
  window.hiParceloJourneyMounted = true;
  const mounted = new Map(), motion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = x => Math.max(0, Math.min(1, x));
  function init(section) {
    if (mounted.has(section)) return;
    const q = s => section.querySelector(s), track = q('[data-hpj-track]'), pin = q('.hpj-pin'), canvas = q('[data-hpj-canvas]'), video = q('[data-hpj-video]'), photos = q('[data-hpj-photos]'), media = video || canvas;
    if (!track || !pin || !media) return;
    const abort = new AbortController(), { signal } = abort;
    const copy = JSON.parse(q('[data-hpj-copy]').textContent);
    const title = q('[data-hpj-caption-title]'), body = q('[data-hpj-caption-body]'), caption = q('[data-hpj-caption]'), scene = q('[data-hpj-scene-name]'), counter = q('[data-hpj-counter]'), completed = q('[data-hpj-completion]');
    const stages = [...section.querySelectorAll('[data-hpj-stage]')], fills = stages.map(s => s.querySelector('[data-hpj-stage-fill]'));
    let renderer, model, frame = 0, measureFrame = 0, started = false, disposed = false, active = false, lastChapter = -1, lastStage = -1, failed = false;
    let start = 0, distance = 1, mobile = false, width = 1, height = 1, renderCount = 0, generation = 0;
    const stageLimits = [0, .20, .69, 1];
    function draw() {
      frame = 0;
      if (!renderer || !model || !active || motion.matches || disposed || document.hidden) return;
      const p = clamp((window.scrollY - start) / distance), s = model.evaluateJourney(p, mobile);
      renderer.render(s); renderCount++;
      section.dataset.hpjProgress = p.toFixed(6); section.dataset.hpjParent = s.parent;
      if (lastChapter !== s.chapter) {
        lastChapter = s.chapter; title.textContent = copy.titles[s.chapter]; body.textContent = copy.bodies[s.chapter]; scene.textContent = copy.scenes[s.chapter]; counter.textContent = `${String(s.chapter + 1).padStart(2, '0')} / 09`;
      }
      const a = model.chapters[s.chapter], b = model.chapters[s.chapter + 1] ?? 1.03;
      const fade = Math.min(model.span(p, a, a + .003) || (p < .003 ? 1 : 0), 1 - model.span(p, b - .003, b));
      caption.style.opacity = (.75 + .25 * fade).toFixed(4);
      if (lastStage !== s.stage) { lastStage = s.stage; stages.forEach((el, i) => { if (i === s.stage) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); }); }
      fills.forEach((fill, i) => { fill.style.transform = `scaleX(${clamp((p - stageLimits[i]) / (stageLimits[i + 1] - stageLimits[i])).toFixed(5)})`; });
      completed.style.opacity = s.complete.toFixed(4); completed.setAttribute('aria-hidden', s.complete > .5 ? 'false' : 'true');
      section.classList.toggle('is-complete', s.complete > .99);
    }
    function queue() { if (!frame && active && renderer && !motion.matches && !document.hidden) frame = requestAnimationFrame(draw); }
    function measure() {
      measureFrame = 0;
      if (disposed || motion.matches) return;
      const header = document.querySelector('.hi-header'), style = header && getComputedStyle(header);
      const headerSize = header && ['sticky', 'fixed'].includes(style.position) ? Math.min(header.getBoundingClientRect().height, innerHeight * .25) : 0;
      section.style.setProperty('--hpj-top', `${Math.round(headerSize)}px`);
      const bounds = media.getBoundingClientRect(); width = bounds.width; height = bounds.height; mobile = matchMedia('(max-width: 749px)').matches;
      start = track.getBoundingClientRect().top + window.scrollY - headerSize;
      distance = Math.max(1, track.offsetHeight - pin.offsetHeight);
      renderer?.resize(width, height, window.devicePixelRatio || 1, mobile); queue();
    }
    function scheduleMeasure() { if (!measureFrame && !disposed) measureFrame = requestAnimationFrame(measure); }
    function fallback() {
      failed = true; section.classList.add('is-static'); section.classList.remove('is-ready'); renderer?.dispose(); renderer = null; started = false; cancelAnimationFrame(frame); frame = 0;
    }
    async function begin() {
      if (started || motion.matches || failed || disposed) return;
      started = true;
      delete section.dataset.hpjError;
      const ticket = ++generation;
      try {
        const [world, timeline] = await Promise.all([import(video ? section.dataset.hpjFilmUrl : photos ? section.dataset.hpjPhotoUrl : section.dataset.hpjWorldUrl), import(section.dataset.hpjModelUrl)]);
        if (ticket !== generation || disposed || motion.matches) { if (ticket === generation) started = false; return; }
        model = timeline;
        const mediaError = error => { section.dataset.hpjError = error.message; fallback(); };
        renderer = video ? world.createRenderer(video, JSON.parse(q('[data-hpj-film-sources]').textContent), queue, mediaError) : photos ? world.createRenderer(canvas, JSON.parse(photos.textContent), queue, mediaError) : world.createRenderer(canvas, section.dataset.hpjTexture, queue, {color:section.dataset.hpjSurface,detail:section.dataset.hpjDetail});
        measure();
        if (video || photos) await renderer.ready;
        if (ticket !== generation || disposed || motion.matches) return;
        section.classList.add('is-ready'); section.classList.remove('is-static'); queue();
      } catch (error) { if (ticket !== generation || disposed || motion.matches) return; section.dataset.hpjError = error.message; fallback(); }
    }
    function motionChange() {
      if (motion.matches) { generation++; cancelAnimationFrame(frame); frame = 0; renderer?.dispose(); renderer = null; started = false; section.classList.remove('is-ready'); }
      else if (active) { failed = false; section.classList.remove('is-static'); begin(); scheduleMeasure(); }
    }
    const observer = new IntersectionObserver(entries => {
      active = entries.some(e => e.isIntersecting);
      if (active) { begin(); scheduleMeasure(); queue(); } else { cancelAnimationFrame(frame); frame = 0; }
    }, { rootMargin: '350px 0px' }); observer.observe(track);
    const resize = new ResizeObserver(scheduleMeasure); resize.observe(media); resize.observe(document.body);
    window.addEventListener('scroll', queue, { passive: true, signal });
    window.addEventListener('resize', scheduleMeasure, { passive: true, signal });
    window.addEventListener('pageshow', scheduleMeasure, { signal });
    window.addEventListener('load', scheduleMeasure, { once: true, signal });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { scheduleMeasure(); queue(); } }, { signal });
    motion.addEventListener('change', motionChange, { signal });
    canvas?.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); }, { signal });
    q('[data-hpj-skip]').addEventListener('click', event => {
      event.preventDefault(); const target = document.getElementById(`hpj-after-${section.id.replace('hi-delivery-journey-', '')}`);
      target?.scrollIntoView({ behavior: 'instant', block: 'start' }); target?.focus({ preventScroll: true });
    }, { signal });
    document.fonts?.ready.then(scheduleMeasure);
    section.hiJourney = { state: p => model?.evaluateJourney(p ?? clamp((scrollY - start) / distance), mobile), stats: () => ({ renderCount, ...renderer?.stats() }), measure: scheduleMeasure };
    mounted.set(section, () => { disposed = true; generation++; abort.abort(); observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(measureFrame); renderer?.dispose(); delete section.hiJourney; mounted.delete(section); });
    measure();
  }
  function boot(root) { if (root.matches?.('[data-hpj]')) init(root); root.querySelectorAll?.('[data-hpj]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(document), { once: true }); else boot(document);
  document.addEventListener('shopify:section:load', e => boot(e.target));
  document.addEventListener('shopify:section:unload', e => { for (const [section, dispose] of mounted) if (e.target === section || e.target.contains(section)) dispose(); });
})();
