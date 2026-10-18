const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {spawn,execFileSync}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root='verification/film';
fs.mkdirSync(root,{recursive:true});
for(const [name,size] of [['wide','640x360'],['mobile','360x640']]){
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i',`testsrc2=size=${size}:rate=30`,'-t','6','-an','-c:v','libx264','-pix_fmt','yuv420p','-crf','30','-g','1','-bf','0','-movflags','+faststart','-y',`${root}/${name}.mp4`]);
}
const fixture={journey_film:{sources:[{url:'/assets/__film-test-wide.mp4',mime_type:'video/mp4',width:640},{url:'/assets/__film-test-wide.mp4',mime_type:'application/x-mpegURL',width:1920}],preview_image:{src:'/assets/hi-journey-package-2026.webp',width:1042,height:751}},journey_film_mobile:{sources:[{url:'/assets/__film-test-mobile.mp4',mime_type:'video/mp4',width:360}]}};
const server=spawn(process.execPath,['scripts/preview.mjs'],{env:{...process.env,HP_PREVIEW_PORT:'4188',HP_PREVIEW_JOURNEY_FILM:JSON.stringify(fixture)}});
const report={viewports:[],checks:[],errors:[]};
let browser;
async function seek(page,p){
 await page.evaluate(p=>{const s=document.querySelector('[data-hpj]'),track=s.querySelector('[data-hpj-track]'),pin=s.querySelector('.hpj-pin'),header=parseFloat(s.style.getPropertyValue('--hpj-top'))||0;window.scrollTo({top:track.getBoundingClientRect().top+scrollY-header+p*(track.offsetHeight-pin.offsetHeight),behavior:'instant'});},p);
 try {await page.waitForFunction(p=>{const s=document.querySelector('[data-hpj]'),stats=s.hiJourney?.stats();return s.classList.contains('is-ready')&&Math.abs(Number(s.dataset.hpjProgress)-p)<.0002&&stats?.duration>0&&!stats.seeking&&Math.abs(stats.currentTime-stats.targetTime)<.017},p);}
 catch(error){console.error('Film state',await page.locator('[data-hpj]').evaluate(s=>({class:s.className,progress:s.dataset.hpjProgress,error:s.dataset.hpjError,stats:s.hiJourney?.stats(),video:s.querySelector('video')?.outerHTML})));throw error;}
 const result=await page.locator('[data-hpj]').evaluate(s=>({state:s.hiJourney.state(),stats:s.hiJourney.stats(),error:s.dataset.hpjError,overflow:document.documentElement.scrollWidth>innerWidth,caption:Number(getComputedStyle(s.querySelector('.hpj-caption')).opacity)}));
 assert(!result.error,result.error);assert.equal(result.stats.mode,'film');assert.equal(result.stats.error,0);assert(result.stats.paused);assert(!result.overflow);assert(result.caption>=.74);
 return result;
}
(async()=>{
 await new Promise((resolve,reject)=>{server.stdout.on('data',b=>{if(b.toString().includes('Homepage preview'))resolve()});server.stderr.on('data',b=>console.error(b.toString()));server.on('error',reject);server.on('exit',code=>reject(new Error(`Preview exited: ${code}`)))});
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.route('**/__film-test-*.mp4',async route=>{
  const name=route.request().url().includes('mobile')?'mobile':'wide',bytes=fs.readFileSync(`${root}/${name}.mp4`),range=route.request().headers().range?.match(/bytes=(\d+)-(\d*)/),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;
  await route.fulfill({status:range?206:200,contentType:'video/mp4',headers:{'accept-ranges':'bytes','content-length':String(end-start+1),...(range?{'content-range':`bytes ${start}-${end}/${bytes.length}`}:{})},body:bytes.subarray(start,end+1)});
 });
 const page=await context.newPage(),requests=[];
 page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:4188/',{waitUntil:'networkidle'});
 assert.equal(requests.filter(url=>url.includes('__film-test-')).length,0,'film loaded before story approached');
 assert.equal(await page.locator('video').getAttribute('src'),null);report.checks.push('No video download before the section approaches the viewport');
 const poses=[0,.04,.10,.20,.228,.30,.40,.53,.58,.69,.72,.78,.84,.89,.945,.96,1];
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844],['small-phone',320,568],['tablet',768,1024],['landscape',844,390]]){
  await page.setViewportSize({width,height});
  const states=new Map();
  for(const p of poses)states.set(p,(await seek(page,p)).state);
  for(const p of [.945,.84,.58,.228,.04])assert.deepEqual((await seek(page,p)).state,states.get(p));
  const stats=(await seek(page,.4)).stats;assert(stats.source.includes(width<750?'mobile':'wide'));
  report.viewports.push({name,width,height,forwardPoses:poses.length,reversePoses:5});console.log('PASS film',name);
 }
 assert.equal(requests.filter(url=>/hi-journey-world|hi-journey-materials/.test(url)).length,0);report.checks.push('Film mode never loads the 3D renderer or material maps');
 await page.setViewportSize({width:1440,height:900});await seek(page,.4);
 const before=await page.locator('video').screenshot(),count=(await page.locator('[data-hpj]').evaluate(s=>s.hiJourney.stats())).renderCount;
 await page.waitForTimeout(300);const after=await page.locator('video').screenshot();assert(before.equals(after));assert.equal((await page.locator('[data-hpj]').evaluate(s=>s.hiJourney.stats())).renderCount,count);report.checks.push('Paused scroll produces identical film pixels with zero additional render frames');
 await page.evaluate(()=>{const s=document.querySelector('[data-hpj]'),t=s.querySelector('[data-hpj-track]'),pin=s.querySelector('.hpj-pin'),start=t.getBoundingClientRect().top+scrollY-(parseFloat(s.style.getPropertyValue('--hpj-top'))||0),distance=t.offsetHeight-pin.offsetHeight;for(const p of [.9,.1,.85,.2,.7,.33,.82])window.scrollTo({top:start+p*distance,behavior:'instant'});});await seek(page,.82);report.checks.push('Rapid forward/reverse scrolling settles on the latest requested frame');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.equal(await page.locator('video').getAttribute('src'),null);assert.equal(await page.locator('.hpj-scroll').evaluate(e=>getComputedStyle(e).display),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});await seek(page,.4);report.checks.push('Reduced motion releases media and restores the readable sequence; it can be toggled back');
 await page.locator('[data-hpj]').evaluate(e=>{e.dispatchEvent(new CustomEvent('shopify:section:unload',{bubbles:true}));e.dispatchEvent(new CustomEvent('shopify:section:load',{bubbles:true}));});await seek(page,.72);assert.equal(await page.locator('video').count(),1);report.checks.push('Theme editor unload/reload disposes and restores one film element');
 await page.locator('[data-hpj-skip]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'hpj-after-journey');report.checks.push('Keyboard skip still exits the pinned film');
 const reduced=await browser.newPage({reducedMotion:'reduce'}),reducedRequests=[];reduced.on('request',r=>reducedRequests.push(r.url()));await reduced.goto('http://127.0.0.1:4188/');await reduced.locator('[data-hpj]').scrollIntoViewIfNeeded();await reduced.waitForTimeout(200);assert(!reducedRequests.some(url=>/__film-test-|hi-journey-(film|world)\.js/.test(url)));report.checks.push('Initial reduced motion downloads neither film nor renderer');await reduced.close();
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto('http://127.0.0.1:4188/');assert.equal(await nojs.locator('.hpj-scroll').evaluate(e=>getComputedStyle(e).display),'none');assert((await nojs.locator('[data-hpj-static]').boundingBox()).height>100);await nojs.close();report.checks.push('Disabled JavaScript retains the complete readable sequence');
 const broken=await browser.newPage();await broken.route('**/__film-test-*.mp4',route=>route.fulfill({status:503,body:'Unavailable'}));await broken.goto('http://127.0.0.1:4188/');await broken.locator('[data-hpj]').scrollIntoViewIfNeeded();await broken.waitForSelector('[data-hpj].is-static');await broken.close();report.checks.push('Unavailable film activates the static fallback');
 const unseekable=await browser.newPage();await unseekable.route('**/__film-test-*.mp4',route=>route.fulfill({contentType:'video/mp4',body:fs.readFileSync(`${root}/wide.mp4`)}));await unseekable.goto('http://127.0.0.1:4188/');await unseekable.evaluate(()=>{const s=document.querySelector('[data-hpj]'),t=s.querySelector('[data-hpj-track]'),pin=s.querySelector('.hpj-pin');window.scrollTo({top:t.getBoundingClientRect().top+scrollY+.4*(t.offsetHeight-pin.offsetHeight),behavior:'instant'});});await unseekable.waitForFunction(()=>document.querySelector('[data-hpj]').hiJourney?.stats().seeks>0);await unseekable.waitForTimeout(300);assert((await unseekable.locator('[data-hpj]').evaluate(s=>s.hiJourney.stats())).seeks<10,'unseekable film causes a seek loop');await unseekable.waitForSelector('[data-hpj].is-static',{timeout:15000});await unseekable.close();report.checks.push('A server without usable range seeking cannot cause a retry loop and times out to the static fallback');
 assert.deepEqual(report.errors,[]);fs.writeFileSync(`${root}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();server.kill();
})().catch(async error=>{console.error(error);if(browser)await browser.close();server.kill();process.exit(1)});
