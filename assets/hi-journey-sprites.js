// HiParcelo: smooth, full-HD scroll-driven delivery frames.
// Native source: 1280 x 720, 240 frames at 24 FPS.
// Delivery: 40 Shopify-hosted WebP sheets, each containing 3 x 2 native-resolution frames.
// Only nearby sheets are decoded. Original source detail is preserved.
export function createRenderer(canvas, urls, onReady, onError) {
  'use strict';
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx || !Array.isArray(urls) || urls.length !== 40) throw new Error('Delivery frame sequence unavailable');

  const sourceWidth = 1280, sourceHeight = 720, columns = 3;
  const framesPerSheet = 6, frameCount = 240, sheetCount = urls.length;
  const clamp = value => Math.max(0, Math.min(1, value));
  const sheets = new Map();
  const pending = new Map();
  let disposed = false, mobile = false, settled = false, readyResolve, readyReject;
  let target = 0, visual = 0, lastStamp = 0, tickId = 0;
  let inFlight = 0, serial = 0, direction = 1;
  let canvasWidth = 0, canvasHeight = 0, paintKey = '', lastDrawnFrame = 0;
  let drawn = 0, blended = 0, misses = 0, failures = 0, decoded = 0;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  ready.catch(() => {});

  function sheetIndex(frame) {
    return Math.min(sheetCount - 1, Math.max(0, Math.floor(frame / framesPerSheet)));
  }

  function queueSheet(index, priority) {
    if (index < 0 || index >= sheetCount || disposed) return;
    const cached = sheets.get(index);
    if (cached) { cached.used = ++serial; return; }
    pending.set(index, Math.max(priority, pending.get(index) ?? -1));
  }

  function requestWindow(frame, weight = 100) {
    const index = sheetIndex(Math.round(frame));
    queueSheet(index, weight + 20);
    queueSheet(index + direction, weight + 10);
    queueSheet(index - direction, weight + 8);
    queueSheet(index + direction * 2, weight + 3);
    if (!mobile) queueSheet(index - direction * 2, weight);
    // Drop stale speculative requests after rapid direction changes.
    if (pending.size > 12) {
      const wanted = sheetIndex(Math.round(target * (frameCount - 1)));
      for (const pendingIndex of pending.keys()) {
        if (Math.abs(pendingIndex - index) > 3 && Math.abs(pendingIndex - wanted) > 3) {
          pending.delete(pendingIndex);
        }
      }
    }
    pump();
  }

  function pump() {
    if (disposed) return;
    const limit = mobile ? 2 : 3;
    while (inFlight < limit && pending.size) {
      let choice, score = -Infinity;
      for (const [index, priority] of pending) {
        if (priority > score) { score = priority; choice = index; }
      }
      pending.delete(choice);
      if (sheets.has(choice)) continue;
      const image = new Image();
      const record = { image, state: 'loading', used: ++serial };
      sheets.set(choice, record);
      inFlight++;
      image.decoding = 'async';
      function finish(ok) {
        if (record.state !== 'loading') return;
        inFlight = Math.max(0, inFlight - 1);
        if (disposed) return;
        if (!ok) {
          record.state = 'failed';
          failures++;
          if (choice === 0 && !settled) {
            settled = true;
            readyReject(new Error('The delivery film could not load its opening frame'));
          } else if (choice === sheetIndex(Math.round(target * (frameCount - 1)))) {
            onError?.(new Error('Delivery frame unavailable'));
          }
        } else {
          record.state = 'ready';
          decoded++;
          if (choice === 0 && !settled) {
            settled = true;
            readyResolve();
          }
          paintKey = '';
          schedule();
          onReady?.();
        }
        trim();
        pump();
      }
      image.onload = () => {
        // Decode asynchronously; do not block scroll events with synchronous image decode.
        if (typeof image.decode === 'function') {
          image.decode().then(() => finish(true), () => finish(true));
        } else {
          finish(true);
        }
      };
      image.onerror = () => finish(false);
      image.src = urls[choice];
    }
  }

  function trim() {
    const limit = mobile ? 4 : 7;
    const loaded = [...sheets.entries()].filter(([, item]) => item.state === 'ready');
    if (loaded.length <= limit) return;
    const current = sheetIndex(Math.round(visual * (frameCount - 1)));
    const wanted = sheetIndex(Math.round(target * (frameCount - 1)));
    const keep = new Set([current, wanted, sheetIndex(lastDrawnFrame)]);
    const candidates = loaded
      .filter(([index]) => !keep.has(index))
      .sort((a, b) => {
        const aDistance = Math.min(Math.abs(a[0] - current), Math.abs(a[0] - wanted));
        const bDistance = Math.min(Math.abs(b[0] - current), Math.abs(b[0] - wanted));
        return bDistance - aDistance || a[1].used - b[1].used;
      });
    let toRemove = loaded.length - limit;
    for (const [index, record] of candidates) {
      if (toRemove <= 0) break;
      record.image.onload = null;
      record.image.onerror = null;
      sheets.delete(index);
      toRemove--;
    }
  }

  function drawSourceFrame(frame, opacity = 1) {
    const index = sheetIndex(frame);
    const record = sheets.get(index);
    if (!record || record.state !== 'ready') return false;
    const offset = frame % framesPerSheet;
    const sx = (offset % columns) * sourceWidth;
    const sy = Math.floor(offset / columns) * sourceHeight;
    record.used = ++serial;
    if (opacity !== 1) ctx.globalAlpha = opacity;
    ctx.drawImage(record.image, sx, sy, sourceWidth, sourceHeight,
      imageRect.x, imageRect.y, imageRect.width, imageRect.height);
    if (opacity !== 1) ctx.globalAlpha = 1;
    return true;
  }

  let imageRect = { x: 0, y: 0, width: 1, height: 1 };
  function draw() {
    if (disposed || !canvasWidth || !canvasHeight) return;
    const exact = visual * (frameCount - 1);
    const first = Math.floor(exact);
    const second = Math.min(frameCount - 1, first + 1);
    // Five sub-positions per source frame soften the 24-fps scroll steps
    // without falsely claiming native 60-fps footage.
    const fraction = Math.round((exact - first) * 4) / 4;
    const key = first + ':' + fraction + ':' + canvasWidth + ':' + canvasHeight;
    if (paintKey === key) return;

    const a = sheets.get(sheetIndex(first));
    if (!a || a.state !== 'ready') {
      misses++;
      queueSheet(sheetIndex(first), 1000);
      pump();
      // Keep the last good canvas image visible until the requested sheet decodes.
      return;
    }
    ctx.fillStyle = '#0b1f3a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    drawSourceFrame(first);
    if (fraction > 0 && second !== first) {
      const b = sheets.get(sheetIndex(second));
      if (b?.state === 'ready' && drawSourceFrame(second, fraction)) blended++;
      else queueSheet(sheetIndex(second), 900);
    }
    paintKey = key;
    lastDrawnFrame = first;
    drawn++;
    pump();
  }

  function tick(timestamp) {
    tickId = 0;
    if (disposed) return;
    const elapsed = lastStamp ? Math.min(64, Math.max(1, timestamp - lastStamp)) : 16;
    lastStamp = timestamp;
    const gap = target - visual;
    // Faster catch-up for large scroll jumps; gentle motion for small scroll changes.
    const inertiaMs = Math.abs(gap) > .12 ? 65 : 95;
    visual += gap * (1 - Math.exp(-elapsed / inertiaMs));
    if (Math.abs(target - visual) < 0.00018) visual = target;
    requestWindow(visual * (frameCount - 1), 80);
    draw();
    if (Math.abs(target - visual) > 0.00018) schedule();
    else lastStamp = 0;
  }
  function schedule() {
    if (!disposed && !tickId && !document.hidden) tickId = requestAnimationFrame(tick);
  }

  function resize(width, height, dpr, isMobile) {
    if (disposed) return;
    mobile = !!isMobile;
    const ratio = Math.max(1, Math.min(mobile ? 1.5 : 1.6, dpr || 1));
    // Never upscale canvas backing pixels far beyond the detail available in the 720p source.
    const nominalWidth = Math.max(1, Math.round(width * ratio));
    const nominalHeight = Math.max(1, Math.round(height * ratio));
    const cap = 1.4;
    const scale = Math.min(1, sourceWidth * cap / nominalWidth, sourceHeight * cap / nominalHeight);
    const w = Math.max(1, Math.round(nominalWidth * scale));
    const h = Math.max(1, Math.round(nominalHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      paintKey = '';
    }
    canvasWidth = w; canvasHeight = h;
    const frameRatio = sourceWidth / sourceHeight;
    let dw = w, dh = h;
    if (w / h > frameRatio) dw = h * frameRatio;
    else dh = w / frameRatio;
    imageRect = { x: (w - dw) / 2, y: (h - dh) / 2, width: dw, height: dh };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    requestWindow(target * (frameCount - 1), 150);
    draw();
  }

  // A decoded opening frame is required before removing the CSS poster.
  queueSheet(0, 2000);
  queueSheet(1, 1000);
  pump();

  return {
    ready,
    resize,
    render(state) {
      if (disposed) return;
      const next = clamp(Number(state?.p) || 0);
      direction = next >= target ? 1 : -1;
      // Dragging the scrollbar far ahead is a seek, not an invitation to download
      // all intervening sheets; go straight to the intended HD frame.
      if (Math.abs(next - visual) > .18) {
        visual = next;
        lastStamp = 0;
        paintKey = '';
        pending.clear();
      }
      target = next;
      requestWindow(target * (frameCount - 1), 160);
      schedule();
    },
    stats() {
      return {
        mode: 'high-definition-smooth-sprites',
        sourceFPS: 24, sourceFrames: frameCount, width: sourceWidth, height: sourceHeight,
        sheetCount, cachedSheets: sheets.size, queuedSheets: pending.size, inFlight,
        decoded, draws: drawn, blends: blended, missingFrames: misses, failures,
        frame: Math.round(visual * (frameCount - 1)),
        targetFrame: Math.round(target * (frameCount - 1)),
        canvasWidth, canvasHeight
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (tickId) cancelAnimationFrame(tickId);
      pending.clear();
      sheets.forEach(record => {
        record.image.onload = null;
        record.image.onerror = null;
      });
      sheets.clear();
      if (!settled) {
        settled = true;
        readyReject(new Error('Delivery animation disposed'));
      }
    }
  };
}
