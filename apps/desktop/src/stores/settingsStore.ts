import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  // General
  theme: 'dark' | 'light' | 'system';
  launchOnStartup: boolean;
  startMinimized: boolean;
  timeFormat: '12h' | '24h';

  // AI
  openaiApiKey: string;
  aiInsightsEnabled: boolean;
  aiModel: 'gpt-4o-mini' | 'gpt-4o';

  // Screenshots
  screenshotsEnabled: boolean;
  screenshotInterval: '10-15' | '15-20' | '20-30';
  screenshotAutoDelete: '7' | '30' | '90' | 'never';
  screenshotBlurMode: 'never' | 'always' | 'sensitive';
  excludedAppsForScreenshots: string[];

  // Privacy
  trackPrivateBrowsing: boolean;
  dataRetentionDays: number;
  appLockEnabled: boolean;
  appLockPin?: string;

  // Notifications
  distractionAlerts: boolean;
  goalReminders: boolean;
  breakReminders: boolean;
  dailySummary: boolean;
  soundEnabled: boolean;

  // Work Schedule
  workDays: number[];
  workStartTime: string;
  workEndTime: string;
  trackOutsideWorkHours: boolean;

  // Custom Lists
  productiveSites: string[];
  distractingSites: string[];
  neutralSites: string[];
  excludedSites: string[];
}

interface SettingsStore extends Settings {
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setOpenaiApiKey: (key: string) => void;
  setAiInsightsEnabled: (enabled: boolean) => void;
  setScreenshotsEnabled: (enabled: boolean) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  addToProductiveSites: (site: string) => void;
  addToDistractingSites: (site: string) => void;
  removeFromProductiveSites: (site: string) => void;
  removeFromDistractingSites: (site: string) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  theme: 'dark',
  launchOnStartup: false,
  startMinimized: false,
  timeFormat: '12h',

  openaiApiKey: '',
  aiInsightsEnabled: true,
  aiModel: 'gpt-4o-mini',

  screenshotsEnabled: true,
  screenshotInterval: '10-15',
  screenshotAutoDelete: '30',
  screenshotBlurMode: 'never',
  excludedAppsForScreenshots: [],

  trackPrivateBrowsing: false,
  dataRetentionDays: 30,
  appLockEnabled: false,

  distractionAlerts: true,
  goalReminders: true,
  breakReminders: true,
  dailySummary: true,
  soundEnabled: true,

  workDays: [1, 2, 3, 4, 5], // Mon-Fri
  workStartTime: '09:00',
  workEndTime: '18:00',
  trackOutsideWorkHours: true,

  productiveSites: ['github.com', 'stackoverflow.com', 'notion.so'],
  distractingSites: ['twitter.com', 'reddit.com', 'tiktok.com'],
  neutralSites: ['gmail.com', 'slack.com'],
  excludedSites: [],
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => set({ theme }),

      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),

      setAiInsightsEnabled: (enabled) => set({ aiInsightsEnabled: enabled }),

      setScreenshotsEnabled: (enabled) => set({ screenshotsEnabled: enabled }),

      updateSettings: (settings) => set(settings),

      addToProductiveSites: (site) =>
        set((state) => ({
          productiveSites: [...state.productiveSites, site],
        })),

      addToDistractingSites: (site) =>
        set((state) => ({
          distractingSites: [...state.distractingSites, site],
        })),

      removeFromProductiveSites: (site) =>
        set((state) => ({
          productiveSites: state.productiveSites.filter((s) => s !== site),
        })),

      removeFromDistractingSites: (site) =>
        set((state) => ({
          distractingSites: state.distractingSites.filter((s) => s !== site),
        })),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'settings-storage',
    }
  )
);
