// Compare rendered library styles to measurements captured from the live reference.
// This catches style drift that a no-overflow or no-console-error test cannot detect.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const fixture=JSON.parse(readFileSync(new URL('../test/fixtures/reference-styles.json',import.meta.url)));
const base=process.env.DOCS_URL || 'http://127.0.0.1:4645';
const browser=await chromium.launch();
const page=await browser.newPage({viewport:fixture.viewport,reducedMotion:'reduce'});
const failures=[];
let assertions=0;
try {
  for(const c of fixture.checks){
    await page.setViewportSize({width:c.width,height:1000});
    await page.goto(`${base}/preview/${c.name}/${c.example}`);
    await page.locator('[data-preview-ready]').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    const locator=page.locator(c.selector).first();
    assert.ok(await locator.count(),`${c.id}: missing ${c.selector}`);
    const values=await locator.evaluate((el,expected)=>{
      const normalize=(value,key)=>{
        if(!/Color$/.test(key)&&key!=='color')return value;
        const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
        const ctx=canvas.getContext('2d');ctx.fillStyle=value;ctx.fillRect(0,0,1,1);
        return Array.from(ctx.getImageData(0,0,1,1).data);
      };
      return Object.fromEntries(Object.entries(expected).map(([key,value])=>[key,{expected:normalize(value,key),actual:normalize(key==='placeholderColor'?getComputedStyle(el,'::placeholder').color:getComputedStyle(el)[key],key)}]));
    },c.expected);
    for(const [key,{actual,expected}] of Object.entries(values)){
      assertions++;
      const same=Array.isArray(expected)?expected.every((v,i)=>Math.abs(actual[i]-v)<=1):actual===expected;
      if(!same)failures.push({component:c.name,check:c.id,property:key,expected,actual});
    }
  }
  // Required, controlled and native textarea states work at both widths.
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});
    await page.goto(`${base}/preview/textarea/Site`);
    await page.locator('[data-preview-ready]').waitFor();
    const field=page.locator('textarea');
    await page.getByRole('button',{name:'Save brief'}).click();
    assert.equal(await field.getAttribute('aria-invalid'),'true');
    const brief='Buy two train tickets.\nKeep the total under $200.';
    await field.fill(brief);
    assert.equal(await field.inputValue(),brief);
    assert.equal(await field.getAttribute('aria-invalid'),null);
    assert.equal(await field.evaluate(e=>getComputedStyle(e).outlineWidth),'2px');
    assert.equal(await field.evaluate(e=>new FormData(e.form).get('brief')),brief);
    await page.getByRole('button',{name:'Save brief'}).click();
    assert.match(await page.getByRole('status').innerText(),/Saved: Buy two train tickets/);
    await page.getByRole('button',{name:'Reset'}).click();
    assert.equal(await field.inputValue(),'');
    await page.goto(`${base}/preview/textarea/States`);
    await page.locator('[data-preview-ready]').waitFor();
    assert.ok(await page.locator('textarea[disabled]').isDisabled());
    assert.equal(await page.locator('textarea[readonly]').evaluate(e=>e.readOnly),true);
    assert.equal(await page.locator('textarea[rows]').getAttribute('rows'),'4');
    assert.equal(await page.locator('textarea[rows]').evaluate(e=>getComputedStyle(e).resize),'vertical');
  }
  console.log(JSON.stringify({reference:fixture.reference,captured:fixture.captured,comparisons:assertions,failures,textareaStates:'passed at 1440 and 390'},null,2));
  assert.equal(failures.length,0,'Library styles must match the recorded reference');
} finally {await browser.close();}
