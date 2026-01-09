// Content script for page-specific tracking

(function() {
  // Only run once
  if (window.productifyInitialized) return;
  window.productifyInitialized = true;

  // YouTube specific tracking
  if (window.location.hostname.includes('youtube.com')) {
    trackYouTube();
  }

  // Udemy specific tracking
  if (window.location.hostname.includes('udemy.com')) {
    trackUdemy();
  }

  function trackYouTube() {
    // Track video progress
    const video = document.querySelector('video');
    if (!video) return;

    let lastProgress = 0;

    video.addEventListener('timeupdate', () => {
      const progress = Math.floor((video.currentTime / video.duration) * 100);

      // Report every 25%
      if (progress >= lastProgress + 25) {
        lastProgress = Math.floor(progress / 25) * 25;

        const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent;
        const channelName = document.querySelector('#channel-name a')?.textContent;

        chrome.runtime.sendMessage({
          type: 'VIDEO_PROGRESS',
          data: {
            platform: 'youtube',
            videoId: new URLSearchParams(window.location.search).get('v'),
            videoTitle,
            channelName,
            progress: lastProgress,
            duration: Math.round(video.duration)
          }
        });
      }
    });

    // Track video completion
    video.addEventListener('ended', () => {
      chrome.runtime.sendMessage({
        type: 'VIDEO_COMPLETED',
        data: {
          platform: 'youtube',
          videoId: new URLSearchParams(window.location.search).get('v')
        }
      });
    });
  }

  function trackUdemy() {
    // Track lecture progress
    const progressObserver = new MutationObserver(() => {
      const progressElement = document.querySelector('[data-purpose="progress-bar"]');
      if (progressElement) {
        const progress = progressElement.getAttribute('aria-valuenow');
        const courseTitle = document.querySelector('h1')?.textContent;

        chrome.runtime.sendMessage({
          type: 'COURSE_PROGRESS',
          data: {
            platform: 'udemy',
            courseTitle,
            progress: parseInt(progress) || 0
          }
        });
      }
    });

    progressObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Generic page engagement tracking
  let scrollDepth = 0;
  let timeOnPage = 0;
  const startTime = Date.now();

  window.addEventListener('scroll', () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const currentScroll = window.scrollY;
    const depth = Math.round((currentScroll / maxScroll) * 100) || 0;
    scrollDepth = Math.max(scrollDepth, depth);
  });

  // Report engagement on page unload
  window.addEventListener('beforeunload', () => {
    timeOnPage = Math.round((Date.now() - startTime) / 1000);

    chrome.runtime.sendMessage({
      type: 'PAGE_ENGAGEMENT',
      data: {
        url: window.location.href,
        scrollDepth,
        timeOnPage
      }
    });
  });
})();
