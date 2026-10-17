/* Accessible vertical video feed. Never fetches or scrapes Instagram. */
(() => {
  const init = (root) => {
    if (root.dataset.hpSocialReady === 'true') return;
    root.dataset.hpSocialReady = 'true';
    const feed = root.querySelector('[data-hp-social-feed]');
    if (!feed) return;
    const slides = Array.from(feed.querySelectorAll('[data-hp-social-reel]'));
    const pos = root.querySelector('.hp-social__nav-position');
    const prev = root.querySelector('[data-hp-social-prev]');
    const next = root.querySelector('[data-hp-social-next]');
    if (!slides.length) return;
    let activeIndex = 0;
    let visible = !document.hidden;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function pauseOthers(keepIndex) {
      slides.forEach((slide, i) => {
        if (i === keepIndex) return;
        const video = slide.querySelector('video');
        if (video) video.pause();
      });
    }
    function updateVideoUI(slide) {
      const video = slide.querySelector('video');
      if (!video) return;
      const play = slide.querySelector('[data-hp-social-play]');
      const mute = slide.querySelector('[data-hp-social-mute]');
      if (play) {
        play.setAttribute('aria-pressed', String(!video.paused));
        play.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
        const symbol = play.querySelector('[data-hp-social-play-icon]');
        if (symbol) symbol.textContent = video.paused ? '▶' : 'Ⅱ';
      }
      if (mute) {
        mute.setAttribute('aria-pressed', String(!video.muted));
        mute.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
        const symbol = mute.querySelector('[data-hp-social-mute-icon]');
        if (symbol) symbol.textContent = video.muted ? '♪' : '♫';
      }
    }
    function setActive(index) {
      activeIndex = Math.max(0, Math.min(slides.length - 1, index));
      pauseOthers(activeIndex);
      if (pos) pos.textContent = String(activeIndex + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      if (prev) prev.disabled = activeIndex === 0;
      if (next) next.disabled = activeIndex === slides.length - 1;
      const current = slides[activeIndex];
      const video = current.querySelector('video');
      if (video && visible && !reducedMotion) {
        video.muted = true;
        const promise = video.play();
        if (promise && typeof promise.catch === 'function') promise.catch(() => updateVideoUI(current));
      }
      if (video) updateVideoUI(current);
    }
    function goTo(index) {
      const bounded = Math.max(0, Math.min(slides.length - 1, index));
      slides[bounded].scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'nearest', inline: 'nearest' });
      setActive(bounded);
    }
    slides.forEach((slide) => {
      const video = slide.querySelector('video');
      if (video) {
        video.muted = true;
        video.playsInline = true;
        const progress = slide.querySelector('[data-hp-social-progress]');
        video.addEventListener('timeupdate', () => {
          const pct = video.duration && Number.isFinite(video.duration) ? Math.round(100 * video.currentTime / video.duration) : 0;
          if (progress) {
            progress.setAttribute('aria-valuenow', String(pct));
            const bar = progress.querySelector('span');
            if (bar) bar.style.width = pct + '%';
          }
        });
        video.addEventListener('play', () => updateVideoUI(slide));
        video.addEventListener('pause', () => updateVideoUI(slide));
        const play = slide.querySelector('[data-hp-social-play]');
        if (play) play.addEventListener('click', () => {
          if (video.paused) {
            const promise = video.play();
            if (promise && typeof promise.catch === 'function') promise.catch(() => updateVideoUI(slide));
          } else video.pause();
        });
        const mute = slide.querySelector('[data-hp-social-mute]');
        if (mute) mute.addEventListener('click', () => { video.muted = !video.muted; updateVideoUI(slide); });
        updateVideoUI(slide);
      }
      const load = slide.querySelector('[data-hp-social-load]');
      if (load) load.addEventListener('click', () => {
        const box = slide.querySelector('[data-hp-social-instagram]');
        if (!box || box.dataset.loaded === 'true') return;
        let url;
        try { url = new URL(box.dataset.instagramUrl); } catch { return; }
        const match = url.pathname.match(/^\/(reel|p)\/([a-zA-Z0-9_-]+)\/?$/);
        if (url.protocol !== 'https:' || !['www.instagram.com', 'instagram.com'].includes(url.hostname) || !match) {
          load.textContent = 'Invalid Instagram URL';
          return;
        }
        const frame = document.createElement('iframe');
        frame.className = 'hp-social__iframe';
        frame.loading = 'eager';
        frame.title = 'Instagram Reel';
        frame.allow = 'autoplay; encrypted-media; picture-in-picture';
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        frame.src = 'https://www.instagram.com/' + match[1] + '/' + match[2] + '/embed/';
        box.appendChild(frame);
        box.dataset.loaded = 'true';
      });
    });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting || entry.intersectionRatio < .6) return;
          const index = slides.indexOf(entry.target);
          if (index !== -1) setActive(index);
        });
      }, { root: feed, threshold: [.6, .8] });
      slides.forEach(slide => observer.observe(slide));
    } else {
      feed.addEventListener('scroll', () => {
        const index = Math.round(feed.scrollTop / (feed.clientHeight || 1));
        if (index !== activeIndex) setActive(index);
      }, { passive: true });
    }
    if (prev) prev.addEventListener('click', () => goTo(activeIndex - 1));
    if (next) next.addEventListener('click', () => goTo(activeIndex + 1));
    feed.addEventListener('keydown', event => {
      if (event.target.closest('a,button,iframe')) return;
      if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); goTo(activeIndex + 1); }
      if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); goTo(activeIndex - 1); }
    });
    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden;
      if (!visible) pauseOthers(-1);
    });
    setActive(0);
  };
  const boot = (event) => {
    const scope = event && event.target ? event.target : document;
    if (scope.matches && scope.matches('[data-hp-social]')) init(scope);
    scope.querySelectorAll('[data-hp-social]').forEach(init);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
  else boot();
  document.addEventListener('shopify:section:load', boot);
})();
