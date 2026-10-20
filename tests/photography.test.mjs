import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePhotoStory } from '../assets/hi-journey-photography.js';

const visualWeights = state => Object.fromEntries(state.layers.map((layer,index) => {
  const weight = state.layers.length === 1 ? 1 : index ? layer.opacity : 1-state.layers[1].opacity;
  return [layer.key,[weight,...layer.camera.map(value=>value*weight)]];
}));
test('twenty thousand scroll poses have finite camera states and no visual cut discontinuities',()=>{
  let previous;
  for(let i=0;i<=20000;i++){
    const state=evaluatePhotoStory(i/20000),weights=visualWeights(state);
    assert(state.layers.length>=1&&state.layers.length<=2);
    for(const layer of state.layers){assert(layer.opacity>=0&&layer.opacity<=1);assert(layer.camera.every(Number.isFinite));assert(layer.camera[0]>=1&&layer.camera[0]<=1.2);}
    if(previous)for(const key of new Set([...Object.keys(previous),...Object.keys(weights)])){
      const a=previous[key]||[0,0,0,0],b=weights[key]||[0,0,0,0];assert(Math.max(...a.map((value,j)=>Math.abs(value-b[j])))<.035,`visible cut near ${i/20000}`);
    }
    previous=weights;
  }
});
test('reverse and arbitrary seeking reproduce exactly the same photographic camera and blends',()=>{
  const poses=Array.from({length:501},(_,i)=>i/500),states=new Map(poses.map(p=>[p,evaluatePhotoStory(p)]));
  for(const p of poses.slice().reverse())assert.deepEqual(evaluatePhotoStory(p),states.get(p));
  for(let i=0;i<1000;i++){const p=poses[(i*73)%poses.length];assert.deepEqual(evaluatePhotoStory(p),states.get(p));}
});
test('the story begins with packing and holds the delivered parcel, including invalid progress',()=>{
  assert.equal(evaluatePhotoStory(0).layers[0].key,'packing');assert.equal(evaluatePhotoStory(1).layers[0].key,'delivered');
  assert.deepEqual(evaluatePhotoStory(-2),evaluatePhotoStory(0));assert.deepEqual(evaluatePhotoStory(4),evaluatePhotoStory(1));assert.deepEqual(evaluatePhotoStory(NaN),evaluatePhotoStory(0));
});
