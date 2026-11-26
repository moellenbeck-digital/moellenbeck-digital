// Mobile check for .facts-table: no cell and no table wider than the viewport, no clipped text.
// Usage: node audit/mobile-tables.cjs [port=8765] [screenshot-dir]
// Exit code 1 if any table, cell or cell content exceeds the viewport or its cell.
const {chromium}=require('./tools/node_modules/playwright');const fs=require('fs');const path=require('path');
const port=process.argv[2]||'8765';const shots=process.argv[3]||null;
const widths=[320,344,360,375,390,412];const pages=[['start','/'],['hv','/hausverwaltung/']];
(async()=>{
 const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const results=[];
 for(const [name,route] of pages)for(const w of widths){
  const ctx=await b.newContext({viewport:{width:w,height:900},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const p=await ctx.newPage();await p.goto('http://127.0.0.1:'+port+route);await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{const vw=document.documentElement.clientWidth;const out=[];
   document.querySelectorAll('.facts-table').forEach((t,ti)=>{const tb=t.getBoundingClientRect();
    const cells=[...t.querySelectorAll('th,td')].map(c=>{const b=c.getBoundingClientRect();
     const range=document.createRange();range.selectNodeContents(c);const tr=range.getBoundingClientRect();
     return {text:c.textContent.trim().slice(0,40),right:Math.round(b.right*10)/10,textRight:Math.round(tr.right*10)/10,overflow:c.scrollWidth>c.clientWidth+1}});
    const bad=cells.filter(c=>c.right>vw+0.5||c.textRight>vw+0.5||c.overflow);
    out.push({table:ti,caption:(t.caption||{}).textContent||null,tableRight:Math.round(tb.right*10)/10,viewport:vw,cells:cells.length,bad});});
   return out;});
  if(shots){fs.mkdirSync(shots,{recursive:true});const el=p.locator('#fakten');await el.scrollIntoViewIfNeeded();
   await el.screenshot({path:path.join(shots,`${name}-${w}.png`)});}
  for(const t of r)results.push({page:name,width:w,...t,ok:t.tableRight<=t.viewport+0.5&&t.bad.length===0});
  await ctx.close();}
 await b.close();
 for(const r of results)console.log(`${r.ok?'ok  ':'FAIL'} ${r.page} ${r.width}px table ${r.table}: right ${r.tableRight} <= ${r.viewport}, ${r.cells} cells, ${r.bad.length} clipped`);
 fs.writeFileSync('evidence/round3/mobile-tables.json',JSON.stringify(results,null,1));
 if(results.some(r=>!r.ok))process.exitCode=1;
})();
