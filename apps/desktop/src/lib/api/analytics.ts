import apiClient from './client';

// Types
export interface DailyAnalytics {
  date: string;
  total_time: number;
  productivity_score: number;
  productive_time: number;
  neutral_time: number;
  distracting_time: number;
  hourly_productivity: Array<{
    hour: number;
    productivity: number;
    total_time: number;
    productive_time: number;
    distracting_time: number;
  }>;
  categories: Array<{
    category: string;
    duration: number;
    percentage: number;
  }>;
  focus_sessions: Array<{
    start: string;
    end: string;
    duration: number;
    app: string;
    category: string;
  }>;
}

export interface WeeklyAnalytics {
  start_date: string;
  end_date: string;
  total_time: number;
  average_daily_time: number;
  productivity_score: number;
  productive_time: number;
  distracting_time: number;
  daily_breakdown: Array<{
    date: string;
    day: string;
    total_time: number;
    productivity_score: number;
  }>;
  comparison: {
    time_change: number;
    productivity_change: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  streak: {
    current: number;
    best: number;
    goal_met_today: boolean;
  };
}

export interface TopApp {
  app: string;
  duration: number;
  percentage: number;
  productivity_type: string;
  category: string;
}

export interface CategoryBreakdown {
  category: string;
  duration: number;
  percentage: number;
  productivity_score: number;
  top_apps: string[];
}

export interface TrendData {
  trends: Array<{
    date: string;
    productivity_score: number;
    total_time: number;
    productive_time: number;
  }>;
  insights: string[];
}

// API Functions
export async function fetchDailyAnalytics(date?: string): Promise<DailyAnalytics> {
  const params = date ? `?date=${date}` : '';
  const response = await apiClient.get(`/api/analytics/daily${params}`);
  return response.data;
}

export async function fetchWeeklyAnalytics(): Promise<WeeklyAnalytics> {
  const response = await apiClient.get('/api/analytics/weekly');
  return response.data;
}

export async function fetchTopApps(
  date?: string,
  limit: number = 10
): Promise<TopApp[]> {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  params.append('limit', limit.toString());

  const response = await apiClient.get(`/api/analytics/top-apps?${params.toString()}`);
  return response.data;
}

export async function fetchCategories(date?: string): Promise<CategoryBreakdown[]> {
  const params = date ? `?date=${date}` : '';
  const response = await apiClient.get(`/api/analytics/categories${params}`);
  return response.data;
}

export async function fetchTrends(days: number = 7): Promise<TrendData> {
  const response = await apiClient.get(`/api/analytics/trends?days=${days}`);
  return response.data;
}
