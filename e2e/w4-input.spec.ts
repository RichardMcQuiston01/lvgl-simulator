import { expect, test, type Page } from '@playwright/test';

type W4 = NonNullable<Window['__w4']>;

/** Runs `pick` against the fixture state in the page, failing clearly if it did not load. */
async function read<T>(page: Page, pick: (state: W4) => T): Promise<T> {
  return page.evaluate((source) => {
    const state = window.__w4;
    if (!state) {
      throw new Error('The fixture did not set up window.__w4.');
    }
    state.render();
    return (new Function('state', `return (${source})(state)`) as (state: unknown) => T)(state);
  }, pick.toString());
}

/** Clicks a point given in canvas-local coordinates. */
async function clickAt(page: Page, point: { x: number; y: number }): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) {
    throw new Error('The canvas has no bounding box.');
  }
  await page.mouse.click(box.x + point.x, box.y + point.y);
}

/** Drags from `from` by `(dx, 0)`, pausing before letting go so the swipe is not a flick. */
async function swipe(page: Page, from: { x: number; y: number }, dx: number): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (!box) {
    throw new Error('The canvas has no bounding box.');
  }
  await page.mouse.move(box.x + from.x, box.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box.x + from.x + dx / 2, box.y + from.y, { steps: 5 });
  await page.mouse.move(box.x + from.x + dx, box.y + from.y, { steps: 5 });
  await page.waitForTimeout(250);
  await page.mouse.up();
}

