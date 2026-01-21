// Configuration
const API_URL = 'http://localhost:8000';
let authToken = null;
let isTracking = true;
let currentTab = null;
let tabStartTime = null;

// ============== Network Status & Retry Queue ==============
const RETRY_QUEUE = [];
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // exponential backoff
const REQUEST_TIMEOUT = 10000; // 10 seconds
let isOnline = true;
let syncInProgress = false;

// IndexedDB for persistent offline queue
const DB_NAME = 'productify_offline_queue';
const DB_VERSION = 1;
let db = null;

// Initialize IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create stores for offline data
      if (!database.objectStoreNames.contains('pendingActivities')) {
        const store = database.createObjectStore('pendingActivities', {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }

      if (!database.objectStoreNames.contains('pendingVideos')) {
        database.createObjectStore('pendingVideos', {
          keyPath: 'id',
          autoIncrement: true
        });
      }

      if (!database.objectStoreNames.contains('syncStatus')) {
        database.createObjectStore('syncStatus', { keyPath: 'key' });
      }
    };
  });
}

// Add item to offline queue (IndexedDB)
async function addToOfflineQueue(storeName, data) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add({
        ...data,
        queuedAt: new Date().toISOString(),
        retryCount: 0
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (error) {
      console.error('Error adding to offline queue:', error);
      reject(error);
    }
  });
}

// Get all items from offline queue
async function getOfflineQueue(storeName) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    } catch (error) {
      console.error('Error getting offline queue:', error);
      resolve([]);
    }
  });
}

// Remove item from offline queue
async function removeFromOfflineQueue(storeName, id) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (error) {
      console.error('Error removing from offline queue:', error);
      reject(error);
    }
  });
}

// Update sync status
async function updateSyncStatus(status) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(['syncStatus'], 'readwrite');
      const store = transaction.objectStore('syncStatus');
      store.put({ key: 'lastSync', ...status, updatedAt: new Date().toISOString() });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// Get sync status
async function getSyncStatus() {
  if (!db) await initDB();

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(['syncStatus'], 'readonly');
      const store = transaction.objectStore('syncStatus');
      const request = store.get('lastSync');

      request.onsuccess = () => resolve(request.result || { pending: 0, lastSyncTime: null });
      request.onerror = () => resolve({ pending: 0, lastSyncTime: null });
    } catch (error) {
      resolve({ pending: 0, lastSyncTime: null });
    }
  });
}

// Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// Retry with exponential backoff
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      // Check for auth errors
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await refreshAuthToken();
        if (refreshed && attempt < retries) {
          options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${authToken}`
          };
          continue;
        }
        throw new Error('Authentication failed');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      console.warn(`Attempt ${attempt + 1}/${retries + 1} failed:`, error.message);

      if (attempt < retries) {
        const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)];
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Refresh auth token
async function refreshAuthToken() {
  const stored = await chrome.storage.local.get(['refreshToken']);
  if (!stored.refreshToken) return false;

  try {
    const response = await fetchWithTimeout(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: stored.refreshToken })
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.access_token;
      await chrome.storage.local.set({
        authToken,
        refreshToken: data.refresh_token || stored.refreshToken
      });
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  return false;
}

// Check network status
function checkOnlineStatus() {
  // In service worker context, we check via a simple fetch
  fetchWithTimeout(`${API_URL}/health`, {}, 5000)
    .then(() => {
      if (!isOnline) {
        isOnline = true;
        console.log('Network restored - syncing offline queue');
        processOfflineQueue();
      }
    })
    .catch(() => {
      isOnline = false;
    });
}

// Process offline queue
async function processOfflineQueue() {
  if (syncInProgress || !isOnline || !authToken) return;

  syncInProgress = true;
  let synced = 0;
  let failed = 0;

  try {
    // Process pending activities
    const pendingActivities = await getOfflineQueue('pendingActivities');

    for (const item of pendingActivities) {
      try {
        await fetchWithRetry(`${API_URL}/api/activities/browser`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(item.data)
        });

        await removeFromOfflineQueue('pendingActivities', item.id);
        synced++;
      } catch (error) {
        console.error('Failed to sync activity:', error);
        failed++;

        // Update retry count
        if (item.retryCount >= MAX_RETRIES) {
          // Give up on this item after max retries
          await removeFromOfflineQueue('pendingActivities', item.id);
        }
      }
    }

    // Process pending videos
    const pendingVideos = await getOfflineQueue('pendingVideos');

    for (const item of pendingVideos) {
      try {
        await fetchWithRetry(`${API_URL}/api/activities/${item.endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(item.data)
        });

        await removeFromOfflineQueue('pendingVideos', item.id);
        synced++;
      } catch (error) {
        console.error('Failed to sync video data:', error);
        failed++;

        if (item.retryCount >= MAX_RETRIES) {
          await removeFromOfflineQueue('pendingVideos', item.id);
        }
      }
    }

    // Update sync status
    const remaining = (await getOfflineQueue('pendingActivities')).length +
                     (await getOfflineQueue('pendingVideos')).length;

    await updateSyncStatus({
      pending: remaining,
      lastSyncTime: new Date().toISOString(),
      lastSyncResult: { synced, failed }
    });

    console.log(`Sync complete: ${synced} synced, ${failed} failed, ${remaining} pending`);

  } catch (error) {
    console.error('Error processing offline queue:', error);
  } finally {
    syncInProgress = false;
  }
}

