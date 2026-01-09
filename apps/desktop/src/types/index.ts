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
  | 'other';

// URL Activity Types
export interface URLActivity extends Activity {
  fullUrl: string;
  domain: string;
  platform: string;
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
  aiClassification?: {
    category: string;
    confidence: number;
    reasoning: string;
  };
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
  topApps: Array<{ name: string; duration: number; category: Category }>;
  topDistractions: Array<{ name: string; duration: number }>;
  hourlyProductivity: Array<{ hour: number; productivity: number }>;
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
  general: {
    theme: 'dark' | 'light' | 'system';
    launchOnStartup: boolean;
    startMinimized: boolean;
    timeFormat: '12h' | '24h';
  };
  ai: {
    apiKey: string;
    enabled: boolean;
    model: string;
  };
  screenshots: {
    enabled: boolean;
    interval: string;
    autoDelete: string;
    blurMode: string;
    excludedApps: string[];
  };
  privacy: {
    trackPrivateBrowsing: boolean;
    dataRetentionDays: number;
    appLockEnabled: boolean;
  };
  notifications: {
    distractionAlerts: boolean;
    goalReminders: boolean;
    breakReminders: boolean;
    dailySummary: boolean;
    soundEnabled: boolean;
  };
}

// Custom Lists Types
export interface CustomLists {
  productive: Array<{ pattern: string; note?: string }>;
  distracting: Array<{ pattern: string; note?: string }>;
  neutral: Array<{ pattern: string; note?: string }>;
  excluded: Array<{ pattern: string; reason?: string }>;
}
