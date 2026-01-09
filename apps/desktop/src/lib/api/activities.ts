import apiClient from './client';

// Types
export interface CurrentActivity {
  app_name: string;
  window_title: string;
  url: string | null;
  domain: string | null;
  platform: string | null;
  start_time: string;
  duration: number;
  category: string;
  productivity_score: number;
  productivity_type: 'productive' | 'neutral' | 'distracting';
  is_afk: boolean;
  activitywatch_available: boolean;
}

export interface ActivityItem {
  id: string;
  app_name: string;
  window_title: string;
  url: string | null;
  domain: string | null;
  start_time: string;
  end_time: string | null;
  duration: number;
  category: string;
  productivity_score: number;
  is_productive: boolean;
  productivity_type: string;
}

export interface DailySummary {
  date: string;
  total_time: number;
  productive_time: number;
  distracting_time: number;
  neutral_time: number;
  productivity_score: number;
  focus_score: string;
  top_apps: Array<{
    app: string;
    duration: number;
    productivity_type: string;
  }>;
  top_distractions: Array<{
    app: string;
    duration: number;
  }>;
  categories: Array<{
    category: string;
    duration: number;
    percentage: number;
  }>;
}

export interface TimelineEntry {
  hour: number;
  activities: Array<{
    app_name: string;
    window_title: string;
    duration: number;
    productivity_type: string;
  }>;
  total_time: number;
  productive_time: number;
  dominant_category: string;
}

export interface ActivityFilters {
  category?: string;
  productivity_type?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityStatus {
  available: boolean;
  url: string;
  buckets: string[];
  window_bucket: string;
  afk_bucket: string;
}

// API Functions
export async function fetchCurrentActivity(): Promise<CurrentActivity> {
  const response = await apiClient.get('/api/activities/current');
  return response.data;
}

export async function fetchActivities(
  date: string,
  filters?: ActivityFilters
): Promise<ActivityItem[]> {
  const params = new URLSearchParams();
  params.append('date', date);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.productivity_type) params.append('productivity_type', filters.productivity_type);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const response = await apiClient.get(`/api/activities?${params.toString()}`);
  return response.data;
}

export async function fetchDailySummary(date: string): Promise<DailySummary> {
  const response = await apiClient.get(`/api/activities/summary/${date}`);
  return response.data;
}

export async function fetchTimeline(date: string): Promise<TimelineEntry[]> {
  const response = await apiClient.get(`/api/activities/timeline/${date}`);
  return response.data;
}

export async function fetchActivityStatus(): Promise<ActivityStatus> {
  const response = await apiClient.get('/api/activities/status');
  return response.data;
}
