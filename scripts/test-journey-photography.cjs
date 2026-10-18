const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
fs.mkdirSync('verification/photography',{recursive:true});
const report={viewports:[],checks:[],errors:[],durations:[]};
const server=spawn(process.execPath,['scripts/preview.mjs'],{env:{...process.env,HP_PREVIEW_PORT:'4189'}});
let browser;
const basic=[0,.04,.10,.135,.18,.20,.218,.228,.24,.25,.282,.30,.4,.53,.565,.58,.615,.625,.645,.67,.69,.72,.73,.75,.78,.84,.889,.895,.912,.918,.93,.945,.963,.975,.979,.99,1];
const cuts=[.065,.20,.265,.30,.53,.615,.69,.78,.89,.965,.986];
const poses=[...new Set([...basic,...cuts.flatMap(p=>[p-.006,p,p+.006])])].sort((a,b)=>a-b);
async function scrollToPose(page,p){
 await page.evaluate(p=>{const s=document.querySelector('[data-hpj]'),t=s.querySelector('[data-hpj-track]'),pin=s.querySelector('.hpj-pin'),header=parseFloat(s.style.getPropertyValue('--hpj-top'))||0;window.scrollTo({top:t.getBoundingClientRect().top+scrollY-header+p*(t.offsetHeight-pin.offsetHeight),behavior:'instant'});},p);
}
async function pose(page,p){
 await scrollToPose(page,p);
 try {await page.waitForFunction(p=>{const s=document.querySelector('[data-hpj]'),stats=s.hiJourney?.stats(),distance=s.querySelector('[data-hpj-track]').offsetHeight-s.querySelector('.hpj-pin').offsetHeight,tolerance=Math.max(.0002,1.01/distance);return s.classList.contains('is-ready')&&Math.abs(Number(s.dataset.hpjProgress)-p)<=tolerance&&stats?.mode==='photographic'&&!stats.pending&&stats.visibleScene===stats.scene;},p,{timeout:7000});}
 catch(error){console.error('Photographic pose failed',p,await page.locator('[data-hpj]').evaluate(s=>({class:s.className,progress:s.dataset.hpjProgress,error:s.dataset.hpjError,stats:s.hiJourney?.stats(),viewport:[innerWidth,innerHeight],scroll:scrollY})));await page.screenshot({path:'verification/photography/failure.png'});throw error;}
 const result=await page.locator('[data-hpj]').evaluate(s=>{const stats=s.hiJourney.stats(),pin=s.querySelector('.hpj-pin').getBoundingClientRect();return {state:s.hiJourney.state(),stats,error:s.dataset.hpjError,overflow:document.documentElement.scrollWidth>innerWidth,caption:Number(getComputedStyle(s.querySelector('.hpj-caption')).opacity),pin:{y:pin.y,bottom:pin.bottom},height:innerHeight};});
 assert(!result.error,result.error);assert.equal(result.stats.error,0);assert(!result.overflow);assert(result.caption>=.74);assert(result.pin.y>=-1&&result.pin.bottom<=result.height+1);assert(result.stats.cachedImages<=6,'decoded image cache grows without bound');report.durations.push(result.stats.lastDuration);
 return result;
}
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.on('data',b=>{if(b.toString().includes('Homepage preview'))resolve()});server.stderr.on('data',b=>console.error(b.toString()));server.on('error',reject);server.on('exit',code=>reject(new Error(`Preview exited ${code}`)));});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:900}}),requests=[];
 page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()}: ${r.url()}`)});
 await page.goto('http://127.0.0.1:4189/',{waitUntil:'networkidle'});
 assert(!requests.some(url=>url.includes('hi-journey-photography.js')),'renderer loaded before story approached');
 assert(!requests.some(url=>/hi-journey-photo-(?!packing)/.test(url)),'entire story fetched before visiting');report.checks.push('Photographic renderer and later scenes are deferred until the story approaches');
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['small-phone',320,568],['tablet',768,1024],['landscape',844,390]]){
  await page.setViewportSize({width,height});
  const states=new Map(),pixels=new Map();
  for(const p of poses){const result=await pose(page,p);states.set(p,{state:result.state,layers:result.stats.layers});if([.228,.4,.945].includes(p))pixels.set(p,await page.locator('[data-hpj-canvas]').screenshot());if([.04,.228,.282,.4,.58,.67,.72,.84,.945,.975,1].includes(p)&&['desktop','phone'].includes(name))await page.screenshot({path:`verification/photography/${name}-${p}.png`});}
  for(const p of [.945,.84,.58,.228,.04]){const result=await pose(page,p);assert.deepEqual({state:result.state,layers:result.stats.layers},states.get(p));if(pixels.has(p))assert((await page.locator('[data-hpj-canvas]').screenshot()).equals(pixels.get(p)),`${name}: reverse pixels differ at ${p}`);}
  report.viewports.push({name,width,height,forwardPoses:poses.length,reversePoses:5});console.log('PASS photography',name);
 }
 assert(!requests.some(url=>/hi-journey-(world|film)\.js|hi-journey-materials/.test(url)));report.checks.push('Photographic mode loads neither WebGL materials nor the video renderer');
 await page.setViewportSize({width:1440,height:900});await pose(page,.4);
 const count=await page.locator('[data-hpj]').evaluate(s=>s.hiJourney.stats().renderCount),before=await page.locator('[data-hpj-canvas]').screenshot();await page.waitForTimeout(350);const after=await page.locator('[data-hpj-canvas]').screenshot();assert(before.equals(after));assert.equal(await page.locator('[data-hpj]').evaluate(s=>s.hiJourney.stats().renderCount),count);assert(before.length>10000);report.checks.push('Stopped scrolling holds identical pixels with no additional render frames');
 const cameraBefore=before;await pose(page,.43);assert(!(await page.locator('[data-hpj-canvas]').screenshot()).equals(cameraBefore));report.checks.push('Camera movement visibly changes the photograph within a scene');
 await page.evaluate(async()=>{const s=document.querySelector('[data-hpj]'),t=s.querySelector('[data-hpj-track]'),pin=s.querySelector('.hpj-pin'),header=parseFloat(s.style.getPropertyValue('--hpj-top'))||0,start=t.getBoundingClientRect().top+scrollY-header,distance=t.offsetHeight-pin.offsetHeight;for(const p of [.9,.1,.7,.3,.99,.04,.72]){window.scrollTo({top:start+p*distance,behavior:'instant'});await new Promise(requestAnimationFrame);}});await pose(page,.72);report.checks.push('Rapid arbitrary seeking settles on the latest requested scene');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.equal(await page.locator('.hpj-scroll').evaluate(e=>getComputedStyle(e).display),'none');assert((await page.locator('[data-hpj-static]').boundingBox()).height>300);assert.equal(await page.locator('.hpj-static__photo').count(),3);await page.screenshot({path:'verification/photography/reduced-motion.png'});
 await page.emulateMedia({reducedMotion:'no-preference'});await pose(page,.72);report.checks.push('Reduced motion shows the complete static illustrated sequence and can be toggled back');
 await page.locator('[data-hpj-skip]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'hpj-after-journey');report.checks.push('Keyboard skip exits the pinned story and moves focus');
 await page.locator('[data-hpj]').evaluate(e=>{e.dispatchEvent(new CustomEvent('shopify:section:unload',{bubbles:true}));e.dispatchEvent(new CustomEvent('shopify:section:load',{bubbles:true}));});await pose(page,.4);assert.equal(await page.locator('[data-hpj-canvas]').count(),1);report.checks.push('Theme editor unload/reload releases and restores the renderer');
 const phone=await browser.newPage({viewport:{width:390,height:844}}),phoneRequests=[];phone.on('request',r=>phoneRequests.push(r.url()));await phone.goto('http://127.0.0.1:4189/');await pose(phone,.72);assert(phoneRequests.filter(url=>/hi-journey-photo-/.test(url)).every(url=>/-mobile\.webp/.test(url)));await phone.close();report.checks.push('A phone loads the smaller image variants');
 const reduced=await browser.newPage({reducedMotion:'reduce'}),reducedRequests=[];reduced.on('request',r=>reducedRequests.push(r.url()));await reduced.goto('http://127.0.0.1:4189/');await reduced.locator('[data-hpj]').scrollIntoViewIfNeeded();await reduced.waitForTimeout(150);assert(!reducedRequests.some(url=>/hi-journey-(photography|model|world)\.js/.test(url)));await reduced.close();report.checks.push('Initial reduced motion downloads no animation modules');
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto('http://127.0.0.1:4189/');assert.equal(await nojs.locator('.hpj-scroll').evaluate(e=>getComputedStyle(e).display),'none');assert((await nojs.locator('[data-hpj-static]').boundingBox()).height>300);await nojs.close();report.checks.push('Disabled JavaScript retains the complete illustrated text sequence');
 const broken=await browser.newPage();await broken.route('**/hi-journey-photo-*.webp',route=>route.fulfill({status:503,body:'Unavailable'}));await broken.goto('http://127.0.0.1:4189/');await broken.locator('[data-hpj]').scrollIntoViewIfNeeded();await broken.waitForSelector('[data-hpj].is-static');await broken.close();report.checks.push('Image failure uses the readable fallback');
 const unavailable=await browser.newPage();await unavailable.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='2d'?null:get.call(this,type,...args)}});await unavailable.goto('http://127.0.0.1:4189/');await unavailable.locator('[data-hpj]').scrollIntoViewIfNeeded();await unavailable.waitForSelector('[data-hpj].is-static');await unavailable.close();report.checks.push('Unavailable canvas uses the readable fallback');
 assert.deepEqual(report.errors,[]);const durations=report.durations.sort((a,b)=>a-b);report.callbackMilliseconds={median:durations[Math.floor(durations.length*.5)],p95:durations[Math.floor(durations.length*.95)],max:durations.at(-1),scope:'CPU render-submission callback in headless Chromium, not customer-device FPS'};delete report.durations;fs.writeFileSync('verification/photography/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();server.kill();
})().catch(async error=>{console.error(error);if(browser)await browser.close();server.kill();process.exit(1)});
