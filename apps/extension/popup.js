// DOM Elements
const trackingToggle = document.getElementById('trackingToggle');
const activityTitle = document.getElementById('activityTitle');
const activityDomain = document.getElementById('activityDomain');
const activityTime = document.getElementById('activityTime');
const totalTime = document.getElementById('totalTime');
const topCategory = document.getElementById('topCategory');
const topSitesList = document.getElementById('topSitesList');
const openDashboard = document.getElementById('openDashboard');
const settingsBtn = document.getElementById('settingsBtn');
const loginForm = document.getElementById('loginForm');
const mainContent = document.getElementById('mainContent');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// State
let isTracking = true;
let isAuthenticated = false;
let updateInterval;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  await loadStats();

  // Update every second
  updateInterval = setInterval(updateCurrentActivity, 1000);
});

async function loadStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });

  isTracking = response.isTracking;
  isAuthenticated = response.isAuthenticated;

  updateTrackingUI();

  if (!isAuthenticated) {
    mainContent.style.display = 'none';
    loginForm.classList.add('show');
  }

  if (response.currentTab) {
    updateActivityDisplay(response.currentTab);
  }
}

async function loadStats() {
  const stats = await chrome.runtime.sendMessage({ type: 'GET_TODAY_STATS' });

  // Total time
  const hours = Math.floor(stats.totalTime / 3600);
  const minutes = Math.floor((stats.totalTime % 3600) / 60);
  totalTime.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  // Top category
  if (stats.byCategory.length > 0) {
    topCategory.textContent = stats.byCategory[0][0];
  }

  // Top sites
  topSitesList.innerHTML = stats.byDomain.slice(0, 5).map(([domain, time]) => {
    const mins = Math.round(time / 60);
    return `
      <div class="site-item">
        <span class="site-name">${domain}</span>
        <span class="site-time">${mins}m</span>
      </div>
    `;
  }).join('') || '<div class="site-item"><span class="site-name">No activity yet</span></div>';
}

async function updateCurrentActivity() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
  if (response.currentTab) {
    updateActivityDisplay(response.currentTab);
  }
}

function updateActivityDisplay(tab) {
  activityTitle.textContent = tab.title || 'Unknown';
  activityDomain.textContent = tab.domain || '-';

  const mins = Math.floor(tab.duration / 60);
  const secs = tab.duration % 60;
  activityTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTrackingUI() {
  if (isTracking) {
    trackingToggle.classList.add('active');
  } else {
    trackingToggle.classList.remove('active');
  }
}

// Event Listeners
trackingToggle.addEventListener('click', async () => {
  isTracking = !isTracking;
  await chrome.runtime.sendMessage({ type: 'SET_TRACKING', value: isTracking });
  updateTrackingUI();
});

openDashboard.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:1420' });
});

settingsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:1420/settings' });
});

loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    loginError.textContent = 'Please fill in all fields';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  const response = await chrome.runtime.sendMessage({
    type: 'LOGIN',
    credentials: { email, password }
  });

  loginBtn.disabled = false;
  loginBtn.textContent = 'Sign In';

  if (response.success) {
    loginForm.classList.remove('show');
    mainContent.style.display = 'block';
    isAuthenticated = true;
    await loadStats();
  } else {
    loginError.textContent = response.error || 'Login failed';
  }
});

// Cleanup
window.addEventListener('unload', () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
