import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const root=new URL('..', import.meta.url).pathname;
const require=createRequire(`${root}/package.json`);
const {chromium}=require('playwright-core');
const base=process.env.DOCS_URL || 'http://localhost:4645';
const out=process.env.AUDIT_DIR || '/tmp/inkbox-library-audit';
mkdirSync(out,{recursive:true});
const {items}=JSON.parse(readFileSync(`${root}/apps/www/lib/registry-index.json`));
const jobs=items.flatMap(item=>item.examples.flatMap(example=>[false,true].map(phone=>({name:item.name,example,phone,width:phone?390:item.type==='ui'?720:1440}))));
const total=jobs.length;
const browser=await chromium.launch();
const results=[];
try {
  await Promise.all(Array.from({length:3},async()=>{
    const page=await browser.newPage({reducedMotion:'reduce'});
    page.setDefaultTimeout(15000);
    while(jobs.length){
      const job=jobs.shift();
      const errors=[];
      const onError=e=>errors.push(e.message);
      page.on('pageerror',onError);
      const result={...job,errors};
      try {
        await page.setViewportSize({width:job.width,height:900});
        const response=await page.goto(`${base}/preview/${job.name}/${job.example}`);
        assert.equal(response.status(),200);
        await page.locator('[data-preview-ready]').waitFor();
        await page.evaluate(()=>document.fonts.ready);
        result.overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
        result.height=await page.locator('[data-preview-root]').evaluate(e=>e.getBoundingClientRect().height);
        assert.ok(result.height>0);
        result.file=`${job.name}-${job.example}-${job.phone?'phone':'desktop'}.png`;
        await page.screenshot({path:`${out}/${result.file}`,fullPage:true,animations:'disabled'});
      } catch(error){result.error=error.message;}
      page.off('pageerror',onError);
      results.push(result);
      if(results.length%12===0) console.log(`Audited ${results.length}/${total} previews`);
    }
    await page.close();
  }));
  results.sort((a,b)=>a.name.localeCompare(b.name)||a.example.localeCompare(b.example)||Number(a.phone)-Number(b.phone));
  writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
  const sheet=await browser.newPage({viewport:{width:1680,height:1600}});
  for(const phone of [false,true]){
    const selected=results.filter(r=>r.phone===phone&&r.file);
    for(let offset=0;offset<selected.length;offset+=16){
      const cards=selected.slice(offset,offset+16).map(r=>`<figure><figcaption>${r.name} / ${r.example}${r.overflow?' OVERFLOW':''}</figcaption><img src="data:image/png;base64,${readFileSync(`${out}/${r.file}`).toString('base64')}"></figure>`).join('');
      await sheet.setContent(`<style>body{margin:0;background:#ddd;font:14px Arial}main{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px}figure{margin:0;background:white;height:370px;overflow:hidden}figcaption{padding:8px;background:#112;color:white}img{width:100%;height:330px;object-fit:contain;object-position:top}</style><main>${cards}</main>`);
      await sheet.screenshot({path:`${out}/sheet-${phone?'phone':'desktop'}-${offset/16+1}.png`,fullPage:true});
    }
  }
  const failures=results.filter(r=>r.error||r.overflow||r.errors.length);
  console.log(JSON.stringify({total:results.length,components:new Set(results.map(r=>r.name)).size,failures},null,2));
  assert.equal(failures.length,0,"All component previews must render without runtime errors or page overflow");
} finally {await browser.close();}
