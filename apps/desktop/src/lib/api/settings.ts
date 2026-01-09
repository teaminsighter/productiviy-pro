import apiClient from './client';

// ============================================================================
// Types
// ============================================================================

export interface GeneralSettings {
  theme: 'dark' | 'light' | 'system';
  language: string;
  start_on_boot: boolean;
  start_minimized: boolean;
  show_in_tray: boolean;
}

export interface TrackingSettings {
  enabled: boolean;
  work_start_time: string;
  work_end_time: string;
  work_days: number[];
  idle_timeout: number;
  afk_detection: boolean;
}

export interface ScreenshotSettings {
  enabled: boolean;
  interval: number;
  quality: 'low' | 'medium' | 'high';
  blur_enabled: boolean;
  auto_delete_after: number;
  excluded_apps: string[];
}

export interface AISettings {
  api_key_set: boolean;
  api_key_masked: string | null;
  model: string;
  auto_analysis: boolean;
  analysis_frequency: 'hourly' | 'daily' | 'weekly';
}

export interface PrivacySettings {
  incognito_mode: boolean;
  data_retention_days: number;
  app_lock_enabled: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  productivity_alerts: boolean;
  break_reminders: boolean;
  break_interval: number;
  sound_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface AllSettings {
  general: GeneralSettings;
  tracking: TrackingSettings;
  screenshots: ScreenshotSettings;
  ai: AISettings;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
}

export interface SettingsUpdate {
  general?: Partial<GeneralSettings>;
  tracking?: Partial<TrackingSettings>;
  screenshots?: Partial<ScreenshotSettings>;
  privacy?: Partial<PrivacySettings>;
  notifications?: Partial<NotificationSettings>;
}

export interface CustomListItem {
  pattern: string;
  note: string | null;
}

export interface CustomLists {
  productive: CustomListItem[];
  distracting: CustomListItem[];
  neutral: CustomListItem[];
  excluded: CustomListItem[];
}

export interface StorageInfo {
  activity_data_mb: number;
  screenshots_mb: number;
  total_mb: number;
  limit_mb: number;
  usage_percent: number;
}

export interface APIKeyTestResult {
  status: 'success' | 'error' | 'warning';
  message: string;
  valid: boolean;
}

export interface APIKeyStatus {
  configured: boolean;
  masked: string | null;
}

// ============================================================================
// Settings API Functions
// ============================================================================

export async function fetchSettings(): Promise<AllSettings> {
  const response = await apiClient.get('/api/settings');
  return response.data;
}

export async function updateSettings(settings: SettingsUpdate): Promise<{ status: string }> {
  const response = await apiClient.put('/api/settings', settings);
  return response.data;
}

export async function updateGeneralSettings(settings: GeneralSettings): Promise<{ status: string }> {
  const response = await apiClient.patch('/api/settings/general', settings);
  return response.data;
}

export async function updateTrackingSettings(settings: TrackingSettings): Promise<{ status: string }> {
  const response = await apiClient.patch('/api/settings/tracking', settings);
  return response.data;
}

export async function updateScreenshotSettings(settings: ScreenshotSettings): Promise<{ status: string }> {
  const response = await apiClient.patch('/api/settings/screenshots', settings);
  return response.data;
}

export async function updatePrivacySettings(settings: PrivacySettings): Promise<{ status: string }> {
  const response = await apiClient.patch('/api/settings/privacy', settings);
  return response.data;
}

export async function updateNotificationSettings(settings: NotificationSettings): Promise<{ status: string }> {
  const response = await apiClient.patch('/api/settings/notifications', settings);
  return response.data;
}

// ============================================================================
// API Key Functions
// ============================================================================

export async function getAPIKeyStatus(): Promise<APIKeyStatus> {
  const response = await apiClient.get('/api/settings/api-key/status');
  return response.data;
}

export async function setAPIKey(apiKey: string): Promise<{ status: string; masked: string }> {
  const response = await apiClient.post('/api/settings/api-key', { api_key: apiKey });
  return response.data;
}

export async function removeAPIKey(): Promise<{ status: string }> {
  const response = await apiClient.delete('/api/settings/api-key');
  return response.data;
}

export async function testAPIKey(apiKey: string): Promise<APIKeyTestResult> {
  const response = await apiClient.post('/api/settings/api-key/test', { api_key: apiKey });
  return response.data;
}

export async function updateAISettings(settings: {
  model: string;
  auto_analysis: boolean;
  analysis_frequency: string;
}): Promise<{ status: string }> {
  const response = await apiClient.patch('/api/settings/ai', settings);
  return response.data;
}

// ============================================================================
// Custom Lists Functions
// ============================================================================

export async function fetchCustomLists(): Promise<CustomLists> {
  const response = await apiClient.get('/api/settings/lists');
  return response.data;
}

export async function updateCustomLists(lists: CustomLists): Promise<{ status: string }> {
  const response = await apiClient.put('/api/settings/lists', lists);
  return response.data;
}

export async function addToCustomList(
  listType: 'productive' | 'distracting' | 'neutral' | 'excluded',
  item: CustomListItem
): Promise<{ status: string }> {
  const response = await apiClient.post(`/api/settings/lists/${listType}`, item);
  return response.data;
}

export async function removeFromCustomList(
  listType: 'productive' | 'distracting' | 'neutral' | 'excluded',
  pattern: string
): Promise<{ status: string }> {
  const response = await apiClient.delete(`/api/settings/lists/${listType}/${encodeURIComponent(pattern)}`);
  return response.data;
}

// ============================================================================
// Data Management Functions
// ============================================================================

export async function exportData(): Promise<{ status: string; download_url: string }> {
  const response = await apiClient.post('/api/settings/export');
  return response.data;
}

export async function downloadExport(): Promise<Blob> {
  const response = await apiClient.get('/api/settings/export/download', {
    responseType: 'blob',
  });
  return response.data;
}

export async function clearAllData(): Promise<{ status: string }> {
  const response = await apiClient.delete('/api/settings/data', {
    params: { confirm: true },
  });
  return response.data;
}

export async function deleteAllScreenshots(): Promise<{ status: string }> {
  const response = await apiClient.delete('/api/settings/screenshots', {
    params: { confirm: true },
  });
  return response.data;
}

export async function resetSettings(): Promise<{ status: string }> {
  const response = await apiClient.post('/api/settings/reset', null, {
    params: { confirm: true },
  });
  return response.data;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const response = await apiClient.get('/api/settings/storage');
  return response.data;
}
