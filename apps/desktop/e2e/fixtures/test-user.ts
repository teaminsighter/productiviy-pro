/**
 * Test fixtures for Productify Pro E2E tests
 */

export const testUser = {
  email: 'e2etest@productifypro.com',
  password: 'E2ETestPass123#',
  name: 'E2E Test User',
};

export const newUser = {
  email: `test-${Date.now()}@productifypro.com`,
  password: 'NewUserPassword123!',
  name: 'New Test User',
};

export const invalidCredentials = {
  email: 'invalid@test.com',
  password: 'wrongpassword',
};

export const testTeam = {
  name: 'Test Team',
  description: 'A team for testing purposes',
};

export const testGoal = {
  name: 'Test Productivity Goal',
  description: 'Achieve 6 hours of focused work daily',
  target: 6,
  unit: 'hours',
  type: 'daily',
};

export const testSettings = {
  trackingEnabled: true,
  screenshotsEnabled: false,
  screenshotInterval: 5,
  blurScreenshots: true,
  notificationsEnabled: true,
  focusReminders: true,
  idleTimeout: 5,
};

// API endpoints for testing
export const apiEndpoints = {
  health: '/health',
  login: '/api/auth/login',
  register: '/api/auth/register',
  logout: '/api/auth/logout',
  me: '/api/auth/me',
  activities: '/api/activities',
  settings: '/api/settings',
  teams: '/api/teams',
  goals: '/api/goals',
  analytics: '/api/analytics',
};
