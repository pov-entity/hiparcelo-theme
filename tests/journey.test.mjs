import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateJourney, roadAt, localPoint, roadLength } from '../assets/hi-journey-model.js';
const distance = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]));
const limits = [.10,.135,.20,.228,.24,.25,.265,.282,.285,.30,.40,.45,.53,.58,.615,.625,.645,.665,.675,.681,.69,.73,.75,.889,.895,.912,.917,.918,.920,.921,.925,.932,.959,.963,.975,.979,.983,.989,.998];
test('every handoff and camera key is continuous',()=>{
 for(const p of limits){const a=evaluateJourney(p-1e-8),b=evaluateJourney(p+1e-8);for(const field of ['parcel'])assert(distance(a[field],b[field])<.001,field+' jump at '+p);assert(distance(a.camera.target,b.camera.target)<.001,'camera jump at '+p);assert(Math.abs(a.camera.size-b.camera.size)<.001,'camera zoom jump at '+p);}
});
test('ten thousand poses have finite physical and camera states',()=>{
 for(let i=0;i<=10000;i++){const s=evaluateJourney(i/10000);for(const v of [...s.parcel,...s.plane.position,...s.truck.position,...s.camera.target,s.camera.size,s.camera.elevation,s.truck.angle])assert(Number.isFinite(v));assert(s.plane.position[1]>=0);assert(s.camera.size>0);assert(s.stage>=0&&s.stage<=2);assert(s.chapter>=0&&s.chapter<=8);}
});
test('forward, reverse and random seeking reconstruct identical poses',()=>{
 const frames=Array.from({length:501},(_,i)=>JSON.stringify(evaluateJourney(i/500)));
 for(let i=500;i>=0;i--)assert.equal(JSON.stringify(evaluateJourney(i/500)),frames[i]);
 for(const i of [471,8,225,400,50,2,499,100])assert.equal(JSON.stringify(evaluateJourney(i/500)),frames[i]);
});
test('aircraft remains parked until cargo is loaded and the door is closed',()=>{
 for(let i=0;i<=250;i++)assert.deepEqual(evaluateJourney(i/1000).plane.position,[0,0,28]);
 const s=evaluateJourney(.25);assert.equal(s.parent,'aircraft');assert.equal(s.plane.door,0);
});
test('aircraft takes off, crosses the ocean, deploys gear and lands before unloading',()=>{
 assert(evaluateJourney(.28).plane.position[1]===0);assert(evaluateJourney(.30).plane.position[1]>10);assert(evaluateJourney(.4).plane.position[1]>20);
 for(const p of [.58,.60,.615,.625])assert.equal(evaluateJourney(p).plane.position[1],0);
 assert.equal(evaluateJourney(.565).plane.wheels,1);assert.equal(evaluateJourney(.614).plane.door,0);
 assert.equal(evaluateJourney(.625).plane.door,1);
});
test('parcel is rigidly attached inside aircraft including aircraft pitch',()=>{
 for(let i=240;i<625;i++){const s=evaluateJourney(i/1000),a=s.plane.pitch;const offset=[0,Math.cos(a)*1.85-Math.sin(a)*5,Math.sin(a)*1.85+Math.cos(a)*5];assert(distance(s.parcel,s.plane.position.map((v,i)=>v+offset[i]))<1e-9);assert.equal(s.parent,'aircraft');}
});
test('parcel traverses the customs scanner after landing',()=>{const s=evaluateJourney(.67);assert.equal(s.parent,'customs_belt');assert.equal(s.parcel[0],10);assert(s.parcel[2]>=502&&s.parcel[2]<=508);});
test('parcel remains inside truck through curves and until collection',()=>{
 for(let i=730;i<918;i++){const s=evaluateJourney(i/1000);assert(distance(s.parcel,localPoint(s.truck.position,s.truck.angle,[0,1.35,-3.15]))<1e-9);assert.equal(s.parent,'truck');}
});
test('truck cargo doors close before movement and truck stops before courier exits',()=>{
 assert.equal(evaluateJourney(.75).truck.door,0);
 const stop=evaluateJourney(.889).truck.position;
 for(const p of [.889,.891,.895,.90,.95,1])assert.deepEqual(evaluateJourney(p).truck.position,stop);
 assert.equal(evaluateJourney(.89).driver.visible,false);assert.equal(evaluateJourney(.895).driver.visible,true);
 for(const p of [.76,.8,.85])assert.equal(evaluateJourney(p).truck.door,0);
});
test('truck heading follows the road tangent',()=>{
 for(let i=1;i<100;i++){const t=i/100,a=roadAt(t-.0001).position,b=roadAt(t+.0001).position;const angle=Math.atan2(b[0]-a[0],b[2]-a[2]);assert(Math.abs(angle-roadAt(t).angle)<.06);}
 assert(roadLength>100);
});
test('courier holds the same parcel with a fixed local carry position',()=>{
 for(let i=925;i<963;i++){const s=evaluateJourney(i/1000);assert(distance(s.parcel,localPoint(s.driver.position,s.driver.angle,[0,1.05,.52]))<1e-9);assert.equal(s.parent,'courier');}
});
test('parcel stays on doorstep while courier walks away',()=>{
 const a=evaluateJourney(.979);for(const p of [.98,.99,1]){const s=evaluateJourney(p);assert.deepEqual(s.parcel,a.parcel);assert.equal(s.parent,'doorstep');}assert(distance(evaluateJourney(1).driver.position,a.driver.position)>8);
 assert.equal(evaluateJourney(1).complete,1);
});
test('mobile adjusts framing without changing physical scale or paths',()=>{
 for(const p of [.04,.228,.4,.58,.67,.72,.84,.945,.985,1]){const a=evaluateJourney(p),b=evaluateJourney(p,true);assert.deepEqual(a.parcel,b.parcel);assert.deepEqual(a.plane,b.plane);assert.deepEqual(a.truck,b.truck);assert(b.camera.size>a.camera.size);}
});
test('invalid progress clamps safely to start and finish',()=>{assert.deepEqual(evaluateJourney(-100),evaluateJourney(0));assert.deepEqual(evaluateJourney(100),evaluateJourney(1));assert.deepEqual(evaluateJourney(NaN),evaluateJourney(0));});
