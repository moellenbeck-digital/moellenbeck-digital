/* Contact form regression check. Needs a running static server for the repo root; sends nothing.
   Usage: node scripts/check-form.cjs [--base-url=URL | --port=N] [--chrome=PATH]
   Env:   BASE_URL or PORT, CHROME_PATH. Arguments win over env.
   Defaults: http://127.0.0.1:8876; Google Chrome on macOS if installed, else Playwright's Chromium. */
const {chromium}=require('../audit/tools/node_modules/playwright');
const assert=require('node:assert/strict');
const {existsSync}=require('node:fs');
const {parseArgs}=require('node:util');

const {values:args}=parseArgs({options:{'base-url':{type:'string'},port:{type:'string'},chrome:{type:'string'}}});
const local=port=>{assert.match(port,/^\d{1,5}$/,'Invalid port: '+port);return 'http://127.0.0.1:'+port;};
const baseUrl=(args['base-url']||(args.port&&local(args.port))||process.env.BASE_URL||local(process.env.PORT||'8876')).replace(/\/+$/,'');
const macChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath=args.chrome||process.env.CHROME_PATH||(existsSync(macChrome)?macChrome:undefined);
const SETTLE_MS=1500;

async function checkWithJs(browser,url){
 const page=await browser.newPage(); await page.goto(url);
 await page.locator('#contactForm').evaluate(f=>f.requestSubmit());
 assert.match(await page.locator('#formStatus').textContent(),/prüfen/);
 await fill(page,'Testnachricht ohne Versand.');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Page.enable');
 const navigation=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No mailto navigation')),5000);cdp.on('Page.frameRequestedNavigation',event=>{if(event.url.startsWith('mailto:')){clearTimeout(timer);resolve(event.url);}});});
 await page.locator('#contactForm').evaluate(f=>f.requestSubmit());
 const mailto=await navigation;assert.match(mailto,/mailto:admin@moellenbeck-digital.io\?subject=/);assert.match(decodeURIComponent(mailto),/Testnachricht ohne Versand/);
 await page.close();
}

async function fill(page,message){
 await page.locator('#cfName').fill('Audit Test'); await page.locator('#cfMail').fill('audit@example.invalid');
 await page.locator('#cfSubject').selectOption({index:1});await page.locator('#cfMsg').fill(message);
}

const formValues=page=>Promise.all(['#cfName','#cfMail','#cfSubject','#cfMsg'].map(id=>page.locator(id).inputValue()));

async function checkWithoutJs(browser,url){
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 await page.goto(url,{waitUntil:'networkidle'});
 assert.equal(await page.locator('#contactForm').getAttribute('method'),'dialog');
 assert.ok(await page.locator('a[href="mailto:admin@moellenbeck-digital.io"]').count());
 await fill(page,'Eingabe ohne JavaScript.');
 const before=await formValues(page);assert.ok(before.every(Boolean),'Fields were not filled');
 const button=page.locator('#contactForm button[type="submit"]');
 // Let requests caused by scrolling or typing finish before recording.
 await button.scrollIntoViewIfNeeded();await page.waitForTimeout(SETTLE_MS);
 const startUrl=page.url();const traffic=[];
 context.on('request',r=>traffic.push(r.method()+' '+r.url()));
 // mailto: and other external protocols raise no request event, only a navigation request.
 const cdp=await context.newCDPSession(page);await cdp.send('Page.enable');
 cdp.on('Page.frameRequestedNavigation',e=>traffic.push('NAVIGATE '+e.url));
 for(const [how,submit] of [['button click',()=>button.click()],['Enter key',()=>page.locator('#cfName').press('Enter')]]){
  await submit();await page.waitForTimeout(SETTLE_MS);
  assert.deepEqual(traffic,[],'No-JS submit via '+how+' caused traffic');
  assert.equal(page.url(),startUrl,'No-JS submit via '+how+' changed the URL');
  assert.deepEqual(await formValues(page),before,'No-JS submit via '+how+' lost input');
 }
 await context.close();
}

(async()=>{const browser=await chromium.launch({executablePath});
 try{
  for(const path of ['/','/hausverwaltung/']){
   await checkWithJs(browser,baseUrl+path);
   await checkWithoutJs(browser,baseUrl+path);
   console.log(path+' validation, mailto composition, no-JS fallback, no-JS submit (0 requests, input kept) passed');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
