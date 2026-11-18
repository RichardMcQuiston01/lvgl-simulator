import { expect, test } from '@playwright/test';

test.describe('W3 widget set — visual regression', () => {
  test('renders the W3 fixture screen consistently', async ({ page }) => {
    await page.goto('/w3.html');
    await page.waitForFunction(() => window.__ready === true);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('w3-widgets.png', { animations: 'disabled' });
  });
});