// Platform detection patterns
const PLATFORMS = {
  youtube: {
    pattern: /youtube\.com/,
    extractTitle: (url, title) => {
      const videoMatch = title.match(/^(.+?) - YouTube$/);
      return videoMatch ? videoMatch[1] : title;
    },
    getMetadata: async (url) => {
      const videoId = url.match(/[?&]v=([^&]+)/)?.[1];
      return { videoId, platform: 'youtube' };
    },
    defaultCategory: 'entertainment',
    canBeProductive: true // Educational content
  },
  github: {
    pattern: /github\.com/,
    extractTitle: (url, title) => title.replace(' · GitHub', ''),
    defaultCategory: 'development',
    isProductive: true
  },
  stackoverflow: {
    pattern: /stackoverflow\.com/,
    defaultCategory: 'development',
    isProductive: true
  },
  udemy: {
    pattern: /udemy\.com/,
    extractTitle: (url, title) => {
      const courseMatch = title.match(/^(.+?) \| Udemy$/);
      return courseMatch ? courseMatch[1] : title;
    },
    defaultCategory: 'learning',
    isProductive: true
  },
  coursera: {
    pattern: /coursera\.org/,
    defaultCategory: 'learning',
    isProductive: true
  },
  linkedin: {
    pattern: /linkedin\.com/,
    defaultCategory: 'professional',
    canBeProductive: true
  },
  twitter: {
    pattern: /twitter\.com|x\.com/,
    defaultCategory: 'social',
    isProductive: false
  },
  facebook: {
    pattern: /facebook\.com/,
    defaultCategory: 'social',
    isProductive: false
  },
  instagram: {
    pattern: /instagram\.com/,
    defaultCategory: 'social',
    isProductive: false
  },
  reddit: {
    pattern: /reddit\.com/,
    defaultCategory: 'social',
    canBeProductive: true // Some subreddits are productive
  },
  netflix: {
    pattern: /netflix\.com/,
    defaultCategory: 'entertainment',
    isProductive: false
  },
  notion: {
    pattern: /notion\.so/,
    defaultCategory: 'productivity',
    isProductive: true
  },
  figma: {
    pattern: /figma\.com/,
    defaultCategory: 'design',
    isProductive: true
  },
  docs: {
    pattern: /docs\.google\.com/,
    defaultCategory: 'productivity',
    isProductive: true
  },
  sheets: {
    pattern: /sheets\.google\.com/,
    defaultCategory: 'productivity',
    isProductive: true
  },
  gmail: {
    pattern: /mail\.google\.com/,
    defaultCategory: 'email',
    canBeProductive: true
  },
  chatgpt: {
    pattern: /chat\.openai\.com|chatgpt\.com/,
    defaultCategory: 'ai',
    isProductive: true
  },
  claude: {
    pattern: /claude\.ai/,
    defaultCategory: 'ai',
    isProductive: true
  }
};

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Productify Pro Extension installed');

  // Initialize IndexedDB
  await initDB();

  // Load saved settings
  const stored = await chrome.storage.local.get(['authToken', 'isTracking', 'refreshToken']);
  authToken = stored.authToken || null;
  isTracking = stored.isTracking !== false;

  // Try auto-login from desktop app if not authenticated
  if (!authToken) {
    await tryAutoLoginFromDesktop();
  }

  // Set up alarms
  chrome.alarms.create('syncActivity', { periodInMinutes: 1 });
  chrome.alarms.create('checkNetwork', { periodInMinutes: 2 });
  chrome.alarms.create('processQueue', { periodInMinutes: 5 });
});

