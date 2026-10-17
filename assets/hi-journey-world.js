const C = {
  navy: [0.025, .105, .245], blue: [.055, .18, .35], edge: [.18, .29, .43], cream: [.97, .94, .87], paper: [.99, .975, .94],
  ground: [.87, .88, .85], concrete: [.70, .74, .74], road: [.22, .28, .33], line: [.85, .83, .74], metal: [.51, .59, .64], glass: [.15, .29, .36],
  rubber: [.09, .12, .15], gold: [.72, .59, .38], green: [.25, .37, .30], lightGreen: [.44, .53, .39], bark: [.38, .32, .25], skin: [.68, .47, .33]
};
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, f) => a.map(v => v * f);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a.reduce((v, x, i) => v + x * b[i], 0);
const norm = a => mul(a, 1 / (Math.hypot(...a) || 1));
function multiply(a, b) {
  const r = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) for (let i = 0; i < 4; i++) r[c * 4 + row] += a[i * 4 + row] * b[c * 4 + i];
  return r;
}
function view(eye, target) {
  const z = norm(sub(eye, target)), x = norm(cross([0, 1, 0], z)), y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}
function ortho(w, h, near = .1, far = 700) {
  return new Float32Array([2 / w, 0, 0, 0, 0, 2 / h, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1]);
}
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function transform(p, r = [0, 0, 0]) {
  const [x, y, z] = r, sx = Math.sin(x), cx = Math.cos(x), sy = Math.sin(y), cy = Math.cos(y), sz = Math.sin(z), cz = Math.cos(z);
  const rx = [1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1];
  const ry = [cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1];
  const rz = [cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const m = multiply(ry, multiply(rz, rx)); m[12] = p[0]; m[13] = p[1]; m[14] = p[2]; return m;
}
function point(m, v, vector = false) {
  return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + (vector ? 0 : m[12]), m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + (vector ? 0 : m[13]), m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + (vector ? 0 : m[14])];
}
const sphereTemplates = new Map();
class Mesh {
  constructor() { this.data = []; this.matrix = identity(); }
  group(p, r, fn) { const old = this.matrix; this.matrix = multiply(old, transform(p, r)); fn(); this.matrix = old; }
  triangle(a, b, c, color, uv, material = 0, normals) {
    const n = normals ? null : norm(cross(sub(b, a), sub(c, a)));
    [a, b, c].forEach((v, i) => { this.data.push(...point(this.matrix, v), ...point(this.matrix, normals ? normals[i] : n, true), ...color, ...(uv ? uv[i] : [0, 0]), material); });
  }
  quad(a, b, c, d, color, material = 0) {
    this.triangle(a, b, c, color, [[0, 1], [1, 1], [1, 0]], material);
    this.triangle(a, c, d, color, [[0, 1], [1, 0], [0, 0]], material);
  }
  box(p, size, color, r = [0, 0, 0], topMaterial = 0) {
    this.group(p, r, () => {
      const [x, y, z] = size.map(v => v / 2);
      this.quad([-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z], color, topMaterial);
      this.quad([-x, -y, z], [-x, -y, -z], [x, -y, -z], [x, -y, z], color);
      this.quad([-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], color);
      this.quad([x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], color);
      this.quad([-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], color);
      this.quad([x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], color);
    });
  }
  ellipsoid(p, radii, color, segments = 18, rings = 10, omit) {
    const key = `${radii.join(',')}/${segments}/${rings}`;
    let cells = sphereTemplates.get(key);
    if (!cells) {
      cells = [];
      const vertex = (a, b) => [Math.sin(b) * Math.cos(a), Math.cos(b), Math.sin(b) * Math.sin(a)];
      for (let j = 0; j < rings; j++) for (let i = 0; i < segments; i++) {
        const vs = [vertex(i / segments * Math.PI * 2, j / rings * Math.PI), vertex((i + 1) / segments * Math.PI * 2, j / rings * Math.PI), vertex((i + 1) / segments * Math.PI * 2, (j + 1) / rings * Math.PI), vertex(i / segments * Math.PI * 2, (j + 1) / rings * Math.PI)];
        const positions = vs.map(v => v.map((x, k) => x * radii[k]));
        cells.push({ positions, ns: vs.map(v => norm(v.map((x, k) => x / radii[k]))), mid: positions.reduce((a, v) => add(a, mul(v, .25)), [0, 0, 0]) });
      }
      sphereTemplates.set(key, cells);
    }
    for (const cell of cells) {
      if (omit?.(add(cell.mid, p))) continue;
      const positions = cell.positions.map(v => add(v, p)), ns = cell.ns;
      this.triangle(positions[0], positions[1], positions[2], color, null, 0, [ns[0], ns[1], ns[2]]);
      this.triangle(positions[0], positions[2], positions[3], color, null, 0, [ns[0], ns[2], ns[3]]);
    }
  }
  cylinder(a, b, radius, color, segments = 12) {
    const axis = norm(sub(b, a)), right = norm(cross(Math.abs(axis[1]) > .9 ? [1, 0, 0] : [0, 1, 0], axis)), up = cross(axis, right);
    for (let i = 0; i < segments; i++) {
      const u = i * Math.PI * 2 / segments, v = (i + 1) * Math.PI * 2 / segments;
      const n0 = add(mul(right, Math.cos(u)), mul(up, Math.sin(u))), n1 = add(mul(right, Math.cos(v)), mul(up, Math.sin(v)));
      const p0 = add(a, mul(n0, radius)), p1 = add(a, mul(n1, radius)), p2 = add(b, mul(n1, radius)), p3 = add(b, mul(n0, radius));
      this.triangle(p0, p1, p2, color, null, 0, [n0, n1, n1]); this.triangle(p0, p2, p3, color, null, 0, [n0, n1, n0]);
      this.triangle(a, p1, p0, color); this.triangle(b, p3, p2, color);
    }
  }
  prism(outline, y, thickness, color) {
    if (outline.reduce((a, v, i) => a + v[0] * outline[(i + 1) % outline.length][1] - outline[(i + 1) % outline.length][0] * v[1], 0) > 0) outline = outline.slice().reverse();
    for (let i = 1; i < outline.length - 1; i++) this.triangle([outline[0][0], y + thickness, outline[0][1]], [outline[i][0], y + thickness, outline[i][1]], [outline[i + 1][0], y + thickness, outline[i + 1][1]], color);
    for (let i = 0; i < outline.length; i++) { const a = outline[i], b = outline[(i + 1) % outline.length]; this.quad([a[0], y, a[1]], [b[0], y, b[1]], [b[0], y + thickness, b[1]], [a[0], y + thickness, a[1]], color); }
  }
}
function tree(m, x, z, scale = 1) {
  m.cylinder([x, 0, z], [x, 2.5 * scale, z], .13 * scale, C.bark, 6);
  m.ellipsoid([x, 3 * scale, z], [1.35 * scale, 1.8 * scale, 1.2 * scale], C.green, 8, 6);
  m.ellipsoid([x - .55 * scale, 3 * scale, z + .25 * scale], [1 * scale, 1.3 * scale, .95 * scale], C.lightGreen, 8, 6);
}
function warehouse(m) {
  m.box([-4, .0, -3], [25, .25, 23], C.concrete);
  m.box([-12.4, 3.2, -3], [.3, 6.4, 21], C.paper);
  m.box([-4, 3.2, -13.4], [17, 6.4, .3], C.paper);
  m.box([-7.5, 6.5, -3], [10, .35, 21], C.navy);
  for (let z = -12; z <= 6; z += 1.3) m.box([-7.5, 6.7, z], [10, .05, .04], C.edge);
  for (const z of [-9, -4, 1]) {
    for (const x of [-10, -6]) m.box([x, 2.4, z], [.1, 4.8, .1], C.edge);
    for (let y = .65; y < 5; y += 1.65) {
      m.box([-8, y, z], [4.8, .1, 1.2], C.metal);
      for (let x = -9.5; x <= -6; x += 1.05) m.box([x, y + .45, z], [.8, .8, .85], x < -8 ? C.cream : C.navy);
    }
  }
  m.box([0, .65, 0], [3.5, 1.3, 2.1], C.metal);
  m.box([0, 1.23, 0], [3.6, .12, 2.2], C.paper);
  for (let i = 0; i < 12; i++) { const z = 1.25 + i * .61, y = 1.29 - z * .05625 - .12; m.cylinder([-.65, y, z], [.65, y, z], .12, C.metal, 8); }
  for (const x of [-.85, .85]) m.box([x, .88, 4.3], [.14, .23, 7.8], C.navy, [.05625, 0, 0]);
  for (const z of [2, 6]) for (const x of [-.8, .8]) m.box([x, .3, z], [.13, .6, .13], C.edge);
  m.box([2, 2.7, -1.4], [.9, .08, .7], C.navy);
  m.cylinder([2, 0, -1.4], [2, 2.7, -1.4], .07, C.metal);
  m.box([1.8, 2.2, -.9], [.55, .45, .1], C.glass, [-.25, 0, 0]);
  for (const x of [-11, 5]) tree(m, x, 10, .85);
}
function runway(m, start, end) {
  m.box([0, -.025, (start + end) / 2], [9, .08, end - start], C.road);
  for (let z = start + 3; z < end; z += 5) m.box([0, .025, z], [.16, .01, 2.3], C.line);
  for (const x of [-4.2, 4.2]) m.box([x, .025, (start + end) / 2], [.08, .01, end - start - 2], C.cream);
  for (let x = -3; x <= 3; x += 1) for (const z of [start + 1, end - 2]) m.box([x, .027, z], [.5, .015, 2.1], C.cream);
  for (let z = start + 4; z < end; z += 8) for (const x of [-5.4, 5.4]) m.box([x, .08, z], [.14, .16, .14], C.gold);
}
function customs(m) {
  m.box([15, -.01, 506], [43, .18, 35], C.concrete);
  m.box([23, 3, 505], [.25, 6, 18], C.paper);
  m.box([16, 3, 498], [14, 6, .25], C.paper);
  m.box([21, 6.1, 505], [4.4, .3, 18], C.navy);
  m.box([10, .4, 504], [2.8, .8, 6], C.edge);
  m.box([10, .815, 504], [2.7, .05, 6], C.rubber);
  m.group([10, 0, 505], [0, 0, 0], () => {
    m.box([-1.15, 2, 0], [.35, 2.2, 1.5], C.paper); m.box([1.15, 2, 0], [.35, 2.2, 1.5], C.paper); m.box([0, 3, 0], [2.65, .3, 1.5], C.navy);
    for (let i = -4; i <= 4; i++) m.box([i * .21, 1.9, .7], [.12, 1.8, .07], C.rubber);
    m.box([1.38, 2.3, 0], [.03, .16, .35], C.lightGreen);
  });
  for (let i = 0; i < 7; i++) m.cylinder([9, .77, 508 + i * .5], [11, .77, 508 + i * .5], .07, C.metal, 8);
  m.box([14, .4, 511], [7, .8, 2], C.edge);
  m.box([14, .8, 511], [7, .08, 1.9], C.metal);
  m.box([16, .905, 513.5], [1.7, .12, 6.4], C.metal, [-.039, .675, 0]);
  m.box([18, .53, 514], [2, 1.06, 7], C.concrete);
  m.box([18, 1.05, 516], [2.4, .08, 2], C.line);
  for (const z of [499, 502]) for (const x of [16, 18]) m.box([x, .6, z], [1.2, 1.2, 1.1], C.cream);
}
function house(m, x = -5.2, z = 629, small = false) {
  m.group([x, 0, z], [0, 0, 0], () => {
    m.box([0, .05, 0], [17, .25, 18], C.lightGreen);
    m.box([0, 2, 0], [11, 4, 8], C.paper);
    m.box([0, 4.2, .5], [11.7, .5, 9.6], C.navy);
    for (let i = -5; i <= 5; i++) m.box([i, 4.48, .5], [.025, .04, 9.5], C.edge);
    m.box([-3.7, 1.9, -4.06], [2.3, 2.3, .1], C.glass);
    m.box([3.3, 1.9, -4.06], [2.9, 2.3, .1], C.glass);
    for (const x0 of [-3.7, 3.3]) m.box([x0, 1.9, -4.13], [.04, 2.3, .04], C.line);
    m.box([0, 1.45, -4.06], [1.7, 2.9, .12], C.bark);
    for (const x0 of [-.82, .82]) m.box([x0, 1.47, -4.15], [.055, 2.95, .05], C.gold);
    m.box([.53, 1.35, -4.17], [.055, .26, .045], C.gold);
    m.box([0, 3.25, -4.8], [3.2, .18, 2], C.navy);
    m.box([0, .1, -5], [3.6, .2, 2.1], C.concrete);
    for (const x0 of [-1.5, 1.5]) { m.box([x0, 1.9, -4.2], [.2, .45, .15], C.edge); m.box([x0, 1.88, -4.3], [.12, .2, .02], C.cream); }
    for (let zz = -8; zz <= -6; zz += .8) m.box([0, .035, zz], [2.2, .07, .6], C.cream);
    for (const x0 of [-3, 3]) for (const zz of [-6, -7.4]) { m.box([x0, .3, zz], [1, .6, 1], C.concrete); m.ellipsoid([x0, .9, zz], [.6, .65, .6], C.green, 8, 6); }
    if (!small) { tree(m, -6.6, -5, 1.2); tree(m, 6.5, 2, 1.3); m.box([6.5, .6, -5.5], [.2, 1.2, .2], C.edge); m.box([6.5, 1.3, -5.5], [.9, .5, .4], C.navy); }
  });
}
function airplane(m, state) {
  const s = state.plane;
  m.group(s.position, [s.pitch, 0, 0], () => {
    m.ellipsoid([0, 2.7, 0], [1.6, 1.55, 10.8], C.navy, 28, 26, v => v[0] > 1.05 && v[1] > 1.5 && v[1] < 3.8 && v[2] > 3.2 && v[2] < 6.8);
    m.box([0, 1.5, 5], [2.6, .1, 4], C.rubber);
    m.group([1.15, 3.8, 5], [0, 0, s.door * 2.4], () => m.box([0, -1.08, 0], [.16, 2.15, 3.6], C.blue));
    const wing = [[0, 1.5], [4, -.2], [14, -5.8], [14, -7.1], [4, -4.2], [0, -4]];
    for (const sign of [-1, 1]) {
      m.prism(wing.map(v => [v[0] * sign, v[1]]), 2.1, .16, C.navy);
      m.prism([[0, -7], [sign * 5.4, -9], [sign * 5.4, -10.1], [0, -9.7]], 2.6, .12, C.blue);
      m.ellipsoid([sign * 5.5, 1.3, -2.5], [.7, .72, 1.9], C.blue, 16, 12);
      m.ellipsoid([sign * 5.5, 1.3, -.72], [.54, .54, .12], C.metal, 16, 8);
      m.ellipsoid([sign * 5.5, 1.3, -.61], [.39, .39, .08], C.rubber, 14, 6);
      m.box([sign * 13.8, 2.4, -6.4], [.13, .65, 1.1], C.blue, [0, 0, -sign * .25]);
      m.ellipsoid([sign * .45, 3.4, 8.8], [.58, .31, .43], C.glass, 10, 6);
    }
    m.group([0, 2.6, -7.8], [0, 0, Math.PI / 2], () => m.prism([[0, 0], [4.4, -1.8], [4.4, -2.8], [0, -2.3]], -.09, .18, C.blue));
    const deploy = Math.min(1, s.wheels);
    if (deploy > .01) for (const [x, z] of [[-1.2, -2], [1.2, -2], [0, 7]]) {
      m.cylinder([x, 1.8, z], [x, .5 + (1 - deploy) * 1.2, z], .09, C.metal, 8);
      wheel(m, [x, .48 + (1 - deploy) * 1.2, z], .4, .3, s.wheelSpin, 0);
    }
  });
  if (state.p < .252 || state.p > .615) m.box([3.3, 1.25, s.position[2] + 5], [4.2, .13, 1.45], C.metal, [0, 0, -.23]);
}
function wheel(m, p, r, width, spin, steer) {
  m.group(p, [0, steer, 0], () => {
    m.cylinder([-width / 2, 0, 0], [width / 2, 0, 0], r, C.rubber, 16);
    for (const sign of [-1, 1]) {
      m.cylinder([sign * width * .51, 0, 0], [sign * width * .54, 0, 0], r * .55, C.metal, 10);
      for (let k = 0; k < 3; k++) {
        const angle = spin + k * Math.PI / 3;
        m.cylinder([sign * width * .55, Math.sin(angle) * r * .4, Math.cos(angle) * r * .4], [sign * width * .55, -Math.sin(angle) * r * .4, -Math.cos(angle) * r * .4], r * .055, C.edge, 5);
      }
    }
  });
}
function truck(m, s) {
  m.group(s.position, [0, s.angle, 0], () => {
    m.box([0, .73, 0], [2.45, .32, 7.6], C.edge);
    m.box([0, 1.01, -1], [2.7, .16, 5.2], C.metal);
    for (const x of [-1.36, 1.36]) m.box([x, 2.35, -1], [.14, 2.7, 5.2], C.navy);
    m.box([0, 3.73, -1], [2.9, .16, 5.5], C.blue);
    m.box([0, 2.4, 1.6], [2.75, 2.7, .12], C.navy);
    for (const x of [-1.38, 1.38]) for (const z of [-3.5, 1.5]) m.box([x, 2.35, z], [.08, 2.8, .09], C.metal);
    for (const sign of [-1, 1]) m.group([sign * 1.35, 2.36, -3.6], [0, -sign * s.door * 1.65, 0], () => {
      m.box([-sign * .665, 0, 0], [1.32, 2.65, .12], C.navy); m.box([-sign * .12, -.1, -.08], [.055, 1.3, .04], C.metal);
    });
    m.box([0, 1.65, 2.8], [2.65, 1.4, 2.25], C.blue);
    m.box([0, 2.6, 2.5], [2.75, .8, 2.15], C.navy);
    m.box([0, 2.45, 3.65], [2.37, .8, .1], C.glass, [-.24, 0, 0]);
    m.box([0, 1.03, 3.95], [2.6, .2, .15], C.metal);
    m.box([0, 1.46, 3.91], [1.15, .37, .05], C.rubber);
    for (const sign of [-1, 1]) {
      m.box([sign * .98, 1.65, 3.94], [.38, .23, .08], C.cream);
      m.box([sign * 1.58, 2.38, 3.1], [.22, .36, .17], C.navy);
      m.group([sign * 1.39, 1.98, 3.35], [0, sign < 0 ? s.cabDoor * 1.15 : 0, 0], () => {
        m.box([0, 0, -.65], [.1, 1.7, 1.4], C.blue); m.box([sign * .06, .4, -.65], [.02, .65, 1.15], C.glass); m.box([sign * .09, -.12, -.95], [.05, .07, .3], C.metal);
      });
      m.box([sign * 1.1, 1.05, -3.67], [.28, .2, .08], [.58, .22, .15]);
      for (const z of [-2.65, 2.7]) wheel(m, [sign * 1.28, .61, z], .59, .4, -s.distance / .59, z > 0 ? s.steer : 0);
    }
  });
}
function packageBox(m, s) {
  m.group(s.parcel, [0, s.parcelAngle, 0], () => {
    const w = .82, h = .52, d = .62;
    m.box([0, -.23, 0], [w, .06, d], C.navy);
    for (const x of [-.395, .395]) m.box([x, 0, 0], [.03, h, d], C.navy);
    for (const z of [-.295, .295]) m.box([0, 0, z], [w, h, .03], C.navy);
    m.box([0, .8 * (1 - s.product) - .06, 0], [.34, .22, .25], C.cream, [0, .25, 0]);
    for (const x of [-.27, .27]) m.ellipsoid([x, .12 + .5 * (1 - s.padding), 0], [.1, .08, .24], C.paper, 8, 4);
    m.group([0, .28, -.32], [-s.boxLid * 1.95, 0, 0], () => {
      m.box([0, 0, .32], [.85, .055, .66], C.navy, [0, 0, 0], 1);
      if (s.tape > 0) m.box([.33, .031, .32], [.04, .004, .66 * s.tape], C.gold);
      if (s.label > 0) { m.box([-.27, .034 + .3 * (1 - s.label), .1], [.19, .005, .13], C.paper); for (let i = 0; i < 7; i++) m.box([-.33 + i * .018, .039 + .3 * (1 - s.label), .105], [.007, .002, .08], C.navy); }
    });
  });
}
function courier(m, state) {
  const s = state.driver;
  if (!s.visible) return;
  m.group(s.position, [0, s.angle, 0], () => {
    const stride = Math.sin(s.phase) * .3 * Math.min(1, s.stride), lift = Math.abs(Math.sin(s.phase)) * .07 * Math.min(1, s.stride);
    const hip = 0.86 - s.bend * .24;
    for (const sign of [-1, 1]) {
      const ankle = [sign * .13, .12 + (sign * stride > 0 ? lift : 0), sign * stride];
      const knee = [sign * .13, .49 - s.bend * .1, sign * stride * .5 + s.bend * .1];
      m.cylinder([sign * .13, hip, 0], knee, .09, C.edge, 9); m.cylinder(knee, ankle, .075, C.edge, 9);
      m.box(add(ankle, [0, -.045, .06]), [.19, .12, .35], C.rubber);
    }
    const lean = s.bend * .29;
    m.ellipsoid([0, hip + .33, lean], [.25, .36, .16], C.navy, 12, 10);
    m.box([0, hip + .41, lean + .15], [.36, .09, .015], C.cream);
    m.ellipsoid([0, hip + .79, lean + .03], [.155, .2, .15], C.skin, 12, 10);
    m.ellipsoid([0, hip + .94, lean + .02], [.17, .075, .16], C.navy, 12, 6);
    m.box([0, hip + .91, lean + .18], [.26, .035, .2], C.navy);
    const inverse = transform([0, 0, 0], [0, -s.angle, 0]);
    const parcelLocal = point(inverse, sub(state.parcel, s.position));
    for (const sign of [-1, 1]) {
      const shoulder = [sign * .23, hip + .52, lean];
      const hand = s.carrying ? [parcelLocal[0] + sign * .38, parcelLocal[1] - .08, parcelLocal[2]] : [sign * .29, hip - .06, -sign * stride * .8 + .04];
      const elbow = [(shoulder[0] + hand[0]) * .5 + sign * .08, (shoulder[1] + hand[1]) * .5 - .12, (shoulder[2] + hand[2]) * .5];
      m.cylinder(shoulder, elbow, .075, C.blue, 9); m.cylinder(elbow, hand, .055, C.skin, 9); m.ellipsoid(hand, [.06, .065, .065], C.skin, 8, 5);
    }
  });
}
const vertexShader = `
attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor; attribute vec2 aUv; attribute float aMaterial;
uniform mat4 uView; uniform mat4 uLight;
varying vec3 vPosition; varying vec3 vNormal; varying vec3 vColor; varying vec2 vUv; varying float vMaterial; varying vec4 vShadow;
void main(){vPosition=aPosition;vNormal=aNormal;vColor=aColor;vUv=aUv;vMaterial=aMaterial;vShadow=uLight*vec4(aPosition,1.0);gl_Position=uView*vec4(aPosition,1.0);}`;
const fragmentShader = `
precision highp float;
varying vec3 vPosition; varying vec3 vNormal; varying vec3 vColor; varying vec2 vUv; varying float vMaterial; varying vec4 vShadow;
uniform sampler2D uTexture; uniform sampler2D uShadow; uniform float uShadowSize; uniform float uShadowBias; uniform float uProgress; uniform vec3 uTarget;
float visibility(vec3 n){vec3 s=vShadow.xyz*.5+.5;if(s.x<0.0||s.x>1.0||s.y<0.0||s.y>1.0)return 1.0;float bias=max(.00012,uShadowBias*(2.0-dot(n,normalize(vec3(-.5,.9,-.45)))));float lit=0.0;for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){vec3 encoded=texture2D(uShadow,s.xy+vec2(float(x),float(y))/uShadowSize).rgb;float d=dot(encoded,vec3(1.0,1.0/255.0,1.0/65025.0));lit+=s.z-bias<=d?1.0:.0;}}return lit/9.0;}
void main(){vec3 n=normalize(vNormal);vec3 color=vColor;float material=vMaterial;if(material>.5&&material<1.5)color=texture2D(uTexture,vec2(vUv.y,1.0-vUv.x)*.96+.02).rgb;
if(material>1.5){float waves=sin(vPosition.x*.65+vPosition.z*.21-uProgress*7.0)*sin(vPosition.z*.48+vPosition.x*.14+uProgress*2.0);color=vec3(.14,.30,.40)+waves*.016;float shimmer=pow(max(0.0,sin(vPosition.z*1.4+vPosition.x*.4+uProgress*8.0)),18.0);color+=shimmer*.022;}
float diffuse=max(0.0,dot(n,normalize(vec3(-.5,.9,-.45))));float lighting=.48+.5*diffuse*mix(.45,1.0,visibility(n));float ao=mix(.90,1.0,smoothstep(.0,.7,vPosition.y));color*=lighting*ao;
float distanceFog=smoothstep(55.0,220.0,length(vPosition.xz-uTarget.xz));color=mix(color,vec3(.93,.93,.89),distanceFog*.32);gl_FragColor=vec4(color,1.0);}`;
const shadowVertex = `attribute vec3 aPosition;uniform mat4 uView;void main(){gl_Position=uView*vec4(aPosition,1.0);}`;
const shadowFragment = `precision highp float;void main(){vec3 encoded=fract(gl_FragCoord.z*vec3(1.0,255.0,65025.0));encoded.xy-=encoded.yz/255.0;gl_FragColor=vec4(encoded,1.0);}`;
export function createRenderer(canvas, textureUrl, onTextureReady) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
  if (!gl) throw new Error('WebGL unavailable');
  for (let i = 0; i < gl.getParameter(gl.MAX_VERTEX_ATTRIBS); i++) gl.disableVertexAttribArray(i);
  const resources = { programs: [], buffers: [], textures: [], framebuffers: [], renderbuffers: [] };
  function program(vs, fs) {
    const shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type, i) => { const shader = gl.createShader(type); gl.shaderSource(shader, i ? fs : vs); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader)); return shader; });
    const p = gl.createProgram(); shaders.forEach(s => gl.attachShader(p, s)); gl.linkProgram(p); shaders.forEach(s => gl.deleteShader(s)); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); resources.programs.push(p);
    return { id: p, position: gl.getAttribLocation(p, 'aPosition'), normal: gl.getAttribLocation(p, 'aNormal'), color: gl.getAttribLocation(p, 'aColor'), uv: gl.getAttribLocation(p, 'aUv'), material: gl.getAttribLocation(p, 'aMaterial'), view: gl.getUniformLocation(p, 'uView'), light: gl.getUniformLocation(p, 'uLight'), target: gl.getUniformLocation(p, 'uTarget'), progress: gl.getUniformLocation(p, 'uProgress') };
  }
  const main = program(vertexShader, fragmentShader), shadow = program(shadowVertex, shadowFragment);
  function buffer(data, dynamic = false) { const b = gl.createBuffer(); resources.buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); return { id: b, count: data.length / 12 }; }
  const chunks = [];
  function chunk(z, radius, fn) { const mesh = new Mesh(); fn(mesh); chunks.push({ z, radius, ...buffer(new Float32Array(mesh.data)) }); }
  chunk(0, 25, warehouse);
  chunk(68, 65, m => { m.box([0, -.13, 44], [95, .2, 170], C.ground); m.box([0, -.01, 27], [38, .1, 25], C.concrete); runway(m, 38, 115); });
  chunk(280, 200, m => {
    m.quad([-650, -.32, 112], [-650, -.32, 418], [650, -.32, 418], [650, -.32, 112], C.blue, 2);
    m.prism([[-650, 108], [-120, 108], [-40, 116], [30, 113], [90, 118], [180, 109], [650, 112], [650, 103], [-650, 103]], -.2, .08, C.cream);
    m.prism([[-650, 414], [-120, 414], [-50, 409], [10, 417], [70, 411], [200, 412], [650, 409], [650, 425], [-650, 425]], -.2, .08, C.cream);
  });
  chunk(480, 70, m => { m.box([0, -.17, 485], [170, .24, 145], C.ground); runway(m, 422, 486); });
  chunk(506, 23, customs);
  chunk(578, 66, m => {
    m.box([0, -.18, 586], [160, .22, 112], C.ground);
    let prev;
    for (let i = 0; i <= 150; i++) {
      const t = i / 150, f = t * (roadPointsForWorld.length - 1), k = Math.min(roadPointsForWorld.length - 2, Math.floor(f)), u = f - k;
      const a = roadPointsForWorld[Math.max(0, k - 1)], b = roadPointsForWorld[k], c = roadPointsForWorld[k + 1], d = roadPointsForWorld[Math.min(roadPointsForWorld.length - 1, k + 2)];
      const p = b.map((v, j) => .5 * (2 * v + (-a[j] + c[j]) * u + (2 * a[j] - 5 * v + 4 * c[j] - d[j]) * u * u + (-a[j] + 3 * v - 3 * c[j] + d[j]) * u * u * u));
      if (prev) { const dx = p[0] - prev[0], dz = p[1] - prev[1], len = Math.hypot(dx, dz), x = (p[0] + prev[0]) / 2, z = (p[1] + prev[1]) / 2, angle = Math.atan2(dx, dz); m.box([x, -.035, z], [7.5, .1, len + .15], C.concrete, [0, angle, 0]); m.box([x, .027, z], [6.1, .025, len + .1], C.road, [0, angle, 0]); if (i % 6 < 3) m.box([x, .045, z], [.12, .01, len + .02], C.line, [0, angle, 0]); }
      prev = p;
    }
    m.box([9, -.015, 638], [6.1, .04, 35], C.road);
    for (let i = 0; i < 22; i++) { const z = 536 + i * 4.3, side = i % 2 ? -1 : 1; tree(m, (z < 555 ? 18 : z < 585 ? 0 : 8) + side * (8.5 + i % 3 * 2), z, .85 + (i % 3) * .13); }
    for (const z of [542, 567, 593, 614]) { const x = z < 555 ? 23 : z < 585 ? 5 : 14; m.cylinder([x, 0, z], [x, 4.5, z], .065, C.edge, 6); m.box([x - .45, 4.5, z], [.95, .09, .3], C.navy); }
  });
  chunk(629, 25, m => house(m));
  chunk(646, 25, m => house(m, 26, 647, true));
  chunk(600, 15, m => house(m, -24, 601, true));
  const moving = buffer(new Float32Array(0), true);
  const texture = gl.createTexture(); resources.textures.push(texture); gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 35, 78, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let disposed = false, image = new Image(); image.crossOrigin = 'anonymous';
  image.onload = () => { if (disposed) return; gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); onTextureReady?.(); }; image.src = textureUrl;
  const shadowSize = Math.min(1024, gl.getParameter(gl.MAX_TEXTURE_SIZE)), shadowTexture = gl.createTexture(); resources.textures.push(shadowTexture); gl.bindTexture(gl.TEXTURE_2D, shadowTexture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, shadowSize, shadowSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const depth = gl.createRenderbuffer(); resources.renderbuffers.push(depth); gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, shadowSize, shadowSize);
  const fbo = gl.createFramebuffer(); resources.framebuffers.push(fbo); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowTexture, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth); if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Shadow buffer unavailable'); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.DITHER); gl.clearColor(.96, .95, .91, 1);
  function draw(p, obj) {
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.id);
    for (const [location, size, offset] of [[p.position, 3, 0], [p.normal, 3, 12], [p.color, 3, 24], [p.uv, 2, 36], [p.material, 1, 44]]) if (location >= 0) { gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 48, offset); }
    gl.drawArrays(gl.TRIANGLES, 0, obj.count);
  }
  let cssWidth = 1, cssHeight = 1, renderCount = 0, lastDuration = 0, lastVertices = 0;
  return {
    resize(width, height, dpr = 1) { cssWidth = width; cssHeight = height; const ratio = Math.min(dpr, width < 600 ? 1.5 : 1.75); canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio)); },
    render(s) {
      if (disposed || gl.isContextLost()) return;
      const begin = performance.now(), m = new Mesh();
      if (s.p < .692) airplane(m, s);
      if (s.p < .10) {
        const release = Math.max(0, Math.min(1, (s.p - .035) / .02)), hand = [release * 1.7, 2.04 + .8 * (1 - s.product), 0];
        m.cylinder([2, 1.3, -1], [1.1, 2.8, -1], .1, C.edge, 10);
        m.cylinder([1.1, 2.8, -1], hand, .08, C.metal, 10);
        m.box(hand, [.5, .12, .3], C.blue);
        for (const x of [-.22, .22]) m.box(add(hand, [x, -.19, 0]), [.06, .28, .2], C.metal);
      }
      if (s.p > .30 && s.p < .56) for (const [x, y, z, scale] of [[-22, 14, 170, 1], [25, 20, 222, .8], [-30, 16, 295, 1.2], [23, 12, 354, .9]]) {
        for (let i = -1; i <= 1; i++) m.ellipsoid([x + i * 2.3 * scale, y + (1 - Math.abs(i)) * 1.0, z + Math.sin(s.p * 5) * .5], [3.5 * scale, 1.25 * scale, 2.1 * scale], C.paper, 12, 7);
      }
      if (s.p < .24 || s.p > .62 && s.p < .69) m.group(s.trolley, [0, 0, 0], () => { m.box([0, .74, 0], [1.9, .2, 1.7], C.metal); for (const x of [-.7, .7]) for (const z of [-.6, .6]) wheel(m, [x, .34, z], .25, .17, s.trolley[2] * 2, 0); m.cylinder([-.8, .8, -.7], [-.8, 1.5, -.7], .05, C.navy); });
      if (s.p > .64) truck(m, s.truck);
      if (s.p < .135) for (let i = 0; i < 10; i++) { const z = 1.2 + ((i * .7 + s.p * 40) % 6.7); m.box([0, 1.294 - z * .05625, z], [1.3, .015, .035], C.rubber); }
      packageBox(m, s); courier(m, s);
      gl.bindBuffer(gl.ARRAY_BUFFER, moving.id); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(m.data), gl.DYNAMIC_DRAW); moving.count = m.data.length / 12;
      const target = s.camera.target, size = Math.max(s.camera.size, s.camera.minWidth / (cssWidth / cssHeight)), az = s.camera.azimuth, el = s.camera.elevation;
      const eye = add(target, [Math.sin(az) * Math.cos(el) * 100, Math.sin(el) * 100, -Math.cos(az) * Math.cos(el) * 100]);
      const camera = multiply(ortho(size * cssWidth / cssHeight, size), view(eye, target));
      const lightEye = add(target, [-55, 99, -50]), shadowArea = Math.max(20, size * 1.25);
      const light = multiply(ortho(shadowArea, shadowArea, .1, 250), view(lightEye, target));
      const visible = chunks.filter(c => Math.abs(c.z - target[2]) < c.radius + size * 1.1);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, shadowSize, shadowSize); gl.clearColor(1, 1, 1, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.useProgram(shadow.id); gl.uniformMatrix4fv(shadow.view, false, light); visible.forEach(c => draw(shadow, c)); draw(shadow, moving);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(.96, .95, .91, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.useProgram(main.id); gl.uniformMatrix4fv(main.view, false, camera); gl.uniformMatrix4fv(main.light, false, light); gl.uniform3fv(main.target, target); gl.uniform1f(main.progress, s.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(gl.getUniformLocation(main.id, 'uTexture'), 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shadowTexture); gl.uniform1i(gl.getUniformLocation(main.id, 'uShadow'), 1); gl.uniform1f(gl.getUniformLocation(main.id, 'uShadowSize'), shadowSize); gl.uniform1f(gl.getUniformLocation(main.id, 'uShadowBias'), shadowArea / shadowSize / 250 * 2.5);
      visible.forEach(c => draw(main, c)); draw(main, moving); renderCount++; lastDuration = performance.now() - begin; lastVertices = moving.count + visible.reduce((sum, c) => sum + c.count, 0);
    },
    stats() { return { renderCount, lastDuration, lastVertices, width: canvas.width, height: canvas.height, error: gl.getError() }; },
    dispose() { disposed = true; image.onload = null; image.onerror = null; image.src = ''; for (const [kind, method] of [['programs', 'deleteProgram'], ['buffers', 'deleteBuffer'], ['textures', 'deleteTexture'], ['framebuffers', 'deleteFramebuffer'], ['renderbuffers', 'deleteRenderbuffer']]) resources[kind].forEach(r => gl[method](r)); }
  };
}
const roadPointsForWorld = [[18, 523], [18, 536], [18, 550], [9, 560], [0, 573], [0, 585], [7, 597], [9, 608], [9, 621]];
