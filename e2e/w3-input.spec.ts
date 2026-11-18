import { expect, test, type Page } from '@playwright/test';

/** Moves to a point in canvas-local coordinates. */
async function moveTo(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) {
    throw new Error('The canvas has no bounding box.');
  }
  await page.mouse.move(box.x + x, box.y + y);
}

/** Clicks a point given in canvas-local coordinates. */
async function clickCanvas(page: Page, x: number, y: number): Promise<void> {
  await moveTo(page, x, y);
  await page.mouse.down();
  await page.mouse.up();
}

/** Reads from the fixture's state, failing clearly if it did not load. */
async function read<T>(page: Page, pick: (state: NonNullable<Window['__w3']>) => T): Promise<T> {
  return page.evaluate((source) => {
    const state = window.__w3;
    if (!state) {
      throw new Error('The fixture did not set up window.__w3.');
    }
    return (new Function('state', `return (${source})(state)`) as (state: unknown) => T)(state);
  }, pick.toString());
}

test.describe('W3 selection widgets in a real browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/w3-input.html');
    await page.waitForFunction(() => window.__w3 !== undefined);
  });

  test('a dropdown opens on click, picks an option, and closes', async ({ page }) => {
    await clickCanvas(page, 80, 28);
    expect(await read(page, (state) => state.dropdown.isOpen)).toBe(true);

    // The list opens below the dropdown; its third row is Cherry.
    await clickCanvas(page, 80, 137);
    expect(await read(page, (state) => state.dropdown.selectedText)).toBe('Cherry');
    expect(await read(page, (state) => state.dropdown.isOpen)).toBe(false);
    expect(await read(page, (state) => state.dropdownChanges)).toBe(1);
  });

  test('an open dropdown list takes the click instead of a button under it', async ({ page }) => {
    await clickCanvas(page, 80, 28);
    // (60, 100) is inside the "Covered" button and also inside the open list's Banana row.
    await clickCanvas(page, 60, 100);
    expect(await read(page, (state) => state.dropdown.selectedText)).toBe('Banana');
    expect(await read(page, (state) => state.coveredClicks)).toBe(0);

    // With the list closed, the same point reaches the button.
    await clickCanvas(page, 60, 100);
    expect(await read(page, (state) => state.coveredClicks)).toBe(1);
  });

  test('pressing outside an open dropdown closes it without choosing', async ({ page }) => {
    await clickCanvas(page, 80, 28);
    await clickCanvas(page, 350, 400);
    expect(await read(page, (state) => state.dropdown.isOpen)).toBe(false);
    expect(await read(page, (state) => state.dropdown.selectedText)).toBe('Apple');
    expect(await read(page, (state) => state.dropdownChanges)).toBe(0);
  });

  test('a focused dropdown changes with the arrow keys, and Enter opens then picks', async ({
    page,
  }) => {
    await page.locator('canvas').focus();
    await page.keyboard.press('ArrowDown');
    expect(await read(page, (state) => state.dropdown.selectedText)).toBe('Banana');
    await page.keyboard.press('Enter');
    expect(await read(page, (state) => state.dropdown.isOpen)).toBe(true);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    expect(await read(page, (state) => state.dropdown.selectedText)).toBe('Cherry');
    expect(await read(page, (state) => state.dropdown.isOpen)).toBe(false);
  });

  test('a roller follows a drag and settles on a row', async ({ page }) => {
    await moveTo(page, 245, 70);
    await page.mouse.down();
    await page.mouse.move(245, 55, { steps: 5 });
    // Hold still so the drag has no flick in it.
    await page.waitForTimeout(300);
    await page.mouse.move(245, 40, { steps: 5 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    // Dragging up by 30px is one row.
    await expect.poll(() => read(page, (state) => state.roller.selectedIndex)).toBe(1);
    expect(await read(page, (state) => state.rollerChanges)).toBe(1);
  });

  test('a button matrix checks one button at a time', async ({ page }) => {
    await clickCanvas(page, 110, 210);
    expect(await read(page, (state) => state.matrix.checkedIndex)).toBe(1);
    await clickCanvas(page, 175, 210);
    expect(await read(page, (state) => state.matrix.checkedIndex)).toBe(2);
  });

  test('a list scrolls with the mouse wheel and reports a click on a row', async ({ page }) => {
    await moveTo(page, 100, 300);
    await page.mouse.wheel(0, 60);
    await expect.poll(() => read(page, (state) => state.list.scrollY)).toBeGreaterThan(0);
    const scrolled = await read(page, (state) => state.list.scrollY);

    // After scrolling, the row under (100, 275) is further down the list.
    await clickCanvas(page, 100, 275);
    const clicked = await read(page, (state) => state.listClicks);
    expect(clicked).toHaveLength(1);
    expect(clicked[0]).not.toBe('One');
    expect(scrolled).toBeGreaterThan(0);
  });

  test('radio checkboxes check one at a time', async ({ page }) => {
    await clickCanvas(page, 250, 212);
    await clickCanvas(page, 250, 244);
    expect(await read(page, (state) => state.radios.map((radio) => radio.checked))).toEqual([
      false,
      true,
      false,
    ]);
  });
});
