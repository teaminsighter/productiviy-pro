import apiClient from './client';

// ============================================================================
// Types (camelCase to match backend API response)
// ============================================================================

export interface GeneralSettings {
  theme: 'dark' | 'light' | 'system';
  language: string;
  startOnBoot: boolean;
  startMinimized: boolean;
  showInTray: boolean;
  closeToTray: boolean;
  minimizeToTray: boolean;
  autoUpdate: boolean;
}

export interface TrackingSettings {
  trackingEnabled: boolean;
  workStartTime: string;
  workEndTime: string;
  workDays: number[];
  idleTimeout: number;
  afkDetection: boolean;
}

export interface ScreenshotSettings {
  screenshotsEnabled: boolean;
  screenshotInterval: number;
  screenshotQuality: 'low' | 'medium' | 'high';
  blurScreenshots: boolean;
  autoDeleteAfter: number;
  excludedApps: string[];
}

export interface AISettings {
  apiKeySet: boolean;
  apiKeyMasked: string | null;
  aiModel: string;
  autoAnalysis: boolean;
  analysisFrequency: 'hourly' | 'daily' | 'weekly';
}

export interface PrivacySettings {
  incognitoMode: boolean;
  dataRetentionDays: number;
  appLockEnabled: boolean;
}

export interface NotificationSettings {
  notificationsEnabled: boolean;
  productivityAlerts: boolean;
  breakReminders: boolean;
  breakInterval: number;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
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
  activity_count?: number;
  screenshot_count?: number;
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
  aiModel: string;
  autoAnalysis: boolean;
  analysisFrequency: string;
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

export interface ExportData {
  exported_at: string;
  user: { id: number; email: string; name: string };
  settings: Record<string, unknown>;
  activities: Array<Record<string, unknown>>;
  url_activities: Array<Record<string, unknown>>;
  youtube_activities: Array<Record<string, unknown>>;
}

export interface DeleteDataResult {
  status: string;
  message: string;
  deleted: {
    activities: number;
    url_activities: number;
    youtube_activities: number;
  };
}

export interface DeleteScreenshotsResult {
  status: string;
  message: string;
  deleted_count: number;
  freed_mb: number;
}

export async function exportData(): Promise<ExportData> {
  const response = await apiClient.get('/api/settings/export');
  return response.data;
}

export async function downloadExportAsFile(): Promise<void> {
  const data = await exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `productify_export_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function clearAllData(): Promise<DeleteDataResult> {
  const response = await apiClient.delete('/api/settings/data', {
    params: { confirm: true },
  });
  return response.data;
}

export async function deleteAllScreenshots(): Promise<DeleteScreenshotsResult> {
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
