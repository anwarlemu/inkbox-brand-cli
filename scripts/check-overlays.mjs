import assert from 'node:assert/strict';

export async function checkOverlays(page, base) {
  const frameFor = async (name, example = 'Site') => {
    const element = page.locator(`iframe[src="/preview/${name}/${example}"]`);
    await element.scrollIntoViewIfNeeded();
    const frame = await element.contentFrame();
    await frame.locator('[data-preview-ready]').waitFor();
    await frame.locator('body').evaluate(() => document.fonts.ready);
    return frame;
  };
  const fits = async locator => {
    await locator.waitFor();
    await page.waitForTimeout(200);
    assert.ok(await locator.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.left >= -1 && rect.top >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1;
    }), 'The complete overlay must fit in its viewport');
  };
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/components/dropdown-menu`);
    let frame = await frameFor('dropdown-menu');
    if (width === 1440) {
      const actual = await frame.locator('body').evaluate(() => innerWidth);
      assert.ok(actual >= 600 && actual <= 720, 'Primitive previews should render at the column width');
    }
    const trigger = frame.getByRole('button', { name: 'Card actions' });
    await trigger.click();
    await fits(frame.getByRole('menu', { exact: true }));
    await frame.getByRole('menuitem', { name: 'Edit limits E' }).click();
    assert.equal(await frame.getByRole('menu').count(), 0, 'Selecting an action closes the menu');
    await frame.locator('[data-slot="dropdown-menu-trigger"]:focus').waitFor();
    await trigger.press('ArrowDown');
    await frame.getByRole('menuitem', { name: 'Edit limits E' }).waitFor();
    await frame.locator(':focus').press('Escape');
    await frame.locator('[data-slot="dropdown-menu-trigger"]:focus').waitFor();
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true, 'Escape restores focus to the trigger');

    frame = await frameFor('dropdown-menu', 'Glass');
    await fits(frame.getByRole('menu'));
    const row = frame.getByRole('menuitem', { name: 'Vault', exact: true });
    await row.hover();
    const style = await row.evaluate(el => { const s = getComputedStyle(el); return { radius: s.borderRadius, size: s.fontSize, padding: s.padding, shadow: s.boxShadow, bg: s.backgroundColor }; });
    assert.equal(style.radius, '6px');
    assert.equal(style.size, '12px');
    assert.equal(style.padding, '12px 11px');
    assert.notEqual(style.shadow, 'none', 'Glass highlight uses the reference inset edge');
    assert.equal(style.bg, 'rgba(255, 255, 255, 0.17)');
    frame = await frameFor('dropdown-menu', 'Open');
    await fits(frame.getByRole('menu'));

    frame = await frameFor('dropdown-menu', 'Choices');
    const preferences = frame.getByRole('button', { name: 'Preferences' });
    await preferences.click();
    await frame.getByRole('menuitemcheckbox', { name: 'Notifications' }).click();
    await frame.getByRole('status').filter({ hasText: 'Notifications off' }).waitFor();
    await frame.locator('[data-slot="dropdown-menu-trigger"]:focus').waitFor();
    await preferences.press('ArrowDown');
    await frame.getByRole('menuitemcheckbox').press('ArrowDown');
    await frame.getByRole('menuitem', { name: 'Exports', exact: true }).press('ArrowRight');
    const sub = frame.locator('[data-slot="dropdown-menu-sub-content"]');
    await fits(sub);
    assert.equal(await sub.getAttribute('data-variant'), 'glass', 'Submenus inherit the glass variant');
    assert.equal(await sub.getByRole('menuitem', { name: 'PDF (coming soon)' }).getAttribute('aria-disabled'), 'true');
    await sub.getByRole('menuitem', { name: 'CSV', exact: true }).press('Enter');
    assert.equal(await frame.getByRole('menu').count(), 0);
    await frame.locator('[data-slot="dropdown-menu-trigger"]:focus').waitFor();
    await preferences.click();
    await frame.getByRole('menuitem', { name: 'Exports', exact: true }).hover();
    await sub.getByRole('menuitem', { name: 'CSV', exact: true }).click();
    assert.equal(await frame.getByRole('menu').count(), 0);

    await page.goto(`${base}/components/select`);
    frame = await frameFor('select', 'Toolbar');
    await frame.getByRole('combobox', { name: 'Period' }).click();
    await fits(frame.getByRole('listbox'));
    await page.waitForTimeout(350);
    assert.equal(await frame.getByRole('listbox').count(), 1, 'Lazy-loaded neighboring examples must not steal focus or close Select');
    await frame.locator(':focus').press('Escape');
    frame = await frameFor('select');
    const select = frame.getByRole('combobox', { name: 'Money raised' });
    await select.click();
    await fits(frame.getByRole('listbox'));
    await frame.getByRole('option', { name: 'Bootstrapped' }).click();
    assert.equal(await select.textContent(), 'Bootstrapped');
    const triggerWidth = (await select.boundingBox()).width;
    assert.equal(await select.evaluate(el => getComputedStyle(el).fontSize), '18px');
    await select.press('ArrowDown');
    const listbox = frame.getByRole('listbox');
    await fits(listbox);
    assert.equal(await listbox.evaluate(el => getComputedStyle(el).fontSize), '18px');
    assert.ok(Math.abs((await listbox.boundingBox()).width - triggerWidth) <= 1, 'Field menu matches its trigger width');
    await frame.locator(':focus').press('Escape');
    frame = await frameFor('select', 'Toolbar');
    await frame.getByRole('combobox', { name: 'Period' }).click();
    await fits(frame.getByRole('listbox'));
    assert.ok((await frame.getByRole('listbox').boundingBox()).width >= 175, 'Short toolbar menus retain their minimum readable width');
    assert.equal(await frame.getByRole('listbox').evaluate(el => getComputedStyle(el).fontSize), '14px');
    await frame.locator(':focus').press('Escape');
    frame = await frameFor('select', 'Form');
    const card = frame.getByRole('combobox', { name: 'Card (required)' });
    assert.equal(await card.getAttribute('aria-required'), 'true');
    assert.equal(await frame.locator('select[name="card"]').evaluate(el => el.required), true);
    assert.equal(await frame.locator('form').evaluate(el => el.checkValidity()), false);
    await frame.getByRole('button', { name: 'Continue', exact: true }).click();
    assert.equal(await card.getAttribute('aria-invalid'), 'true');
    await card.press('ArrowDown');
    await fits(frame.getByRole('listbox'));
    assert.equal(await frame.getByRole('option', { name: /Archived card/ }).getAttribute('aria-disabled'), 'true');
    await frame.getByRole('option', { name: /Travel agent/ }).press('o');
    await frame.getByRole('option', { name: /Operations and/ }).press('Enter');
    assert.equal(await card.getAttribute('aria-invalid'), null);
    assert.equal(await frame.locator('form').evaluate(el => el.checkValidity()), true);
    assert.equal(await card.evaluate(el => el.getBoundingClientRect().right <= innerWidth), true, 'Long labels stay inside the field');
    await frame.getByRole('button', { name: 'Continue', exact: true }).click();
    await frame.getByRole('status').filter({ hasText: 'Selected: operations.' }).waitFor();
    await frame.getByRole('button', { name: 'Reset', exact: true }).click();
    assert.equal(await card.textContent(), 'Choose a card');
    assert.equal(await frame.locator('form').evaluate(el => new FormData(el).get('card')), '');
    assert.equal(await frame.getByRole('combobox', { name: 'Billing currency' }).isDisabled(), true);

    for (const [component, triggerName] of [['popover', 'What are limits?'], ['dialog', 'New card'], ['sheet', 'Purchase log']]) {
      await page.goto(`${base}/components/${component}`);
      frame = await frameFor(component);
      await frame.getByRole('button', { name: triggerName, exact: true }).click();
      await fits(frame.getByRole('dialog'));
      await frame.locator('body').press('Escape');
      assert.equal(await frame.getByRole('dialog').count(), 0, `${component} closes with Escape`);
    }
    await page.goto(`${base}/components/tooltip`);
    frame = await frameFor('tooltip');
    await frame.getByRole('button', { name: 'New card' }).hover();
    await fits(frame.getByRole('tooltip'));
    assert.equal(await frame.getByRole('tooltip').textContent(), 'New card');
    const next = await frame.getByRole('button', { name: 'Pause card' }).boundingBox();
    await page.mouse.move(next.x + next.width / 2, next.y + next.height / 2, { steps: 8 });
    await page.mouse.move(next.x + next.width / 2 + 1, next.y + next.height / 2);
    await frame.locator('[data-slot="tooltip-content"][data-state="instant-open"]').waitFor({ timeout: 1000 });
    console.log(`PASS: dropdown keyboard/actions/checkbox/submenu, reference glass styles, select, popover, dialog, sheet, tooltip (${width}px).`);
  }
  await page.setViewportSize({ width: 390, height: 220 });
  await page.goto(`${base}/preview/dropdown-menu/Site`);
  await page.locator('[data-preview-ready]').waitFor();
  await page.getByRole('button', { name: 'Card actions' }).click();
  const menu = page.getByRole('menu');
  await fits(menu);
  assert.ok(await menu.evaluate(el => el.scrollHeight > el.clientHeight), 'A menu scrolls when its content exceeds a short viewport');
  await page.getByRole('menuitem', { name: 'Close card Hold 2s' }).scrollIntoViewIfNeeded();
  await page.locator('body').press('Escape');
  console.log('PASS: long menu content remains reachable in a short viewport.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [component, trigger, role] of [['select', 'Money raised', 'listbox'], ['dropdown-menu', 'Card actions', 'menu'], ['popover', 'What are limits?', 'dialog'], ['dialog', 'New card', 'dialog'], ['tooltip', 'New card', 'tooltip']]) {
    await page.setViewportSize({ width: 720, height: 900 });
    await page.goto(`${base}/preview/${component}/Site`);
    await page.locator('[data-preview-ready]').waitFor();
    const control = page.getByRole(component === 'select' ? 'combobox' : 'button', { name: trigger, exact: true });
    if (component === 'tooltip') await control.hover(); else await control.click();
    const overlay = page.getByRole(role, { exact: true });
    await overlay.waitFor();
    assert.equal(await overlay.evaluate(el => getComputedStyle(el).animationName), 'none', `${component} respects reduced motion`);
  }
  await page.goto(`${base}/preview/accordion/Site`);
  await page.locator('[data-preview-ready]').waitFor();
  await page.locator('[data-slot="accordion-trigger"][data-state="closed"]').first().click();
  assert.equal(await page.locator('[data-slot="accordion-content"][data-state="open"]').first().evaluate(el => getComputedStyle(el).animationName), 'none', 'Accordion state animations respect reduced motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  console.log('PASS: overlays respect reduced motion.');
}