// On startup (when browser opens or service worker restarts)
chrome.runtime.onStartup.addListener(async () => {
  await initDB();
  const stored = await chrome.storage.local.get(['authToken', 'isTracking']);
  authToken = stored.authToken || null;
  isTracking = stored.isTracking !== false;

  // Try auto-login from desktop app if not authenticated
  if (!authToken) {
    await tryAutoLoginFromDesktop();
  }

  // Check network and process queue
  checkOnlineStatus();
});

// Try to auto-login from desktop app (if it's running and user is logged in)
async function tryAutoLoginFromDesktop() {
  try {
    console.log('Attempting auto-login from desktop app...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    // First check if desktop app is running by calling status endpoint
    const statusResponse = await fetch(`${API_URL}/api/auth/status`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!statusResponse.ok) {
      console.log('Desktop app not authenticated or not running');
      return false;
    }

    const statusData = await statusResponse.json();

    if (!statusData.authenticated) {
      console.log('Desktop app user not logged in');
      return false;
    }

    // Desktop user is logged in, but we need their token
    // Try to get extension token (requires the desktop to have valid auth)
    // For now, user needs to login once - token will be shared after
    console.log('Desktop app is authenticated, prompting user to link extension');

    return false; // User still needs to login once to link
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Desktop app connection timeout - app may not be running');
    } else {
      console.log('Auto-login failed:', error.message);
    }
    return false;
  }
}

// Try auto-login by getting token from desktop app's localStorage via API
async function tryAutoLoginWithToken() {
  try {
    // Check if desktop app API is available and user is logged in
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    // Get stored token from desktop app (if running)
    // The desktop app stores token, we'll check if user is logged in
    const statusResponse = await fetch(`${API_URL}/api/auth/status`, {
      signal: controller.signal,
      credentials: 'include'
    });

    clearTimeout(timeoutId);

    if (!statusResponse.ok) {
      return { success: false, error: 'Desktop app not available' };
    }

    const statusData = await statusResponse.json();

    if (!statusData.authenticated) {
      return { success: false, error: 'Please login to desktop app first' };
    }

    // User is logged in to desktop, now we need their credentials
    // Since we can't directly access the desktop's token, user logs in once
    // After that, both use the same backend session
    return {
      success: false,
      error: 'Please sign in once to link extension',
      desktopLoggedIn: true,
      user: statusData.user
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Desktop app not running' };
    }
    return { success: false, error: error.message };
  }
}

// Link extension using a code from desktop app
async function linkWithCode(code) {
  try {
    const response = await fetch(`${API_URL}/api/auth/extension-link-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: code })
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.access_token;

      await chrome.storage.local.set({
        authToken: data.access_token,
        linkedToDesktop: true,
        linkedAt: new Date().toISOString()
      });

      console.log('Extension linked with code successfully');
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.detail || 'Invalid code' };
    }
  } catch (error) {
    console.error('Error linking with code:', error);
    return { success: false, error: 'Connection failed' };
  }
}

// Link extension to desktop app (call this after user logs in to desktop)
async function linkToDesktopApp(desktopToken) {
  try {
    const response = await fetch(`${API_URL}/api/auth/extension-token`, {
      headers: {
        'Authorization': `Bearer ${desktopToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.access_token;

      await chrome.storage.local.set({
        authToken: data.access_token,
        linkedToDesktop: true,
        linkedAt: new Date().toISOString()
      });

      console.log('Extension linked to desktop app successfully');
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Failed to get extension token' };
  } catch (error) {
    console.error('Error linking to desktop:', error);
    return { success: false, error: error.message };
  }
}

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case 'syncActivity':
      syncCurrentActivity();
      break;
    case 'checkNetwork':
      checkOnlineStatus();
      break;
    case 'processQueue':
      if (isOnline && authToken) {
        processOfflineQueue();
      }
      break;
  }
});

