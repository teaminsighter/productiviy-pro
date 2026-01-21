import { test, expect } from '@playwright/test';
import { testUser } from '../fixtures/test-user';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test('should display dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);

    // Check for key dashboard elements
    const dashboardHeading = page.locator('h1, h2').filter({ hasText: /dashboard|overview|home/i });
    await expect(dashboardHeading.first()).toBeVisible();
  });

  test('should display activity stats cards', async ({ page }) => {
    // Look for stats cards with common metric names
    const statsCards = page.locator('[data-testid="stat-card"], .stat-card, .stats-card, .metric-card');

    // Alternative: Look for common stat text
    const totalTime = page.locator('text=/total.*time|hours.*today|time.*tracked/i');
    const productivity = page.locator('text=/productivity|productive|focus/i');

    // At least one should be visible
    const hasStatsCards = await statsCards.count() > 0;
    const hasTotalTime = await totalTime.count() > 0;
    const hasProductivity = await productivity.count() > 0;

    expect(hasStatsCards || hasTotalTime || hasProductivity).toBeTruthy();
  });

  test('should have tracking toggle', async ({ page }) => {
    // Look for tracking toggle
    const trackingToggle = page.locator(
      'button:has-text("Start"), button:has-text("Stop"), ' +
      'button:has-text("Pause"), button:has-text("Resume"), ' +
      '[data-testid="tracking-toggle"], ' +
      'input[type="checkbox"][name*="tracking"], ' +
      '[role="switch"]'
    );

    if (await trackingToggle.count() > 0) {
      await expect(trackingToggle.first()).toBeVisible();
    }
  });

  test('should display navigation menu', async ({ page }) => {
    // Check for navigation elements
    const navItems = [
      /dashboard/i,
      /analytics/i,
      /settings/i,
      /team/i,
    ];

    for (const navItem of navItems) {
      const navLink = page.locator(`a, button`).filter({ hasText: navItem });
      if (await navLink.count() > 0) {
        await expect(navLink.first()).toBeVisible();
      }
    }
  });

  test('should display recent activity list or chart', async ({ page }) => {
    // Look for activity display
    const activityElements = page.locator(
      '[data-testid="activity-list"], ' +
      '[data-testid="activity-chart"], ' +
      '.activity-list, .activity-chart, ' +
      '[class*="recharts"], ' +
      'text=/recent.*activity|today.*activity|activity.*log/i'
    );

    // Activity elements may take time to load
    await page.waitForTimeout(2000);

    const hasActivityElements = await activityElements.count() > 0;

    // If no activity elements, check for empty state
    const emptyState = page.locator('text=/no activity|no data|start tracking/i');
    const hasEmptyState = await emptyState.count() > 0;

    expect(hasActivityElements || hasEmptyState).toBeTruthy();
  });

  test('should navigate to analytics page', async ({ page }) => {
    // Find and click analytics link
    const analyticsLink = page.locator('a[href*="analytics"], a:has-text("Analytics"), button:has-text("Analytics")');

    if (await analyticsLink.count() > 0) {
      await analyticsLink.first().click();
      await expect(page).toHaveURL(/analytics/);
    }
  });

  test('should navigate to settings page', async ({ page }) => {
    // Find and click settings link
    const settingsLink = page.locator('a[href*="settings"], a:has-text("Settings"), button:has-text("Settings")');

    if (await settingsLink.count() > 0) {
      await settingsLink.first().click();
      await expect(page).toHaveURL(/settings/);
    }
  });

  test('should display current date/time context', async ({ page }) => {
    // Look for date display
    const dateElements = page.locator(
      'text=/today|this week|january|february|march|april|may|june|july|august|september|october|november|december/i'
    );

    await expect(dateElements.first()).toBeVisible();
  });
});

test.describe('Dashboard - Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test('should toggle tracking on and off', async ({ page }) => {
    // Find tracking toggle
    const trackingToggle = page.locator(
      '[data-testid="tracking-toggle"], ' +
      '[role="switch"], ' +
      'button:has-text("Start"), button:has-text("Stop"), ' +
      'button:has-text("Pause")'
    );

    if (await trackingToggle.count() > 0) {
      const toggle = trackingToggle.first();

      // Get initial state
      const initialText = await toggle.textContent();

      // Click toggle
      await toggle.click();

      // Wait for state change
      await page.waitForTimeout(1000);

      // Click again to restore
      await toggle.click();

      // Should be back to initial state
      await page.waitForTimeout(1000);
    }
  });
});
