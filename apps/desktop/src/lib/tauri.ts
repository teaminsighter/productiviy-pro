import { invoke } from '@tauri-apps/api/core';

// ============ Response Types ============

export interface TrackingStatus {
  active: boolean;
  paused: boolean;
  focus_mode: boolean;
  current_app: string | null;
  current_category: string | null;
}

export interface FocusStatus {
  active: boolean;
  duration: number;
  elapsed: number;
  remaining: number;
  progress: number;
  session_name: string | null;
}

export interface TrayStatus {
  status: 'active' | 'focus' | 'paused';
  tooltip: string;
}

export interface AppState {
  tracking_active: boolean;
  focus_mode: boolean;
  focus_duration: number;
  focus_elapsed: number;
  focus_session_name: string | null;
  current_app: string | null;
  current_category: string | null;
  paused: boolean;
}

// ============ Tracking Commands ============

/**
 * Get current tracking status
 */
export async function getTrackingStatus(): Promise<TrackingStatus> {
  return invoke<TrackingStatus>('get_tracking_status');
}

/**
 * Toggle tracking on/off
 */
export async function toggleTracking(): Promise<TrackingStatus> {
  return invoke<TrackingStatus>('toggle_tracking');
}

/**
 * Pause tracking
 */
export async function pauseTracking(): Promise<TrackingStatus> {
  return invoke<TrackingStatus>('pause_tracking');
}

/**
 * Resume tracking
 */
export async function resumeTracking(): Promise<TrackingStatus> {
  return invoke<TrackingStatus>('resume_tracking');
}

// ============ Focus Mode Commands ============

/**
 * Start focus mode
 */
export async function startFocusMode(
  duration: number,
  sessionName?: string
): Promise<FocusStatus> {
  return invoke<FocusStatus>('start_focus_mode', {
    duration,
    sessionName: sessionName || null,
  });
}

/**
 * End focus mode
 */
export async function endFocusMode(): Promise<FocusStatus> {
  return invoke<FocusStatus>('end_focus_mode');
}

/**
 * Get current focus status
 */
export async function getFocusStatus(): Promise<FocusStatus> {
  return invoke<FocusStatus>('get_focus_status');
}

/**
 * Update focus elapsed time (for sync with frontend timer)
 */
export async function updateFocusElapsed(elapsed: number): Promise<FocusStatus> {
  return invoke<FocusStatus>('update_focus_elapsed', { elapsed });
}

// ============ Activity Commands ============

/**
 * Update current activity (for tray tooltip)
 */
export async function updateCurrentActivity(
  appName?: string,
  category?: string
): Promise<void> {
  return invoke('update_current_activity', {
    appName: appName || null,
    category: category || null,
  });
}

// ============ Tray Commands ============

/**
 * Get tray status
 */
export async function getTrayStatus(): Promise<TrayStatus> {
  return invoke<TrayStatus>('get_tray_status');
}

// ============ Utility Commands ============

/**
 * Capture a screenshot
 */
export async function captureScreenshot(): Promise<string> {
  return invoke<string>('capture_screenshot');
}

/**
 * Open settings window
 */
export async function openSettings(): Promise<void> {
  return invoke('open_settings');
}

/**
 * Open goals page
 */
export async function openGoals(): Promise<void> {
  return invoke('open_goals');
}

/**
 * Show daily summary
 */
export async function showDailySummary(): Promise<void> {
  return invoke('show_daily_summary');
}

/**
 * Get full app state (for debugging/sync)
 */
export async function getAppState(): Promise<AppState> {
  return invoke<AppState>('get_app_state');
}

// ============ Event Listeners ============

/**
 * Listen for focus mode events from tray
 */
export function setupTrayEventListeners(handlers: {
  onOpenFocusModal?: () => void;
  onFocusEnded?: () => void;
  onStartFocus?: (duration: number, sessionName: string) => void;
  onShowAbout?: () => void;
}) {
  // Open focus modal event
  if (handlers.onOpenFocusModal) {
    window.addEventListener('open-focus-modal', () => {
      handlers.onOpenFocusModal?.();
    });
  }

  // Focus ended event
  if (handlers.onFocusEnded) {
    window.addEventListener('focus-ended', () => {
      handlers.onFocusEnded?.();
    });
  }

  // Start focus event
  if (handlers.onStartFocus) {
    window.addEventListener('start-focus', ((event: CustomEvent) => {
      const { duration, sessionName } = event.detail;
      handlers.onStartFocus?.(duration, sessionName);
    }) as EventListener);
  }

  // Show about event
  if (handlers.onShowAbout) {
    window.addEventListener('show-about', () => {
      handlers.onShowAbout?.();
    });
  }
}

/**
 * Remove tray event listeners
 */
export function removeTrayEventListeners() {
  // Note: In a real app, you'd want to store and remove specific listeners
  // This is a simplified version
}

// ============ Platform Detection ============

/**
 * Check if running in Tauri
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Get platform info
 */
export async function getPlatform(): Promise<string> {
  if (!isTauri()) return 'web';
  // Platform detection - simplified version
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
}

// ============ Native Notification Commands ============

/**
 * Send a native OS notification
 */
export async function sendNativeNotification(
  title: string,
  body: string,
  icon?: string
): Promise<void> {
  if (!isTauri()) {
    // Fallback to browser notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon });
    }
    return;
  }
  return invoke('send_native_notification', { title, body, icon });
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isTauri()) {
    // Browser fallback
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }
  return invoke<boolean>('request_notification_permission');
}

/**
 * Check notification permission status
 */
export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'unknown'> {
  if (!isTauri()) {
    // Browser fallback
    if ('Notification' in window) {
      return Notification.permission as 'granted' | 'denied' | 'unknown';
    }
    return 'unknown';
  }
  const result = await invoke<string>('check_notification_permission');
  return result as 'granted' | 'denied' | 'unknown';
}

/**
 * Send a smart notification (with type-specific behavior)
 */
export async function sendSmartNotification(
  notificationType: string,
  title: string,
  body: string
): Promise<void> {
  if (!isTauri()) {
    // Fallback to browser notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }
  return invoke('send_smart_notification', { notificationType, title, body });
}
