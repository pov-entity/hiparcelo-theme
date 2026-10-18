const C = {
  navy: [0.025, .105, .245], blue: [.055, .18, .35], edge: [.18, .29, .43], cream: [.97, .94, .87], paper: [.99, .975, .94],
  ground: [.87, .88, .85], concrete: [.70, .74, .74], road: [.22, .28, .33], line: [.85, .83, .74], metal: [.51, .59, .64], glass: [.15, .29, .36],
  rubber: [.09, .12, .15], gold: [.72, .59, .38], green: [.25, .37, .30], lightGreen: [.44, .53, .39], bark: [.38, .32, .25], skin: [.68, .47, .33]
};
C.parcel = [.025, .105, .245]; C.cardboard = [.61, .49, .34]; C.uniform = [.026, .11, .24]; C.trousers = [.18, .23, .28];
C.lawn = [.37, .43, .28]; C.paving = [.72, .72, .67]; C.lamp = [1, .80, .48]; C.redLamp = [.8, .07, .035]; C.greenLamp = [.06, .65, .32]; C.cloud = [.98, .985, 1];
C.panel = [.075, .17, .31]; C.chrome = [.70, .73, .76]; C.timber = [.36, .245, .16];
C.leaf = [.25,.37,.22]; C.leafLight = [.40,.49,.28];
const materials = new Map([[C.navy,3],[C.blue,3],[C.edge,3],[C.panel,3],[C.metal,4],[C.chrome,4],[C.gold,4],[C.cream,5],[C.paper,5],[C.ground,6],[C.concrete,6],[C.road,7],[C.lawn,8],[C.parcel,9],[C.cardboard,9],[C.green,10],[C.lightGreen,10],[C.glass,11],[C.bark,12],[C.timber,12],[C.uniform,13],[C.trousers,13],[C.skin,14],[C.rubber,15],[C.cloud,16],[C.paving,17],[C.lamp,18],[C.redLamp,18],[C.greenLamp,18]]);
materials.set(C.leaf,19);materials.set(C.leafLight,19);
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
const roundedTemplates = new Map();
const bakedMeshes = new Map();
class Mesh {
  constructor() { this.data = []; this.matrix = identity(); }
  group(p, r, fn) { const old = this.matrix; this.matrix = multiply(old, transform(p, r)); fn(); this.matrix = old; }
  triangle(a, b, c, color, uv, material = 0, normals) {
    const n = normals ? null : norm(cross(sub(b, a), sub(c, a)));
    const sn = normals ? normals[0] : n, axis = Math.abs(sn[1]) > .55 ? 1 : Math.abs(sn[0]) > Math.abs(sn[2]) ? 0 : 2;
    material = material || materials.get(color) || 0;
    const matrix=this.matrix,data=this.data,vertices=[a,b,c],explicit=(material===1||material===19)&&uv;
    for(let i=0;i<3;i++){
      const v=vertices[i],vn=normals?normals[i]:n,x=v[0],y=v[1],z=v[2],nx=vn[0],ny=vn[1],nz=vn[2];
      data.push(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14],matrix[0]*nx+matrix[4]*ny+matrix[8]*nz,matrix[1]*nx+matrix[5]*ny+matrix[9]*nz,matrix[2]*nx+matrix[6]*ny+matrix[10]*nz,color[0],color[1],color[2],explicit?uv[i][0]:axis===0?z:x,explicit?uv[i][1]:axis===1?z:y,material);
    }
  }
  cached(key,build){
    let source=bakedMeshes.get(key);
    if(!source){const mesh=new Mesh();build(mesh);source=new Float32Array(mesh.data);bakedMeshes.set(key,source);}
    const matrix=this.matrix,data=this.data;
    for(let i=0;i<source.length;i+=12){const x=source[i],y=source[i+1],z=source[i+2],nx=source[i+3],ny=source[i+4],nz=source[i+5];data.push(matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14],matrix[0]*nx+matrix[4]*ny+matrix[8]*nz,matrix[1]*nx+matrix[5]*ny+matrix[9]*nz,matrix[2]*nx+matrix[6]*ny+matrix[10]*nz,source[i+6],source[i+7],source[i+8],source[i+9],source[i+10],source[i+11]);}
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
  roundedBox(p, size, radius, color, rotation = [0, 0, 0], baking = false) {
    if(!baking){this.group(p,rotation,()=>this.cached(`rounded/${size}/${radius}/${color}`,m=>m.roundedBox([0,0,0],size,radius,color,[0,0,0],true)));return;}
    const key = `${size.join(',')}/${radius}`;
    let cells = roundedTemplates.get(key);
    if (!cells) {
      cells = [];
      const half = size.map(v => v / 2), core = half.map(v => Math.max(.001,v-radius));
      const coords = h => [-h,-h+radius*.35,-h+radius,h-radius,h-radius*.35,h];
      for (let axis=0;axis<3;axis++) for (const sign of [-1,1]) {
        const u=(axis+1)%3,v=(axis+2)%3, us=coords(half[u]),vs=coords(half[v]);
        const at=(a,b)=>{const raw=[0,0,0];raw[axis]=half[axis]*sign;raw[u]=a;raw[v]=b;const center=raw.map((x,i)=>Math.max(-core[i],Math.min(core[i],x)));const normal=norm(sub(raw,center));return {position:add(center,mul(normal,radius)),normal};};
        for(let j=0;j<vs.length-1;j++) for(let i=0;i<us.length-1;i++) {
          const points=[at(us[i],vs[j]),at(us[i+1],vs[j]),at(us[i+1],vs[j+1]),at(us[i],vs[j+1])];
          if(sign<0)points.reverse();cells.push(points);
        }
      }
      roundedTemplates.set(key,cells);
    }
    this.group(p,rotation,()=>{for(const c of cells){this.triangle(c[0].position,c[1].position,c[2].position,color,null,0,[c[0].normal,c[1].normal,c[2].normal]);this.triangle(c[0].position,c[2].position,c[3].position,color,null,0,[c[0].normal,c[2].normal,c[3].normal]);}});
  }
  torus(p, radius, tube, color, rotation = [0, 0, 0], segments = 24) {
    this.group(p,rotation,()=>{
      const at=(a,b)=>{const n=[Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b),Math.sin(b)];return {p:[(radius+tube*Math.cos(b))*Math.cos(a),(radius+tube*Math.cos(b))*Math.sin(a),tube*Math.sin(b)],n};};
      for(let i=0;i<segments;i++)for(let j=0;j<6;j++){const a=i*Math.PI*2/segments,b=j*Math.PI/3,c=[at(a,b),at(a+Math.PI*2/segments,b),at(a+Math.PI*2/segments,b+Math.PI/3),at(a,b+Math.PI/3)];this.triangle(c[0].p,c[1].p,c[2].p,color,null,0,[c[0].n,c[1].n,c[2].n]);this.triangle(c[0].p,c[2].p,c[3].p,color,null,0,[c[0].n,c[2].n,c[3].n]);}
    });
  }
  fuselage() {
    const profile=[[-10.8,.08],[-9.5,.47],[-8,1.02],[-6,1.43],[-3,1.6],[0,1.6],[3.2,1.6],[5.5,1.55],[6.8,1.42],[7,1.4],[8.4,1.12],[9.4,.73],[10.3,.35],[10.8,.035]], count=40;
    const at=(j,i)=>{const [z,r]=profile[j],angle=i*Math.PI*2/count,lo=profile[Math.max(0,j-1)],hi=profile[Math.min(profile.length-1,j+1)],slope=(hi[1]-lo[1])/(hi[0]-lo[0]);return {p:[Math.cos(angle)*r,2.7+Math.sin(angle)*r*.97,z],n:norm([Math.cos(angle),Math.sin(angle)/.97,-slope])};};
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<count;i++){
      const c=[at(j,i),at(j,i+1),at(j+1,i+1),at(j+1,i)],mid=c.reduce((a,v)=>add(a,mul(v.p,.25)),[0,0,0]);
      if(mid[0]>1.05&&mid[1]>1.5&&mid[1]<3.8&&mid[2]>3.2&&mid[2]<6.8)continue;
      this.triangle(c[0].p,c[1].p,c[2].p,C.navy,null,0,[c[0].n,c[1].n,c[2].n]);this.triangle(c[0].p,c[2].p,c[3].p,C.navy,null,0,[c[0].n,c[2].n,c[3].n]);
    }
  }
  ellipsoid(p, radii, color, segments = 18, rings = 10, omit, baking = false) {
    if(!omit&&!baking){this.group(p,[0,0,0],()=>this.cached(`ellipsoid/${radii}/${segments}/${rings}/${color}`,m=>m.ellipsoid([0,0,0],radii,color,segments,rings,null,true)));return;}
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
function foliage(m,p,radii,scale=1,seed=0,count=92){
  const random=i=>{const f=Math.sin((i+seed*131)*127.1+311.7)*43758.5453;return f-Math.floor(f);};
  for(let i=0;i<count;i++){
    const a=random(i*6)*Math.PI*2,cy=random(i*6+1)*2-1,sr=Math.sqrt(1-cy*cy),reach=Math.cbrt(random(i*6+2));
    const center=add(p,[Math.cos(a)*sr*radii[0]*reach,cy*radii[1]*reach,Math.sin(a)*sr*radii[2]*reach]);
    const size=(.22+random(i*6+3)*.16)*scale;
    m.group(center,[random(i*6+4)*Math.PI,random(i*6+5)*Math.PI*2,a],()=>m.quad([-size*.36,-size*.5,0],[size*.36,-size*.5,0],[size*.36,size*.5,.018*scale],[-size*.36,size*.5,.018*scale],i%4?C.leaf:C.leafLight));
  }
}
function tree(m, x, z, scale = 1) {
  m.cylinder([x,0,z],[x+.06*scale,2.8*scale,z],.13*scale,C.bark,9);
  for(let i=0;i<7;i++){
    const angle=i*2.399,spread=(i<4?.83:.57)*scale,height=(2.5+i*.18)*scale;
    const end=[x+Math.cos(angle)*spread,height,z+Math.sin(angle)*spread];
    m.cylinder([x,1.6*scale,z],end,.045*scale,C.bark,6);
    foliage(m,add(end,[0,.4*scale,0]),[(.76+i%2*.12)*scale,1.04*scale,.78*scale],scale,i+x*3+z*.17,128);
  }
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
    m.box([0, .05, 0], [17, .25, 18], C.lawn);
    m.box([0, 2, 0], [11, 4, 8], C.paper);
    m.box([0, 4.2, .5], [11.7, .5, 9.6], C.navy);
    for (let i = -5; i <= 5; i++) m.box([i, 4.48, .5], [.025, .04, 9.5], C.edge);
    m.box([-3.7, 1.9, -4.06], [2.3, 2.3, .1], C.glass);
    m.box([3.3, 1.9, -4.06], [2.9, 2.3, .1], C.glass);
    for(const [wx,ww] of [[-3.7,2.3],[3.3,2.9]]) {for(const side of [-1,1])m.box([wx+side*(ww/2+.025),1.9,-4.14],[.075,2.48,.09],C.edge);for(const h of [.71,3.09])m.box([wx,h,-4.14],[ww+.12,.075,.09],C.edge);m.box([wx,.64,-4.14],[ww+.25,.12,.3],C.paving);}
    for (const x0 of [-3.7, 3.3]) m.box([x0, 1.9, -4.13], [.04, 2.3, .04], C.line);
    m.roundedBox([0,1.45,-4.06],[1.7,2.9,.12],.035,C.timber);
    for(let i=-3;i<=3;i++)m.box([i*.22,1.45,-4.128],[.008,2.72,.008],C.bark);
    for (const x0 of [-.82, .82]) m.box([x0, 1.47, -4.15], [.055, 2.95, .05], C.gold);
    m.roundedBox([.53,1.35,-4.17],[.055,.26,.045],.015,C.chrome);
    m.box([0, 3.25, -4.8], [3.2, .18, 2], C.navy);
    m.roundedBox([0,.1,-5],[3.6,.2,2.1],.025,C.paving);
    m.box([0,.204,-4.55],[1.3,.008,.43],C.rubber);
    for (const x0 of [-1.5, 1.5]) { m.roundedBox([x0,1.9,-4.2],[.2,.45,.15],.025,C.edge); m.box([x0,1.88,-4.3],[.12,.2,.02],C.lamp); }
    for (let zz = -8; zz <= -6; zz += .8) m.roundedBox([0,.035,zz],[2.2,.07,.6],.022,C.paving);
    for (const x0 of [-3, 3]) for (const zz of [-6, -7.4]) {
      m.roundedBox([x0,.3,zz],[1,.6,1],.025,C.concrete);m.box([x0,.605,zz],[.88,.015,.88],C.bark);
      for(let stem=0;stem<5;stem++){const a=stem*2.399,tip=[x0+Math.cos(a)*.26,1.02+(stem%3)*.11,zz+Math.sin(a)*.26];m.cylinder([x0,.61,zz],tip,.014,C.bark,5);foliage(m,tip,[.25,.3,.25],.65,stem+x0*7+zz,25);}
    }
    if (!small) { tree(m, -6.6, -5, 1.2); tree(m, 6.5, 2, 1.3); m.box([6.5, .6, -5.5], [.2, 1.2, .2], C.edge); m.box([6.5, 1.3, -5.5], [.9, .5, .4], C.navy); }
  });
}
function airplane(m, state) {
  const s = state.plane;
  m.group(s.position, [s.pitch, 0, 0], () => {
    m.cached('airframe',m=>{
    m.fuselage();
    m.box([0, 1.5, 5], [2.6, .1, 4], C.rubber);
    const wing = [[0, 1.5], [4, -.2], [14, -5.8], [14, -7.1], [4, -4.2], [0, -4]];
    for (const sign of [-1, 1]) {
      m.prism(wing.map(v => [v[0] * sign, v[1]]), 2.1, .16, C.navy);
      m.cylinder([sign*1.55,2.21,.84],[sign*13.85,2.21,-5.8],.027,C.metal,6);
      m.cylinder([sign*3.1,2.268,-3.2],[sign*12.8,2.268,-6.55],.009,C.panel,5);
      for(const t of [.32,.62,.84])m.cylinder([sign*(2+t*12),2.268,.6-t*6.6],[sign*(2+t*12),2.268,-3.7-t*3],.008,C.panel,5);
      m.prism([[0, -7], [sign * 5.4, -9], [sign * 5.4, -10.1], [0, -9.7]], 2.6, .12, C.blue);
      m.box([sign*5.5,1.92,-2.8],[.14,.8,1.9],C.edge,[.1,0,0]);
      m.ellipsoid([sign * 5.5, 1.3, -2.5], [.7, .72, 1.9], C.blue, 24, 14);
      m.torus([sign*5.5,1.3,-.78],.47,.075,C.chrome);
      m.ellipsoid([sign*5.5,1.3,-.84],[.43,.43,.08],C.rubber,20,6);
      m.group([sign*5.5,1.3,-.73],[0,0,0],()=>{for(let blade=0;blade<16;blade++){const a=blade*Math.PI/8,b=a+.17;m.triangle([Math.cos(a)*.12,Math.sin(a)*.12,0],[Math.cos(b)*.40,Math.sin(b)*.40,-.025],[Math.cos(a+.04)*.40,Math.sin(a+.04)*.40,-.015],C.metal);}m.ellipsoid([0,0,.035],[.13,.13,.20],C.chrome,12,8);});
      m.box([sign * 13.8, 2.4, -6.4], [.13, .65, 1.1], C.blue, [0, 0, -sign * .25]);
      m.ellipsoid([sign*13.88,2.43,-5.89],[.1,.085,.14],sign<0?C.redLamp:C.greenLamp,8,5);
      m.quad([sign*.065,3.63,8.15],[sign*.72,3.46,8.15],[sign*.42,3.25,9.12],[sign*.065,3.40,9.12],C.glass);
      m.cylinder([sign*.065,3.64,8.15],[sign*.065,3.41,9.12],.022,C.edge,6);
    }
    m.ellipsoid([0,4.26,-.9],[.14,.055,.45],C.paper,12,6);
    m.ellipsoid([0,4.28,1.2],[.065,.065,.1],C.redLamp,8,5);
    m.group([0, 2.6, -7.8], [0, 0, Math.PI / 2], () => m.prism([[0, 0], [4.4, -1.8], [4.4, -2.8], [0, -2.3]], -.09, .18, C.blue));
    });
    m.group([1.15,3.8,5],[0,0,s.door*2.4],()=>{
      const at=(j,k)=>{const y=3.8-j*2.15/8,z=3.2+k*3.6/4,r=z<5.5?1.6-(z-3.2)*.05/2.3:1.55-(z-5.5)*.13/1.3,x=Math.sqrt(Math.max(.1,r*r-((y-2.7)/.97)**2));return {p:[x-1.15,y-3.8,z-5],n:norm([x,(y-2.7)/(.97*.97),.07])};};
      for(let j=0;j<8;j++)for(let k=0;k<4;k++){const c=[at(j,k),at(j+1,k),at(j+1,k+1),at(j,k+1)];m.triangle(c[0].p,c[1].p,c[2].p,C.blue,null,0,[c[0].n,c[1].n,c[2].n]);m.triangle(c[0].p,c[2].p,c[3].p,C.blue,null,0,[c[0].n,c[2].n,c[3].n]);}
      for(const z of [-1.4,1.4])m.cylinder([-.02,.025,z-.14],[.06,.025,z+.14],.035,C.chrome,8);
      m.box([.47,-1.08,1.4],[.035,.1,.25],C.chrome);
    });
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
    m.group([0,0,0],[-spin,0,0],()=>m.cached(`wheel/${r}/${width}`,m=>{
    m.cylinder([-width*.34,0,0],[width*.34,0,0],r*.92,C.rubber,24);
    for (const sign of [-1, 1]) {
      m.torus([sign*width*.28,0,0],r*.80,r*.20,C.rubber,[0,Math.PI/2,0],20);
      m.cylinder([sign * width * .51, 0, 0], [sign * width * .54, 0, 0], r * .54, C.chrome, 16);
      m.cylinder([sign*width*.54,0,0],[sign*width*.57,0,0],r*.18,C.edge,12);
      for (let k = 0; k < 6; k++) {
        const angle = k * Math.PI / 3;
        m.cylinder([sign*width*.55,Math.sin(angle)*r*.34,Math.cos(angle)*r*.34],[sign*width*.57,Math.sin(angle)*r*.34,Math.cos(angle)*r*.34],r*.06,C.rubber,6);
      }
    }
    }));
  });
}
function truck(m, s) {
  m.group(s.position, [0, s.angle, 0], () => {
    m.cached('truck-cargo',m=>{
    m.box([0, .73, 0], [2.45, .32, 7.6], C.edge);
    m.box([0, 1.01, -1], [2.7, .16, 5.2], C.metal);
    for (const x of [-1.36, 1.36]) {m.box([x, 2.35, -1], [.14, 2.7, 5.2], C.navy);for(let z=-3.25;z<1.4;z+=.32)m.box([x*1.054,2.35,z],[.012,2.45,.024],C.panel);m.box([x*1.054,1.14,-1],[.02,.045,5.05],C.chrome);}
    m.roundedBox([0,3.73,-1],[2.9,.16,5.5],.055,C.blue);
    m.box([0, 2.4, 1.6], [2.75, 2.7, .12], C.navy);
    for (const x of [-1.38, 1.38]) for (const z of [-3.5, 1.5]) m.box([x, 2.35, z], [.08, 2.8, .09], C.metal);
    });
    for (const sign of [-1, 1]) m.group([sign * 1.35, 2.36, -3.6], [0, -sign * s.door * 1.65, 0], () => {
      m.box([-sign * .665, 0, 0], [1.32, 2.65, .12], C.navy); m.box([-sign * .12, -.1, -.08], [.055, 1.3, .04], C.chrome);
      for(const y of [-.91,.83])m.box([-sign*.09,y,-.085],[.15,.09,.06],C.chrome);
      m.box([-sign*.20,-.1,-.095],[.22,.07,.055],C.metal);
      for(const y of [-.94,.92])m.box([0,y,-.09],[.1,.22,.07],C.metal);
    });
    m.cached('truck-cab',m=>{
    m.roundedBox([0,1.65,2.8],[2.65,1.4,2.25],.14,C.blue);
    m.roundedBox([0,2.6,2.5],[2.75,.8,2.15],.14,C.navy);
    m.box([0, 2.45, 3.65], [2.37, .8, .1], C.glass, [-.24, 0, 0]);
    m.roundedBox([0,1.03,3.95],[2.6,.2,.15],.045,C.chrome);
    m.box([0, 1.46, 3.91], [1.15, .37, .05], C.rubber);
    for(let row=0;row<4;row++)m.box([0,1.32+row*.085,3.947],[1.08,.018,.025],C.chrome);
    m.box([0,1.15,4.04],[.55,.12,.015],C.paper);
    for(const side of [-1,1])m.cylinder([side*.56,2.10,3.8],[side*.27,2.38,3.738],.018,C.rubber,6);
    });
    for (const sign of [-1, 1]) {
      m.roundedBox([sign*.98,1.65,3.94],[.38,.23,.08],.03,C.lamp);
      m.cylinder([sign*1.25,2.2,3.18],[sign*1.58,2.32,3.1],.025,C.edge,6);
      m.roundedBox([sign*1.58,2.38,3.1],[.22,.36,.17],.045,C.navy);
      m.box([sign*1.59,2.38,3.0],[.15,.28,.018],C.chrome);
      m.group([sign * 1.39, 1.98, 3.35], [0, sign < 0 ? s.cabDoor * 1.15 : 0, 0], () => {
        m.box([0, 0, -.65], [.1, 1.7, 1.4], C.blue); m.box([sign * .06, .4, -.65], [.02, .65, 1.15], C.glass); m.box([sign * .09, -.12, -.95], [.05, .07, .3], C.metal);
      });
      m.box([sign * 1.1, 1.05, -3.67], [.28, .2, .08], C.redLamp);
      m.box([sign*1.448,1.2,-2.1],[.025,.07,.19],C.lamp);
      for (const z of [-2.65, 2.7]) wheel(m, [sign * 1.28, .61, z], .59, .4, -s.distance / .59, z > 0 ? s.steer : 0);
    }
  });
}
function packageBox(m, s) {
  m.group(s.parcel, [0, s.parcelAngle, 0], () => {
    const w = .82, h = .52, d = .62;
    m.box([0, -.23, 0], [w, .06, d], C.parcel);
    for (const x of [-.395, .395]) {m.box([x,0,0],[.03,h,d],C.parcel);m.box([x*.955,.01,0],[.004,.47,.57],C.cardboard);}
    for (const z of [-.295, .295]) {m.box([0,0,z],[w,h,.03],C.parcel);m.box([0,.01,z*.945],[.76,.47,.004],C.cardboard);}
    for(const x of [-.378,.378])m.box([x,.259,0],[.012,.004,.58],C.cardboard);
    m.box([0, .8 * (1 - s.product) - .06, 0], [.34, .22, .25], C.cream, [0, .25, 0]);
    for (const x of [-.27, .27]) m.ellipsoid([x, .12 + .5 * (1 - s.padding), 0], [.1, .08, .24], C.paper, 8, 4);
    m.group([0, .28, -.32], [-s.boxLid * 1.95, 0, 0], () => {
      m.box([0, 0, .32], [.85, .055, .66], C.parcel, [0, 0, 0], 1);
      m.box([0,-.029,.32],[.81,.003,.62],C.cardboard);
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
      m.cylinder([sign*.13,hip,0],knee,.09,C.trousers,12);m.ellipsoid(knee,[.087,.10,.089],C.trousers,10,6);m.cylinder(knee,ankle,.075,C.trousers,12);
      m.roundedBox(add(ankle,[0,-.045,.06]),[.19,.12,.35],.045,C.rubber);
      m.box(add(ankle,[0,-.098,.06]),[.19,.015,.34],C.edge);
    }
    const lean = s.bend * .29;
    m.ellipsoid([0,hip+.33,lean],[.25,.36,.16],C.uniform,20,14);
    m.cylinder([0,hip+.60,lean+.02],[0,hip+.76,lean+.03],.075,C.skin,12);
    m.box([0,hip+.025,lean],[.34,.055,.24],C.rubber);
    m.box([0,hip+.025,lean+.127],[.055,.045,.012],C.chrome);
    for(const sign of [-1,1])m.box([sign*.063,hip+.595,lean+.105],[.09,.09,.025],C.blue,[0,0,sign*.4]);
    m.box([-.105,hip+.41,lean+.157],[.105,.036,.012],C.cream);
    m.cylinder([0,hip+.19,lean+.16],[0,hip+.56,lean+.115],.006,C.edge,5);
    m.ellipsoid([0,hip+.79,lean+.03],[.145,.195,.145],C.skin,20,14);
    m.ellipsoid([0,hip+.725,lean+.048],[.116,.108,.127],C.skin,16,10);
    for(const sign of [-1,1]){
      m.ellipsoid([sign*.142,hip+.79,lean+.018],[.026,.052,.03],C.skin,10,7);
      m.ellipsoid([sign*.052,hip+.815,lean+.160],[.015,.009,.006],C.rubber,8,5);
      m.cylinder([sign*.028,hip+.837,lean+.159],[sign*.075,hip+.837,lean+.147],.007,C.bark,5);
    }
    m.ellipsoid([0,hip+.785,lean+.168],[.027,.04,.036],C.skin,12,8);
    m.cylinder([-.036,hip+.731,lean+.160],[.036,hip+.731,lean+.160],.006,C.bark,6);
    m.ellipsoid([0,hip+.94,lean+.02],[.16,.075,.15],C.uniform,18,10);
    m.roundedBox([0,hip+.91,lean+.16],[.25,.027,.19],.013,C.uniform);
    const inverse = transform([0, 0, 0], [0, -s.angle, 0]);
    const parcelLocal = point(inverse, sub(state.parcel, s.position));
    for (const sign of [-1, 1]) {
      const shoulder = [sign * .23, hip + .52, lean];
      const hand = s.carrying ? [parcelLocal[0] + sign * .38, parcelLocal[1] - .08, parcelLocal[2]] : [sign * .29, hip - .06, -sign * stride * .8 + .04];
      const elbow = [(shoulder[0] + hand[0]) * .5 + sign * .08, (shoulder[1] + hand[1]) * .5 - .12, (shoulder[2] + hand[2]) * .5];
      m.ellipsoid(shoulder,[.092,.10,.10],C.uniform,12,8);
      m.cylinder(shoulder,elbow,.078,C.uniform,12);m.ellipsoid(elbow,[.069,.074,.07],C.skin,10,6);m.cylinder(elbow,hand,.052,C.skin,12);m.ellipsoid(hand,[.06,.065,.06],C.skin,12,8);
      if(s.carrying)for(let finger=0;finger<3;finger++)m.cylinder(add(hand,[-sign*.026,-.016+finger*.025,.028]),add(hand,[-sign*.05,-.017+finger*.025,.058]),.010,C.skin,6);
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
uniform sampler2D uTexture; uniform sampler2D uShadow; uniform sampler2D uSurface; uniform sampler2D uDetail; uniform float uShadowSize; uniform float uShadowBias; uniform float uProgress; uniform vec3 uTarget; uniform vec3 uViewDirection; uniform vec3 uParcel;
float visibility(vec3 n){vec3 s=vShadow.xyz*.5+.5;if(s.x<0.0||s.x>1.0||s.y<0.0||s.y>1.0)return 1.0;float bias=max(.00012,uShadowBias*(2.0-dot(n,normalize(vec3(-.5,.9,-.45)))));float lit=0.0,spread=vMaterial>1.5&&vMaterial<2.5?3.0:1.0;for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){vec3 encoded=texture2D(uShadow,s.xy+vec2(float(x),float(y))*spread/uShadowSize).rgb;float d=dot(encoded,vec3(1.0,1.0/255.0,1.0/65025.0));lit+=s.z-bias<=d?1.0:.0;}}return lit/9.0;}
vec2 atlasUv(float tile,vec2 uv){return (vec2(mod(tile,4.0),floor(tile/4.0))+.006+fract(uv)*.988)*.25;}
vec3 sky(vec3 ray){float h=clamp(ray.y*.8+.3,0.0,1.0);vec3 c=mix(vec3(.60,.66,.71),vec3(.19,.33,.52),h);if(ray.y<0.0)c=mix(c,vec3(.23,.215,.185),clamp(-ray.y*2.0,0.0,1.0));return c;}
vec3 fresnel(vec3 f0,float d){return f0+(1.0-f0)*pow(1.0-clamp(d,0.0,1.0),5.0);}
vec3 finish(vec3 color){color=clamp((color*(2.51*color+.03))/(color*(2.43*color+.59)+.14),0.0,1.0);return pow(color,vec3(1.0/2.2));}
void main(){
  float mat=floor(vMaterial+.5),tile=2.0,density=2.0,rough=.75,metal=0.0,bump=.30;
  vec3 n=normalize(vNormal),base=vColor,V=normalize(uViewDirection),L=normalize(vec3(-.5,.9,-.45));
  if(mat==19.0){vec2 q=vUv*2.0-1.0;if(abs(q.x)>.94*(1.0-q.y*q.y)*(1.0-.20*q.y))discard;if(!gl_FrontFacing)n=-n;}
  if(mat==3.0){tile=0.0;density=3.0;rough=.26;metal=.18;bump=.06;}
  if(mat==4.0){tile=1.0;density=3.0;rough=.28;metal=.86;bump=.12;}
  if(mat==5.0){tile=2.0;density=3.0;rough=.9;bump=.55;}
  if(mat==6.0){tile=3.0;density=.55;rough=.88;bump=.45;}
  if(mat==7.0){tile=4.0;density=3.0;rough=.96;bump=.5;}
  if(mat==8.0){tile=5.0;density=2.6;rough=.95;bump=.65;}
  if(mat==9.0||mat==1.0){tile=6.0;density=9.0;rough=.82;bump=.17;}
  if(mat==10.0){tile=7.0;density=4.5;rough=.77;bump=.6;}
  if(mat==11.0){tile=0.0;density=1.0;rough=.085;metal=.08;bump=0.0;}
  if(mat==12.0){tile=8.0;density=1.1;rough=.64;bump=.35;}
  if(mat==13.0){tile=9.0;density=9.0;rough=.96;bump=.16;}
  if(mat==14.0){tile=12.0;density=8.0;rough=.61;bump=.08;}
  if(mat==15.0){tile=10.0;density=5.0;rough=.95;bump=.18;}
  if(mat==16.0){tile=15.0;density=.25;rough=1.0;bump=.12;}
  if(mat==17.0){tile=11.0;density=.75;rough=.85;bump=.4;}
  if(mat==19.0){tile=7.0;density=.85;rough=.9;bump=.35;}
  vec2 uv=atlasUv(tile,vUv*density);vec3 surface=texture2D(uSurface,uv).rgb;vec3 detail=texture2D(uDetail,uv).rgb;
  if(mat==1.0)base=texture2D(uTexture,vec2(vUv.y,1.0-vUv.x)*.96+.02).rgb;
  else base*=mix(vec3(.72),vec3(1.28),surface);
  if(mat==19.0)base*=.86+.28*abs(vUv.x-.5)+.10*smoothstep(.02,.0,abs(vUv.x-.5));
  rough=clamp(rough*(.82+.36*detail.b),.065,1.0);
  vec3 tangent=abs(n.y)>.55?vec3(1,0,0):abs(n.x)>abs(n.z)?vec3(0,0,1):vec3(1,0,0);
  tangent=normalize(tangent-n*dot(n,tangent));vec3 bitangent=normalize(cross(n,tangent));n=normalize(n+tangent*(detail.r-.5)*bump+bitangent*(detail.g-.5)*bump);
  if(mat==2.0){
    vec2 q=vPosition.xz;float t=uProgress*30.0;
    float warp=texture2D(uSurface,atlasUv(13.0,q*.014)).r*12.0;
    float w0=dot(q,vec2(.71,.44))*2.8+t+warp,w1=dot(q,vec2(-.83,.56))*7.7-t*.67+warp*1.7,w2=dot(q,vec2(.51,-.92))*17.5+t*.33;
    vec2 ripple=texture2D(uDetail,atlasUv(13.0,q*.17+vec2(t*.001,0.0))).rg-.5,ripple2=texture2D(uDetail,atlasUv(13.0,q.yx*.051+vec2(.3,-t*.0007))).rg-.5;
    n=normalize(vec3(.07*cos(w0)+.03*cos(w1)+ripple.x*1.35+ripple2.y*.7,1.0,.06*cos(w0)-.04*cos(w1)+ripple.y*1.35+ripple2.x*.7));
    float swell=.48*sin(dot(q,vec2(.15,.23))+t*.24)+.30*sin(w0)+.16*sin(w1)+.06*sin(w2);
    base=vec3(.055,.205,.30)*(1.0+swell*.24);rough=.14;metal=.04;
    float shore=min(abs(q.y-114.0),abs(q.y-415.0));float foam=(1.0-smoothstep(.0,1.7,shore+sin(q.x*.7+t*.2)*.65))*.6;
    base=mix(base,vec3(.72,.79,.77),foam);
  }
  base=pow(clamp(base,0.0,1.0),vec3(2.2));
  vec3 H=normalize(L+V);float NoL=max(dot(n,L),0.0),NoV=max(dot(n,V),.015),NoH=max(dot(n,H),0.0),VoH=max(dot(V,H),0.0);
  vec3 f0=mix(vec3(.04),base,metal),F=fresnel(f0,VoH);float a=rough*rough,a2=a*a,d=NoH*NoH*(a2-1.0)+1.0;
  float D=a2/(3.14159265*d*d+.00001),k=(rough+1.0)*(rough+1.0)/8.0,G=NoL/(NoL*(1.0-k)+k)*NoV/(NoV*(1.0-k)+k);
  vec3 specular=F*(D*G/max(4.0*NoL*NoV,.001)),diffuse=(1.0-F)*(1.0-metal)*base/3.14159265;
  float shade=visibility(n);vec3 color=(diffuse+specular)*vec3(3.65,3.44,3.15)*NoL*mix(.12,1.0,shade);
  vec3 ambient=mix(vec3(.23,.21,.17),vec3(.40,.50,.63),n.y*.5+.5);
  float ao=mix(.84,1.0,smoothstep(.0,.45,vPosition.y));
  vec2 parcelDistance=(vPosition.xz-uParcel.xz)/vec2(.58,.46);float contact=exp(-dot(parcelDistance,parcelDistance)*1.7)*exp(-max(uParcel.y-.26-vPosition.y,0.0)*8.0);
  if(vPosition.y<uParcel.y-.23)ao*=1.0-contact*.30;
  color+=base*ambient*.68*ao*(1.0-metal);
  vec3 reflected=sky(reflect(-V,n));vec3 envF=fresnel(f0,NoV);color+=reflected*envF*(1.0-rough*.68)*ao;
  if(mat==3.0||mat==11.0){float band=pow(max(0.0,1.0-abs(dot(reflect(-V,n),normalize(vec3(-.25,.7,-.67))))),9.0);color+=vec3(.17,.22,.29)*band*(mat==11.0?.70:.24);}
  if(mat==2.0){float f=.02+.98*pow(1.0-NoV,5.0);color=mix(base*vec3(.55,.75,.92),reflected,f*.8+.12)+specular*vec3(3.4,3.2,2.9)*NoL*shade;color*=mix(.91,1.0,shade);}
  if(mat==10.0||mat==19.0)color+=base*vec3(.22,.30,.12)*pow(max(0.0,dot(-L,V)),2.0)*.3;
  if(mat==14.0)color+=base*vec3(.22,.06,.025)*(1.0-NoL)*.32;
  if(mat==18.0)color+=pow(vColor,vec3(2.2))*1.8;
  float haze=smoothstep(60.0,230.0,length(vPosition.xz-uTarget.xz));color=mix(color,vec3(.72,.78,.83),haze*.30);
  gl_FragColor=vec4(finish(color),1.0);
}`;
const shadowVertex = `attribute vec3 aPosition;attribute vec2 aUv;attribute float aMaterial;uniform mat4 uView;varying vec2 vUv;varying float vMaterial;void main(){vUv=aUv;vMaterial=aMaterial;gl_Position=uView*vec4(aPosition,1.0);}`;
const shadowFragment = `precision highp float;varying vec2 vUv;varying float vMaterial;void main(){if(vMaterial>18.5&&vMaterial<19.5){vec2 q=vUv*2.0-1.0;if(abs(q.x)>.94*(1.0-q.y*q.y)*(1.0-.20*q.y))discard;}vec3 encoded=fract(gl_FragCoord.z*vec3(1.0,255.0,65025.0));encoded.xy-=encoded.yz/255.0;gl_FragColor=vec4(encoded,1.0);}`;
export function createRenderer(canvas, textureUrl, onTextureReady, materialUrls = {}) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
  if (!gl) throw new Error('WebGL unavailable');
  for (let i = 0; i < gl.getParameter(gl.MAX_VERTEX_ATTRIBS); i++) gl.disableVertexAttribArray(i);
  const resources = { programs: [], buffers: [], textures: [], framebuffers: [], renderbuffers: [] };
  function program(vs, fs) {
    const shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type, i) => { const shader = gl.createShader(type); gl.shaderSource(shader, i ? fs : vs); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader)); return shader; });
    const p = gl.createProgram(); shaders.forEach(s => gl.attachShader(p, s)); gl.linkProgram(p); shaders.forEach(s => gl.deleteShader(s)); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); resources.programs.push(p);
    return { id: p, position: gl.getAttribLocation(p, 'aPosition'), normal: gl.getAttribLocation(p, 'aNormal'), color: gl.getAttribLocation(p, 'aColor'), uv: gl.getAttribLocation(p, 'aUv'), material: gl.getAttribLocation(p, 'aMaterial'), view: gl.getUniformLocation(p, 'uView'), light: gl.getUniformLocation(p, 'uLight'), target: gl.getUniformLocation(p, 'uTarget'), progress: gl.getUniformLocation(p, 'uProgress'), viewDirection: gl.getUniformLocation(p,'uViewDirection'), parcel: gl.getUniformLocation(p,'uParcel') };
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
    m.box([0, -.18, 586], [160, .22, 112], C.lawn);
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
  let disposed = false;
  const images = [];
  function loadMap(url, pixel, mipmap = false) {
    const texture=gl.createTexture();resources.textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(pixel));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    if(url){const image=new Image();images.push(image);image.crossOrigin='anonymous';image.onload=()=>{if(disposed)return;gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);if(mipmap){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}onTextureReady?.();};image.src=url;}
    return texture;
  }
  const texture=loadMap(textureUrl,[8,35,78,255]),surfaceTexture=loadMap(materialUrls.color,[128,128,128,255],true),detailTexture=loadMap(materialUrls.detail,[128,128,200,255],true);
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
        for(let i=-2;i<=2;i++)m.ellipsoid([x+i*1.9*scale,y+(2-Math.abs(i))*.65,z+Math.sin(s.p*5)*.5+Math.sin(i*2)*.7],[2.6*scale,(1.0+Math.cos(i)*.2)*scale,1.8*scale],C.cloud,16,10);
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
      gl.uniform3fv(main.viewDirection,norm(sub(eye,target)));gl.uniform3fv(main.parcel,s.parcel);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(gl.getUniformLocation(main.id, 'uTexture'), 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, shadowTexture); gl.uniform1i(gl.getUniformLocation(main.id, 'uShadow'), 1); gl.uniform1f(gl.getUniformLocation(main.id, 'uShadowSize'), shadowSize); gl.uniform1f(gl.getUniformLocation(main.id, 'uShadowBias'), shadowArea / shadowSize / 250 * 2.5);
      gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,surfaceTexture);gl.uniform1i(gl.getUniformLocation(main.id,'uSurface'),2);gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,detailTexture);gl.uniform1i(gl.getUniformLocation(main.id,'uDetail'),3);
      visible.forEach(c => draw(main, c)); draw(main, moving); renderCount++; lastDuration = performance.now() - begin; lastVertices = moving.count + visible.reduce((sum, c) => sum + c.count, 0);
    },
    stats() { return { renderCount, lastDuration, lastVertices, width: canvas.width, height: canvas.height, error: gl.getError() }; },
    dispose() { disposed = true; images.forEach(image=>{image.onload=null;image.onerror=null;image.src='';}); for (const [kind, method] of [['programs', 'deleteProgram'], ['buffers', 'deleteBuffer'], ['textures', 'deleteTexture'], ['framebuffers', 'deleteFramebuffer'], ['renderbuffers', 'deleteRenderbuffer']]) resources[kind].forEach(r => gl[method](r)); }
  };
}
const roadPointsForWorld = [[18, 523], [18, 536], [18, 550], [9, 560], [0, 573], [0, 585], [7, 597], [9, 608], [9, 621]];
