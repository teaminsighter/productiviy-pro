// DOM Elements
const trackingToggle = document.getElementById('trackingToggle');
const activityTitle = document.getElementById('activityTitle');
const activityDomain = document.getElementById('activityDomain');
const activityTime = document.getElementById('activityTime');
const activityLoading = document.getElementById('activityLoading');
const activityData = document.getElementById('activityData');
const totalTimeValue = document.getElementById('totalTimeValue');
const totalTimeSkeleton = document.getElementById('totalTimeSkeleton');
const topCategoryValue = document.getElementById('topCategoryValue');
const topCategorySkeleton = document.getElementById('topCategorySkeleton');
const topSitesList = document.getElementById('topSitesList');
const openDashboard = document.getElementById('openDashboard');
const settingsBtn = document.getElementById('settingsBtn');
const loginForm = document.getElementById('loginForm');
const mainContent = document.getElementById('mainContent');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const linkCodeInput = document.getElementById('linkCode');
const linkBtn = document.getElementById('linkBtn');
const linkError = document.getElementById('linkError');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const syncBanner = document.getElementById('syncBanner');
const syncBannerText = document.getElementById('syncBannerText');
const syncNowBtn = document.getElementById('syncNowBtn');
const toast = document.getElementById('toast');

// State
let isTracking = true;
let isAuthenticated = false;
let isOnline = true;
let updateInterval;
let timerInterval; // Separate interval for timer display
const MESSAGE_TIMEOUT = 5000; // 5 second timeout for messages
const UPDATE_INTERVAL = 3000; // Sync data every 3 seconds
const TIMER_INTERVAL = 1000; // Update timer display every 1 second
let currentDuration = 0; // Track duration locally for smooth counting

// Send message with timeout
function sendMessageWithTimeout(message, timeout = MESSAGE_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, timeout);

    try {
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
  toast.textContent = message;
  toast.className = `toast ${type}`;

  // Force reflow
  toast.offsetHeight;

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Update network status indicator
function updateNetworkStatus(online, syncing = false, pending = 0) {
  statusDot.className = 'status-dot';

  if (syncing) {
    statusDot.classList.add('syncing');
    statusText.textContent = 'Syncing...';
  } else if (online) {
    statusDot.classList.add('online');
    statusText.textContent = 'Online';
  } else {
    statusDot.classList.add('offline');
    statusText.textContent = 'Offline';
  }

  // Update sync banner
  if (pending > 0 && !syncing) {
    syncBanner.className = 'sync-banner show pending';
    syncBannerText.textContent = `${pending} item${pending > 1 ? 's' : ''} pending sync`;
    syncNowBtn.disabled = !online;
  } else if (syncing) {
    syncBanner.className = 'sync-banner show syncing';
    syncBannerText.textContent = 'Syncing...';
    syncNowBtn.disabled = true;
  } else {
    syncBanner.className = 'sync-banner';
  }
}

// Show loading state
function showLoading() {
  activityLoading.style.display = 'flex';
  activityData.style.display = 'none';
}

// Hide loading state
function hideLoading() {
  activityLoading.style.display = 'none';
  activityData.style.display = 'block';
}

// Show stats
function showStats() {
  totalTimeSkeleton.style.display = 'none';
  totalTimeValue.style.display = 'inline';
  topCategorySkeleton.style.display = 'none';
  topCategoryValue.style.display = 'inline';
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // First, try auto-login from desktop app
    await tryAutoLogin();

    await loadStatus();
    await loadStats();
    hideLoading();
    showStats();

    // Sync data every 3 seconds
    updateInterval = setInterval(updateCurrentActivity, UPDATE_INTERVAL);

    // Update timer display every 1 second (smooth counting)
    timerInterval = setInterval(updateTimerDisplay, TIMER_INTERVAL);
  } catch (error) {
    console.error('Initialization error:', error);
    showToast('Failed to load. Please try again.', 'error');
    hideLoading();
  }
});

