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

interface UseRealTimeActivityReturn {
  currentActivity: CurrentActivity | null;
  timeStats: TimeStats;
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;
  toggleTracking: () => void;
}

export function useRealTimeActivity(): UseRealTimeActivityReturn {
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

  // Use refs to track elapsed time locally (for smooth updates)
  const activityStartRef = useRef<number>(Date.now());
  const baseStatsRef = useRef<TimeStats>(timeStats);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isProductiveRef = useRef<boolean>(false);

  // Fetch initial data from server
  const fetchCurrentState = useCallback(async () => {
    try {
      // Fetch current activity and basic stats
      const response = await apiClient.get('/api/activities/current-realtime');
      const data = response.data;

      if (data.current_activity) {
        setCurrentActivity(data.current_activity);
        activityStartRef.current = new Date(data.current_activity.start_time).getTime();
        isProductiveRef.current = data.current_activity.is_productive;
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

      setIsTracking(data.is_tracking !== false);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch current state:', err);
      setError('Failed to connect to tracking service');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tick every second to update duration locally
  const tick = useCallback(() => {
    if (!isTracking) return;

    const now = Date.now();

    // Update current activity duration
    if (currentActivity) {
      const elapsed = Math.floor((now - activityStartRef.current) / 1000);
      setCurrentActivity(prev => prev ? { ...prev, duration: elapsed } : null);
    }

    // Update total time (add 1 second)
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
  }, [isTracking, currentActivity]);

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

  // Initial fetch and periodic sync with server (every 5 seconds for responsive app switching)
  useEffect(() => {
    fetchCurrentState();

    const syncInterval = setInterval(fetchCurrentState, 5000);

    return () => clearInterval(syncInterval);
  }, [fetchCurrentState]);

  const toggleTracking = useCallback(() => {
    setIsTracking(prev => !prev);
    apiClient.post('/api/activities/toggle-tracking', { tracking: !isTracking }).catch(console.error);
  }, [isTracking]);

  return {
    currentActivity,
    timeStats,
    isTracking,
    isLoading,
    error,
    toggleTracking
  };
}
