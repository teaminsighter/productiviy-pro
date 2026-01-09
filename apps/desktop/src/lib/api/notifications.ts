/**
 * Notifications and Onboarding API
 */
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'ai_insight'
  | 'distraction_alert'
  | 'goal_progress'
  | 'goal_achieved'
  | 'focus_reminder'
  | 'break_suggestion'
  | 'daily_summary'
  | 'streak_alert'
  | 'weekly_report';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type UserProfileType =
  | 'developer'
  | 'designer'
  | 'writer'
  | 'manager'
  | 'student'
  | 'freelancer'
  | 'other';

export interface NotificationAction {
  label: string;
  action: string;
  primary?: boolean;
}

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actions?: NotificationAction[];
  is_read: boolean;
  is_dismissed: boolean;
  priority: NotificationPriority;
  source?: string;
  data?: Record<string, unknown>;
  created_at: string;
  read_at?: string;
  expires_at?: string;
  show_native: boolean;
}

export interface NotificationCreate {
  type?: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actions?: NotificationAction[];
  priority?: NotificationPriority;
  source?: string;
  data?: Record<string, unknown>;
  show_native?: boolean;
  expires_at?: string;
}

export interface NotificationSettings {
  id: number;
  notifications_enabled: boolean;
  distraction_alerts: boolean;
  distraction_threshold_minutes: number;
  goal_notifications: boolean;
  streak_notifications: boolean;
  focus_reminders: boolean;
  break_reminders: boolean;
  break_threshold_minutes: number;
  daily_summary: boolean;
  daily_summary_time: string;
  weekly_report: boolean;
  weekly_report_day: number;
  ai_insights: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  native_notifications: boolean;
  sound_enabled: boolean;
}

export interface NotificationSettingsUpdate {
  notifications_enabled?: boolean;
  distraction_alerts?: boolean;
  distraction_threshold_minutes?: number;
  goal_notifications?: boolean;
  streak_notifications?: boolean;
  focus_reminders?: boolean;
  break_reminders?: boolean;
  break_threshold_minutes?: number;
  daily_summary?: boolean;
  daily_summary_time?: string;
  weekly_report?: boolean;
  weekly_report_day?: number;
  ai_insights?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  native_notifications?: boolean;
  sound_enabled?: boolean;
}

export interface UserProfile {
  id: number;
  onboarding_completed: boolean;
  onboarding_completed_at?: string;
  onboarding_step: number;
  profile_type: UserProfileType;
  work_apps: string[];
  daily_productive_hours: number;
  max_distraction_hours: number;
  ai_enabled: boolean;
  accessibility_granted: boolean;
  screen_recording_granted: boolean;
  launch_on_startup: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdate {
  profile_type?: UserProfileType;
  work_apps?: string[];
  daily_productive_hours?: number;
  max_distraction_hours?: number;
  ai_enabled?: boolean;
  openai_api_key?: string;
  accessibility_granted?: boolean;
  screen_recording_granted?: boolean;
  launch_on_startup?: boolean;
}

export interface OnboardingStatus {
  completed: boolean;
  step: number;
  profile_exists: boolean;
}

export interface OnboardingStepData {
  step: number;
  data: Record<string, unknown>;
}

export interface CommonApp {
  name: string;
  icon: string;
  category: string;
}

// ============================================================================
// Notification API Functions
// ============================================================================

export async function fetchNotifications(
  limit: number = 50,
  unreadOnly: boolean = false,
  type?: NotificationType
): Promise<Notification[]> {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (unreadOnly) params.append('unread_only', 'true');
  if (type) params.append('type', type);

  const response = await axios.get<Notification[]>(
    `${API_BASE}/notifications?${params.toString()}`
  );
  return response.data;
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await axios.get<{ count: number }>(
    `${API_BASE}/notifications/unread-count`
  );
  return response.data.count;
}

export async function createNotification(
  notification: NotificationCreate
): Promise<Notification> {
  const response = await axios.post<Notification>(
    `${API_BASE}/notifications`,
    notification
  );
  return response.data;
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const response = await axios.put<Notification>(
    `${API_BASE}/notifications/${id}/read`
  );
  return response.data;
}

export async function deleteNotification(id: number): Promise<void> {
  await axios.delete(`${API_BASE}/notifications/${id}`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await axios.post(`${API_BASE}/notifications/read-all`);
}

export async function clearAllNotifications(): Promise<void> {
  await axios.delete(`${API_BASE}/notifications/clear`);
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const response = await axios.get<NotificationSettings>(
    `${API_BASE}/notifications/settings`
  );
  return response.data;
}

export async function updateNotificationSettings(
  settings: NotificationSettingsUpdate
): Promise<NotificationSettings> {
  const response = await axios.put<NotificationSettings>(
    `${API_BASE}/notifications/settings`,
    settings
  );
  return response.data;
}

// ============================================================================
// Onboarding API Functions
// ============================================================================

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const response = await axios.get<OnboardingStatus>(
    `${API_BASE}/onboarding/status`
  );
  return response.data;
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const response = await axios.get<UserProfile>(
    `${API_BASE}/onboarding/profile`
  );
  return response.data;
}

export async function updateUserProfile(
  updates: UserProfileUpdate
): Promise<UserProfile> {
  const response = await axios.put<UserProfile>(
    `${API_BASE}/onboarding/profile`,
    updates
  );
  return response.data;
}

export async function saveOnboardingStep(
  step: number,
  data: Record<string, unknown>
): Promise<void> {
  await axios.post(`${API_BASE}/onboarding/step`, { step, data });
}

export async function completeOnboarding(): Promise<{
  status: string;
  message: string;
  profile: {
    profile_type: string;
    work_apps: string[];
    daily_productive_hours: number;
  };
}> {
  const response = await axios.post(`${API_BASE}/onboarding/complete`);
  return response.data;
}

export async function resetOnboarding(): Promise<void> {
  await axios.post(`${API_BASE}/onboarding/reset`);
}

export async function fetchCommonApps(): Promise<CommonApp[]> {
  const response = await axios.get<{ apps: CommonApp[] }>(
    `${API_BASE}/onboarding/common-apps`
  );
  return response.data.apps;
}

export async function fetchProfileTypes(): Promise<{
  types: Array<{
    value: UserProfileType;
    label: string;
    description: Record<string, unknown>;
  }>;
}> {
  const response = await axios.get(`${API_BASE}/onboarding/profile-types`);
  return response.data;
}
