import { expect, test } from '@playwright/test';

test.describe('W1 widget set — visual regression', () => {
  test('renders the W1 fixture screen consistently', async ({ page }) => {
    await page.goto('/w1.html');
    await page.waitForFunction(() => window.__ready === true);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('w1-widgets.png');
  });
});
