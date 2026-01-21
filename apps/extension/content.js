// Content script for page-specific tracking
// Includes memory leak fixes and improved error handling

(function() {
  'use strict';

  // Only run once per page
  if (window.productifyInitialized) return;
  window.productifyInitialized = true;

  // Store references for cleanup
  const cleanupCallbacks = [];
  let isCleaningUp = false;

  // Safe message sender with error handling
  function safeSendMessage(message) {
    try {
      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage(message).catch(() => {
          // Extension context invalidated - cleanup
          cleanup();
        });
      }
    } catch (error) {
      // Extension context may have been invalidated
      console.warn('Productify: Message send failed', error.message);
    }
  }

  // Cleanup function to prevent memory leaks
  function cleanup() {
    if (isCleaningUp) return;
    isCleaningUp = true;

    cleanupCallbacks.forEach(cb => {
      try {
        cb();
      } catch (error) {
        console.warn('Productify: Cleanup error', error);
      }
    });
    cleanupCallbacks.length = 0;
  }

  // Register cleanup callback
  function onCleanup(callback) {
    cleanupCallbacks.push(callback);
  }

  // Debounce function to reduce event frequency
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function for scroll events
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // YouTube specific tracking
  function trackYouTube() {
    let video = null;
    let lastProgress = 0;
    let observer = null;
    let timeUpdateHandler = null;
    let endedHandler = null;
    let retryCount = 0;
    const MAX_RETRIES = 10;

    function findVideo() {
      return document.querySelector('video.html5-main-video') ||
             document.querySelector('video');
    }

    function getVideoTitle() {
      // Try multiple selectors for robustness
      const selectors = [
        'h1.ytd-video-primary-info-renderer',
        'h1.ytd-watch-metadata yt-formatted-string',
        '#title h1 yt-formatted-string',
        '#container h1.title',
        'h1.title'
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          return el.textContent.trim();
        }
      }
      return document.title.replace(' - YouTube', '');
    }

    function getChannelName() {
      const selectors = [
        '#channel-name a',
        'ytd-channel-name a',
        '#owner-name a',
        '.ytd-channel-name a'
      ];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          return el.textContent.trim();
        }
      }
      return null;
    }

    function setupVideoTracking(videoElement) {
      if (!videoElement || video === videoElement) return;

      // Cleanup previous handlers
      if (video && timeUpdateHandler) {
        video.removeEventListener('timeupdate', timeUpdateHandler);
        video.removeEventListener('ended', endedHandler);
      }

      video = videoElement;
      lastProgress = 0;

      timeUpdateHandler = debounce(() => {
        try {
          if (!video || !video.duration || isNaN(video.duration)) return;

          const progress = Math.floor((video.currentTime / video.duration) * 100);

          // Report every 25%
          if (progress >= lastProgress + 25) {
            lastProgress = Math.floor(progress / 25) * 25;

            safeSendMessage({
              type: 'VIDEO_PROGRESS',
              data: {
                platform: 'youtube',
                videoId: new URLSearchParams(window.location.search).get('v'),
                videoTitle: getVideoTitle(),
                channelName: getChannelName(),
                progress: lastProgress,
                duration: Math.round(video.duration)
              }
            });
          }
        } catch (error) {
          console.warn('Productify: Video progress tracking error', error);
        }
      }, 1000);

      endedHandler = () => {
        try {
          safeSendMessage({
            type: 'VIDEO_COMPLETED',
            data: {
              platform: 'youtube',
              videoId: new URLSearchParams(window.location.search).get('v')
            }
          });
        } catch (error) {
          console.warn('Productify: Video completion tracking error', error);
        }
      };

      video.addEventListener('timeupdate', timeUpdateHandler);
      video.addEventListener('ended', endedHandler);
    }

    function attemptSetup() {
      const videoElement = findVideo();
      if (videoElement) {
        setupVideoTracking(videoElement);
      } else if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(attemptSetup, 1000);
      }
    }

    // Initial setup attempt
    attemptSetup();

    // Watch for dynamic video loading (YouTube SPA navigation)
    observer = new MutationObserver(debounce(() => {
      const newVideo = findVideo();
      if (newVideo && newVideo !== video) {
        lastProgress = 0;
        setupVideoTracking(newVideo);
      }
    }, 500));

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Cleanup
    onCleanup(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (video && timeUpdateHandler) {
        video.removeEventListener('timeupdate', timeUpdateHandler);
        video.removeEventListener('ended', endedHandler);
      }
      video = null;
    });
  }

  // Udemy specific tracking
  function trackUdemy() {
    let observer = null;
    let lastProgress = 0;

    const reportProgress = debounce(() => {
      try {
        // Try multiple selectors for Udemy's progress bar
        const progressSelectors = [
          '[data-purpose="progress-bar"]',
          '.curriculum-item-link--progress-bar--',
          '[aria-valuenow]'
        ];

        for (const selector of progressSelectors) {
          const progressElement = document.querySelector(selector);
          if (progressElement) {
            const progress = parseInt(progressElement.getAttribute('aria-valuenow') || '0');

            // Only report if progress changed significantly
            if (Math.abs(progress - lastProgress) >= 5) {
              lastProgress = progress;

              const courseTitle = document.querySelector('h1')?.textContent?.trim() ||
                                 document.title.replace(' | Udemy', '');

              safeSendMessage({
                type: 'COURSE_PROGRESS',
                data: {
                  platform: 'udemy',
                  courseTitle,
                  progress
                }
              });
            }
            return;
          }
        }
      } catch (error) {
        console.warn('Productify: Udemy progress tracking error', error);
      }
    }, 2000);

    observer = new MutationObserver(reportProgress);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-valuenow']
    });

    // Initial check
    reportProgress();

    // Cleanup
    onCleanup(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    });
  }

  // Coursera specific tracking
  function trackCoursera() {
    let observer = null;
    let lastProgress = 0;

    const reportProgress = debounce(() => {
      try {
        const progressElement = document.querySelector('[role="progressbar"]');
        if (progressElement) {
          const progress = parseInt(progressElement.getAttribute('aria-valuenow') || '0');

          if (Math.abs(progress - lastProgress) >= 5) {
            lastProgress = progress;

            const courseTitle = document.querySelector('h1')?.textContent?.trim() ||
                               document.title.replace(' | Coursera', '');

            safeSendMessage({
              type: 'COURSE_PROGRESS',
              data: {
                platform: 'coursera',
                courseTitle,
                progress
              }
            });
          }
        }
      } catch (error) {
        console.warn('Productify: Coursera progress tracking error', error);
      }
    }, 2000);

    observer = new MutationObserver(reportProgress);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    reportProgress();

    onCleanup(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    });
  }

  // Generic page engagement tracking
  function trackPageEngagement() {
    let scrollDepth = 0;
    const startTime = Date.now();
    let scrollHandler = null;
    let beforeUnloadHandler = null;
    let visibilityHandler = null;

    scrollHandler = throttle(() => {
      try {
        const maxScroll = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1
        );
        const currentScroll = window.scrollY;
        const depth = Math.min(100, Math.round((currentScroll / maxScroll) * 100));
        scrollDepth = Math.max(scrollDepth, depth);
      } catch (error) {
        // Ignore scroll tracking errors
      }
    }, 500);

    beforeUnloadHandler = () => {
      try {
        const timeOnPage = Math.round((Date.now() - startTime) / 1000);

        // Only report if meaningful engagement
        if (timeOnPage > 5 || scrollDepth > 10) {
          safeSendMessage({
            type: 'PAGE_ENGAGEMENT',
            data: {
              url: window.location.href,
              scrollDepth,
              timeOnPage
            }
          });
        }
      } catch (error) {
        // Ignore unload errors
      }
    };

    // Also report when tab becomes hidden (more reliable than beforeunload)
    visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        beforeUnloadHandler();
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('beforeunload', beforeUnloadHandler);
    document.addEventListener('visibilitychange', visibilityHandler);

    onCleanup(() => {
      window.removeEventListener('scroll', scrollHandler);
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
    });
  }

  // Initialize based on current site
  function init() {
    const hostname = window.location.hostname;

    try {
      if (hostname.includes('youtube.com')) {
        trackYouTube();
      } else if (hostname.includes('udemy.com')) {
        trackUdemy();
      } else if (hostname.includes('coursera.org')) {
        trackCoursera();
      }

      // Track engagement on all pages
      trackPageEngagement();
    } catch (error) {
      console.warn('Productify: Initialization error', error);
    }
  }

  // Handle extension context invalidation
  if (chrome.runtime?.id) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Keep-alive check
      if (message.type === 'PING') {
        sendResponse({ status: 'alive' });
      }
      return true;
    });
  }

  // Cleanup on page unload
  window.addEventListener('unload', cleanup);

  // Start tracking
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
