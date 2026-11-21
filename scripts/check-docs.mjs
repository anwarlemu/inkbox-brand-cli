// Run against a production docs server: DOCS_URL=http://localhost:3000 npm run test:docs
// Requires the optional playwright-core dependency and its Chromium browser.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { checkOverlays } from './check-overlays.mjs';
import { checkInteractions } from './check-interactions.mjs';

const base = process.env.DOCS_URL ?? 'http://localhost:4645';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) console.log(`HTTP ${response.status()}: ${response.url()}`); });
const nav = page.getByRole('navigation', { name: 'Library', exact: true });
// The rail and the page head must not move between routes: the rail is shared and keeps its scroll and filter.
const measure = () => page.evaluate(() => {
  const nav = document.querySelector('nav[aria-label="Library"]');
  const list = nav.lastElementChild;
  const main = document.querySelector('main');
  const head = main.querySelector('header');
  return { pageScroll: scrollY, railScroll: list.scrollTop, railX: nav.getBoundingClientRect().x, railWidth: nav.getBoundingClientRect().width, mainX: main.getBoundingClientRect().x, headY: head.getBoundingClientRect().y };
});

try {
  await page.goto(`${base}/components/button`);
  await page.getByRole('heading', { name: 'Button', exact: true, level: 1 }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  assert.equal(await nav.evaluate(n => n.getBoundingClientRect().width), 288, 'the rail is 288px');
  const items = await nav.locator('a[data-item]').evaluateAll(links => links.map(link => ({ name: link.dataset.item, title: link.textContent.trim() })));
  assert.ok(items.length >= 68, `every component is listed (${items.length})`);
  const timings = [];
  for (const item of items) {
    const link = nav.locator(`a[data-item="${item.name}"]`);
    await link.scrollIntoViewIfNeeded();
    const before = await measure();
    const started = performance.now();
    await link.click();
    await page.waitForURL(`**/components/${item.name}`);
    await page.getByRole('heading', { name: item.title, exact: true, level: 1 }).waitFor();
    timings.push(performance.now() - started);
    await page.waitForTimeout(150);
    const after = await measure();
    for (const key of ['railScroll', 'railX', 'railWidth', 'mainX', 'headY']) assert.ok(Math.abs(before[key] - after[key]) < 1, `${item.name}: ${key} moved from ${before[key]} to ${after[key]}`);
    assert.equal(await nav.locator(`a[data-item="${item.name}"]`).getAttribute('aria-current'), 'page', `${item.name} is marked current`);
    if (timings.length % 17 === 0) console.log(`Checked ${timings.length}/${items.length} routes.`);
  }
  console.log(`PASS: stable rail and page head across ${items.length} component routes.`);
  timings.sort((a, b) => a - b);
  console.log(`Local production navigation: median ${Math.round(timings[Math.floor(timings.length / 2)])}ms, p95 ${Math.round(timings[Math.floor(timings.length * 0.95)])}ms (includes automation overhead).`);

  await page.goto(`${base}/components/button`);
  await nav.getByRole('textbox', { name: 'Filter components' }).fill('card');
  await nav.locator('a[data-item="card"]').click();
  await page.waitForURL('**/components/card');
  assert.equal(await nav.getByRole('textbox', { name: 'Filter components' }).inputValue(), 'card');
  await nav.getByRole('textbox', { name: 'Filter components' }).fill('zzz');
  await nav.getByText('Nothing matches.').waitFor();
  console.log('PASS: rail filter narrows the list and is kept after navigation.');

  // Scroll edges fade, never cut a row off: the rail at rest shows its first row in full and fades its bottom edge; part
  // way down both edges fade 24px; at the end the bottom edge is clear. The same holds for a library list (command).
  const fade = el => { const style = getComputedStyle(el); return { mask: style.maskImage, start: style.getPropertyValue('--fade-start'), end: style.getPropertyValue('--fade-end') }; };
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const checkFade = async (scroller, name) => {
    await scroller.evaluate(el => { el.scrollTop = 0; });
    await settle();
    let state = await scroller.evaluate(fade);
    assert.match(state.mask, /linear-gradient/, `${name}: the scroll edge is masked`);
    assert.deepEqual([state.start, state.end], ['0px', '24px'], `${name}: at rest the first row is whole and the bottom edge fades`);
    await scroller.evaluate(el => { el.scrollTop = Math.min(200, (el.scrollHeight - el.clientHeight) / 2); });
    await settle();
    state = await scroller.evaluate(fade);
    assert.deepEqual([state.start, state.end], ['24px', '24px'], `${name}: part way down both edges fade 24px`);
    await scroller.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await settle();
    state = await scroller.evaluate(fade);
    assert.equal(state.end, '0px', `${name}: at the end the bottom edge is clear`);
  };
  await nav.getByRole('textbox', { name: 'Filter components' }).fill('');
  await checkFade(nav.locator(':scope > div.fade-y'), 'rail');
  await page.goto(`${base}/preview/command/Preview`);
  await page.locator('[data-preview-ready]').waitFor();
  await checkFade(page.locator('[data-slot="command-list"]').first(), 'command list');
  console.log('PASS: the rail and a library list fade at the edges that have more past them.');

  await page.goto(`${base}/components/dialog`);
  const iframe = page.locator('iframe').first();
  assert.equal(await iframe.getAttribute('sandbox'), 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox');
  await page.waitForFunction(() => { const frame = document.querySelector('iframe'); return frame && Number.parseFloat(frame.style.height) !== 320; });
  await page.getByRole('tab', { name: 'Phone', exact: true }).first().click();
  await page.waitForFunction(() => document.querySelector('iframe')?.style.width === '390px');
  const frame = await iframe.contentFrame();
  await frame.locator('[data-preview-ready]').waitFor();
  await frame.getByRole('button').first().click();
  await frame.getByRole('dialog').waitFor();
  assert.equal(await frame.locator('html').evaluate(async () => { await document.fonts.ready; return [...document.fonts].every(font => font.status === 'loaded' || font.status === 'unloaded'); }), true);
  console.log('PASS: isolated previews render, open their overlay and resize at desktop and phone widths.');

  await page.goto(`${base}/components/button`);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied = text; } } }));
  await page.locator('#example').getByRole('button', { name: 'Copy code', exact: true }).click();
  await page.locator('#example').getByRole('button', { name: 'Copied', exact: true }).waitFor();
  assert.ok((await page.evaluate(() => window.__copied)).includes('Button'));
  await page.getByRole('button', { name: 'Copy command', exact: true }).click();
  assert.match(await page.evaluate(() => window.__copied), /add button$/);
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Clipboard permission denied'); }; });
  await page.locator('#source').getByRole('button', { name: 'Copy code', exact: true }).first().click();
  await page.locator('#source').getByText('Copy failed. Select the code and copy it.').waitFor({ state: 'attached' });
  console.log('PASS: code and command copy handle success and denied clipboard access.');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/components/button`);
  const toggle = page.getByRole('button', { name: 'Open the library' });
  await toggle.click();
  await nav.getByRole('textbox', { name: 'Filter components' }).fill('checkbox');
  await nav.locator('a[data-item="checkbox"]').click();
  await page.waitForURL('**/components/checkbox');
  assert.equal(await page.getByRole('button', { name: 'Open the library' }).getAttribute('aria-expanded'), 'false');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('PASS: the mobile rail closes after choosing an item, without horizontal overflow.');
  await checkOverlays(page, base);
  await checkInteractions(page, base);
  assert.deepEqual(errors, [], 'Browser errors');
  console.log('PASS: no browser runtime or resource errors.');
} finally {
  await browser.close();
}
