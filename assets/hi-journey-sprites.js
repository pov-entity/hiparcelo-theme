// HiParcelo delivery: native-frame sprite renderer.
// Source sequence: 240 full-HD source frames at 24 FPS, 40 images, 6 frames each.
// Source frame size: 1280x720; sprite grid: 3 columns by 2 rows.
export function createRenderer(canvas, urls, onReady, onError) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx || !Array.isArray(urls) || urls.length !== 40) throw new Error('Delivery frames unavailable');
  const columns = 3, frameWidth = 1280, frameHeight = 720, perSheet = 6, frameCount = 240;
  const frames = new Map(), maxSheets = 3;
  let disposed = false, currentProgress = 0, pixelWidth = 0, pixelHeight = 0;
  let mobileMode = false, draws = 0, requested = 0, failures = 0;
  let resolved = false, readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  ready.catch(() => {});

  function load(index) {
    if (disposed || index < 0 || index >= urls.length) return;
    const existing = frames.get(index);
    if (existing) { existing.last = ++requested; return; }
    const record = { image: new Image(), state: 'loading', last: ++requested };
    frames.set(index, record);
    record.image.decoding = 'async';
    record.image.onload = () => {
      if (disposed) return;
      record.state = 'loaded';
      if (!resolved && index === 0) { resolved = true; readyResolve(); }
      trim();
      render();
      onReady && onReady();
    };
    record.image.onerror = () => {
      if (disposed) return;
      record.state = 'failed'; failures++;
      if (!resolved && index === 0) { resolved = true; readyReject(new Error('First delivery frame failed to load')); }
      else if (index === Math.floor(Math.round(currentProgress * (frameCount - 1)) / perSheet) && onError) onError(new Error('Delivery frame failed to load'));
    };
    record.image.src = urls[index];
  }

  function trim() {
    if (frames.size <= maxSheets) return;
    const current = Math.floor(Math.round(currentProgress * (frameCount - 1)) / perSheet);
    const obsolete = [...frames.entries()]
      .filter(([i, record]) => record.state !== 'loading' && i !== current)
      .sort((a,b) => a[1].last - b[1].last);
    for (const [i, record] of obsolete) {
      if (frames.size <= maxSheets) break;
      record.image.onload = null; record.image.onerror = null; frames.delete(i);
    }
  }

  function paint(index, image) {
    if (!pixelWidth || !pixelHeight || disposed) return;
    const x = (index % perSheet) % columns * frameWidth;
    const y = Math.floor((index % perSheet) / columns) * frameHeight;
    const w = pixelWidth, h = pixelHeight, sourceRatio = frameWidth / frameHeight;
    let dw = w, dh = h;
    if (mobileMode) {
      if (w / h > sourceRatio) dw = h * sourceRatio;
      else dh = w / sourceRatio;
    } else {
      if (w / h > sourceRatio) dh = w / sourceRatio;
      else dw = h * sourceRatio;
    }
    const dx = (w - dw) / 2, dy = (h - dh) / 2;
    ctx.fillStyle = '#0b1f3a'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(image, x, y, frameWidth, frameHeight, dx, dy, dw, dh);
    draws++;
  }

  function render() {
    if (disposed) return;
    const frame = Math.min(frameCount - 1, Math.max(0, Math.round(currentProgress * (frameCount - 1))));
    const sheet = Math.floor(frame / perSheet);
    const record = frames.get(sheet);
    if (record?.state === 'loaded') paint(frame, record.image);
    else load(sheet);
    // Preload the next most likely sheet without downloading all frames simultaneously.
    const neighbor = currentProgress < .99 ? Math.min(urls.length - 1, sheet + 1) : sheet - 1;
    load(neighbor);
    trim();
  }

  load(0);
  return {
    ready,
    resize(width, height, dpr, mobile) {
      mobileMode = !!mobile;
      const ratio = Math.max(1, Math.min(1.5, dpr || 1));
      pixelWidth = Math.max(1, Math.round(width * ratio));
      pixelHeight = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth; canvas.height = pixelHeight;
      }
      render();
    },
    render(state) {
      currentProgress = Math.min(1, Math.max(0, Number(state.p) || 0));
      render();
    },
    stats() {
      return { mode:'frame-sprites', sourceFrames:frameCount, sourceFPS:24, sheets:urls.length, cached:frames.size, failures, draws, frame:Math.round(currentProgress*(frameCount-1)) };
    },
    dispose() {
      disposed = true;
      frames.forEach(x => { x.image.onload = null; x.image.onerror = null; x.image.src = ''; });
      frames.clear();
      if (!resolved) { resolved = true; readyReject(new Error('Journey sequence disposed')); }
    }
  };
}