test.describe('W4 container widgets in a real browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/w4-input.html');
    await page.waitForFunction(() => window.__w4 !== undefined);
  });

  test('a tab view switches page when a tab is clicked', async ({ page }) => {
    // The bar is 40px tall and three tabs share 380px: the second tab's centre.
    const tab = await read(page, (state) => ({
      x: state.tabs.x + (state.tabs.width * 1.5) / 3,
      y: state.tabs.y + 20,
    }));
    await clickAt(page, tab);
    await expect.poll(() => read(page, (state) => state.tabs.activeIndex)).toBe(1);
    expect(await read(page, (state) => state.tabChanges)).toBe(1);
  });

  test('a tab view follows a sideways swipe on a page', async ({ page }) => {
    const start = await read(page, (state) => {
      const page0 = state.tabs.pages[0];
      return page0 ? state.centre(page0) : { x: 0, y: 0 };
    });
    // Drag left by more than half a page.
    await swipe(page, start, -230);
    await expect.poll(() => read(page, (state) => state.tabs.activeIndex)).toBe(1);
    expect(await read(page, (state) => state.tabChanges)).toBe(1);
  });

  test('a tab view stays put for a short swipe', async ({ page }) => {
    const start = await read(page, (state) => {
      const page0 = state.tabs.pages[0];
      return page0 ? state.centre(page0) : { x: 0, y: 0 };
    });
    await swipe(page, start, -60);
    await expect.poll(() => read(page, (state) => state.tabs.displayedIndex)).toBe(0);
    expect(await read(page, (state) => state.tabs.activeIndex)).toBe(0);
  });

  test('a stream of small horizontal wheel events steps a tab view one page, not one per event', async ({
    page,
  }) => {
    const over = await read(page, (state) => {
      const page0 = state.tabs.pages[0];
      return page0 ? state.centre(page0) : { x: 0, y: 0 };
    });
    const box = await page.locator('canvas').boundingBox();
    if (!box) {
      throw new Error('The canvas has no bounding box.');
    }
    await page.mouse.move(box.x + over.x, box.y + over.y);
    // A trackpad sends a quick stream of small events.
    for (let event = 0; event < 8; event += 1) {
      await page.mouse.wheel(8, 0);
      await page.waitForTimeout(16);
    }
    await expect.poll(() => read(page, (state) => state.tabs.activeIndex)).toBe(1);
    expect(await read(page, (state) => state.tabChanges)).toBe(1);

    // After a pause, a new gesture steps one more.
    await page.waitForTimeout(400);
    for (let event = 0; event < 8; event += 1) {
      await page.mouse.wheel(8, 0);
      await page.waitForTimeout(16);
    }
    await expect.poll(() => read(page, (state) => state.tabs.activeIndex)).toBe(2);
    expect(await read(page, (state) => state.tabChanges)).toBe(2);
  });

  test('a stream of small horizontal wheel events steps a tile view one tile', async ({ page }) => {
    const over = await read(page, (state) => state.centre(state.tiles));
    const box = await page.locator('canvas').boundingBox();
    if (!box) {
      throw new Error('The canvas has no bounding box.');
    }
    await page.mouse.move(box.x + over.x, box.y + over.y);
    for (let event = 0; event < 8; event += 1) {
      await page.mouse.wheel(8, 0);
      await page.waitForTimeout(16);
    }
    await expect.poll(() => read(page, (state) => state.tiles.activeTile?.col)).toBe(1);
    expect(await read(page, (state) => state.tileChanges)).toBe(1);
  });

  test('a tile view swipes one tile at a time and stops at the last', async ({ page }) => {
    const start = await read(page, (state) => state.centre(state.tiles));
    await swipe(page, start, -110);
    await expect.poll(() => read(page, (state) => state.tiles.activeTile?.col)).toBe(1);
    await swipe(page, start, -110);
    await expect.poll(() => read(page, (state) => state.tiles.activeTile?.col)).toBe(2);
    await swipe(page, start, -110);
    await page.waitForTimeout(300);
    expect(await read(page, (state) => state.tiles.activeTile?.col)).toBe(2);
    expect(await read(page, (state) => state.tileChanges)).toBe(2);
  });

  test('a window header button reports clicks', async ({ page }) => {
    await clickAt(page, await read(page, (state) => state.centre(state.winButton)));
    expect(await read(page, (state) => state.winClicks)).toBe(1);
  });

  test('a menu opens a page from an item and returns with the back button', async ({ page }) => {
    await clickAt(
      page,
      await read(page, (state) => {
        const item = state.root.entries[0];
        return item ? state.centre(item) : { x: 0, y: 0 };
      }),
    );
    expect(await read(page, (state) => state.menu.currentPage?.title)).toBe('Display');
    await clickAt(page, await read(page, (state) => state.centre(state.menu.backButton)));
    expect(await read(page, (state) => state.menu.currentPage?.title)).toBe('Settings');
    expect(await read(page, (state) => state.menu.canGoBack)).toBe(false);
  });

  test('a modal message box blocks what is behind it and reports its buttons', async ({ page }) => {
    await page.evaluate(() => {
      const state = window.__w4;
      if (state) {
        state.modal.hidden = false;
      }
    });
    // The button under the backdrop cannot be clicked.
    await clickAt(page, await read(page, (state) => state.centre(state.behind)));
    expect(await read(page, (state) => state.behindClicks)).toBe(0);

    // A footer button reports itself and leaves the box open.
    await clickAt(
      page,
      await read(page, (state) => {
        const button = state.modal.buttons[1];
        return button ? state.centre(button) : { x: 0, y: 0 };
      }),
    );
    expect(await read(page, (state) => state.modalEvents)).toEqual(['button:OK']);
    expect(await read(page, (state) => state.modal.parent !== null)).toBe(true);

    // The close button cancels and removes it, after which the button behind works again.
    await clickAt(
      page,
      await read(page, (state) => {
        const close = state.modal.closeButton;
        return close ? state.centre(close) : { x: 0, y: 0 };
      }),
    );
    expect(await read(page, (state) => state.modalEvents)).toEqual(['button:OK', 'cancel']);
    expect(await read(page, (state) => state.modal.parent === null)).toBe(true);
    await clickAt(page, await read(page, (state) => state.centre(state.behind)));
    expect(await read(page, (state) => state.behindClicks)).toBe(1);
  });
});
