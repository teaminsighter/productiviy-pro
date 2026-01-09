import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CurrentActivityState {
  id: string;
  appName: string;
  windowTitle: string;
  url?: string;
  duration: number;
  category: string;
  productivityScore: number;
  productivityType: 'productive' | 'neutral' | 'distracting';
  isAfk: boolean;
  startTime: Date;
}

export interface RecentActivity {
  id: string;
  appName: string;
  windowTitle: string;
  url?: string;
  duration: number;
  category: string;
  productivityScore: number;
  isProductive: boolean;
  timestamp: Date;
}

interface ActivityStore {
  // Current activity state
  currentActivity: CurrentActivityState | null;
  recentActivities: RecentActivity[];

  // Connection state
  isConnected: boolean;
  isActivityWatchAvailable: boolean;

  // Daily stats
  todayTotalTime: number;
  todayProductiveTime: number;
  todayDistractingTime: number;
  productivityScore: number;

  // Tracking state
  isTracking: boolean;

  // Actions
  setCurrentActivity: (activity: CurrentActivityState | null) => void;
  addRecentActivity: (activity: RecentActivity) => void;
  setIsConnected: (connected: boolean) => void;
  setActivityWatchAvailable: (available: boolean) => void;
  setIsTracking: (tracking: boolean) => void;
  toggleTracking: () => void;
  updateDailyStats: (stats: {
    totalTime: number;
    productiveTime: number;
    distractingTime: number;
    productivityScore: number;
  }) => void;
  clearActivities: () => void;
}

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set) => ({
      // Initial state
      currentActivity: null,
      recentActivities: [],
      isConnected: false,
      isActivityWatchAvailable: false,
      todayTotalTime: 0,
      todayProductiveTime: 0,
      todayDistractingTime: 0,
      productivityScore: 0,
      isTracking: true,

      // Actions
      setCurrentActivity: (activity) =>
        set((state) => {
          // If activity is null, just clear it
          if (!activity) {
            return { currentActivity: null };
          }

          // Normalize the activity with safe defaults
          const safeActivity: CurrentActivityState = {
            id: activity.id || `activity-${Date.now()}`,
            appName: activity.appName || 'Unknown App',
            windowTitle: activity.windowTitle || '',
            url: activity.url,
            duration: typeof activity.duration === 'number' ? activity.duration : 0,
            category: activity.category || 'uncategorized',
            productivityScore: typeof activity.productivityScore === 'number' ? activity.productivityScore : 0.5,
            productivityType: ['productive', 'neutral', 'distracting'].includes(activity.productivityType)
              ? activity.productivityType
              : 'neutral',
            isAfk: Boolean(activity.isAfk),
            startTime: activity.startTime instanceof Date ? activity.startTime : new Date(),
          };

          // Optionally add to recent activities if it's a new activity
          if (state.currentActivity?.appName !== safeActivity.appName) {
            const recent: RecentActivity = {
              id: safeActivity.id,
              appName: safeActivity.appName,
              windowTitle: safeActivity.windowTitle,
              url: safeActivity.url,
              duration: safeActivity.duration,
              category: safeActivity.category,
              productivityScore: safeActivity.productivityScore,
              isProductive: safeActivity.productivityType === 'productive',
              timestamp: new Date(),
            };

            return {
              currentActivity: safeActivity,
              recentActivities: [recent, ...state.recentActivities].slice(0, 50),
            };
          }

          return { currentActivity: safeActivity };
        }),

      addRecentActivity: (activity) =>
        set((state) => {
          if (!activity) return state;

          // Normalize the activity with safe defaults
          const safeActivity: RecentActivity = {
            id: activity.id || `activity-${Date.now()}`,
            appName: activity.appName || 'Unknown App',
            windowTitle: activity.windowTitle || '',
            url: activity.url,
            duration: typeof activity.duration === 'number' ? activity.duration : 0,
            category: activity.category || 'uncategorized',
            productivityScore: typeof activity.productivityScore === 'number' ? activity.productivityScore : 0.5,
            isProductive: Boolean(activity.isProductive),
            timestamp: activity.timestamp instanceof Date ? activity.timestamp : new Date(),
          };

          return {
            recentActivities: [safeActivity, ...state.recentActivities].slice(0, 50),
          };
        }),

      setIsConnected: (connected) =>
        set({ isConnected: connected }),

      setActivityWatchAvailable: (available) =>
        set({ isActivityWatchAvailable: available }),

      setIsTracking: (tracking) =>
        set({ isTracking: tracking }),

      toggleTracking: () =>
        set((state) => ({ isTracking: !state.isTracking })),

      updateDailyStats: (stats) =>
        set({
          todayTotalTime: typeof stats?.totalTime === 'number' ? stats.totalTime : 0,
          todayProductiveTime: typeof stats?.productiveTime === 'number' ? stats.productiveTime : 0,
          todayDistractingTime: typeof stats?.distractingTime === 'number' ? stats.distractingTime : 0,
          productivityScore: typeof stats?.productivityScore === 'number' ? stats.productivityScore : 0,
        }),

      clearActivities: () =>
        set({
          recentActivities: [],
          currentActivity: null,
          todayTotalTime: 0,
          todayProductiveTime: 0,
          todayDistractingTime: 0,
          productivityScore: 0,
        }),
    }),
    {
      name: 'activity-storage',
      partialize: (state) => ({
        // Only persist these fields
        isTracking: state.isTracking,
        recentActivities: state.recentActivities.slice(0, 20), // Only keep last 20
      }),
    }
  )
);
