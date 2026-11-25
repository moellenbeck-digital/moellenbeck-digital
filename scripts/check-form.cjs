const {chromium}=require('../audit/tools/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
for(const path of ['/','/hausverwaltung/']) {
 const page=await browser.newPage(); await page.goto('http://127.0.0.1:8876'+path);
 await page.locator('#contactForm').evaluate(f=>f.requestSubmit());
 assert.match(await page.locator('#formStatus').textContent(),/prüfen/);
 await page.locator('#cfName').fill('Audit Test'); await page.locator('#cfMail').fill('audit@example.invalid');
 await page.locator('#cfSubject').selectOption({index:1});await page.locator('#cfMsg').fill('Testnachricht ohne Versand.');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Page.enable');
 const navigation=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No mailto navigation')),5000);cdp.on('Page.frameRequestedNavigation',event=>{if(event.url.startsWith('mailto:')){clearTimeout(timer);resolve(event.url);}});});
 await page.locator('#contactForm').evaluate(f=>f.requestSubmit());
 const url=await navigation;assert.match(url,/mailto:admin@moellenbeck-digital.io\?subject=/);assert.match(decodeURIComponent(url),/Testnachricht ohne Versand/);
 await page.close();
 const context=await browser.newContext({javaScriptEnabled:false});const nojs=await context.newPage();await nojs.goto('http://127.0.0.1:8876'+path);assert.equal(await nojs.locator('#contactForm').getAttribute('method'),'dialog');assert.ok(await nojs.locator('a[href="mailto:admin@moellenbeck-digital.io"]').count());await context.close();console.log(path+' validation, mailto composition, no-JS fallback passed');
}await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
