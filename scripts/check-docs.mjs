// Run against a production docs server: DOCS_URL=http://127.0.0.1:3000 npm run test:docs
// Requires the optional playwright-core dependency and its Chromium browser.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { checkOverlays } from './check-overlays.mjs';
import { checkInteractions } from './check-interactions.mjs';

const base = process.env.DOCS_URL ?? 'http://127.0.0.1:4645';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) console.log(`HTTP ${response.status()}: ${response.url()}`); });
const nav = page.getByRole('navigation', { name: 'Library', exact: true });
const measure = () => page.evaluate(() => {
  const nav = document.querySelector('nav[aria-label="Library"]');
  const article = document.querySelector('article');
  return {
    pageScroll: scrollY,
    sidebarScroll: nav.lastElementChild.scrollTop,
    sidebarX: nav.getBoundingClientRect().x,
    sidebarY: nav.getBoundingClientRect().y,
    articleX: article.getBoundingClientRect().x,
    articleY: article.getBoundingClientRect().y,
  };
});

try {
  await page.goto(`${base}/components/button`);
  await page.getByRole('heading', { name: 'Button', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const items = await nav.locator('a[data-item]').evaluateAll(links => links.map(link => ({ name: link.dataset.item, title: link.textContent.trim() })));
  const timings = [];
  for (const item of items) {
    await page.evaluate(() => window.scrollTo(0, 500));
    const link = nav.locator(`a[data-item="${item.name}"]`);
    await link.scrollIntoViewIfNeeded();
    const before = await measure();
    const started = performance.now();
    await link.click();
    await page.waitForURL(`**/components/${item.name}`);
    await page.getByRole('heading', { name: item.title, exact: true, level: 1 }).waitFor();
    timings.push(performance.now() - started);
    await page.waitForTimeout(180);
    const after = await measure();
    for (const key of Object.keys(before)) assert.ok(Math.abs(before[key] - after[key]) < 1, `${item.name}: ${key} moved from ${before[key]} to ${after[key]}`);
    if (timings.length % 16 === 0) console.log(`Checked ${timings.length}/${items.length} routes.`);
  }
  console.log(`PASS: stable page/sidebar coordinates across ${items.length} component routes.`);
  timings.sort((a, b) => a - b);
  console.log(`Local production navigation: median ${Math.round(timings[Math.floor(timings.length / 2)])}ms, p95 ${Math.round(timings[Math.floor(timings.length * 0.95)])}ms (includes automation overhead).`);

  await page.goto(`${base}/components/button`);
  await nav.getByRole('searchbox').fill('card');
  await nav.locator('a[data-item="card"]').click();
  await page.waitForURL('**/components/card');
  assert.equal(await nav.getByRole('searchbox').inputValue(), 'card');
  console.log('PASS: sidebar filter retained after navigation.');

  await page.goto(`${base}/components/faq`);
  const iframe = page.locator('iframe').first();
  await page.waitForFunction(() => { const frame = document.querySelector('iframe'); return frame && frame.style.height !== '900px'; });
  assert.equal(await iframe.getAttribute('sandbox'), 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox');
  const desktopHeight = await iframe.evaluate(frame => Number.parseFloat(frame.style.height));
  await page.getByRole('radio', { name: 'Phone', exact: true }).first().click();
  await page.waitForFunction(previous => { const frame = document.querySelector('iframe'); return frame?.style.width === '390px' && Number.parseFloat(frame.style.height) !== previous; }, desktopHeight);
  const frame = await iframe.contentFrame();
  await frame.getByText('Does the merchant need to integrate anything?', { exact: true }).click();
  await frame.getByText('No. The agent pays at checkout with a card, as a person would.', { exact: true }).waitFor();
  assert.equal(await frame.locator('html').evaluate(async () => { await document.fonts.ready; return [...document.fonts].every(font => font.status === 'loaded' || font.status === 'unloaded'); }), true);
  console.log('PASS: isolated previews render and resize at desktop and phone widths.');

  await page.goto(`${base}/components/button`);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied = text; } } }));
  await page.locator('#example').getByRole('button', { name: 'Copy', exact: true }).click();
  await page.locator('#example').getByRole('button', { name: 'Copied', exact: true }).waitFor();
  assert.ok((await page.evaluate(() => window.__copied)).includes('Button'));
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Clipboard permission denied'); }; });
  await page.locator('#source').getByRole('button', { name: 'Copy', exact: true }).first().click();
  console.log('PASS: code copy handles success and denied clipboard access.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/components/button`);
  await nav.getByRole('button').click();
  await nav.getByRole('searchbox').fill('checkbox');
  await nav.locator('a[data-item="checkbox"]').click();
  await page.waitForURL('**/components/checkbox');
  assert.equal(await nav.getByRole('button').getAttribute('aria-expanded'), 'false');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('PASS: mobile sidebar closes after choosing an item, without horizontal overflow.');
  await checkOverlays(page, base);
  await checkInteractions(page, base);
  assert.deepEqual(errors, [], 'Browser errors');
  console.log('PASS: no browser runtime or resource errors.');
} finally {
  await browser.close();
}
