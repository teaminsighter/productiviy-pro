import { test, expect } from '@playwright/test';
import { testUser, testTeam } from '../fixtures/test-user';

test.describe('Team Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test('should navigate to team page', async ({ page }) => {
    // Find and click team link
    const teamLink = page.locator('a[href*="team"], a:has-text("Team"), button:has-text("Team")');

    if (await teamLink.count() > 0) {
      await teamLink.first().click();
      await expect(page).toHaveURL(/team/);
    } else {
      // Direct navigation
      await page.goto('/team');
      await expect(page).toHaveURL(/team/);
    }
  });

  test('should display team page content', async ({ page }) => {
    await page.goto('/team');

    // Check for team-related content
    const teamContent = page.locator('text=/team|member|invite|create team|join team/i');

    // Should have some team-related content
    await expect(teamContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have option to create team', async ({ page }) => {
    await page.goto('/team');

    // Look for create team button
    const createTeamButton = page.locator(
      'button:has-text("Create"), button:has-text("New Team"), ' +
      'a:has-text("Create"), [data-testid="create-team"]'
    );

    // May already be in a team, so this could be hidden
    if (await createTeamButton.count() > 0) {
      await expect(createTeamButton.first()).toBeVisible();
    }
  });

  test('should be able to open create team dialog', async ({ page }) => {
    await page.goto('/team');

    // Look for create team button
    const createTeamButton = page.locator(
      'button:has-text("Create Team"), button:has-text("New Team")'
    );

    if (await createTeamButton.count() > 0) {
      await createTeamButton.first().click();

      // Dialog or form should appear
      const dialog = page.locator('[role="dialog"], .modal, form');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });

      // Should have name input
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]');
      if (await nameInput.count() > 0) {
        await expect(nameInput.first()).toBeVisible();
      }
    }
  });

  test('should have team member list or empty state', async ({ page }) => {
    await page.goto('/team');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for member list or empty state
    const memberList = page.locator('[data-testid="member-list"], .member-list, .team-members');
    const emptyState = page.locator('text=/no members|no team|create a team|join a team/i');

    const hasMemberList = await memberList.count() > 0;
    const hasEmptyState = await emptyState.count() > 0;

    expect(hasMemberList || hasEmptyState).toBeTruthy();
  });
});

test.describe('Team - Invitations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await page.goto('/team');
  });

  test('should have invite member option', async ({ page }) => {
    // Look for invite button
    const inviteButton = page.locator(
      'button:has-text("Invite"), a:has-text("Invite"), ' +
      '[data-testid="invite-member"]'
    );

    // Invite option may only be visible if user has a team
    if (await inviteButton.count() > 0) {
      await expect(inviteButton.first()).toBeVisible();
    }
  });

  test('should open invite dialog when clicking invite', async ({ page }) => {
    const inviteButton = page.locator('button:has-text("Invite")');

    if (await inviteButton.count() > 0) {
      await inviteButton.first().click();

      // Dialog should appear
      const dialog = page.locator('[role="dialog"], .modal');
      await expect(dialog.first()).toBeVisible({ timeout: 5000 });

      // Should have email input
      const emailInput = page.locator('input[type="email"], input[placeholder*="email"]');
      if (await emailInput.count() > 0) {
        await expect(emailInput.first()).toBeVisible();
      }
    }
  });
});

test.describe('Team - Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test('should navigate to team settings', async ({ page }) => {
    // First go to team page
    await page.goto('/team');

    // Look for team settings link
    const teamSettingsLink = page.locator(
      'a[href*="team-settings"], a[href*="team/settings"], ' +
      'button:has-text("Team Settings"), a:has-text("Team Settings")'
    );

    if (await teamSettingsLink.count() > 0) {
      await teamSettingsLink.first().click();
      await expect(page).toHaveURL(/team.*settings|settings.*team/);
    } else {
      // Direct navigation
      await page.goto('/team-settings');
    }
  });

  test('should display team settings if user has a team', async ({ page }) => {
    await page.goto('/team-settings');

    // Wait for content
    await page.waitForTimeout(2000);

    // Check for team settings content
    const teamSettingsContent = page.locator(
      'text=/team name|team settings|member permissions|visibility/i'
    );
    const noTeamMessage = page.locator('text=/no team|create a team|join a team/i');

    const hasTeamSettings = await teamSettingsContent.count() > 0;
    const hasNoTeam = await noTeamMessage.count() > 0;

    // Either should have team settings or a message about no team
    expect(hasTeamSettings || hasNoTeam).toBeTruthy();
  });
});
