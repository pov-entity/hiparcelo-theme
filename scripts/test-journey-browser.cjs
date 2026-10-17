const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
fs.mkdirSync('verification',{recursive:true});
const report={viewports:[],checks:[],errors:[],durations:[]};
const server=spawn(process.execPath,['scripts/preview.mjs'],{env:{...process.env,HP_PREVIEW_PORT:'4184'}});
let browser;
const poses=[0,.04,.10,.135,.18,.20,.218,.228,.24,.25,.282,.30,.4,.53,.565,.58,.615,.625,.645,.67,.69,.72,.73,.75,.78,.84,.889,.895,.912,.918,.93,.945,.963,.975,.979,.99,1];
async function pose(page,p){
 await page.evaluate(p=>{const s=document.querySelector('[data-hpj]'),t=s.querySelector('[data-hpj-track]'),pin=s.querySelector('.hpj-pin'),head=parseFloat(s.style.getPropertyValue('--hpj-top'))||0;const start=t.getBoundingClientRect().top+scrollY-head;window.scrollTo({top:start+p*(t.offsetHeight-pin.offsetHeight),behavior:'instant'});},p);
 await page.waitForFunction(p=>{const s=document.querySelector('[data-hpj]');return s.classList.contains('is-ready')&&Math.abs(Number(s.dataset.hpjProgress)-p)<.0002},p,{polling:'raf',timeout:5000});
 const result=await page.evaluate(()=>{const s=document.querySelector('[data-hpj]'),rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};return {progress:Number(s.dataset.hpjProgress),state:s.hiJourney.state(),stats:s.hiJourney.stats(),pin:rect(s.querySelector('.hpj-pin')),canvas:rect(s.querySelector('canvas')),copy:rect(s.querySelector('.hpj-copy')),overflow:document.documentElement.scrollWidth>innerWidth,error:s.dataset.hpjError,caption:getComputedStyle(s.querySelector('.hpj-caption')).opacity,head:getComputedStyle(s).getPropertyValue('--hpj-top')}});
 assert(!result.error,result.error);assert.equal(result.stats.error,0);assert(!result.overflow,'horizontal overflow');assert(result.canvas.width>200&&result.canvas.height>150,'canvas too small');assert(result.pin.y>=-1&&result.pin.bottom<=await page.evaluate(()=>innerHeight+1),'sticky pin outside viewport');assert(Number(result.caption)>=.74,'caption vanished at boundary');
 report.durations.push(result.stats.lastDuration);
 return result;
}
(async()=>{
 await new Promise((r,j)=>{server.stdout.on('data',b=>{if(b.toString().includes('Homepage preview'))r()});server.on('error',j);server.stderr.on('data',b=>console.error(b.toString()));});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()}: ${r.url()}`)});
 await page.goto('http://127.0.0.1:4184/',{waitUntil:'networkidle'});
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['small-phone',320,568],['tablet',768,1024],['landscape',844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const forward=new Map();
  for(const p of poses){const result=await pose(page,p);forward.set(p,result);if([.228,.4,.72,.945,1].includes(p)&&['desktop','phone'].includes(name))await page.screenshot({path:`verification/final-${name}-${p}.png`});}
  for(const p of [.945,.84,.58,.228,.04]){const reverse=await pose(page,p),expected=forward.get(p);assert.deepEqual(reverse.state,expected.state,`${name} reverse mismatch ${p}`);}
  report.viewports.push({name,width,height,forwardPoses:poses.length,reversePoses:5});console.log('PASS',name);
 }
 await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(100);await pose(page,.4);
 const countBefore=await page.locator('[data-hpj]').evaluate(e=>e.hiJourney.stats().renderCount);
 const imageBefore=await page.locator('canvas[data-hpj-canvas]').screenshot();await page.waitForTimeout(350);
 const imageAfter=await page.locator('canvas[data-hpj-canvas]').screenshot();
 assert.equal(await page.locator('[data-hpj]').evaluate(e=>e.hiJourney.stats().renderCount),countBefore,'renders continue after scroll stops');assert(imageBefore.equals(imageAfter),'pixels move while scroll is stationary');report.checks.push('Stopped scroll: zero additional frames and identical canvas pixels');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(120);assert.equal(await page.locator('.hpj-scroll').evaluate(e=>getComputedStyle(e).display),'none');assert((await page.locator('[data-hpj-static]').boundingBox()).height>100);report.checks.push('Reduced motion switches to complete readable sequence');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(200);await pose(page,.72);assert.equal(await page.locator('canvas[data-hpj-canvas]').count(),1);report.checks.push('Motion preference can be toggled without duplicate canvases');
 await page.locator('[data-hpj-skip]').focus();await page.keyboard.press('Enter');await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>document.activeElement.id),'hpj-after-journey');report.checks.push('Keyboard skip exits story and moves focus to next section');
 await pose(page,.4);await page.locator('[data-hpj]').evaluate(e=>{e.dispatchEvent(new CustomEvent('shopify:section:unload',{bubbles:true}));e.dispatchEvent(new CustomEvent('shopify:section:load',{bubbles:true}));});await page.waitForTimeout(250);await pose(page,.72);assert.equal(await page.locator('canvas[data-hpj-canvas]').count(),1);report.checks.push('Theme editor section unload/reload works');
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const nojs=await context.newPage();await nojs.goto('http://127.0.0.1:4184/');const nojsBounds=await nojs.locator('[data-hpj-static]').boundingBox();assert(nojsBounds.width>300&&nojsBounds.height>400);assert.equal(await nojs.locator('.hpj-scroll').evaluate(e=>getComputedStyle(e).display),'none');report.checks.push('No JavaScript: readable full three-stage sequence');await context.close();
 const fail=await browser.newPage({viewport:{width:390,height:844}});await fail.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl')return null;return get.call(this,type,...args)}});await fail.goto('http://127.0.0.1:4184/');await fail.locator('[data-hpj]').scrollIntoViewIfNeeded();await fail.waitForSelector('[data-hpj].is-static');assert((await fail.locator('[data-hpj-static]').boundingBox()).height>400);report.checks.push('WebGL unavailable: automatic readable fallback');await fail.close();
 const loss=await browser.newPage({viewport:{width:390,height:844}});await loss.goto('http://127.0.0.1:4184/');await pose(loss,.4);await loss.locator('canvas').evaluate(e=>e.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await loss.waitForSelector('[data-hpj].is-static');report.checks.push('Graphics context loss: safe static fallback');await loss.close();
 assert.deepEqual(report.errors,[]);
 const sorted=report.durations.slice().sort((a,b)=>a-b);report.callbackMilliseconds={median:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),scope:'CPU render-submission callback in headless Chromium with software graphics, not device FPS'};delete report.durations;
 fs.writeFileSync('verification/stress-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await browser.close();server.kill();
})().catch(async e=>{console.error(e);if(browser)await browser.close();server.kill();process.exit(1)});
