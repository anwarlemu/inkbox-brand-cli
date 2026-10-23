// Compare rendered library styles to the values measured from the Inkbox console design (Figma 427:2715).
// This catches style drift that a no-overflow or no-console-error test cannot detect.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright-core');
const fixture=JSON.parse(readFileSync(new URL('../test/fixtures/reference-styles.json',import.meta.url)));
const base=process.env.DOCS_URL || 'http://localhost:4645';
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
    if(c.click){await page.locator(c.click).first().click();await page.waitForTimeout(400);}
    const locator=page.locator(c.selector).first();
    if(!(await locator.count())){failures.push({component:c.name,check:c.id,property:'selector',expected:c.selector,actual:'missing'});continue;}
    const values=await locator.evaluate((el,expected)=>{
      const color=(value)=>{
        const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);
        return Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3);
      };
      const box=el.getBoundingClientRect();
      const read=(key)=>key==='width'?`${Math.round(box.width)}px`:key==='height'?`${Math.round(box.height)}px`:key==='placeholderColor'?getComputedStyle(el,'::placeholder').color:getComputedStyle(el)[key];
      return Object.fromEntries(Object.entries(expected).map(([key,value])=>{
        const isColor=/color$/i.test(key);
        return [key,{expected:isColor?color(value):value,actual:isColor?color(read(key)):read(key)}];
      }));
    },c.expected);
    for(const [key,{actual,expected}] of Object.entries(values)){
      assertions++;
      const same=Array.isArray(expected)?expected.every((v,i)=>Math.abs(actual[i]-v)<=2):actual===expected;
      if(!same)failures.push({component:c.name,check:c.id,property:key,expected,actual});
    }
  }
  console.log(JSON.stringify({reference:fixture.reference,captured:fixture.captured,checks:fixture.checks.length,comparisons:assertions,failures},null,2));
  assert.equal(failures.length,0,'Library styles must match the measured design');
} finally {await browser.close();}
