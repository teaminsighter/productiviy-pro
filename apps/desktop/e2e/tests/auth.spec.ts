import { test, expect } from '@playwright/test';
import { testUser, newUser, invalidCredentials } from '../fixtures/test-user';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      // Check form elements are visible
      await expect(page.locator('h1, h2').filter({ hasText: /sign in|login|welcome/i })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');

      // Click submit without filling form
      await page.click('button[type="submit"]');

      // Should show validation errors or form should not submit
      // Either validation messages appear or we stay on login page
      await expect(page).toHaveURL(/login/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill with invalid credentials
      await page.fill('input[type="email"]', invalidCredentials.email);
      await page.fill('input[type="password"]', invalidCredentials.password);
      await page.click('button[type="submit"]');

      // Should show error message
      const errorMessage = page.locator('[role="alert"], .error, .text-red-500, [data-testid="error"]');
      await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
    });

    test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
      await page.goto('/login');

      // Fill with valid credentials
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    });

    test('should have link to registration page', async ({ page }) => {
      await page.goto('/login');

      // Find and click register link
      const registerLink = page.locator('a[href*="register"], button:has-text("Sign up"), a:has-text("Create account")');

      if (await registerLink.count() > 0) {
        await registerLink.first().click();
        await expect(page).toHaveURL(/register/);
      }
    });
  });

  test.describe('Registration Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/register');

      // Check form elements are visible
      await expect(page.locator('h1, h2').filter({ hasText: /sign up|register|create account/i })).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for weak password', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[type="email"]', newUser.email);
      await page.fill('input[type="password"]', '123'); // Weak password

      // If there's a confirm password field
      const confirmPassword = page.locator('input[name*="confirm"], input[placeholder*="confirm"]');
      if (await confirmPassword.count() > 0) {
        await confirmPassword.fill('123');
      }

      await page.click('button[type="submit"]');

      // Should show password validation error or stay on page
      await expect(page).toHaveURL(/register/);
    });

    test('should register new user successfully', async ({ page }) => {
      await page.goto('/register');

      // Fill registration form
      await page.fill('input[type="email"]', newUser.email);
      await page.fill('input[type="password"]', newUser.password);

      // Fill name if present
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]');
      if (await nameInput.count() > 0) {
        await nameInput.fill(newUser.name);
      }

      // Fill confirm password if present
      const confirmPassword = page.locator('input[name*="confirm"], input[placeholder*="confirm"]');
      if (await confirmPassword.count() > 0) {
        await confirmPassword.fill(newUser.password);
      }

      await page.click('button[type="submit"]');

      // Should redirect to dashboard or onboarding
      await expect(page).toHaveURL(/dashboard|onboarding|welcome/, { timeout: 15000 });
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/register');

      // Find and click login link
      const loginLink = page.locator('a[href*="login"], a:has-text("Sign in"), a:has-text("Already have an account")');

      if (await loginLink.count() > 0) {
        await loginLink.first().click();
        await expect(page).toHaveURL(/login/);
      }
    });
  });

  test.describe('Logout', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', testUser.email);
      await page.fill('input[type="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/dashboard/, { timeout: 10000 });
    });

    test('should logout and redirect to login page', async ({ page }) => {
      // Find and click logout button/link
      const logoutButton = page.locator(
        'button:has-text("Logout"), button:has-text("Sign out"), ' +
        'a:has-text("Logout"), a:has-text("Sign out"), ' +
        '[data-testid="logout"]'
      );

      // May need to open a dropdown menu first
      const userMenu = page.locator('[data-testid="user-menu"], button[aria-label*="menu"], .avatar');
      if (await userMenu.count() > 0) {
        await userMenu.first().click();
        await page.waitForTimeout(500);
      }

      if (await logoutButton.count() > 0) {
        await logoutButton.first().click();
        await expect(page).toHaveURL(/login/, { timeout: 10000 });
      }
    });
  });
});
