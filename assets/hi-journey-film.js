export function createRenderer(video, sources, onReady, onError) {
  const events = new AbortController();
  const { signal } = events;
  const fps = 30, epsilon = .45 / fps;
  let disposed = false, loaded = false, settled = false, selected = '', progress = 0, seeks = 0, width = 1, height = 1, timeout, seekTimeout, requestedTime, rejectedTime;
  let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {});
  video.muted = true; video.defaultMuted = true; video.playsInline = true; video.preload = 'none';
  video.disablePictureInPicture = true; video.disableRemotePlayback = true;

  function targetTime() {
    const lastFrame = Math.max(0, Math.ceil(video.duration * fps) - 1);
    return Math.round(progress * lastFrame) / fps;
  }
  function seek() {
    if (disposed || !loaded || video.seeking || !Number.isFinite(video.duration)) return;
    const time = targetTime();
    if (time === rejectedTime) return;
    if (Math.abs(video.currentTime - time) > epsilon) {
      requestedTime = time; clearTimeout(seekTimeout); seekTimeout = setTimeout(() => fail(new Error('Journey film seeking timed out')), 12000);
      video.currentTime = time; seeks++;
    }
  }
  function fail(error) {
    if (disposed) return;
    clearTimeout(timeout); clearTimeout(seekTimeout);
    if (!settled) { settled = true; rejectReady(error); }
    else onError?.(error);
  }
  function chooseSource(mobile) {
    const options = mobile && sources.mobile?.length ? sources.mobile : sources.desktop;
    const supported = options?.filter(source => source.url && video.canPlayType(source.type || 'video/mp4'));
    if (!supported?.length) throw new Error('No compatible journey film');
    const desiredWidth = Math.min(mobile ? 1080 : 1920, width * Math.min(devicePixelRatio || 1, 1.5));
    const sorted = supported.slice().sort((a, b) => a.width - b.width);
    return sorted.find(source => source.width >= desiredWidth) || sorted.at(-1);
  }
  video.addEventListener('loadedmetadata', () => {
    if (disposed) return;
    if (!Number.isFinite(video.duration) || video.duration <= 0) { fail(new Error('Journey film duration is unavailable')); return; }
  }, { signal });
  video.addEventListener('loadeddata', () => {
    if (disposed) return;
    loaded = true; clearTimeout(timeout);
    if (!settled) { settled = true; resolveReady(); }
    seek(); onReady?.();
  }, { signal });
  video.addEventListener('seeked', () => {
    if (Math.abs(video.currentTime - requestedTime) > epsilon) rejectedTime = requestedTime;
    else { rejectedTime = undefined; clearTimeout(seekTimeout); }
    seek();
  }, { signal });
  video.addEventListener('progress', () => { rejectedTime = undefined; seek(); }, { signal });
  video.addEventListener('play', () => video.pause(), { signal });
  video.addEventListener('error', () => fail(new Error('Journey film could not be loaded')), { signal });

  return {
    ready,
    resize(nextWidth, nextHeight, dpr, mobile) {
      width = nextWidth; height = nextHeight;
      const source = chooseSource(mobile), url = new URL(source.url, document.baseURI).href;
      if (selected === url) return;
      selected = url; loaded = false; requestedTime = undefined; rejectedTime = undefined; clearTimeout(seekTimeout);
      clearTimeout(timeout); timeout = setTimeout(() => fail(new Error('Journey film load timed out')), 12000);
      video.pause(); video.preload = 'auto'; video.src = url; video.load();
    },
    render(state) { progress = Math.max(0, Math.min(1, state.p)); seek(); },
    stats() { return { mode: 'film', seeks, width, height, source: selected, paused: video.paused, seeking: video.seeking, currentTime: video.currentTime, targetTime: loaded ? targetTime() : 0, duration: Number.isFinite(video.duration) ? video.duration : 0, error: video.error?.code || 0 }; },
    dispose() {
      if (disposed) return;
      disposed = true; clearTimeout(timeout); clearTimeout(seekTimeout); events.abort(); video.pause(); video.removeAttribute('src'); video.load();
      if (!settled) { settled = true; rejectReady(new DOMException('Journey film disposed', 'AbortError')); }
    }
  };
}
