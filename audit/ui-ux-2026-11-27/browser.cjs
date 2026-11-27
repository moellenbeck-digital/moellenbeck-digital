const path = require('node:path');
const root=process.cwd();
const {chromium}=require(path.join(root,'audit/tools/node_modules/playwright'));
const AxeBuilder=require(path.join(root,'audit/tools/node_modules/@axe-core/playwright')).default;
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const results=[];
 for(const route of ['/', '/hausverwaltung/', '/design.html']) {
  for(const width of [320,375,768,1440]) {
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}); const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8876'+route);await page.evaluate(()=>document.fonts.ready);
   await page.locator('footer').scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
   const checks=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),badAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash)}));
   let violations=[];
   if(width===375||width===1440) {
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    violations=axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
   }
   const name=route==='/'?'home':route==='/hausverwaltung/'?'hv':'design';
   if(width===375||width===1440) {
    if(name!=='design'){await page.locator('#faq').scrollIntoViewIfNeeded();await page.locator('#faq').screenshot({path:`audit/ui-ux-2026-11-27/${name}-faq-${width}.png`});}
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`audit/ui-ux-2026-11-27/${name}-${width}.png`});
   }
   results.push({route,width,errors,...checks,axeScanned:width===375||width===1440,violations});await context.close();
  }
 }
 fs.writeFileSync('audit/ui-ux-2026-11-27/browser.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results)); await browser.close();
})();