// Try auto-login from desktop app
async function tryAutoLogin() {
  try {
    const response = await sendMessageWithTimeout({ type: 'TRY_AUTO_LOGIN' }, 5000);
    if (response?.success) {
      isAuthenticated = true;
      showToast('Auto signed in from desktop app', 'success');
    }
  } catch (error) {
    // Silent fail - user can still manually login
    console.log('Auto-login not available:', error.message);
  }
}

async function loadStatus() {
  try {
    const response = await sendMessageWithTimeout({ type: 'GET_STATUS' });

    if (!response) {
      throw new Error('No response from background script');
    }

    isTracking = response.isTracking;
    isAuthenticated = response.isAuthenticated;
    isOnline = response.isOnline !== false;

    updateTrackingUI();
    updateNetworkStatus(
      isOnline,
      false,
      response.syncStatus?.pending || 0
    );

    if (!isAuthenticated) {
      mainContent.style.display = 'none';
      loginForm.classList.add('show');
    } else {
      mainContent.style.display = 'block';
      loginForm.classList.remove('show');
    }

    if (response.currentTab) {
      updateActivityDisplay(response.currentTab);
      hideLoading();
    } else {
      activityTitle.textContent = 'No activity';
      activityDomain.textContent = 'Open a web page to start tracking';
      activityTime.textContent = '00:00';
      hideLoading();
    }
  } catch (error) {
    console.error('Error loading status:', error);
    updateNetworkStatus(false);
    throw error;
  }
}

async function loadStats() {
  try {
    const stats = await sendMessageWithTimeout({ type: 'GET_TODAY_STATS' });

    if (!stats) {
      throw new Error('No stats response');
    }

    // Total time
    const hours = Math.floor(stats.totalTime / 3600);
    const minutes = Math.floor((stats.totalTime % 3600) / 60);
    totalTimeValue.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    // Top category
    if (stats.byCategory && stats.byCategory.length > 0) {
      topCategoryValue.textContent = capitalizeFirst(stats.byCategory[0][0]);
    } else {
      topCategoryValue.textContent = '-';
    }

    // Top sites
    if (stats.byDomain && stats.byDomain.length > 0) {
      topSitesList.innerHTML = stats.byDomain.slice(0, 5).map(([domain, time]) => {
        const mins = Math.round(time / 60);
        return `
          <div class="site-item">
            <span class="site-name">${escapeHtml(domain)}</span>
            <span class="site-time">${mins}m</span>
          </div>
        `;
      }).join('');
    } else {
      topSitesList.innerHTML = '<div class="site-item"><span class="site-name">No activity yet</span></div>';
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    // Show empty state
    totalTimeValue.textContent = '0m';
    topCategoryValue.textContent = '-';
    topSitesList.innerHTML = '<div class="site-item"><span class="site-name">Unable to load</span></div>';
  }
}

async function updateCurrentActivity() {
  try {
    const response = await sendMessageWithTimeout({ type: 'GET_STATUS' }, 3000);

    if (response) {
      // Update network status
      updateNetworkStatus(
        response.isOnline !== false,
        false,
        response.syncStatus?.pending || 0
      );

      if (response.currentTab) {
        updateActivityDisplay(response.currentTab);
      }
    }
  } catch (error) {
    // Silently handle update errors - don't spam the user
    console.warn('Activity update failed:', error.message);
  }
}

function updateActivityDisplay(tab) {
  activityTitle.textContent = tab.title || 'Unknown';
  activityDomain.textContent = tab.domain || '-';

  // Store duration for local timer
  currentDuration = tab.duration || 0;
  updateTimerDisplay();
}

// Update timer display every second (smooth counting)
function updateTimerDisplay() {
  currentDuration++;
  const hours = Math.floor(currentDuration / 3600);
  const mins = Math.floor((currentDuration % 3600) / 60);
  const secs = currentDuration % 60;

  if (hours > 0) {
    activityTime.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    activityTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

function updateTrackingUI() {
  if (isTracking) {
    trackingToggle.classList.add('active');
  } else {
    trackingToggle.classList.remove('active');
  }
}

// Utility functions
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event Listeners
trackingToggle.addEventListener('click', async () => {
  try {
    isTracking = !isTracking;
    updateTrackingUI();

    const response = await sendMessageWithTimeout({
      type: 'SET_TRACKING',
      value: isTracking
    });

    if (!response?.success) {
      // Revert if failed
      isTracking = !isTracking;
      updateTrackingUI();
      showToast('Failed to toggle tracking', 'error');
    }
  } catch (error) {
    // Revert on error
    isTracking = !isTracking;
    updateTrackingUI();
    showToast('Failed to toggle tracking', 'error');
  }
});

openDashboard.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:1420' });
});

settingsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:1420/settings' });
});

