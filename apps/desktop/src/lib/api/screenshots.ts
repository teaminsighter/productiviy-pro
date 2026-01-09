import apiClient from './client';

// Types
export interface Screenshot {
  id: string;
  timestamp: string;
  image_path: string;
  thumbnail_path: string | null;
  app_name: string | null;
  window_title: string | null;
  url: string | null;
  category: string;
  is_blurred: boolean;
  productivity_type: string;
}

export interface ScreenshotFilters {
  date?: string;
  app?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface ScreenshotSettings {
  enabled: boolean;
  interval_min: number;
  interval_max: number;
  blur_mode: string;
  quality: number;
  excluded_apps: string[];
}

export interface ScreenshotStats {
  period_days: number;
  total_count: number;
  storage_bytes: number;
  storage_mb: number;
  categories: Record<string, number>;
  daily_average: number;
}

export interface CaptureResult {
  status: string;
  id: string;
  timestamp: string;
  app_name: string | null;
  category: string;
  productivity_type: string;
}

// API Functions
export async function fetchScreenshots(filters?: ScreenshotFilters): Promise<Screenshot[]> {
  const params = new URLSearchParams();
  if (filters?.date) params.append('date', filters.date);
  if (filters?.app) params.append('app', filters.app);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const response = await apiClient.get(`/api/screenshots?${params.toString()}`);
  return response.data;
}

export async function fetchScreenshot(id: string): Promise<Screenshot> {
  const response = await apiClient.get(`/api/screenshots/${id}`);
  return response.data;
}

export async function captureScreenshot(): Promise<CaptureResult> {
  const response = await apiClient.post('/api/screenshots/capture');
  return response.data;
}

export async function deleteScreenshot(
  id: string,
  permanent: boolean = false
): Promise<{ status: string; id: string; permanent: boolean }> {
  const response = await apiClient.delete(`/api/screenshots/${id}?permanent=${permanent}`);
  return response.data;
}

export async function fetchScreenshotSettings(): Promise<ScreenshotSettings> {
  const response = await apiClient.get('/api/screenshots/settings/current');
  return response.data;
}

export async function updateScreenshotSettings(
  settings: Partial<ScreenshotSettings>
): Promise<{ status: string; settings: ScreenshotSettings }> {
  const response = await apiClient.put('/api/screenshots/settings', settings);
  return response.data;
}

export async function fetchScreenshotStats(days: number = 7): Promise<ScreenshotStats> {
  const response = await apiClient.get(`/api/screenshots/stats?days=${days}`);
  return response.data;
}

export async function cleanupScreenshots(
  olderThanDays: number = 30
): Promise<{ status: string; deleted_count: number; freed_mb: number }> {
  const response = await apiClient.delete(`/api/screenshots/cleanup?older_than_days=${olderThanDays}`);
  return response.data;
}

// Get image URL for display
export function getScreenshotImageUrl(id: string, thumbnail: boolean = false): string {
  return `http://localhost:8000/api/screenshots/${id}/image?thumbnail=${thumbnail}`;
}
