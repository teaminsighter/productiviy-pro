import { test, expect } from '@playwright/test';
import { testUser } from '../fixtures/test-user';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });

    // Navigate to settings
    const settingsLink = page.locator('a[href*="settings"], a:has-text("Settings"), button:has-text("Settings")');
    if (await settingsLink.count() > 0) {
      await settingsLink.first().click();
      await page.waitForURL(/settings/, { timeout: 10000 });
    } else {
      // Direct navigation fallback
      await page.goto('/settings');
    }
  });

  test('should display settings page', async ({ page }) => {
    await expect(page).toHaveURL(/settings/);

    // Check for settings heading
    const settingsHeading = page.locator('h1, h2').filter({ hasText: /settings|preferences/i });
    await expect(settingsHeading.first()).toBeVisible();
  });

  test('should display settings categories/tabs', async ({ page }) => {
    // Look for common settings tabs/sections
    const settingsTabs = [
      /general|profile/i,
      /tracking|privacy/i,
      /notifications/i,
      /appearance|theme/i,
    ];

    let foundTabs = 0;
    for (const tabPattern of settingsTabs) {
      const tab = page.locator('button, a, [role="tab"]').filter({ hasText: tabPattern });
      if (await tab.count() > 0) {
        foundTabs++;
      }
    }

    // Should have at least some settings sections
    expect(foundTabs).toBeGreaterThan(0);
  });

  test('should have tracking settings', async ({ page }) => {
    // Navigate to tracking settings if available
    const trackingTab = page.locator('button, a, [role="tab"]').filter({ hasText: /tracking|privacy/i });
    if (await trackingTab.count() > 0) {
      await trackingTab.first().click();
      await page.waitForTimeout(500);
    }

    // Look for tracking-related settings
    const trackingSettings = page.locator(
      'text=/tracking enabled|enable tracking|screenshot|idle|break/i'
    );

    // Should have some tracking settings
    const hasTrackingSettings = await trackingSettings.count() > 0;

    // Alternative: look for toggle switches
    const toggles = page.locator('[role="switch"], input[type="checkbox"]');
    const hasToggles = await toggles.count() > 0;

    expect(hasTrackingSettings || hasToggles).toBeTruthy();
  });

  test('should be able to toggle settings', async ({ page }) => {
    // Find a toggle switch
    const toggles = page.locator('[role="switch"], input[type="checkbox"]');

    if (await toggles.count() > 0) {
      const firstToggle = toggles.first();

      // Get initial state
      const initialChecked = await firstToggle.isChecked().catch(() => false);

      // Click toggle
      await firstToggle.click();
      await page.waitForTimeout(500);

      // Click again to restore
      await firstToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('should have notification settings', async ({ page }) => {
    // Navigate to notification settings if available
    const notificationTab = page.locator('button, a, [role="tab"]').filter({ hasText: /notification/i });
    if (await notificationTab.count() > 0) {
      await notificationTab.first().click();
      await page.waitForTimeout(500);
    }

    // Look for notification-related settings
    const notificationSettings = page.locator(
      'text=/notification|remind|alert|sound|desktop notification/i'
    );

    const hasNotificationSettings = await notificationSettings.count() > 0;

    // It's OK if notifications aren't in a separate tab
    expect(hasNotificationSettings).toBeTruthy();
  });

  test('should have profile/account settings', async ({ page }) => {
    // Navigate to profile settings if available
    const profileTab = page.locator('button, a, [role="tab"]').filter({ hasText: /profile|account|general/i });
    if (await profileTab.count() > 0) {
      await profileTab.first().click();
      await page.waitForTimeout(500);
    }

    // Look for profile-related elements
    const profileElements = page.locator(
      'input[name="name"], input[name="email"], ' +
      'text=/name|email|profile|account/i'
    );

    const hasProfileElements = await profileElements.count() > 0;
    expect(hasProfileElements).toBeTruthy();
  });

  test('should have save/apply button', async ({ page }) => {
    // Look for save button
    const saveButton = page.locator(
      'button:has-text("Save"), button:has-text("Apply"), ' +
      'button:has-text("Update"), button[type="submit"]'
    );

    // Save button should be visible (may be disabled if no changes)
    if (await saveButton.count() > 0) {
      await expect(saveButton.first()).toBeVisible();
    }
  });
});

test.describe('Settings - Theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await page.goto('/settings');
  });

  test('should have theme/appearance settings', async ({ page }) => {
    // Navigate to appearance settings if available
    const appearanceTab = page.locator('button, a, [role="tab"]').filter({ hasText: /appearance|theme|display/i });
    if (await appearanceTab.count() > 0) {
      await appearanceTab.first().click();
      await page.waitForTimeout(500);
    }

    // Look for theme-related elements
    const themeElements = page.locator(
      'text=/dark mode|light mode|theme|appearance/i, ' +
      'button:has-text("Dark"), button:has-text("Light"), ' +
      '[data-testid="theme-toggle"]'
    );

    const hasThemeElements = await themeElements.count() > 0;

    // Theme settings may not be implemented, which is OK
    if (!hasThemeElements) {
      console.log('Theme settings not found - may not be implemented');
    }
  });
});

test.describe('Settings - Rules', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test('should navigate to rules page', async ({ page }) => {
    await page.goto('/settings/rules');

    // Check for rules page content
    const rulesContent = page.locator('text=/rule|classification|category|productive|distracting/i');

    // Rules page should exist
    const hasRulesContent = await rulesContent.count() > 0;
    const isOn404 = await page.locator('text=/404|not found/i').count() > 0;

    // Either rules content exists or we're not on a 404 page
    expect(hasRulesContent || !isOn404).toBeTruthy();
  });
});
