// Shared types for Productify Pro

// Activity Types
export interface Activity {
  id: string;
  appName: string;
  windowTitle: string;
  url?: string;
  domain?: string;
  platform?: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  category: Category;
  productivityScore: number;
  isProductive: boolean;
  metadata?: Record<string, unknown>;
}

export type Category =
  | 'development'
  | 'design'
  | 'communication'
  | 'entertainment'
  | 'social_media'
  | 'research'
  | 'email'
  | 'meeting'
  | 'productivity'
  | 'music'
  | 'video'
  | 'other';

// URL Activity Types
export interface URLActivity extends Activity {
  fullUrl: string;
  pageTitle: string;
  faviconUrl?: string;
}

// YouTube Activity Types
export interface YouTubeActivity extends URLActivity {
  videoId: string;
  videoTitle: string;
  channelName: string;
  watchDuration: number;
  watchPercentage?: number;
  videoCategory: 'educational' | 'entertainment' | 'music' | 'news' | 'gaming' | 'other';
}

// Screenshot Types
export interface Screenshot {
  id: string;
  timestamp: Date;
  imagePath: string;
  thumbnailPath: string;
  appName: string;
  windowTitle: string;
  url?: string;
  category: Category;
  isBlurred: boolean;
}

// Analytics Types
export interface DailySummary {
  date: string;
  totalTime: number;
  productiveTime: number;
  distractingTime: number;
  neutralTime: number;
  productivityScore: number;
  focusScore: string;
  topApps: AppUsage[];
  topDistractions: AppUsage[];
  hourlyProductivity: HourlyProductivity[];
}

export interface AppUsage {
  name: string;
  duration: number;
  category: Category;
}

export interface HourlyProductivity {
  hour: number;
  productivity: number;
  totalTime: number;
}

// AI Types
export interface AIInsight {
  id: string;
  type: 'tip' | 'pattern' | 'recommendation' | 'warning';
  title: string;
  description: string;
  timestamp: Date;
}

export interface ProductivityClassification {
  isProductive: boolean;
  productivityScore: number;
  category: Category;
  reasoning: string;
  confidence: number;
}

// Settings Types
export interface UserSettings {
  general: GeneralSettings;
  ai: AISettings;
  screenshots: ScreenshotSettings;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  workSchedule: WorkScheduleSettings;
}

export interface GeneralSettings {
  theme: 'dark' | 'light' | 'system';
  launchOnStartup: boolean;
  startMinimized: boolean;
  timeFormat: '12h' | '24h';
}

export interface AISettings {
  apiKeyConfigured: boolean;
  enabled: boolean;
  model: string;
}

export interface ScreenshotSettings {
  enabled: boolean;
  interval: string;
  autoDelete: string;
  blurMode: 'never' | 'always' | 'sensitive';
  excludedApps: string[];
}

export interface PrivacySettings {
  trackPrivateBrowsing: boolean;
  dataRetentionDays: number;
  appLockEnabled: boolean;
}

export interface NotificationSettings {
  distractionAlerts: boolean;
  goalReminders: boolean;
  breakReminders: boolean;
  dailySummary: boolean;
  soundEnabled: boolean;
}

export interface WorkScheduleSettings {
  workDays: number[];
  workStartTime: string;
  workEndTime: string;
  trackOutsideWorkHours: boolean;
}

// Custom Lists Types
export interface CustomLists {
  productive: ListItem[];
  distracting: ListItem[];
  neutral: ListItem[];
  excluded: ListItem[];
}

export interface ListItem {
  pattern: string;
  note?: string;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Utils
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function getProductivityColor(score: number): 'productive' | 'neutral' | 'distracting' {
  if (score >= 0.7) return 'productive';
  if (score >= 0.4) return 'neutral';
  return 'distracting';
}

export function getProductivityLabel(score: number): string {
  if (score >= 0.7) return 'Productive';
  if (score >= 0.4) return 'Neutral';
  return 'Distracting';
}
