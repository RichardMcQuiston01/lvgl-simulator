import { expect, test } from '@playwright/test';

test.describe('Stage 2 widget set — visual regression', () => {
  test('renders the fixture screen consistently', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__ready === true);

    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('stage2-widgets.png');
  });
});
