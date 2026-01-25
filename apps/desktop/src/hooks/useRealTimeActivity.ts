import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api/client';

interface CurrentActivity {
  app_name: string;
  title: string;
  duration: number;
  start_time: string;
  category: string;
  is_productive: boolean;
}

interface TimeStats {
  today_total: number;
  today_productive: number;
  productivity: number;
  week_total: number;
  month_total: number;
  distracting_time: number;
  afk_time: number;
}

// Default AFK Detection settings (can be overridden via options)
const DEFAULT_AFK_AUTO_PAUSE = 10 * 60; // 10 minutes - auto pause
const AFK_WARNING_BUFFER = 2 * 60; // Show warning 2 minutes before auto-pause

interface UseRealTimeActivityOptions {
  afkTimeoutSeconds?: number; // How long before auto-pause (default: 600 = 10 min)
  afkDetectionEnabled?: boolean; // Whether AFK detection is enabled
}

type DataSource = 'native' | 'activitywatch' | 'mock' | 'none';

interface UseRealTimeActivityReturn {
  currentActivity: CurrentActivity | null;
  timeStats: TimeStats;
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;
  toggleTracking: () => void;
  // AFK Detection
  isAfk: boolean;
  afkDuration: number; // seconds since last activity
  showAfkWarning: boolean;
  dismissAfkWarning: () => void;
  resumeFromAfk: () => void;
  // Settings
  afkThreshold: number;
  // Data source info
  dataSource: DataSource; // "native", "activitywatch", "mock", or "none"
}