syncNowBtn.addEventListener('click', async () => {
  if (!isOnline) {
    showToast('Cannot sync while offline', 'error');
    return;
  }

  try {
    syncNowBtn.disabled = true;
    updateNetworkStatus(true, true, 0);

    const response = await sendMessageWithTimeout({ type: 'FORCE_SYNC' }, 30000);

    if (response?.success) {
      showToast('Sync completed', 'success');
      // Refresh sync status
      const status = await sendMessageWithTimeout({ type: 'GET_SYNC_STATUS' });
      updateNetworkStatus(status.isOnline, false, status.pending);
    } else {
      showToast(response?.error || 'Sync failed', 'error');
      updateNetworkStatus(isOnline, false, 0);
    }
  } catch (error) {
    showToast('Sync failed: ' + error.message, 'error');
    updateNetworkStatus(isOnline, false, 0);
  } finally {
    syncNowBtn.disabled = false;
  }
});

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Clear previous errors
  loginError.classList.remove('show');
  loginError.textContent = '';

  if (!email || !password) {
    loginError.textContent = 'Please fill in all fields';
    loginError.classList.add('show');
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    loginError.textContent = 'Please enter a valid email address';
    loginError.classList.add('show');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  try {
    const response = await sendMessageWithTimeout({
      type: 'LOGIN',
      credentials: { email, password }
    }, 15000); // 15 second timeout for login

    if (response?.success) {
      loginForm.classList.remove('show');
      mainContent.style.display = 'block';
      isAuthenticated = true;

      showToast('Signed in successfully', 'success');

      // Refresh data
      await loadStats();
      showStats();
    } else {
      loginError.textContent = response?.error || 'Login failed. Please try again.';
      loginError.classList.add('show');
    }
  } catch (error) {
    console.error('Login error:', error);
    loginError.textContent = error.message === 'Message timeout'
      ? 'Connection timeout. Please try again.'
      : 'Login failed. Please check your connection.';
    loginError.classList.add('show');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

// Handle link code button
linkBtn.addEventListener('click', async () => {
  const code = linkCodeInput.value.trim().toUpperCase();

  // Clear previous errors
  linkError.classList.remove('show');
  linkError.textContent = '';

  if (!code || code.length !== 6) {
    linkError.textContent = 'Please enter a 6-digit code';
    linkError.classList.add('show');
    return;
  }

  linkBtn.disabled = true;
  linkBtn.textContent = 'Linking...';

  try {
    const response = await sendMessageWithTimeout({
      type: 'LINK_WITH_CODE',
      code: code
    }, 10000);

    if (response?.success) {
      loginForm.classList.remove('show');
      mainContent.style.display = 'block';
      isAuthenticated = true;

      showToast('Extension linked successfully!', 'success');

      // Refresh data
      await loadStats();
      showStats();
    } else {
      linkError.textContent = response?.error || 'Invalid or expired code';
      linkError.classList.add('show');
    }
  } catch (error) {
    console.error('Link error:', error);
    linkError.textContent = 'Connection failed. Is desktop app running?';
    linkError.classList.add('show');
  } finally {
    linkBtn.disabled = false;
    linkBtn.textContent = 'Link Extension';
  }
});

// Handle Enter key for link code
linkCodeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    linkBtn.click();
  }
});

// Handle Enter key in login form
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginBtn.click();
  }
});

emailInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    passwordInput.focus();
  }
});

// Cleanup
window.addEventListener('unload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  if (timerInterval) {
    clearInterval(timerInterval);
  }
});
