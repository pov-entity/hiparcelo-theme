export const clamp = v => Math.max(0, Math.min(1, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const ease = v => { const t = clamp(v); return t * t * t * (10 + t * (-15 + 6 * t)); };
export const span = (p, a, b) => ease((p - a) / (b - a));
export const blend = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
const key = (p, frames) => {
  for (let i = 1; i < frames.length; i++) {
    if (p <= frames[i][0]) return blend(frames[i - 1].slice(1), frames[i].slice(1), span(p, frames[i - 1][0], frames[i][0]));
  }
  return frames.at(-1).slice(1);
};
const curve = (p, frames) => {
  const n = frames.length;
  if (p <= frames[0][0]) return frames[0].slice(1);
  if (p >= frames[n - 1][0]) return frames[n - 1].slice(1);
  let i = 0;
  while (frames[i + 1][0] < p) i++;
  const a = frames[i], b = frames[i + 1], prev = frames[Math.max(0, i - 1)], next = frames[Math.min(n - 1, i + 2)];
  const dt = b[0] - a[0], t = (p - a[0]) / dt, t2 = t * t, t3 = t2 * t;
  return a.slice(1).map((v, j) => {
    const d = j + 1;
    const m0 = i ? (b[d] - prev[d]) / (b[0] - prev[0]) : 0;
    const m1 = i + 1 < n - 1 ? (next[d] - a[d]) / (next[0] - a[0]) : 0;
    return (2 * t3 - 3 * t2 + 1) * v + (t3 - 2 * t2 + t) * dt * m0 + (-2 * t3 + 3 * t2) * b[d] + (t3 - t2) * dt * m1;
  });
};
const roadPoints = [[18, 523], [18, 536], [18, 550], [9, 560], [0, 573], [0, 585], [7, 597], [9, 608], [9, 621]];
function catmull(points, t) {
  const f = clamp(t) * (points.length - 1), i = Math.min(points.length - 2, Math.floor(f)), u = f - i;
  const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
  return b.map((v, j) => .5 * ((2 * v) + (-a[j] + c[j]) * u + (2 * a[j] - 5 * v + 4 * c[j] - d[j]) * u * u + (-a[j] + 3 * v - 3 * c[j] + d[j]) * u * u * u));
}
const samples = [], distances = [0];
for (let i = 0; i <= 500; i++) {
  samples.push(catmull(roadPoints, i / 500));
  if (i) distances.push(distances.at(-1) + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
}
export const roadLength = distances.at(-1);
export function roadAt(t) {
  const d = clamp(t) * roadLength;
  let lo = 0, hi = distances.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (distances[mid] < d) lo = mid; else hi = mid; }
  const u = (d - distances[lo]) / (distances[hi] - distances[lo] || 1);
  const point = blend(samples[lo], samples[hi], u);
  const before = samples[Math.max(0, lo - 1)], after = samples[Math.min(500, hi + 1)];
  return { position: [point[0], 0, point[1]], angle: Math.atan2(after[0] - before[0], after[1] - before[1]), distance: d };
}
export function localPoint(position, angle, offset) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [position[0] + c * offset[0] + s * offset[2], position[1] + offset[1], position[2] - s * offset[0] + c * offset[2]];
}
export const chapters = [0, .10, .20, .30, .53, .69, .78, .89, .96];
export function evaluateJourney(value, mobile = false) {
  const p = clamp(Number.isFinite(value) ? value : 0);
  const planePosition = p <= .25 ? [0, 0, 28] : p >= .615 ? [0, 0, 495] : curve(p, [[.25, 0, 0, 28], [.265, 0, 0, 35], [.285, 0, 0, 77], [.30, 0, 16, 115], [.40, 0, 26, 260], [.53, 0, 12, 405], [.58, 0, 0, 453], [.615, 0, 0, 495]]);
  planePosition[1] = p < .30 ? 18 * span(p, .282, .30) : p < .53 ? 18 + 6 * span(p, .30, .40) - 12 * span(p, .45, .53) : 12 * (1 - span(p, .53, .58));
  const planePitch = -.075 * span(p, .281, .30) * (1 - span(p, .52, .58));
  const planeDoor = p < .5 ? 1 - span(p, .24, .25) : span(p, .615, .625);
  const truckT = span(p, .75, .889), truck = roadAt(truckT);
  const cargo = localPoint(truck.position, truck.angle, [0, 1.35, -3.15]);
  const trolley = p < .5 ? key(p, [[0, 0, 0, 8], [.135, 0, 0, 8], [.20, 5.4, 0, 33], [1, 5.4, 0, 33]]) : key(p, [[0, 5.4, 0, 500], [.645, 5.4, 0, 500], [.665, 10, 0, 502], [1, 10, 0, 502]]);
  let parcel = key(p, [[0, 0, 1.55, 0], [.10, 0, 1.55, 0], [.135, 0, 1.1, 8], [.20, 5.4, 1.1, 33], [.228, 1.1, 2.05, 33], [.24, 0, 1.85, 33]]);
  let parent = 'workstation';
  if (p >= .135 && p < .20) { parcel = blend(trolley, [trolley[0], 1.1, trolley[2]], 1); parent = 'trolley'; }
  if (p >= .24 && p < .625) { parcel = [planePosition[0], planePosition[1] + Math.cos(planePitch) * 1.85 - Math.sin(planePitch) * 5, planePosition[2] + Math.sin(planePitch) * 1.85 + Math.cos(planePitch) * 5]; parent = 'aircraft'; }
  if (p >= .625 && p < .69) {
    parcel = key(p, [[.625, 0, 1.85, 500], [.645, 5.4, 1.1, 500], [.665, 10, 1.1, 502], [.675, 10, 1.1, 508], [.681, 14, 1.1, 511], [.69, 18, 1.35, 516]]);
    parent = p < .665 ? 'trolley' : 'customs_belt';
  }
  if (p >= .69 && p < .73) { parcel = blend([18, 1.35, 516], [18, 1.35, 519.85], span(p, .69, .73)); parent = 'loading_bay'; }
  if (p >= .73 && p < .918) { parcel = cargo; parent = 'truck'; }
  const driverPosition = key(p, [[0, 8.4, 0, 623.3], [.891, 8.4, 0, 623.3], [.898, 7.3, 0, 623.3], [.912, 7.3, 0, 616.0], [.917, 9, 0, 617.3], [.920, 9, 0, 617.3], [.925, 9, 0, 615.6], [.932, 9, 0, 615.6], [.963, -5.2, .15, 623.2], [.983, -5.2, .15, 623.2], [1, 2.0, 0, 617.5]]);
  let driverAngle = key(p, [[0, -Math.PI / 2], [.895, -Math.PI / 2], [.900, Math.PI], [.912, Math.PI], [.917, 0], [.925, 0], [.932, -1.08], [.959, -1.08], [.963, 0], [.983, 0], [.989, 2.24], [1, 2.24]])[0];
  const carry = localPoint(driverPosition, driverAngle, [0, 1.05 + .30 * (1 - span(p, .921, .925)), .52]);
  const doorstep = [-5.2, .46, 624];
  if (p >= .918 && p < .920) { parcel = blend(cargo, carry, span(p, .918, .920)); parent = 'courier_pickup'; }
  if (p >= .920 && p < .963) { parcel = carry; parent = 'courier'; }
  if (p >= .963 && p < .979) { parcel = blend(localPoint([-5.2, .15, 623.2], 0, [0, 1.05, .52]), doorstep, span(p, .963, .979)); parent = 'courier_placement'; }
  if (p >= .979) { parcel = doorstep; parent = 'doorstep'; }
  const driverVisible = p >= .891;
  const doorOpen = p < .8 ? 1 - span(p, .73, .745) : span(p, .905, .916) * (1 - span(p, .986, 1));
  const truckCabDoor = span(p, .89, .895) * (1 - span(p, .9, .905));
  let cameraTarget, viewSize, elevation;
  const opening = key(p, [[0, 0, 1, 0, 17, .9], [.04, 0, 1.5, 0, 5.5, .9], [.10, 0, 1.5, 0, 6, .9], [.135, 0, 1, 8, 9, .95], [.20, 2, 1.8, 27, 36, 1.08], [.228, 2.5, 2, 33, 8.5, .65], [.25, 0, 2, 28, 36, 1.14]]);
  [viewSize, elevation] = opening.slice(3);
  cameraTarget = opening.slice(0, 3);
  if (p >= .25 && p < .615) {
    const values = key(p, [[.25, 36, 1.14], [.30, 54, 1.27], [.40, 62, 1.28], [.53, 54, 1.22], [.58, 43, 1.12], [.615, 38, 1.02]]);
    [viewSize, elevation] = values; cameraTarget = localPoint(planePosition, 0, [0, 2, 0]);
  }
  if (p >= .615 && p < .75) {
    const v = key(p, [[.615, 0, 2, 495, 38, 1.02], [.645, 5.4, 1.1, 500, 9, .75], [.665, 10, 1, 502, 13, .94], [.69, 18, 1.3, 516, 11, .9], [.73, 18, 1.8, 521, 16, 1], [.75, 18, 1.2, 523, 24, 1.12]]);
    cameraTarget = v.slice(0, 3); [viewSize, elevation] = v.slice(3);
  }
  if (p >= .75 && p < .895) { cameraTarget = localPoint(truck.position, truck.angle, [0, 1.2, 0]); viewSize = mix(24, 28, span(p, .78, .85)); elevation = 1.12; }
  if (p >= .895) {
    const v = key(p, [[.895, 9, 1.2, 621, 28, 1.12], [.917, 9, 1.2, 618, 10, .85], [.932, 9, 1, 615.6, 11, .85], [.963, -5.2, 1, 624, 12, .72], [.983, -5.2, 1, 624, 8, .7], [1, -5.2, 1, 624, 8, .7]]);
    cameraTarget = v.slice(0, 3); [viewSize, elevation] = v.slice(3);
  }
  const stage = p < .20 ? 0 : p < .69 ? 1 : 2;
  let chapter = chapters.findLastIndex(t => p >= t);
  const walkDistance = p < .917 ? span(p, .895, .912) * 7.3 + span(p, .912, .917) * 1.7 : p < .932 ? span(p, .917, .925) * .4 : p < .983 ? span(p, .932, .963) * 16.1 : 16.1 + span(p, .983, 1) * 9.2;
  const wideAircraft = span(p, .16, .20) * (1 - span(p, .20, .228)) + span(p, .235, .25) * (1 - span(p, .615, .645));
  return {
    p, stage, chapter, parent, parcel, parcelAngle: p >= .925 && p < .963 ? driverAngle : 0,
    boxLid: 1 - span(p, .045, .07), product: span(p, 0, .035), padding: span(p, .025, .045), tape: span(p, .07, .085), label: span(p, .085, .10),
    plane: { position: planePosition, angle: 0, pitch: planePitch, door: planeDoor, wheels: 1 - span(p, .30, .315) + span(p, .545, .565), wheelSpin: planePosition[2] / .42 },
    trolley, truck: { ...truck, door: doorOpen, cabDoor: truckCabDoor, steer: (roadAt(Math.min(1, truckT + .012)).angle - roadAt(Math.max(0, truckT - .012)).angle) * 4 },
    driver: { position: driverPosition, angle: driverAngle, visible: driverVisible, phase: walkDistance * 7.5, stride: Math.sin(Math.PI * span(p, .895, .912)) + Math.sin(Math.PI * span(p, .912, .917)) + Math.sin(Math.PI * span(p, .932, .963)) + Math.sin(Math.PI * span(p, .983, 1)), carrying: p >= .918 && p < .981, bend: span(p, .963, .975) * (1 - span(p, .98, .989)) },
    camera: { target: cameraTarget, size: viewSize * (mobile ? 1.18 : 1), minWidth: 32 * wideAircraft, elevation, azimuth: .48 - .13 * span(p, .89, .96) },
    complete: span(p, .985, .998)
  };
}
