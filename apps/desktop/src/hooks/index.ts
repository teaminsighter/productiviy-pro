/**
 * Hooks Index
 *
 * Export all custom hooks from a single entry point
 */

export * from './useTheme';

// API Hooks
export * from './useActivities';
export * from './useAnalytics';

// Screenshots hooks - explicit exports to avoid conflicts with settings
export {
  screenshotKeys,
  useScreenshots,
  useScreenshot,
  useScreenshotSettings,
  useUpdateScreenshotSettings,
  useScreenshotStats,
  useCaptureScreenshot,
  useDeleteScreenshot,
  useCleanupScreenshots,
} from './useScreenshots';

export * from './useSettings';
export * from './useAI';
export * from './useGoals';
export * from './useFocus';

// WebSocket Hook
export * from './useActivityWebSocket';

// License & Billing
export * from './useLicense';
