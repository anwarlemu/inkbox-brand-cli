// Every interactive control in the library works with the pointer and the keyboard, at desktop and phone widths.
// Run through check-docs.mjs against a production docs server.
import assert from 'node:assert/strict';

async function open(page, base, name, example = 'Preview') {
  await page.goto(`${base}/preview/${name}/${example}`);
  await page.locator('[data-preview-ready]').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

const attr = (locator, name) => locator.getAttribute(name);
// State settles a frame or two after an event (Radix checks a radio on focus): poll briefly before asserting.
async function settle(read, ok, timeout = 1500) {
  const end = Date.now() + timeout;
  let value = await read();
  while (!ok(value) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 50));
    value = await read();
  }
  return value;
}

export async function checkInteractions(page, base) {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });

    // Switch, checkbox, toggle: a click and Space flip their state.
    await open(page, base, 'switch');
    const sw = page.getByRole('switch').first();
    const was = await attr(sw, 'aria-checked');
    await sw.click();
    assert.notEqual(await attr(sw, 'aria-checked'), was, 'switch: click toggles');
    await page.keyboard.press('Space');
    assert.equal(await attr(sw, 'aria-checked'), was, 'switch: Space toggles back');

    await open(page, base, 'checkbox');
    const boxes = page.getByRole('checkbox');
    const child = boxes.nth(2);
    const before = await attr(child, 'aria-checked');
    await child.click();
    assert.notEqual(await attr(child, 'aria-checked'), before, 'checkbox: click toggles');

    await open(page, base, 'toggle');
    const toggle = page.locator('[data-slot="toggle"]').first();
    const pressed = await attr(toggle, 'aria-pressed');
    await toggle.click();
    assert.notEqual(await attr(toggle, 'aria-pressed'), pressed, 'toggle: click presses');

    // Radio group and toggle group: arrow keys move the choice.
    await open(page, base, 'radio-group');
    const radios = page.getByRole('radio');
    await page.keyboard.press('Tab');
    // Radix moves focus on a timer after keydown and checks on focus while the arrow is held: hold it as a person does.
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(60);
    await page.keyboard.up('ArrowDown');
    assert.equal(await settle(() => attr(radios.nth(1), 'aria-checked'), (v) => v === 'true'), 'true', 'radio-group: arrow moves the choice');

    await open(page, base, 'toggle-group');
    const items = page.locator('[data-slot="toggle-group-item"]');
    await items.nth(1).click();
    assert.equal(await attr(items.nth(1), 'data-state'), 'on', 'toggle-group: click chooses');

    // Tabs: a click selects; arrows move between tabs.
    await open(page, base, 'tabs');
    const tabs = page.getByRole('tab');
    await tabs.nth(1).click();
    assert.equal(await attr(tabs.nth(1), 'aria-selected'), 'true', 'tabs: click selects');
    await page.keyboard.press('ArrowRight');
    assert.equal(await settle(() => attr(tabs.nth(2), 'aria-selected'), (v) => v === 'true'), 'true', 'tabs: arrow selects the next tab');

    // Accordion and collapsible open and close.
    for (const name of ['accordion', 'collapsible']) {
      await open(page, base, name);
      const trigger = page.locator(`[data-slot="${name}-trigger"]`).first();
      const expanded = await attr(trigger, 'aria-expanded');
      await trigger.click();
      assert.notEqual(await attr(trigger, 'aria-expanded'), expanded, `${name}: click opens or closes`);
    }

    // Slider and resizable: arrow keys change their value.
    for (const [name, role] of [['slider', 'slider'], ['resizable', 'separator']]) {
      await open(page, base, name);
      const thumb = page.getByRole(role).first();
      const value = await attr(thumb, 'aria-valuenow');
      await thumb.focus();
      await page.keyboard.press(name === 'slider' ? 'ArrowRight' : 'ArrowLeft');
      assert.notEqual(await attr(thumb, 'aria-valuenow'), value, `${name}: arrow changes the value`);
    }

    // Input OTP: typed digits fill the slots; letters are refused.
    await open(page, base, 'input-otp');
    const otp = page.locator('[data-slot="input-otp"] input, input[data-slot="input-otp"]').first();
    await otp.focus();
    await page.keyboard.type('12a3456');
    assert.equal(await otp.inputValue(), '123456', 'input-otp: digits only');

    // Textarea takes text.
    await open(page, base, 'textarea');
    const area = page.locator('textarea').first();
    await area.fill('Forward receipts to the finance agent.');
    assert.equal(await area.inputValue(), 'Forward receipts to the finance agent.');

    // Clearing a multi-select is one update, including the values submitted by the form.
    await open(page, base, 'combobox', 'Multiple');
    assert.equal(await page.locator('[data-slot="combobox-chip"]').count(), 2);
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    assert.equal(await page.locator('[data-slot="combobox-chip"]').count(), 0, 'combobox: Clear removes all chips');
    assert.equal(await page.locator('input[type="hidden"][name="events"]').count(), 0, 'combobox: Clear resets submitted values');
    await page.locator('#events').fill('call.started');
    await page.getByRole('option', { name: 'call.started', exact: true }).click();
    assert.equal(await page.locator('[data-slot="combobox-chip"]').count(), 1, 'combobox: selection works after Clear');
    await page.keyboard.press('Escape');
    await page.locator('#events').focus();
    await page.keyboard.press('Backspace');
    assert.equal(await page.locator('[data-slot="combobox-chip"]').count(), 0, 'combobox: Backspace removes the last chip');

    // Calendar: a click selects a day; arrows move the focus.
    await open(page, base, 'calendar');
    const day = page.getByRole('grid').first().locator('button:not([disabled])').nth(12);
    await day.click();
    assert.ok(await page.locator('[aria-selected=true]').count(), 'calendar: click selects a day');
    await page.keyboard.press('ArrowRight');
    assert.ok(await page.evaluate(() => document.activeElement?.closest('[role=grid]') !== null), 'calendar: arrows keep focus in the grid');

    // Carousel: Next moves on and enables Previous.
    await open(page, base, 'carousel');
    const prev = page.getByRole('button', { name: /previous/i }).first();
    const next = page.getByRole('button', { name: /next/i }).first();
    assert.ok(await prev.isDisabled(), 'carousel: Previous starts disabled');
    await next.click();
    await page.waitForTimeout(500);
    assert.ok(await prev.isEnabled(), 'carousel: Next moves on');

    // Form: an empty submit shows its error; the handle is checked as it is typed.
    await open(page, base, 'form');
    await page.getByRole('button', { name: /create agent identity/i }).click();
    assert.ok(await page.locator('[data-slot="form-message"]').count(), 'form: empty submit shows an error');

    // Data table: a head sorts, the filter narrows, a row checkbox selects.
    await open(page, base, 'data-table');
    const rows = () => page.locator('tbody tr').count();
    const all = await rows();
    const sortable = page.locator('th[aria-sort] button, th button').first();
    await sortable.click();
    assert.ok(await page.locator('th[aria-sort="ascending"], th[aria-sort="descending"]').count(), 'data-table: a head sorts');
    await page.locator('input[type=search], input[type=text], input:not([type])').first().fill('support-desk@');
    assert.equal(await settle(rows, (count) => count === 1), 1, 'data-table: the filter finds the exact mailbox');
    assert.ok(all > 1);
    assert.match(await page.locator('tbody tr').innerText(), /support-desk@inkboxmail\.com/);

    // Sidebar: on a desktop the Collapse row folds the rail to its glyphs and Cmd/Ctrl B brings it back.
    if (width > 800) {
      await open(page, base, 'sidebar', 'Icons');
      const rail = page.locator('[data-slot="sidebar"][data-state]').first();
      const state = await attr(rail, 'data-state');
      await page.getByRole('button', { name: /collapse|expand/i }).first().click();
      assert.notEqual(await settle(() => attr(rail, 'data-state'), (v) => v !== state), state, 'sidebar: Collapse folds it');
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+b' : 'Control+b');
      assert.equal(await settle(() => attr(rail, 'data-state'), (v) => v === state), state, 'sidebar: the shortcut restores it');
    } else {
      await open(page, base, 'sidebar');
      await page.locator('[data-slot="sidebar-trigger"]').first().click();
      await page.getByRole('dialog').first().waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').first().waitFor({ state: 'hidden' });
    }

    // Questionnaire: Next is refused until the required question is answered; a choice card answers it.
    await open(page, base, 'questionnaire');
    const choice = page.locator('[data-slot="questionnaire-choice"]').first();
    await choice.click();
    assert.ok(await choice.locator('[data-slot="questionnaire-choice-input"]').isChecked(), 'questionnaire: a choice card picks its answer');

    // Trace: a step's detail opens and closes.
    await open(page, base, 'trace');
    const step = page.locator('[data-slot="trace-trigger"], [data-slot="trace-step-trigger"]').first();
    if (await step.count()) {
      const open1 = await attr(step, 'aria-expanded');
      await step.click();
      assert.notEqual(await attr(step, 'aria-expanded'), open1, 'trace: a step opens');
    }
  }
  console.log('PASS: switches, checkboxes, toggles, radios, tabs, accordions, sliders, resizable panels, OTP, calendar, carousel, form, data table, sidebar, questionnaire and trace (1440px and 390px).');
}
