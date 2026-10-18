const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t = clamp(value); return clamp(t * t * t * (10 + t * (-15 + t * 6))); };
const mix = (a, b, t) => a + (b - a) * t;
export const photoScenes = [
  { key: 'packing', start: 0, from: [1.02,.50,.46], to: [1.13,.52,.57] },
  { key: 'dispatch', start: .065, from: [1.12,.52,.61], to: [1.02,.50,.51] },
  { key: 'cargo', start: .20, from: [1.02,.50,.49], to: [1.13,.50,.60] },
  { key: 'takeoff', start: .265, from: [1.035,.50,.51], to: [1.0,.50,.48], wide: true },
  { key: 'ocean', start: .30, from: [1.06,.50,.49], to: [1.0,.50,.51] },
  { key: 'arrival', start: .53, from: [1.0,.50,.50], to: [1.04,.51,.52], wide: true },
  { key: 'customs', start: .615, from: [1.02,.50,.48], to: [1.13,.51,.58] },
  { key: 'truck-loading', start: .69, from: [1.10,.51,.51], to: [1.02,.51,.51] },
  { key: 'road', start: .78, from: [1.02,.50,.50], to: [1.11,.51,.55] },
  { key: 'carrying', start: .89, from: [1.02,.50,.46], to: [1.08,.53,.54] },
  { key: 'placing', start: .965, from: [1.02,.54,.56], to: [1.11,.57,.65] },
  { key: 'delivered', start: .986, from: [1.12,.54,.63], to: [1.025,.52,.56] }
];
const halfWidth = index => Math.min(.008, (photoScenes[index].start - photoScenes[index - 1].start) * .17);
function camera(index, progress) {
  const scene = photoScenes[index], begin = scene.start - (index ? halfWidth(index) : 0), end = index + 1 < photoScenes.length ? photoScenes[index + 1].start + halfWidth(index + 1) : 1;
  const t = ease((progress - begin) / (end - begin));
  return scene.from.map((value, i) => mix(value, scene.to[i], t));
}
export function evaluatePhotoStory(value) {
  const progress = clamp(Number.isFinite(value) ? value : 0);
  let index = 0;
  for (let i = 1; i < photoScenes.length; i++) if (progress >= photoScenes[i].start) index = i;
  let layers = [{ index, opacity: 1 }];
  for (let i = 1; i < photoScenes.length; i++) {
    const width = halfWidth(i), boundary = photoScenes[i].start;
    if (progress >= boundary - width && progress <= boundary + width) {
      const blend = ease((progress - boundary + width) / (2 * width));
      layers = [{ index: i - 1, opacity: 1 }, { index: i, opacity: blend }];
      break;
    }
  }
  return { progress, index, layers: layers.map(layer => ({ ...layer, key: photoScenes[layer.index].key, camera: camera(layer.index, progress), wide: !!photoScenes[layer.index].wide })) };
}
export function createRenderer(canvas, sources, onReady, onError) {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Photographic canvas unavailable');
  const wideFrame = document.createElement('canvas'), wideContext = wideFrame.getContext('2d');
  const assets = new Map(sources.map(source => [source.key, source])), cache = new Map();
  let disposed = false, mobile = false, state = evaluatePhotoStory(0), lastState, lastRecords, draws = 0, requests = 0, duration = 0, failed = false, settled = false;
  let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {});
  const urlFor = key => { const source = assets.get(key); if (!source?.desktop) throw new Error('Missing photographic scene: ' + key); return mobile && source.mobile ? source.mobile : source.desktop; };
  const notify = record => { if (!disposed && state.layers.some(layer => urlFor(layer.key) === record.url)) onReady?.(); };
  function fail(message) {
    if (failed || disposed) return;
    failed = true; const error = new Error(message);
    if (!settled) { settled = true; rejectReady(error); } else onError?.(error);
  }
  function load(key, priority) {
    const url = urlFor(key);
    if (cache.has(url)) return cache.get(url);
    const image = new Image(), record = { image, ready: false, failed: false, key, url };
    cache.set(url, record); requests++;
    image.crossOrigin = 'anonymous'; image.decoding = 'async'; image.fetchPriority = priority;
    image.onload = async () => {
      clearTimeout(record.timeout);
      try { await image.decode(); } catch { if (!image.naturalWidth) { record.failed = true; notify(record); return; } }
      if (disposed || cache.get(url) !== record) return;
      record.ready = true;
      if (photoScenes.find(scene => scene.key === key)?.wide) {
        record.background = document.createElement('canvas'); record.background.width = 48; record.background.height = 32;
        record.background.getContext('2d').drawImage(image,0,0,48,32);
        record.feather = document.createElement('canvas'); record.feather.width = image.naturalWidth; record.feather.height = image.naturalHeight;
        const c = record.feather.getContext('2d'); c.drawImage(image,0,0); c.globalCompositeOperation = 'destination-in';
        const gradient = c.createLinearGradient(0,0,0,record.feather.height); gradient.addColorStop(0,'transparent'); gradient.addColorStop(.07,'#000'); gradient.addColorStop(.93,'#000'); gradient.addColorStop(1,'transparent'); c.fillStyle = gradient; c.fillRect(0,0,record.feather.width,record.feather.height);
      }
      notify(record);
    };
    image.onerror = () => { clearTimeout(record.timeout); if (!disposed) { record.failed = true; notify(record); } };
    record.timeout = setTimeout(() => { record.failed = true; notify(record); },15000);
    image.src = url;
    return record;
  }
  function drawCover(image, camera, opacity, target = context) {
    const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
    const scale = Math.max(canvas.width / iw, canvas.height / ih) * camera[0], width = canvas.width / scale, height = canvas.height / scale;
    const left = Math.max(0,Math.min(iw-width,camera[1]*iw-width/2)), top = Math.max(0,Math.min(ih-height,camera[2]*ih-height/2));
    target.globalAlpha = opacity; target.drawImage(image,left,top,width,height,0,0,canvas.width,canvas.height);
  }
  function drawLayer(layer, record) {
    if (!layer.wide) { drawCover(record.image,layer.camera,layer.opacity); return; }
    drawCover(record.background,[1,.5,.5],1,wideContext);
    const image = record.feather, scale = Math.min(canvas.width/image.width,canvas.height/image.height)*layer.camera[0];
    const width = image.width*scale, height = image.height*scale, x = (canvas.width-width)/2+(layer.camera[1]-.5)*canvas.width*.15, y = (canvas.height-height)/2+(layer.camera[2]-.5)*canvas.height*.15;
    wideContext.drawImage(image,x,y,width,height); context.globalAlpha = layer.opacity; context.drawImage(wideFrame,0,0);
  }
  function keepNearby() {
    const keep = new Set(state.layers.map(layer => urlFor(layer.key)));
    for (const index of [state.index-1,state.index+1]) if (photoScenes[index]) { const record = load(photoScenes[index].key,'low'); keep.add(record.url); }
    for (const record of lastRecords || []) keep.add(record.url);
    for (const [url, record] of cache) if (!keep.has(url)) { clearTimeout(record.timeout); record.image.onload = null; record.image.onerror = null; record.image.src = ''; cache.delete(url); }
  }
  return {
    ready,
    resize(width, height, dpr = 1, isMobile = false) {
      mobile = isMobile; const ratio = Math.min(dpr,1.5), nextWidth = Math.max(1,Math.round(width*ratio)), nextHeight = Math.max(1,Math.round(height*ratio));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) { canvas.width = nextWidth; canvas.height = nextHeight; }
      if (wideFrame.width !== nextWidth || wideFrame.height !== nextHeight) { wideFrame.width = nextWidth; wideFrame.height = nextHeight; }
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    },
    render(pose) {
      if (disposed || failed) return;
      const begin = performance.now(); state = evaluatePhotoStory(pose.p);
      const records = state.layers.map(layer => load(layer.key,'high'));
      if (records.some(record => record.failed)) { fail('A photographic journey image could not be loaded'); return; }
      let painted = false;
      if (records.every(record => record.ready)) {
        state.layers.forEach((layer,index) => drawLayer(layer,records[index])); lastState = state; lastRecords = records; painted = true;
      } else if (lastState) {
        if (lastRecords.every(record => record?.ready)) lastState.layers.forEach((layer,index) => drawLayer(layer,lastRecords[index]));
      }
      context.globalAlpha = 1; keepNearby(); draws++; duration = performance.now()-begin;
      if (painted && !settled) { settled = true; resolveReady(); }
    },
    stats() { return { mode: 'photographic', drawCount: draws, requests, cachedImages: cache.size, scene: photoScenes[state.index].key, visibleScene: lastState ? photoScenes[lastState.index].key : null, layers: state.layers, pending: state.layers.some(layer => !cache.get(urlFor(layer.key))?.ready), lastDuration: duration, width: canvas.width, height: canvas.height, error: failed ? 1 : 0 }; },
    dispose() {
      if (disposed) return;
      disposed = true; for (const record of cache.values()) { clearTimeout(record.timeout); record.image.onload = null; record.image.onerror = null; record.image.src = ''; } cache.clear(); wideFrame.width = 1; wideFrame.height = 1;
      if (!settled) { settled = true; rejectReady(new DOMException('Photographic journey disposed','AbortError')); }
    }
  };
}
