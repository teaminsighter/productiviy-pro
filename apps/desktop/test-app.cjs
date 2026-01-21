const { chromium } = require('playwright');

(async () => {
  console.log('🎭 Starting Playwright test...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const results = {
    passed: [],
    failed: []
  };

  // Pre-test: Mark onboarding as complete
  console.log('🔧 Setup: Marking onboarding as complete...');
  try {
    const response = await page.request.post('http://localhost:8000/api/onboarding/complete');
    const data = await response.json();
    console.log('   ✅ Onboarding marked complete\n');
  } catch (e) {
    console.log(`   ⚠️ Could not complete onboarding: ${e.message}\n`);
  }

  // Test 1: Login Page
  console.log('📝 Test 1: Login Page');
  try {
    await page.goto('http://localhost:1420/login');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });
    const title = await page.title();
    console.log(`   ✅ Login page loaded - Title: ${title}`);
    results.passed.push('Login page loads');

    // Take screenshot
    await page.screenshot({ path: '/tmp/test-login.png' });
    console.log('   📸 Screenshot saved: /tmp/test-login.png');
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}`);
    results.failed.push('Login page loads');
  }

  // Test 2: Login Flow
  console.log('\n📝 Test 2: Login Flow');
  try {
    await page.fill('input[type="email"]', 'you@productify.com');
    await page.fill('input[type="password"]', 'Test1234!');
    await page.click('button[type="submit"]');

    // Wait for redirect (either / or /dashboard - both are valid for logged-in users)
    await page.waitForURL(url => {
      const path = new URL(url).pathname;
      return path === '/' || path === '/dashboard';
    }, { timeout: 10000 });

    const currentUrl = page.url();
    console.log(`   ✅ Login successful - Redirected to ${new URL(currentUrl).pathname}`);
    results.passed.push('Login flow works');

    await page.screenshot({ path: '/tmp/test-dashboard.png' });
    console.log('   📸 Screenshot saved: /tmp/test-dashboard.png');
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}`);
    results.failed.push('Login flow works');
    await page.screenshot({ path: '/tmp/test-login-error.png' });
  }

  // Test 3: Dashboard Elements
  console.log('\n📝 Test 3: Dashboard Elements');
  try {
    await page.waitForSelector('[class*="glass-card"]', { timeout: 5000 });
    const cards = await page.$$('[class*="glass-card"]');
    console.log(`   ✅ Dashboard loaded with ${cards.length} glass cards`);
    results.passed.push('Dashboard elements render');
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}`);
    results.failed.push('Dashboard elements render');
  }

  // Test 4: Navigate to Screenshots
  console.log('\n📝 Test 4: Screenshots Page');
  try {
    await page.goto('http://localhost:1420/screenshots');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const heading = await page.$('h1');
    const text = heading ? await heading.textContent() : '';
    console.log(`   ✅ Screenshots page loaded - Heading: ${text}`);
    results.passed.push('Screenshots page loads');

    await page.screenshot({ path: '/tmp/test-screenshots.png' });
    console.log('   📸 Screenshot saved: /tmp/test-screenshots.png');
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}`);
    results.failed.push('Screenshots page loads');
  }

  // Test 5: Navigate to Settings
  console.log('\n📝 Test 5: Settings Page');
  try {
    await page.goto('http://localhost:1420/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for screenshots tab
    const screenshotsTab = await page.$('text=Screenshots');
    if (screenshotsTab) {
      await screenshotsTab.click();
      await page.waitForTimeout(500);
      console.log('   ✅ Settings page loaded - Screenshots tab found');

      // Check for new Resolution setting
      const resolutionSetting = await page.$('text=Resolution');
      if (resolutionSetting) {
        console.log('   ✅ Resolution setting found');
        results.passed.push('Screenshot resolution setting exists');
      }

      // Check for Format setting
      const formatSetting = await page.$('text=Format');
      if (formatSetting) {
        console.log('   ✅ Format setting found');
        results.passed.push('Screenshot format setting exists');
      }
    }
    results.passed.push('Settings page loads');

    await page.screenshot({ path: '/tmp/test-settings.png' });
    console.log('   📸 Screenshot saved: /tmp/test-settings.png');
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}`);
    results.failed.push('Settings page loads');
  }

  // Test 6: Analytics Page
  console.log('\n📝 Test 6: Analytics Page');
  try {
    await page.goto('http://localhost:1420/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    console.log('   ✅ Analytics page loaded');
    results.passed.push('Analytics page loads');

    await page.screenshot({ path: '/tmp/test-analytics.png' });
    console.log('   📸 Screenshot saved: /tmp/test-analytics.png');
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}`);
    results.failed.push('Analytics page loads');
  }

  // Test 7: API Health
  console.log('\n📝 Test 7: API Connectivity');
  try {
    const response = await page.request.get('http://localhost:8000/health');
    const data = await response.json();
    console.log(`   ✅ API healthy - ActivityWatch: ${data.activitywatch}`);
    results.passed.push('API connectivity');
  } catch (e) {
    console.log(`   ❌ Failed: ${e.message}`);
    results.failed.push('API connectivity');
  }

  await browser.close();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log('');

  if (results.passed.length > 0) {
    console.log('Passed tests:');
    results.passed.forEach(t => console.log(`  ✅ ${t}`));
  }

  if (results.failed.length > 0) {
    console.log('\nFailed tests:');
    results.failed.forEach(t => console.log(`  ❌ ${t}`));
  }

  console.log('\n📸 Screenshots saved to /tmp/test-*.png');
})();