// Track tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await handleTabChange(activeInfo.tabId);
});

// Track URL changes within a tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    await handleTabChange(tabId);
  }
});

// Track window focus
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus
    await saveCurrentActivity();
    currentTab = null;
  } else {
    // Browser gained focus
    try {
      const [tab] = await chrome.tabs.query({ active: true, windowId });
      if (tab) {
        await handleTabChange(tab.id);
      }
    } catch (error) {
      console.error('Error handling window focus:', error);
    }
  }
});

async function handleTabChange(tabId) {
  // Save previous activity
  if (currentTab) {
    await saveCurrentActivity();
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      currentTab = {
        id: tabId,
        url: tab.url,
        title: tab.title,
        domain: extractDomain(tab.url),
        platform: detectPlatform(tab.url),
        startTime: Date.now()
      };
      tabStartTime = Date.now();
    } else {
      currentTab = null;
    }
  } catch (error) {
    console.error('Error handling tab change:', error);
    currentTab = null;
  }
}

async function saveCurrentActivity() {
  if (!currentTab || !isTracking) return;

  const duration = Math.round((Date.now() - currentTab.startTime) / 1000);
  if (duration < 5) return; // Ignore very short visits

  const activity = {
    url: currentTab.url,
    title: currentTab.title,
    domain: currentTab.domain,
    platform: currentTab.platform?.name || null,
    category: currentTab.platform?.defaultCategory || 'browsing',
    duration: duration,
    timestamp: new Date(currentTab.startTime).toISOString(),
    metadata: await extractMetadata(currentTab)
  };

  // Store locally (chrome.storage.local)
  await storeActivity(activity);

  // Sync to server or queue for later
  await syncToServer(activity);
}

