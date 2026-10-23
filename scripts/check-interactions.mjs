import assert from 'node:assert/strict';

export async function checkInteractions(page, base) {
  const open = async (component, example = 'Site') => {
    await page.goto(`${base}/components/${component}`);
    const frame = page.locator(`iframe[src="/preview/${component}/${example}"]`);
    if (["command", "dialog", "dropdown-menu", "popover", "select", "sheet", "tooltip", "site-header"].includes(component)) {
      await frame.scrollIntoViewIfNeeded();
      const content = await frame.contentFrame();
      await content.locator('[data-preview-ready]').waitFor();
      return content;
    }
    const label = example === 'Site' ? 'Preview' : example.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, c => c.toUpperCase());
    const preview = page.locator('article figure').filter({ has: page.locator('figcaption', { hasText: new RegExp(`^${label}$`) }) });
    await preview.waitFor();
    return preview;
  };
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    let demo = await open('field');
    const website = demo.getByRole('textbox', { name: 'Website', exact: true });
    for (const [value, invalid] of [['acme.com', false], ['https://shop.acme.com/path?q=1', false], ['acme', true], ['', true], ['https://', true], ['ftp://acme.com', true], ['acme .com', true], ['acme.com', false]]) {
      await website.fill(value);
      assert.equal(await website.getAttribute('aria-invalid'), invalid ? 'true' : null, value);
      assert.equal(await demo.getByText('Enter a web address, like acme.com.', { exact: true }).count(), invalid ? 1 : 0);
    }
    assert.equal(await demo.getByLabel('Work email', { exact: false }).evaluate(el => el.required), true);
    assert.equal(await website.evaluate(el => document.getElementById(el.getAttribute('aria-describedby')).textContent), 'Web address accepted.');

    demo = await open('input', 'States');
    const email = demo.getByRole('textbox', { name: 'Work email', exact: true });
    await email.fill('ada@acme.com');
    assert.equal(await email.getAttribute('aria-invalid'), null);
    await email.fill('ada@');
    assert.equal(await email.getAttribute('aria-invalid'), 'true');
    assert.equal(await demo.getByRole('textbox', { name: 'Card nickname' }).isDisabled(), true);
    demo = await open('input', 'Search');
    await demo.getByRole('searchbox').fill('limits');
    assert.equal(await demo.locator('li').count(), 1);
    await demo.getByRole('searchbox').fill('zzzz');
    await demo.getByText('No guides match your search.').waitFor();

    demo = await open('checkbox');
    const all = demo.getByRole('checkbox', { name: 'All categories' });
    assert.equal(await all.getAttribute('aria-checked'), 'mixed');
    await all.click();
    assert.equal(await demo.locator('[role="checkbox"][aria-checked="true"]').count(), 4);
    await all.click();
    assert.equal(await demo.locator('[role="checkbox"][aria-checked="true"]').count(), 0);
    await demo.getByRole('checkbox', { name: 'Airlines', exact: true }).click();
    assert.equal(await all.getAttribute('aria-checked'), 'mixed');
    assert.equal(await demo.getByRole('checkbox', { name: /Cash withdrawals/ }).isDisabled(), true);

    demo = await open('tags-input');
    const input = demo.getByRole('textbox', { name: 'Allowed merchants' });
    assert.equal(await input.getAttribute('aria-invalid'), 'true');
    await demo.getByRole('button', { name: 'Remove not a domain', exact: true }).click();
    assert.equal(await input.getAttribute('aria-invalid'), null);
    await input.fill('acme.com');
    await input.press('Enter');
    await input.fill('acme.com,');
    assert.equal(await demo.getByRole('button', { name: 'Remove acme.com', exact: true }).count(), 1);
    await input.fill('composing.com');
    await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 229, isComposing: true, bubbles: true });
    assert.equal(await input.inputValue(), 'composing.com');
    await input.fill('');
    await input.evaluate(el => {
      const data = new DataTransfer(); data.setData('text', 'one.com, two.com\none.com');
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    });
    assert.equal(await demo.getByRole('button', { name: 'Remove one.com', exact: true }).count(), 1);
    await input.press('Backspace');
    assert.equal(await demo.getByRole('button', { name: 'Remove two.com', exact: true }).count(), 0);

    demo = await open('segmented-control');
    const billing = demo.getByRole('radiogroup', { name: 'Billing' });
    await billing.getByRole('radio', { name: 'Monthly' }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await billing.getByRole('radio', { name: 'Yearly' }).getAttribute('aria-checked'), 'true');
    assert.equal(await billing.locator('button[tabindex="0"]').count(), 1);
    await page.keyboard.press('ArrowRight');
    assert.equal(await billing.getByRole('radio', { name: 'Monthly' }).getAttribute('aria-checked'), 'true');
    await page.keyboard.press('End');
    assert.equal(await billing.getByRole('radio', { name: 'Yearly' }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Home');
    assert.equal(await billing.getByRole('radio', { name: 'Monthly' }).getAttribute('aria-checked'), 'true');

    demo = await open('progress');
    const progress = demo.getByRole('progressbar');
    assert.equal(await progress.getAttribute('aria-valuenow'), '1240');
    assert.equal(await progress.getAttribute('aria-valuemax'), '2000');
    await demo.getByRole('button', { name: 'Spend $100', exact: true }).click();
    assert.equal(await progress.getAttribute('aria-valuenow'), '1340');
    for (let i = 0; i < 7; i++) await demo.getByRole('button', { name: 'Spend $100' }).click();
    assert.equal(await progress.getAttribute('aria-valuenow'), '2000');
    assert.equal(await demo.getByRole('button', { name: 'Spend $100' }).isDisabled(), true);
    await demo.getByRole('button', { name: 'Reset', exact: true }).click();
    assert.equal(await progress.getAttribute('aria-valuenow'), '1240');

    demo = await open('dialog');
    await demo.getByRole('button', { name: 'New card', exact: true }).click();
    await demo.getByRole('textbox', { name: /Card name/ }).fill('');
    await demo.getByRole('button', { name: 'Create card', exact: true }).click();
    assert.equal(await demo.getByRole('dialog').count(), 1);
    await demo.getByRole('textbox', { name: /Card name/ }).fill('Office agent');
    const limit = demo.getByRole('spinbutton', { name: /Per purchase limit/ });
    await limit.fill('-1');
    await demo.getByRole('button', { name: 'Create card', exact: true }).click();
    assert.equal(await demo.getByRole('dialog').count(), 1);
    await limit.fill('375.50');
    await demo.getByRole('button', { name: 'Create card', exact: true }).click();
    await demo.getByRole('status').filter({ hasText: 'Office agent created with a $375.50 purchase limit.' }).waitFor();
    assert.equal(await demo.getByRole('dialog').count(), 0);

    demo = await open('dropdown-menu');
    const actions = demo.getByRole('button', { name: 'Card actions' });
    await actions.click();
    await demo.getByRole('menuitem', { name: 'Edit limits E' }).click();
    await demo.getByRole('spinbutton').fill('300');
    await demo.getByRole('button', { name: 'Save limit' }).click();
    await demo.getByRole('status').filter({ hasText: 'Purchase limit updated to $300.00.' }).waitFor();
    await actions.click();
    await demo.getByRole('menuitem', { name: 'Add funds F' }).click();
    await demo.getByRole('spinbutton').fill('50');
    await demo.getByRole('button', { name: 'Add funds', exact: true }).click();
    await demo.getByRole('status').filter({ hasText: 'Balance updated to $550.00.' }).waitFor();
    await actions.click();
    await demo.getByRole('menuitem', { name: 'Pause card' }).click();
    await demo.getByRole('status').filter({ hasText: 'Card paused.' }).waitFor();
    await demo.locator('[data-slot="dropdown-menu-trigger"]:focus').waitFor();
    await actions.click();
    await demo.getByRole('menuitem', { name: 'Resume card' }).click();
    await demo.getByRole('status').filter({ hasText: 'Card resumed.' }).waitFor();

    await demo.locator('[data-slot="dropdown-menu-trigger"]:focus').waitFor();
    await actions.click();
    const closeCard = demo.getByRole('menuitem', { name: 'Close card Hold 2s' });
    await closeCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(2000);
    assert.equal(await actions.isDisabled(), false, 'A short click cannot close the card');
    await closeCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(2100);
    await page.mouse.up();
    await demo.getByRole('status').filter({ hasText: 'Card closed.' }).waitFor();
    assert.equal(await actions.isDisabled(), true);

    demo = await open('tooltip');
    await demo.getByRole('button', { name: 'New card' }).click();
    await demo.getByRole('status').filter({ hasText: '2 cards.' }).waitFor();
    await demo.getByRole('button', { name: 'Pause card' }).click();
    await demo.getByRole('button', { name: 'Resume card' }).click();
    await demo.getByRole('button', { name: 'Card settings' }).click();
    await demo.getByRole('textbox', { name: 'Card nickname' }).fill('Office agent');
    await demo.getByRole('button', { name: 'Card settings' }).click();
    await demo.getByRole('button', { name: 'Card settings' }).click();
    assert.equal(await demo.getByRole('textbox', { name: 'Card nickname' }).inputValue(), 'Office agent');

    demo = await open('accordion');
    const question = demo.getByRole('button', { name: 'Do I need to write code?' });
    await question.click();
    assert.equal(await question.getAttribute('aria-expanded'), 'true');
    await question.click();
    assert.equal(await question.getAttribute('aria-expanded'), 'false');
    demo = await open('collapse');
    const collapse = demo.getByRole('button');
    await collapse.click();
    assert.equal(await collapse.getAttribute('aria-expanded'), 'false');
    assert.equal(await demo.locator('[data-slot="collapse"]').getAttribute('inert'), '');
    await collapse.click();
    assert.equal(await collapse.getAttribute('aria-expanded'), 'true');

    demo = await open('tag-filter');
    await demo.getByRole('button', { name: 'Filter by tags' }).click();
    await page.getByRole('searchbox', { name: 'Search tags' }).fill('office');
    await page.getByRole('button', { name: 'office', exact: true }).click();
    await page.keyboard.press('Escape');
    await demo.getByRole('button', { name: 'Clear tag filter office' }).click();
    assert.equal(await demo.getByRole('button', { name: 'Clear tag filter office' }).count(), 0);

    demo = await open('command');
    await demo.getByRole('combobox').fill('store cards');
    await demo.getByRole('combobox').press('Enter');
    await demo.getByRole('region', { name: 'Selected guide' }).getByRole('heading', { name: 'How we store cards' }).waitFor();
    demo = await open('command', 'Open');
    await demo.getByRole('combobox').fill('credentials');
    await demo.getByRole('combobox').press('Enter');
    await demo.getByRole('region', { name: 'Selected guide' }).waitFor();
    assert.equal(await demo.getByRole('dialog').count(), 0);

    demo = await open('empty-state', 'NoResults');
    await demo.getByRole('button', { name: 'Clear search' }).click();
    assert.equal(await demo.getByRole('searchbox').inputValue(), '');
    assert.equal(await demo.getByRole('listitem').count(), 2);
    demo = await open('tabs', 'Plain');
    await demo.getByRole('tab', { name: 'Declined', exact: true }).click();
    assert.equal(await demo.getByRole('tabpanel').textContent(), 'Uber · Declined.');

    demo = await open('spinner');
    await demo.getByRole('button', { name: 'Create card', exact: true }).click();
    assert.equal(await demo.getByRole('button').isDisabled(), true);
    await demo.getByRole('status').filter({ hasText: 'Demo card created.' }).waitFor();
    assert.equal(await demo.getByRole('button').isDisabled(), false);

    demo = await open('switch');
    const toggle = demo.getByRole('switch', { name: 'Pause this card' });
    await toggle.press('Space');
    assert.equal(await toggle.getAttribute('aria-checked'), 'true');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-checked'), 'false');
    demo = await open('secret-field');
    await demo.getByRole('button', { name: 'Show API key' }).click();
    await demo.getByRole('button', { name: 'Hide API key' }).click();
    await demo.getByRole('button', { name: 'Show API key' }).waitFor();

    demo = await open('hold-button');
    const hold = demo.getByRole('button', { name: 'Hold to close card', exact: true });
    await hold.focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    await page.keyboard.up('Space');
    await page.waitForTimeout(2000);
    assert.equal(await hold.isDisabled(), false, 'Releasing early cancels');
    await page.keyboard.down('Space');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(2100);
    await page.keyboard.up('Space');
    assert.equal(await hold.isDisabled(), false, 'Window blur cancels');
    await hold.focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(2100);
    await page.keyboard.up('Space');
    await demo.getByRole('status').filter({ hasText: 'Card closed.' }).waitFor();
    assert.equal(await hold.isDisabled(), true);
    await demo.getByRole('button', { name: 'Reset demo' }).click();
    assert.equal(await hold.isDisabled(), false);
    console.log(`PASS: field/email validation, checkbox groups, tag editing/IME, keyboard radios, progress, form submission, menu actions, command selection, search, tabs, switches, secrets and hold cancellation (${width}px).`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  let demo = await open('copy-button');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied = text; } } }));
  await demo.locator('[data-slot="copy-button"]').first().click();
  await demo.getByRole('button', { name: 'Copied', exact: true }).waitFor();
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Denied'); }; });
  await demo.getByRole('button', { name: 'Copied', exact: true }).click();
  await demo.getByRole('button', { name: 'Copy failed. Try again.' }).waitFor();
  await page.evaluate(() => { navigator.clipboard.writeText = async text => { window.__copied = text; }; });
  await demo.getByRole('button', { name: 'Copy failed. Try again.' }).click();
  await demo.getByRole('button', { name: 'Copied', exact: true }).waitFor();
  demo = await open('dropdown-menu', 'Choices');
  await demo.getByRole('button', { name: 'Preferences' }).click();
  await demo.getByRole('menuitem', { name: 'Exports', exact: true }).hover();
  await demo.getByRole('menuitem', { name: 'CSV', exact: true }).click();
  await demo.getByRole('button', { name: 'Copy export' }).click();
  await demo.getByRole('button', { name: 'Copied', exact: true }).waitFor();
  demo = await open('sonner', 'Action');
  await demo.getByRole('button', { name: 'Create card' }).click();
  await demo.getByRole('button', { name: 'View card' }).click();
  await demo.getByRole('status').filter({ hasText: 'Travel agent · Active' }).waitFor();

  // Exercise a real click through the sandbox without contacting the external service.
  await page.context().route('https://app.agentcard.sh/**', route => route.fulfill({ body: '<title>Agentcard destination</title>' }));
  demo = await open('site-header');
  const popupEvent = page.waitForEvent('popup');
  await demo.getByRole('link', { name: 'Get started' }).click();
  const popup = await popupEvent;
  await popup.waitForLoadState();
  assert.equal(new URL(popup.url()).hostname, 'app.agentcard.sh');
  await popup.close();
  await page.context().unroute('https://app.agentcard.sh/**');
  console.log('PASS: clipboard success/failure/retry, toast actions and external navigation from sandboxed previews.');
}
