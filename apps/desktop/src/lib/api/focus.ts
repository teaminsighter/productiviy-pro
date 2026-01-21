import apiClient from './client';

// ============================================================================
// Types
// ============================================================================

export interface FocusSettings {
  id: string;
  defaultBlockedApps: string[];
  defaultBlockedWebsites: string[];
  allowedApps: string[];
  allowedWebsites: string[];
  autoStartFromCalendar: boolean;
  autoDetectGaps: boolean;
  minGapMinutes: number;
  focusDurationMinutes: number;
  breakDurationMinutes: number;
  longBreakDurationMinutes: number;
  sessionsBeforeLongBreak: number;
  breakRemindersEnabled: boolean;
  blockingMode: 'soft' | 'hard' | 'strict';
  workStartTime: string;
  workEndTime: string;
  workDays: number[];
  totalFocusMinutes: number;
  totalDistractionsBlocked: number;
  currentStreakDays: number;
  longestStreakDays: number;
}

export interface FocusSettingsUpdate {
  defaultBlockedApps?: string[];
  defaultBlockedWebsites?: string[];
  allowedApps?: string[];
  allowedWebsites?: string[];
  autoStartFromCalendar?: boolean;
  autoDetectGaps?: boolean;
  minGapMinutes?: number;
  focusDurationMinutes?: number;
  breakDurationMinutes?: number;
  longBreakDurationMinutes?: number;
  sessionsBeforeLongBreak?: number;
  breakRemindersEnabled?: boolean;
  blockingMode?: 'soft' | 'hard' | 'strict';
  bypassPassword?: string;
  workStartTime?: string;
  workEndTime?: string;
  workDays?: number[];
}

export interface FocusBlock {
  id: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  title: string;
  status: 'scheduled' | 'active' | 'completed' | 'paused' | 'cancelled';
  blockingEnabled: boolean;
  blockedApps: string[];
  blockedWebsites: string[];
  completedMinutes: number;
  successRate: number | null;
  distractionsBlocked: number;
}

export interface CalendarGap {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  qualityScore: number;
}

export interface FocusSuggestion {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface FocusStats {
  totalFocusMinutes: number;
  totalSessions: number;
  completedSessions: number;
  averageSessionMinutes: number;
  totalDistractionsBlocked: number;
  averageSuccessRate: number;
  currentStreak: number;
  longestStreak: number;
  dailyStats: Array<{
    date: string;
    focusMinutes: number;
    sessions: number;
    distractionsBlocked: number;
  }>;
}

export interface CreateFocusBlockRequest {
  startTime: string;
  endTime: string;
  title?: string;
  blockingEnabled?: boolean;
  syncToCalendar?: boolean;
}

// ============================================================================
// Focus Settings API
// ============================================================================

export async function getFocusSettings(): Promise<FocusSettings> {
  const response = await apiClient.get('/api/focus/settings');
  return transformFocusSettings(response.data);
}

export async function updateFocusSettings(settings: FocusSettingsUpdate): Promise<FocusSettings> {
  // Transform camelCase to snake_case for the backend
  const payload = {
    default_blocked_apps: settings.defaultBlockedApps,
    default_blocked_websites: settings.defaultBlockedWebsites,
    allowed_apps: settings.allowedApps,
    allowed_websites: settings.allowedWebsites,
    auto_start_from_calendar: settings.autoStartFromCalendar,
    auto_detect_gaps: settings.autoDetectGaps,
    min_gap_minutes: settings.minGapMinutes,
    focus_duration_minutes: settings.focusDurationMinutes,
    break_duration_minutes: settings.breakDurationMinutes,
    long_break_duration_minutes: settings.longBreakDurationMinutes,
    sessions_before_long_break: settings.sessionsBeforeLongBreak,
    break_reminders_enabled: settings.breakRemindersEnabled,
    blocking_mode: settings.blockingMode,
    bypass_password: settings.bypassPassword,
    work_start_time: settings.workStartTime,
    work_end_time: settings.workEndTime,
    work_days: settings.workDays,
  };

  // Remove undefined values
  const cleanPayload = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  );

  const response = await apiClient.put('/api/focus/settings', cleanPayload);
  return transformFocusSettings(response.data);
}

// ============================================================================
// Focus Blocks API
// ============================================================================

export async function getFocusBlocks(hoursAhead: number = 24): Promise<FocusBlock[]> {
  const response = await apiClient.get('/api/focus/blocks', {
    params: { hours_ahead: hoursAhead },
  });
  return response.data.map(transformFocusBlock);
}

export async function createFocusBlock(request: CreateFocusBlockRequest): Promise<FocusBlock> {
  const payload = {
    start_time: request.startTime,
    end_time: request.endTime,
    title: request.title || 'Focus Time',
    blocking_enabled: request.blockingEnabled ?? true,
    sync_to_calendar: request.syncToCalendar ?? false,
  };
  const response = await apiClient.post('/api/focus/blocks', payload);
  return transformFocusBlock(response.data);
}

export async function deleteFocusBlock(blockId: string): Promise<{ message: string }> {
  const response = await apiClient.delete(`/api/focus/blocks/${blockId}`);
  return response.data;
}

// ============================================================================
// Active Session API
// ============================================================================

export async function getActiveSession(): Promise<FocusBlock | null> {
  const response = await apiClient.get('/api/focus/active');
  return response.data ? transformFocusBlock(response.data) : null;
}

export async function startFocusSession(blockId?: string): Promise<FocusBlock> {
  const payload = blockId ? { block_id: blockId } : {};
  const response = await apiClient.post('/api/focus/start', payload);
  return transformFocusBlock(response.data);
}

