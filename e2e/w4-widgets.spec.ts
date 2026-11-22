import { expect, test } from '@playwright/test';

test.describe('W4 widget set — visual regression', () => {
  test('renders the W4 fixture screen consistently', async ({ page }) => {
    await page.goto('/w4.html');
    await page.waitForFunction(() => window.__ready === true);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('w4-widgets.png', { animations: 'disabled' });
  });
});
