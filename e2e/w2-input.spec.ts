import { expect, test, type Page } from '@playwright/test';

/** Clicks a point given in canvas-local coordinates. */
async function clickCanvas(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) {
    throw new Error('The canvas has no bounding box.');
  }
  await page.mouse.click(box.x + x, box.y + y);
}

/** The centre of the on-screen keyboard key labelled `label`, in canvas-local coordinates. */
async function keyCentre(page: Page, label: string): Promise<{ x: number; y: number }> {
  return page.evaluate((wanted) => {
    const state = window.__w2;
    if (!state) {
      throw new Error('The fixture did not set up window.__w2.');
    }
    const rect = state.keyboard.keyRects.find((candidate) => candidate.definition.label === wanted);
    if (!rect) {
      throw new Error(`No key labelled ${wanted}.`);
    }
    return {
      x: state.keyboard.x + rect.x + rect.width / 2,
      y: state.keyboard.y + rect.y + rect.height / 2,
    };
  }, label);
}

const textOf = (page: Page): Promise<string> =>
  page.evaluate(() => window.__w2?.textarea.text ?? '<fixture missing>');

test.describe('W2 text input in a real browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/w2-input.html');
    await page.waitForFunction(() => window.__w2 !== undefined);
  });

  test('focuses on click and edits with real key presses', async ({ page }) => {
    await clickCanvas(page, 100, 28);
    expect(await page.evaluate(() => window.__w2?.textarea.focused)).toBe(true);

    await page.keyboard.type('Hello');
    expect(await textOf(page)).toBe('Hello');
    await page.keyboard.press('Backspace');
    expect(await textOf(page)).toBe('Hell');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('X');
    expect(await textOf(page)).toBe('HelXl');
  });

  test('selects all with Ctrl+A and typing replaces the selection', async ({ page }) => {
    await clickCanvas(page, 100, 28);
    await page.keyboard.type('abc');
    await page.keyboard.press('Control+a');
    expect(await page.evaluate(() => window.__w2?.textarea.selectedText)).toBe('abc');
    await page.keyboard.type('z');
    expect(await textOf(page)).toBe('z');
  });

  test('types with the on-screen keyboard and fires ready from its Enter key', async ({ page }) => {
    for (const label of ['q', 'w', 'e']) {
      const { x, y } = await keyCentre(page, label);
      await clickCanvas(page, x, y);
    }
    expect(await textOf(page)).toBe('qwe');

    const backspace = await keyCentre(page, '⌫');
    await clickCanvas(page, backspace.x, backspace.y);
    expect(await textOf(page)).toBe('qw');

    const enter = await keyCentre(page, '↵');
    await clickCanvas(page, enter.x, enter.y);
    expect(await page.evaluate(() => window.__w2?.readyCount)).toBe(1);
    expect(await textOf(page)).toBe('qw');
  });

  test('switches the keyboard to capitals', async ({ page }) => {
    const shift = await keyCentre(page, 'ABC');
    await clickCanvas(page, shift.x, shift.y);
    expect(await page.evaluate(() => window.__w2?.keyboard.mode)).toBe('textUpper');
    const key = await keyCentre(page, 'Q');
    await clickCanvas(page, key.x, key.y);
    expect(await textOf(page)).toBe('Q');
  });

  test('places the caret and selects by dragging in the textarea', async ({ page }) => {
    await clickCanvas(page, 100, 28);
    await page.keyboard.type('hello world');
    const box = await page.locator('canvas').boundingBox();
    if (!box) {
      throw new Error('The canvas has no bounding box.');
    }
    // Drag from near the start of the text to well into it.
    await page.mouse.move(box.x + 20, box.y + 28);
    await page.mouse.down();
    await page.mouse.move(box.x + 80, box.y + 28, { steps: 4 });
    await page.mouse.up();
    const selected = await page.evaluate(() => window.__w2?.textarea.selectedText ?? '');
    expect(selected.length).toBeGreaterThan(2);
    expect('hello world').toContain(selected);
  });
});