export async function endFocusSession(blockId: string): Promise<FocusBlock> {
  const response = await apiClient.post(`/api/focus/end/${blockId}`);
  return transformFocusBlock(response.data);
}

export async function pauseFocusSession(blockId: string): Promise<FocusBlock> {
  const response = await apiClient.post(`/api/focus/pause/${blockId}`);
  return transformFocusBlock(response.data);
}

// ============================================================================
// Quick Actions
// ============================================================================

export async function quickStartFocus(durationMinutes: number = 50): Promise<FocusBlock> {
  const response = await apiClient.post('/api/focus/quick-start', null, {
    params: { duration_minutes: durationMinutes },
  });
  return transformFocusBlock(response.data);
}

export async function scheduleFromSuggestion(
  startTime: string,
  endTime: string
): Promise<FocusBlock> {
  const response = await apiClient.post('/api/focus/schedule-from-suggestion', null, {
    params: { start_time: startTime, end_time: endTime },
  });
  return transformFocusBlock(response.data);
}

// ============================================================================
// Suggestions & Gaps
// ============================================================================

export async function getCalendarGaps(
  daysAhead: number = 7,
  minGapMinutes: number = 30
): Promise<CalendarGap[]> {
  const response = await apiClient.get('/api/focus/gaps', {
    params: { days_ahead: daysAhead, min_gap_minutes: minGapMinutes },
  });
  return response.data.map((gap: Record<string, unknown>) => ({
    startTime: gap.start_time as string,
    endTime: gap.end_time as string,
    durationMinutes: gap.duration_minutes as number,
    qualityScore: gap.quality_score as number,
  }));
}

export async function getFocusSuggestions(daysAhead: number = 7): Promise<FocusSuggestion[]> {
  const response = await apiClient.get('/api/focus/suggestions', {
    params: { days_ahead: daysAhead },
  });
  return response.data.map((s: Record<string, unknown>) => ({
    startTime: s.start_time as string,
    endTime: s.end_time as string,
    durationMinutes: s.duration_minutes as number,
    reason: s.reason as string,
    priority: s.priority as string,
  }));
}

// ============================================================================
// Stats & Tracking
// ============================================================================

export async function getFocusStats(days: number = 7): Promise<FocusStats> {
  const response = await apiClient.get('/api/focus/stats', {
    params: { days },
  });
  const data = response.data;
  return {
    totalFocusMinutes: data.total_focus_minutes || 0,
    totalSessions: data.total_sessions || 0,
    completedSessions: data.completed_sessions || 0,
    averageSessionMinutes: data.average_session_minutes || 0,
    totalDistractionsBlocked: data.total_distractions_blocked || 0,
    averageSuccessRate: data.average_success_rate || 0,
    currentStreak: data.current_streak || 0,
    longestStreak: data.longest_streak || 0,
    dailyStats: (data.daily_stats || []).map((d: Record<string, unknown>) => ({
      date: d.date as string,
      focusMinutes: d.focus_minutes as number,
      sessions: d.sessions as number,
      distractionsBlocked: d.distractions_blocked as number,
    })),
  };
}

export async function recordDistractionBlocked(
  blockId: string,
  appOrSite: string
): Promise<{ message: string }> {
  const response = await apiClient.post('/api/focus/distraction-blocked', {
    block_id: blockId,
    app_or_site: appOrSite,
  });
  return response.data;
}

export async function checkAutoStart(): Promise<{
  shouldStart: boolean;
  event: Record<string, unknown> | null;
}> {
  const response = await apiClient.get('/api/focus/check-auto-start');
  return {
    shouldStart: response.data.should_start,
    event: response.data.event,
  };
}

// ============================================================================
// Transform Functions (snake_case to camelCase)
// ============================================================================

function transformFocusSettings(data: Record<string, unknown>): FocusSettings {
  return {
    id: data.id as string,
    defaultBlockedApps: data.default_blocked_apps as string[],
    defaultBlockedWebsites: data.default_blocked_websites as string[],
    allowedApps: data.allowed_apps as string[],
    allowedWebsites: data.allowed_websites as string[],
    autoStartFromCalendar: data.auto_start_from_calendar as boolean,
    autoDetectGaps: data.auto_detect_gaps as boolean,
    minGapMinutes: data.min_gap_minutes as number,
    focusDurationMinutes: data.focus_duration_minutes as number,
    breakDurationMinutes: data.break_duration_minutes as number,
    longBreakDurationMinutes: data.long_break_duration_minutes as number,
    sessionsBeforeLongBreak: data.sessions_before_long_break as number,
    breakRemindersEnabled: data.break_reminders_enabled as boolean,
    blockingMode: data.blocking_mode as 'soft' | 'hard' | 'strict',
    workStartTime: data.work_start_time as string,
    workEndTime: data.work_end_time as string,
    workDays: data.work_days as number[],
    totalFocusMinutes: data.total_focus_minutes as number,
    totalDistractionsBlocked: data.total_distractions_blocked as number,
    currentStreakDays: data.current_streak_days as number,
    longestStreakDays: data.longest_streak_days as number,
  };
}

function transformFocusBlock(data: Record<string, unknown>): FocusBlock {
  return {
    id: data.id as string,
    startTime: data.start_time as string,
    endTime: data.end_time as string,
    durationMinutes: data.duration_minutes as number,
    title: data.title as string,
    status: data.status as FocusBlock['status'],
    blockingEnabled: data.blocking_enabled as boolean,
    blockedApps: data.blocked_apps as string[],
    blockedWebsites: data.blocked_websites as string[],
    completedMinutes: data.completed_minutes as number,
    successRate: data.success_rate as number | null,
    distractionsBlocked: data.distractions_blocked as number,
  };
}
