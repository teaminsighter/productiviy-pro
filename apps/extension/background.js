// Configuration
const API_URL = 'http://localhost:8000';
let authToken = null;
let isTracking = true;
let currentTab = null;
let tabStartTime = null;

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

  // Load saved settings
  const stored = await chrome.storage.local.get(['authToken', 'isTracking']);
  authToken = stored.authToken || null;
  isTracking = stored.isTracking !== false;

  // Set up alarm for periodic sync
  chrome.alarms.create('syncActivity', { periodInMinutes: 1 });
});

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncActivity') {
    syncCurrentActivity();
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
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) {
      await handleTabChange(tab.id);
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
    if (tab.url && !tab.url.startsWith('chrome://')) {
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
  }
}

async function saveCurrentActivity() {
  if (!currentTab || !isTracking || !authToken) return;

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

  // Store locally
  await storeActivity(activity);

  // Sync to server
  await syncToServer(activity);
}

async function syncCurrentActivity() {
  if (currentTab && isTracking) {
    // Update duration for current tab
    const duration = Math.round((Date.now() - currentTab.startTime) / 1000);

    // Send heartbeat to server
    if (authToken && duration > 10) {
      try {
        await fetch(`${API_URL}/api/activities/heartbeat`, {
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
        });
      } catch (error) {
        console.error('Heartbeat failed:', error);
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
  if (!authToken) return;

  try {
    await fetch(`${API_URL}/api/activities/browser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(activity)
    });
  } catch (error) {
    console.error('Failed to sync activity:', error);
    // Will be synced later via stored activities
  }
}

// Message handling from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message) {
  switch (message.type) {
    case 'GET_STATUS':
      return {
        isTracking,
        isAuthenticated: !!authToken,
        currentTab: currentTab ? {
          url: currentTab.url,
          title: currentTab.title,
          domain: currentTab.domain,
          duration: Math.round((Date.now() - currentTab.startTime) / 1000)
        } : null
      };

    case 'VIDEO_PROGRESS':
      // Track video watching progress (YouTube, etc.)
      console.log('Video progress:', message.data);
      await trackVideoProgress(message.data);
      return { success: true };

    case 'VIDEO_COMPLETED':
      // Track video completion
      console.log('Video completed:', message.data);
      await trackVideoComplete(message.data);
      return { success: true };

    case 'COURSE_PROGRESS':
      // Track course progress (Udemy, Coursera)
      console.log('Course progress:', message.data);
      await trackCourseProgress(message.data);
      return { success: true };

    case 'PAGE_ENGAGEMENT':
      // Track page engagement (scroll depth, time on page)
      console.log('Page engagement:', message.data);
      await trackPageEngagement(message.data);
      return { success: true };

    case 'SET_TRACKING':
      isTracking = message.value;
      await chrome.storage.local.set({ isTracking });
      return { success: true };

    case 'LOGIN':
      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.credentials)
        });

        if (!response.ok) throw new Error('Login failed');

        const data = await response.json();
        authToken = data.access_token;
        await chrome.storage.local.set({ authToken });

        return { success: true, user: data.user };
      } catch (error) {
        return { success: false, error: error.message };
      }

    case 'LOGOUT':
      authToken = null;
      await chrome.storage.local.remove(['authToken']);
      return { success: true };

    case 'GET_TODAY_STATS':
      return await getTodayStats();

    default:
      return { error: 'Unknown message type' };
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

  // Sync to server
  if (authToken) {
    try {
      await fetch(`${API_URL}/api/activities/video-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(videoData)
      });
    } catch (error) {
      console.error('Failed to sync video progress:', error);
    }
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

  // Sync to server
  if (authToken) {
    try {
      await fetch(`${API_URL}/api/activities/video-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(completionData)
      });
    } catch (error) {
      console.error('Failed to sync video completion:', error);
    }
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

  // Sync to server
  if (authToken) {
    try {
      await fetch(`${API_URL}/api/activities/course-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(courseData)
      });
    } catch (error) {
      console.error('Failed to sync course progress:', error);
    }
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