async function syncCurrentActivity() {
  if (currentTab && isTracking) {
    // Update duration for current tab
    const duration = Math.round((Date.now() - currentTab.startTime) / 1000);

    // Send heartbeat to server
    if (authToken && duration > 10 && isOnline) {
      try {
        await fetchWithTimeout(`${API_URL}/api/activities/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            url: currentTab.url,
            title: currentTab.title,
            domain: currentTab.domain,
            duration: duration
          })
        }, 5000);
      } catch (error) {
        console.warn('Heartbeat failed:', error.message);
        // Don't queue heartbeats - they're not critical
      }
    }
  }
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

function detectPlatform(url) {
  for (const [name, config] of Object.entries(PLATFORMS)) {
    if (config.pattern.test(url)) {
      return { name, ...config };
    }
  }
  return null;
}

async function extractMetadata(tab) {
  const metadata = {
    domain: tab.domain,
    fullUrl: tab.url
  };

  // Platform-specific extraction
  if (tab.platform) {
    if (tab.platform.name === 'youtube') {
      const videoId = tab.url.match(/[?&]v=([^&]+)/)?.[1];
      if (videoId) {
        metadata.videoId = videoId;
        metadata.videoTitle = tab.platform.extractTitle?.(tab.url, tab.title) || tab.title;
      }
    } else if (tab.platform.name === 'udemy') {
      metadata.courseTitle = tab.platform.extractTitle?.(tab.url, tab.title) || tab.title;
    } else if (tab.platform.name === 'github') {
      const repoMatch = tab.url.match(/github\.com\/([^\/]+\/[^\/]+)/);
      if (repoMatch) {
        metadata.repository = repoMatch[1];
      }
    }
  }

  return metadata;
}

async function storeActivity(activity) {
  // Get existing activities
  const stored = await chrome.storage.local.get(['activities']);
  const activities = stored.activities || [];

  // Add new activity
  activities.push(activity);

  // Keep only last 1000 activities
  if (activities.length > 1000) {
    activities.splice(0, activities.length - 1000);
  }

  await chrome.storage.local.set({ activities });
}

async function syncToServer(activity) {
  if (!authToken) {
    // Queue for later when user logs in
    await addToOfflineQueue('pendingActivities', { data: activity });
    return;
  }

  if (!isOnline) {
    // Queue for later when network is restored
    await addToOfflineQueue('pendingActivities', { data: activity });
    await updateSyncStatus({ pending: (await getOfflineQueue('pendingActivities')).length });
    return;
  }

  try {
    await fetchWithRetry(`${API_URL}/api/activities/browser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(activity)
    });
  } catch (error) {
    console.error('Failed to sync activity, queuing:', error.message);
    // Queue for later
    await addToOfflineQueue('pendingActivities', { data: activity });
    await updateSyncStatus({ pending: (await getOfflineQueue('pendingActivities')).length });
  }
}

// Message handling from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    });
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'GET_STATUS':
      const syncStatus = await getSyncStatus();
      const pendingCount = (await getOfflineQueue('pendingActivities')).length +
                          (await getOfflineQueue('pendingVideos')).length;
      return {
        isTracking,
        isAuthenticated: !!authToken,
        isOnline,
        syncStatus: {
          ...syncStatus,
          pending: pendingCount
        },
        currentTab: currentTab ? {
          url: currentTab.url,
          title: currentTab.title,
          domain: currentTab.domain,
          duration: Math.round((Date.now() - currentTab.startTime) / 1000)
        } : null
      };

    case 'VIDEO_PROGRESS':
      // Track video watching progress (YouTube, etc.)
      await trackVideoProgress(message.data);
      return { success: true };

    case 'VIDEO_COMPLETED':
      // Track video completion
      await trackVideoComplete(message.data);
      return { success: true };

    case 'COURSE_PROGRESS':
      // Track course progress (Udemy, Coursera)
      await trackCourseProgress(message.data);
      return { success: true };

    case 'PAGE_ENGAGEMENT':
      // Track page engagement (scroll depth, time on page)
      await trackPageEngagement(message.data);
      return { success: true };

    case 'SET_TRACKING':
      isTracking = message.value;
      await chrome.storage.local.set({ isTracking });
      return { success: true };

    case 'LOGIN':
      return await handleLogin(message.credentials);

    case 'TRY_AUTO_LOGIN':
      // Try to auto-login from desktop app
      if (authToken) {
        return { success: true, alreadyLoggedIn: true };
      }
      return await tryAutoLoginWithToken();

    case 'LINK_TO_DESKTOP':
      // Link extension using desktop app's token
      if (message.token) {
        return await linkToDesktopApp(message.token);
      }
      return { success: false, error: 'No token provided' };

    case 'LINK_WITH_CODE':
      // Link extension using a code from desktop app
      return await linkWithCode(message.code);

    case 'LOGOUT':
      authToken = null;
      await chrome.storage.local.remove(['authToken', 'refreshToken']);
      return { success: true };

    case 'GET_TODAY_STATS':
      return await getTodayStats();

    case 'FORCE_SYNC':
      if (isOnline && authToken) {
        await processOfflineQueue();
        return { success: true };
      }
      return { success: false, error: 'Cannot sync: offline or not authenticated' };

    case 'GET_SYNC_STATUS':
      const status = await getSyncStatus();
      const pending = (await getOfflineQueue('pendingActivities')).length +
                     (await getOfflineQueue('pendingVideos')).length;
      return { ...status, pending, isOnline };

    default:
      return { error: 'Unknown message type' };
  }
}

