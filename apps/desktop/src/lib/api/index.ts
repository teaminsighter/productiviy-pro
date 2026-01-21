// API Client
export { apiClient, checkBackendHealth } from './client';

// Activities API
export * from './activities';

// Analytics API
export * from './analytics';

// Screenshots API - explicit exports to avoid conflicts
export {
  fetchScreenshots,
  fetchScreenshot,
  captureScreenshot,
  deleteScreenshot,
  fetchScreenshotSettings,
  updateScreenshotSettings as updateScreenshotSettingsAPI,
  fetchScreenshotStats,
  cleanupScreenshots,
} from './screenshots';

export type {
  Screenshot,
  ScreenshotFilters,
  ScreenshotSettings as ScreenshotSettingsType,
  ScreenshotStats,
  CaptureResult,
} from './screenshots';

// Settings API
export * from './settings';

// AI API
export * from './ai';

// Goals API
export * from './goals';

// Auth API
export * from './auth';

// Calendar API
export * from './calendar';

// Deep Work API
export * from './deepwork';

// Reports API
export * from './reports';
