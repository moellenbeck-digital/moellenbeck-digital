const path=require('node:path'), assert=require('node:assert/strict'), fs=require('node:fs');
const {chromium}=require(path.join(process.cwd(),'audit/tools/node_modules/playwright'));
(async()=>{
 const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const results=[];
 for(const route of ['/','/hausverwaltung/']){
  const c=await b.newContext({viewport:{width:375,height:900},reducedMotion:'reduce'});const p=await c.newPage();await p.goto('http://127.0.0.1:8876'+route);
  const menu=p.locator('.nav-menu > summary');await menu.focus();await p.keyboard.press('Enter');assert(await p.locator('.nav-menu').evaluate(e=>e.open));await p.keyboard.press('Escape');assert(!(await p.locator('.nav-menu').evaluate(e=>e.open)));assert(await menu.evaluate(e=>e===document.activeElement));
  const faq=p.locator('#faq .faq-item').nth(1);await faq.locator('summary').focus();await p.keyboard.press('Enter');assert(await faq.evaluate(e=>e.open));await p.keyboard.press('Space');assert(!(await faq.evaluate(e=>e.open)));
  const parity=await p.evaluate(()=>{
   const schema=[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>JSON.parse(s.textContent)['@graph']||[]).find(n=>n['@type']==='FAQPage').mainEntity;
   const text=s=>s.replace(/\s+/g,' ').trim();
   const dom=[...document.querySelectorAll('#faq .faq-item')];
   return dom.length===schema.length&&dom.every((d,i)=>text(d.querySelector('summary').textContent)===schema[i].name&&text(d.querySelector('.faq-answer').textContent)===schema[i].acceptedAnswer.text);
  });assert(parity,'FAQ schema parity');
  const button=p.locator('#soundToggle');
  const checkSoundIcon=async(on)=>{assert.equal(await button.locator('.sound-on').isVisible(),on);assert.equal(await button.locator('.sound-off').isVisible(),!on);};
  await checkSoundIcon(false);assert.equal(await button.getAttribute('aria-pressed'),'false');await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');await checkSoundIcon(true);assert.equal(await p.locator('#soundState').textContent(),'an');await p.reload();assert.equal(await button.getAttribute('aria-pressed'),'true');await checkSoundIcon(true);await button.click();assert.equal(await p.evaluate(()=>localStorage.getItem('md-sounds')),'off');await checkSoundIcon(false);
  const sizes=await p.locator('.nav-menu > summary,.nav-cta,#soundToggle').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));assert(sizes.every(s=>s.w>=44&&s.h>=44));
  // 200% layout zoom on a 1440px desktop: effective CSS viewport 720px.
  await p.setViewportSize({width:720,height:500});assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
  await c.close();
  const nc=await b.newContext({javaScriptEnabled:false,viewport:{width:375,height:900}});const np=await nc.newPage();await np.goto('http://127.0.0.1:8876'+route);await np.locator('#faq .faq-item').nth(1).locator('summary').click();assert(await np.locator('#faq .faq-item').nth(1).evaluate(e=>e.open));assert(!(await np.locator('#soundSetting').isVisible()));assert(await np.locator('a[href^="mailto:"]').first().count());await nc.close();
  results.push({route,menuEscape:true,faqKeyboard:true,faqSchemaParity:true,soundPersistence:true,soundIconVisibility:true,targets44px:true,zoomEquivalent:true,noJS:true});
 }
 const c=await b.newContext({permissions:['clipboard-read','clipboard-write']});const p=await c.newPage();await p.goto('http://127.0.0.1:8876/design.html');await p.locator('[data-copy="html-code"]').click();assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),await p.locator('#html-code').textContent());
 await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('denied'))},configurable:true}));await p.locator('[data-copy="agent-code"]').click();assert.match(await p.locator('#copy-status').textContent(),/markiert/);assert.equal(await p.evaluate(()=>getSelection().toString()),await p.locator('#agent-code').textContent());
 results.push({route:'/design.html',clipboard:true,clipboardDeniedFallback:true});await c.close();
 const mc=await b.newContext({viewport:{width:1440,height:1000}});const mp=await mc.newPage();await mp.goto('http://127.0.0.1:8876');await mp.waitForTimeout(2500);const pause=mp.locator('.md-toggle').first();assert(await pause.isVisible());await pause.click();assert(await mp.evaluate(()=>document.documentElement.classList.contains('md-still')));await mc.close();results.push({normalMotionPause:true});
 await b.close();fs.writeFileSync('audit/ui-ux-2026-11-27/interactions.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})();