export function useRealTimeActivity(options?: UseRealTimeActivityOptions): UseRealTimeActivityReturn {
  // AFK settings from options or defaults
  const afkAutoPauseThreshold = options?.afkTimeoutSeconds ?? DEFAULT_AFK_AUTO_PAUSE;
  const afkWarningThreshold = Math.max(afkAutoPauseThreshold - AFK_WARNING_BUFFER, 60); // Warning 2 min before, minimum 1 min
  const afkDetectionEnabled = options?.afkDetectionEnabled ?? true;
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity | null>(null);
  const [timeStats, setTimeStats] = useState<TimeStats>({
    today_total: 0,
    today_productive: 0,
    productivity: 0,
    week_total: 0,
    month_total: 0,
    distracting_time: 0,
    afk_time: 0
  });
  const [isTracking, setIsTracking] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('none');

  // AFK Detection state
  const [isAfk, setIsAfk] = useState(false);
  const [afkDuration, setAfkDuration] = useState(0);
  const [showAfkWarning, setShowAfkWarning] = useState(false);
  const [afkWarningDismissed, setAfkWarningDismissed] = useState(false);

  // Use refs to track elapsed time locally (for smooth updates)
  const activityStartRef = useRef<number>(Date.now());
  const baseStatsRef = useRef<TimeStats>(timeStats);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProductiveRef = useRef<boolean>(false);

  // AFK detection refs
  const lastActivityRef = useRef<string | null>(null);
  const lastActivityChangeRef = useRef<number>(Date.now());
  const autoPausedRef = useRef<boolean>(false);
  const manualPausedRef = useRef<boolean>(false); // Track if user manually paused

  // Use ref for isTracking to avoid stale closures in tick
  const isTrackingRef = useRef<boolean>(isTracking);

  // Fetch initial data from server
  const fetchCurrentState = useCallback(async () => {
    try {
      // Fetch current activity and basic stats
      const response = await apiClient.get('/api/activities/current-realtime');
      const data = response.data;

      // Get idle time from API response (skip native calls to avoid blocking)
      // The Rust backend tracking handles native activity separately
      let osIdleSeconds = data.current_activity?.idle_seconds || 0;

      if (data.current_activity) {
        setCurrentActivity(data.current_activity);
        activityStartRef.current = new Date(data.current_activity.start_time).getTime();
        isProductiveRef.current = data.current_activity.is_productive;

        // AFK Detection: Use actual OS-level idle_seconds instead of window changes
        // This properly detects keyboard/mouse activity even when staying in the same window
        if (osIdleSeconds < 30) {
          // User is actively typing/moving mouse (less than 30s of OS-level idle)
          lastActivityChangeRef.current = Date.now();
          setIsAfk(false);
          setAfkDuration(0);
          setShowAfkWarning(false);
          setAfkWarningDismissed(false);
          autoPausedRef.current = false;
        } else {
          // Use OS idle time for AFK duration
          setAfkDuration(osIdleSeconds);
        }

        // Also track activity key changes for logging
        const activityKey = `${data.current_activity.app_name}:${data.current_activity.title}`;
        if (lastActivityRef.current !== activityKey) {
          lastActivityRef.current = activityKey;
        }
      }

      // Also fetch summary to get distraction time
      let distractingTime = 0;
      let afkTime = 0;
      try {
        const summaryResponse = await apiClient.get('/api/activities/summary/today');
        if (summaryResponse.data) {
          distractingTime = summaryResponse.data.distracting_time || 0;
          // AFK time = neutral time (not productive, not distracting)
          afkTime = summaryResponse.data.neutral_time || 0;
        }
      } catch (e) {
        // Summary endpoint might not be available, continue with zeros
        console.warn('Could not fetch summary:', e);
      }

      if (data.stats) {
        baseStatsRef.current = {
          today_total: data.stats.today_total || 0,
          today_productive: data.stats.today_productive || 0,
          productivity: data.stats.productivity || 0,
          week_total: data.stats.week_total || 0,
          month_total: data.stats.month_total || 0,
          distracting_time: distractingTime,
          afk_time: afkTime
        };
        setTimeStats(baseStatsRef.current);
      }

      // Don't override manual pause - only sync from server if not manually paused
      if (!manualPausedRef.current) {
        setIsTracking(data.is_tracking !== false);
      }
      setDataSource((data.data_source as DataSource) || 'none');
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch current state:', err);
      setError('Failed to connect to tracking service');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  // Tick every second to update duration locally
  const tick = useCallback(() => {
    // Use ref to always get current tracking state (avoids stale closures)
    if (!isTrackingRef.current) return;

    const now = Date.now();

    // Update current activity duration
    if (currentActivity) {
      const elapsed = Math.floor((now - activityStartRef.current) / 1000);
      setCurrentActivity(prev => prev ? { ...prev, duration: elapsed } : null);
    }

    // AFK Detection: Check how long since last activity change
    const timeSinceLastChange = Math.floor((now - lastActivityChangeRef.current) / 1000);
    setAfkDuration(timeSinceLastChange);

    // Only do AFK detection if enabled
    if (afkDetectionEnabled) {
      // Show warning before auto-pause (2 minutes before threshold)
      if (timeSinceLastChange >= afkWarningThreshold && !afkWarningDismissed && !autoPausedRef.current) {
        setShowAfkWarning(true);
        setIsAfk(true);
      }

      // Auto-pause at configured threshold
      if (timeSinceLastChange >= afkAutoPauseThreshold && !autoPausedRef.current) {
        console.log(`AFK detected for ${afkAutoPauseThreshold / 60} minutes - auto-pausing tracking`);
        autoPausedRef.current = true;
        setIsTracking(false);
        setShowAfkWarning(true);
        apiClient.post('/api/activities/toggle-tracking', { tracking: false }).catch(console.error);
        return; // Stop updating stats
      }
    }

    // Update total time (add 1 second) - only if not AFK auto-paused
    setTimeStats(prev => {
      const newTotal = prev.today_total + 1;
      const newProductive = isProductiveRef.current
        ? prev.today_productive + 1
        : prev.today_productive;
      const newProductivity = newTotal > 0
        ? Math.round((newProductive / newTotal) * 100)
        : 0;

      return {
        ...prev,
        today_total: newTotal,
        today_productive: newProductive,
        productivity: newProductivity
      };
    });
  }, [isTracking, currentActivity, afkWarningDismissed, afkDetectionEnabled, afkWarningThreshold, afkAutoPauseThreshold]);

  // Start/stop tick interval
  useEffect(() => {
    if (isTracking) {
      tickIntervalRef.current = setInterval(tick, 1000);
    } else {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, [isTracking, tick]);

  // Initial fetch and periodic sync with server (every 5 seconds to reduce API load)
  useEffect(() => {
    fetchCurrentState();

    // Sync every 5 seconds (balance between responsiveness and performance)
    const syncInterval = setInterval(fetchCurrentState, 5000);

    return () => clearInterval(syncInterval);
  }, [fetchCurrentState]);

  const toggleTracking = useCallback(() => {
    const newTrackingState = !isTracking;
    // Track manual pause to prevent server sync from overriding
    manualPausedRef.current = !newTrackingState; // true when pausing, false when resuming
    setIsTracking(newTrackingState);
    apiClient.post('/api/activities/toggle-tracking', { tracking: newTrackingState }).catch(console.error);
  }, [isTracking]);

  // AFK: Dismiss warning but keep tracking
  const dismissAfkWarning = useCallback(() => {
    setShowAfkWarning(false);
    setAfkWarningDismissed(true);
  }, []);

  // AFK: Resume from AFK state
  const resumeFromAfk = useCallback(() => {
    setIsAfk(false);
    setAfkDuration(0);
    setShowAfkWarning(false);
    setAfkWarningDismissed(false);
    autoPausedRef.current = false;
    manualPausedRef.current = false; // Clear manual pause when resuming
    lastActivityChangeRef.current = Date.now();

    // Resume tracking if it was auto-paused
    if (!isTracking) {
      setIsTracking(true);
      apiClient.post('/api/activities/toggle-tracking', { tracking: true }).catch(console.error);
    }
  }, [isTracking]);

  return {
    currentActivity,
    timeStats,
    isTracking,
    isLoading,
    error,
    toggleTracking,
    // AFK Detection
    isAfk,
    afkDuration,
    showAfkWarning,
    dismissAfkWarning,
    resumeFromAfk,
    // Settings
    afkThreshold: afkAutoPauseThreshold,
    // Data source info
    dataSource
  };
}
