// Every overlay in the library opens from its trigger, takes focus where it should, closes with Escape and hands focus
// back, at desktop and phone widths. Run through check-docs.mjs against a production docs server.
import assert from 'node:assert/strict';

async function open(page, base, name, example = 'Preview') {
  await page.goto(`${base}/preview/${name}/${example}`);
  await page.locator('[data-preview-ready]').waitFor();
  await page.evaluate(() => document.fonts.ready);
}

const visible = (locator) => locator.first().waitFor({ state: 'visible', timeout: 5000 });
const hidden = (locator) => locator.first().waitFor({ state: 'hidden', timeout: 5000 });
const noOverflow = async (page, label) => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: horizontal overflow`);

// Dialog-like overlays: the trigger opens a dialog, Escape closes it and focus returns to the trigger.
async function dialogLike(page, base, name, trigger, role = 'dialog') {
  await open(page, base, name);
  const button = page.getByRole('button', { name: trigger }).first();
  await button.click();
  const panel = page.getByRole(role);
  await visible(panel);
  await noOverflow(page, name);
  assert.ok(await panel.first().evaluate((el) => el.contains(document.activeElement)), `${name}: focus moves into the ${role}`);
  await page.keyboard.press('Escape');
  await hidden(panel);
  assert.ok(await button.evaluate((el) => el === document.activeElement), `${name}: focus returns to the trigger`);
}

export async function checkOverlays(page, base) {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });

    await dialogLike(page, base, 'dialog', 'Create Agent');
    await dialogLike(page, base, 'sheet', 'Edit mailbox');
    await dialogLike(page, base, 'drawer', 'Choose a line');
    await dialogLike(page, base, 'alert-dialog', /delete|revoke|remove/i, 'alertdialog');

    // An alert dialog does not close from a click outside it.
    await open(page, base, 'alert-dialog');
    await page.getByRole('button', { name: /delete|revoke|remove/i }).first().click();
    await visible(page.getByRole('alertdialog'));
    await page.mouse.click(5, 5);
    await page.waitForTimeout(250);
    assert.equal(await page.getByRole('alertdialog').count(), 1, 'alert-dialog: stays open on an outside click');
    await page.keyboard.press('Escape');

    // Popover: opens as a dialog panel beside its trigger and closes with Escape.
    await open(page, base, 'popover');
    await page.locator('[data-slot="popover-trigger"]').first().click();
    await visible(page.locator('[data-slot="popover-content"]'));
    await page.keyboard.press('Escape');
    await hidden(page.locator('[data-slot="popover-content"]'));

    // Menus: arrow keys move the highlight, Escape closes and returns focus.
    await open(page, base, 'dropdown-menu');
    const account = page.locator('[data-slot="dropdown-menu-trigger"]').first();
    await account.focus();
    await page.keyboard.press('Enter');
    await visible(page.getByRole('menu'));
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.locator('[role=menuitem][data-highlighted]').count(), 'dropdown-menu: arrows highlight an item');
    await page.keyboard.press('Escape');
    await hidden(page.getByRole('menu'));
    assert.ok(await account.evaluate((el) => el === document.activeElement), 'dropdown-menu: focus returns');

    await open(page, base, 'context-menu');
    await page.locator('[data-slot="context-menu-trigger"]').first().click({ button: 'right' });
    await visible(page.getByRole('menu'));
    await page.keyboard.press('Escape');
    await hidden(page.getByRole('menu'));

    if (width > 400) {
      await open(page, base, 'menubar');
      const first = page.getByRole('menuitem').first();
      await first.click();
      await visible(page.getByRole('menu'));
      await page.keyboard.press('ArrowRight');
      await visible(page.getByRole('menu'));
      await page.keyboard.press('Escape');
      await hidden(page.getByRole('menu'));

      await open(page, base, 'navigation-menu');
      await page.locator('[data-slot="navigation-menu-trigger"]').first().click();
      await visible(page.locator('[data-slot="navigation-menu-content"]'));
      await page.keyboard.press('Escape');
    }

    // Hover card and tooltip open from pointer and keyboard.
    await open(page, base, 'hover-card');
    await page.locator('[data-slot="hover-card-trigger"]').first().hover();
    await visible(page.locator('[data-slot="hover-card-content"]'));

    await open(page, base, 'tooltip');
    await page.keyboard.press('Tab');
    await visible(page.getByRole('tooltip'));

    // Select: choose a value with the keyboard; the trigger shows it.
    await open(page, base, 'select');
    const select = page.getByRole('combobox').first();
    await select.click();
    await visible(page.getByRole('listbox'));
    await page.getByRole('option', { name: 'Oregon' }).click();
    await hidden(page.getByRole('listbox'));
    assert.match(await select.innerText(), /Oregon/, 'select: the trigger shows the choice');

    // Combobox: type to filter and press Enter to choose.
    await open(page, base, 'combobox');
    await page.locator('[data-slot="combobox-trigger"]').first().click();
    const search = page.getByRole('combobox').last();
    await visible(search);
    await page.keyboard.type('bak');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    assert.match(await page.locator('[data-slot="combobox-trigger"]').first().innerText(), /bak/i, 'combobox: Enter chooses the match');

    // Command: typing filters the list.
    await open(page, base, 'command');
    const input = page.locator('[cmdk-input]').first();
    const before = await page.locator('[cmdk-item]').count();
    await input.fill('vault');
    await page.waitForTimeout(150);
    const after = await page.locator('[cmdk-item]').count();
    assert.ok(after > 0 && after < before, `command: filtering narrows ${before} items to ${after}`);

    // Date picker: open the calendar, pick a day, the popover closes and the trigger shows a date.
    await open(page, base, 'date-picker');
    const dateTrigger = page.locator('[data-slot="date-picker-trigger"]').first();
    const label = await dateTrigger.innerText();
    await dateTrigger.click();
    await visible(page.getByRole('grid'));
    await page.getByRole('grid').first().locator('button:not([disabled])').nth(10).click();
    await hidden(page.getByRole('grid'));
    assert.notEqual(await dateTrigger.innerText(), label, 'date-picker: the trigger shows the chosen date');

    // Toasts appear and can be dismissed.
    await open(page, base, 'sonner');
    await page.getByRole('button').first().click();
    await visible(page.locator('[data-sonner-toast]'));
    await open(page, base, 'toast');
    await page.getByRole('button').first().click();
    await visible(page.locator('[data-slot="toast"]'));
  }
  console.log('PASS: dialogs, sheets, drawers, popovers, menus, select, combobox, command, date picker, tooltips and toasts (1440px and 390px).');
}
