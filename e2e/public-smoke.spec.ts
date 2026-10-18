import { test, expect } from '@playwright/test';

test.describe('public production smoke', () => {
  test('home and auth routes render without dead-end navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('protected student route does not expose dashboard anonymously', async ({ page }) => {
    await page.goto('/student');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/login(?:[/?#]|$)/);
  });

  test('native public bottom tabs navigate and retain active state across redirected routes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const tabs = page.getByRole('navigation', { name: 'Quick navigation' });
    await expect(tabs).toBeVisible();

    // Cookie choice is a real modal and intentionally blocks the app until answered.
    const consent = page.getByRole('dialog', { name: 'Cookie preferences' });
    if (await consent.isVisible()) await consent.getByRole('button', { name: 'Reject all' }).click();

    await expect(tabs.getByRole('link')).toHaveCount(5);
    await expect(tabs.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Dashboard mobile tabs' })).toHaveCount(0);

    await tabs.getByRole('link', { name: 'Study' }).click();
    await expect(page).toHaveURL(/\/study(?:\/?$|\?)/);
    await expect(tabs.getByRole('link', { name: 'Study' })).toHaveAttribute('aria-current', 'page');

    await tabs.getByRole('link', { name: 'Abroad' }).click();
    await expect(page).toHaveURL(/\/tenant\/unipathway\/pathways/);
    await expect(tabs.getByRole('link', { name: 'Abroad' })).toHaveAttribute('aria-current', 'page');
  });
});
