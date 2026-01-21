import { chromium, FullConfig } from '@playwright/test';
import { testUser } from './fixtures/test-user';

/**
 * Global setup for Playwright E2E tests
 *
 * This runs once before all tests and can be used to:
 * - Create test users
 * - Seed database
 * - Store authentication state
 */

const API_URL = process.env.API_URL || 'http://localhost:8000';

async function globalSetup(config: FullConfig) {
  console.log('Running global setup...');

  // Optional: Check if backend is running
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      console.warn('Warning: Backend health check failed. Some tests may fail.');
    } else {
      console.log('Backend is healthy');
    }
  } catch (error) {
    console.warn('Warning: Could not connect to backend. Running in offline mode.');
  }

  // Optional: Create authenticated state
  // This can be used to skip login in tests that don't specifically test auth

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${config.projects[0].use?.baseURL || 'http://localhost:1420'}/login`);

    // Fill login form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('Auth state not saved - login may have failed or user does not exist');
    });

    // Save storage state to file for reuse in authenticated tests
    await context.storageState({ path: './e2e/.auth/user.json' });
    console.log('Saved authenticated state');
  } catch (error) {
    console.log('Could not create authenticated state:', error);
    // This is OK - tests will handle auth themselves
  }

  await browser.close();
  console.log('Global setup complete');
}

export default globalSetup;
