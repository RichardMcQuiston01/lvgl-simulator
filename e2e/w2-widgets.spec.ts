import { expect, test } from '@playwright/test';

test.describe('W2 widget set — visual regression', () => {
  test('renders the W2 fixture screen consistently', async ({ page }) => {
    await page.goto('/w2.html');
    await page.waitForFunction(() => window.__ready === true);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('w2-widgets.png', { animations: 'disabled' });
  });
});