async function handleLogin(credentials) {
  try {
    const response = await fetchWithTimeout(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();
    authToken = data.access_token;

    await chrome.storage.local.set({
      authToken,
      refreshToken: data.refresh_token || null
    });

    // Process any queued activities now that we're logged in
    isOnline = true;
    await processOfflineQueue();

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// ============== Video & Course Tracking ==============

async function trackVideoProgress(data) {
  const videoData = {
    type: 'video_progress',
    platform: data.platform,
    videoId: data.videoId,
    videoTitle: data.videoTitle,
    channelName: data.channelName,
    progress: data.progress,
    videoDuration: data.duration,
    timestamp: new Date().toISOString()
  };

  // Store locally
  const stored = await chrome.storage.local.get(['videoProgress']);
  const progress = stored.videoProgress || [];
  progress.push(videoData);

  // Keep only last 500 video progress entries
  if (progress.length > 500) {
    progress.splice(0, progress.length - 500);
  }
  await chrome.storage.local.set({ videoProgress: progress });

  // Sync to server or queue
  if (authToken && isOnline) {
    try {
      await fetchWithRetry(`${API_URL}/api/activities/video-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(videoData)
      });
    } catch (error) {
      console.warn('Failed to sync video progress, queuing:', error.message);
      await addToOfflineQueue('pendingVideos', { endpoint: 'video-progress', data: videoData });
    }
  } else if (authToken) {
    await addToOfflineQueue('pendingVideos', { endpoint: 'video-progress', data: videoData });
  }
}

async function trackVideoComplete(data) {
  const completionData = {
    type: 'video_completed',
    platform: data.platform,
    videoId: data.videoId,
    timestamp: new Date().toISOString()
  };

  // Store locally
  const stored = await chrome.storage.local.get(['completedVideos']);
  const completed = stored.completedVideos || [];
  completed.push(completionData);
  await chrome.storage.local.set({ completedVideos: completed });

  // Sync to server or queue
  if (authToken && isOnline) {
    try {
      await fetchWithRetry(`${API_URL}/api/activities/video-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(completionData)
      });
    } catch (error) {
      console.warn('Failed to sync video completion, queuing:', error.message);
      await addToOfflineQueue('pendingVideos', { endpoint: 'video-completed', data: completionData });
    }
  } else if (authToken) {
    await addToOfflineQueue('pendingVideos', { endpoint: 'video-completed', data: completionData });
  }
}

async function trackCourseProgress(data) {
  const courseData = {
    type: 'course_progress',
    platform: data.platform,
    courseTitle: data.courseTitle,
    progress: data.progress,
    timestamp: new Date().toISOString()
  };

  // Store locally
  const stored = await chrome.storage.local.get(['courseProgress']);
  const progress = stored.courseProgress || [];
  progress.push(courseData);
  await chrome.storage.local.set({ courseProgress: progress });

  // Sync to server or queue
  if (authToken && isOnline) {
    try {
      await fetchWithRetry(`${API_URL}/api/activities/course-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(courseData)
      });
    } catch (error) {
      console.warn('Failed to sync course progress, queuing:', error.message);
      await addToOfflineQueue('pendingVideos', { endpoint: 'course-progress', data: courseData });
    }
  } else if (authToken) {
    await addToOfflineQueue('pendingVideos', { endpoint: 'course-progress', data: courseData });
  }
}

async function trackPageEngagement(data) {
  // Store engagement data
  const stored = await chrome.storage.local.get(['pageEngagement']);
  const engagement = stored.pageEngagement || [];

  engagement.push({
    url: data.url,
    scrollDepth: data.scrollDepth,
    timeOnPage: data.timeOnPage,
    timestamp: new Date().toISOString()
  });

  // Keep only last 200 entries
  if (engagement.length > 200) {
    engagement.splice(0, engagement.length - 200);
  }
  await chrome.storage.local.set({ pageEngagement: engagement });
}

async function getTodayStats() {
  const stored = await chrome.storage.local.get(['activities']);
  const activities = stored.activities || [];

  const today = new Date().toISOString().split('T')[0];
  const todayActivities = activities.filter(a =>
    a.timestamp.startsWith(today)
  );

  // Aggregate stats
  const totalTime = todayActivities.reduce((sum, a) => sum + a.duration, 0);
  const byDomain = {};
  const byCategory = {};

  todayActivities.forEach(a => {
    byDomain[a.domain] = (byDomain[a.domain] || 0) + a.duration;
    byCategory[a.category] = (byCategory[a.category] || 0) + a.duration;
  });

  return {
    totalTime,
    byDomain: Object.entries(byDomain)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    byCategory: Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
  };
}
