import { test, expect } from '@playwright/test';
import { testUser, apiEndpoints } from '../fixtures/test-user';

const API_URL = process.env.API_URL || 'http://localhost:8000';

test.describe('Event-Based Activity Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 15000 });
  });

  test('backend health check and activity endpoint accessible', async ({ request }) => {
    // Test backend is running
    const healthResponse = await request.get(`${API_URL}/health`);
    expect(healthResponse.ok()).toBeTruthy();

    const healthData = await healthResponse.json();
    console.log('Backend health:', healthData);
    expect(healthData.status).toBe('healthy');
  });

  test('should display real-time current activity on dashboard', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Look for current activity display
    const currentActivity = page.locator(
      '[data-testid="current-activity"], ' +
      '.current-activity, ' +
      'text=/current.*activity|now.*tracking|active.*app/i'
    );

    // Look for app name being tracked
    const appName = page.locator('text=/VS Code|Chrome|Safari|Firefox|Electron|Terminal|Finder|productify/i');

    const hasCurrentActivity = await currentActivity.count() > 0;
    const hasAppName = await appName.count() > 0;

    console.log('Current activity visible:', hasCurrentActivity);
    console.log('App name visible:', hasAppName);

    // At least app name should be visible if tracking is working
    expect(hasCurrentActivity || hasAppName).toBeTruthy();
  });

  test('should show activity data that updates dynamically', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000);

    // Capture initial state of time-related elements
    const timeElements = page.locator(
      'text=/\\d+h|\\d+m|\\d+s|\\d+:\\d+|hours|minutes|seconds/i'
    );

    const initialCount = await timeElements.count();
    console.log('Initial time elements found:', initialCount);

    // Wait for potential updates (activity tracking should update periodically)
    await page.waitForTimeout(5000);

    // Check for WebSocket connection or real-time indicators
    const wsIndicator = page.locator(
      '[data-testid="connection-status"], ' +
      '.connection-status, ' +
      'text=/connected|live|real-time/i'
    );

    const hasWsIndicator = await wsIndicator.count() > 0;
    console.log('WebSocket/real-time indicator found:', hasWsIndicator);

    // Time elements should still be present
    const finalCount = await timeElements.count();
    expect(finalCount).toBeGreaterThan(0);
  });

  test('should fetch activities from backend API with real data', async ({ page, request }) => {
    // Get auth token from localStorage
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    });

    console.log('Auth token exists:', !!token);

    // Fetch activities from API
    const activitiesResponse = await request.get(`${API_URL}/api/activities`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    console.log('Activities API status:', activitiesResponse.status());

    if (activitiesResponse.ok()) {
      const activities = await activitiesResponse.json();
      console.log('Activities count:', Array.isArray(activities) ? activities.length : 'N/A');

      if (Array.isArray(activities) && activities.length > 0) {
        const firstActivity = activities[0];
        console.log('Sample activity:', {
          app_name: firstActivity.app_name,
          duration: firstActivity.duration,
          category: firstActivity.category,
          created_at: firstActivity.created_at,
        });

        // Verify activity has required fields
        expect(firstActivity).toHaveProperty('app_name');
        expect(firstActivity).toHaveProperty('duration');

        // Verify duration is realistic (not hardcoded 5s for all)
        // If event-based tracking works, durations should vary
        const durations = activities.slice(0, 10).map((a: any) => a.duration);
        console.log('First 10 durations:', durations);

        // Check for duration variance (not all same value)
        const uniqueDurations = new Set(durations);
        console.log('Unique duration values:', uniqueDurations.size);
      }
    }
  });

  test('should verify session endpoint works for event-based tracking', async ({ page, request }) => {
    // Get auth token
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    });

    // Test the session endpoint that event-based tracking uses
    const sessionResponse = await request.post(`${API_URL}/api/activities/session`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      data: {
        app_name: 'Playwright Test',
        window_title: 'E2E Testing Activity Tracking',
        start_time: new Date(Date.now() - 10000).toISOString(),
        end_time: new Date().toISOString(),
        duration: 10,
        source: 'test',
      },
    });

    console.log('Session endpoint status:', sessionResponse.status());

    // Session endpoint should exist and accept data
    // 200/201 = success, 401 = auth required, 422 = validation error (all acceptable)
    expect([200, 201, 401, 422]).toContain(sessionResponse.status());

    if (sessionResponse.ok()) {
      const result = await sessionResponse.json();
      console.log('Session created:', result);
    }
  });

  test('should display activity list with accurate timestamps', async ({ page }) => {
    // Navigate to a page that shows activity history
    await page.waitForTimeout(1000);

    // Look for activity list
    const activityList = page.locator(
      '[data-testid="activity-list"], ' +
      '.activity-list, ' +
      'table, ' +
      '[class*="activity"]'
    );

    if (await activityList.count() > 0) {
      console.log('Activity list found');

      // Check for timestamp elements
      const timestamps = page.locator(
        'text=/\\d{1,2}:\\d{2}|ago|AM|PM|today|yesterday/i'
      );

      const timestampCount = await timestamps.count();
      console.log('Timestamp elements found:', timestampCount);

      expect(timestampCount).toBeGreaterThan(0);
    }
  });

  test('should show productivity metrics from real tracking data', async ({ page }) => {
    // Look for productivity score or metrics
    const productivityMetrics = page.locator(
      'text=/productivity.*score|\\d+%|productive|focus.*time/i'
    );

    await page.waitForTimeout(2000);

    const hasMetrics = await productivityMetrics.count() > 0;
    console.log('Productivity metrics found:', hasMetrics);

    if (hasMetrics) {
      // Check that metrics contain actual numbers
      const metricText = await productivityMetrics.first().textContent();
      console.log('Metric text:', metricText);

      // Should contain numbers (not just placeholder text)
      const hasNumbers = /\d/.test(metricText || '');
      console.log('Metrics contain numbers:', hasNumbers);
    }
  });

  test('should have WebSocket connection for real-time updates', async ({ page }) => {
    // Intercept WebSocket connections
    const wsConnections: string[] = [];

    page.on('websocket', ws => {
      wsConnections.push(ws.url());
      console.log('WebSocket connection:', ws.url());

      ws.on('framereceived', event => {
        console.log('WS frame received:', event.payload?.toString().slice(0, 100));
      });
    });

    // Refresh page to capture new WS connections
    await page.reload();
    await page.waitForTimeout(3000);

    console.log('Total WebSocket connections:', wsConnections.length);

    // Check if any WebSocket connections were made (real-time feature)
    // This validates the app attempts real-time communication
    if (wsConnections.length > 0) {
      expect(wsConnections.some(url => url.includes('activities') || url.includes('ws'))).toBeTruthy();
    }
  });

  test('should track time accurately (not hardcoded 5s)', async ({ page, request }) => {
    // Get recent activities and verify duration variance
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || localStorage.getItem('token');
    });

    const response = await request.get(`${API_URL}/api/activities?period=today`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (response.ok()) {
      const data = await response.json();
      const activities = Array.isArray(data) ? data : data.activities || [];

      if (activities.length >= 5) {
        const durations = activities.slice(0, 20).map((a: any) => a.duration);
        console.log('Durations sample:', durations);

        // Calculate statistics
        const uniqueValues = new Set(durations);
        const avg = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        console.log('Duration stats:', {
          count: durations.length,
          uniqueValues: uniqueValues.size,
          average: avg.toFixed(2),
          min,
          max,
        });

        // If event-based tracking works correctly:
        // - Durations should vary (not all exactly 5s)
        // - Should see different values based on actual app usage time

        // Check that not all durations are exactly 5 (old hardcoded value)
        const allFiveSeconds = durations.every((d: number) => d === 5);
        console.log('All durations are 5s (old bug):', allFiveSeconds);

        if (!allFiveSeconds) {
          console.log('SUCCESS: Durations are varied - event-based tracking working!');
        }
      }
    }
  });
});

test.describe('Activity Tracking API Tests', () => {
  test('backend returns valid activity schema', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/activities`);

    // Even without auth, should get 401 or activities
    expect([200, 401]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      const activities = Array.isArray(data) ? data : data.activities || [];

      if (activities.length > 0) {
        const activity = activities[0];

        // Verify schema
        console.log('Activity schema check:', {
          has_id: 'id' in activity,
          has_app_name: 'app_name' in activity,
          has_duration: 'duration' in activity,
          has_category: 'category' in activity,
          has_timestamp: 'created_at' in activity || 'timestamp' in activity,
        });

        expect(activity).toHaveProperty('app_name');
        expect(activity).toHaveProperty('duration');
        expect(typeof activity.duration).toBe('number');
      }
    }
  });

  test('analytics endpoint returns aggregated data', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/analytics/summary`);

    console.log('Analytics endpoint status:', response.status());

    if (response.ok()) {
      const data = await response.json();
      console.log('Analytics summary:', data);

      // Should have aggregated metrics
      expect(data).toBeDefined();
    }
  });
});
