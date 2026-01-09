import { apiClient } from './client';

// ============================================================================
// Types
// ============================================================================

export type GoalType = 'productive_hours' | 'category_limit' | 'focus_sessions' | 'app_specific' | 'distraction_limit';
export type GoalFrequency = 'daily' | 'weekly';
export type GoalStatus = 'on_track' | 'at_risk' | 'completed' | 'failed';

export interface Goal {
  id: number;
  name: string;
  description?: string;
  goal_type: GoalType;
  target_value: number;
  current_value: number;
  frequency: GoalFrequency;
  target_app?: string;
  target_category?: string;
  is_active: boolean;
  notifications_enabled: boolean;
  status: GoalStatus;
  progress_percentage: number;
  last_reset?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GoalCreate {
  name: string;
  description?: string;
  goal_type: GoalType;
  target_value: number;
  frequency?: GoalFrequency;
  target_app?: string;
  target_category?: string;
  notifications_enabled?: boolean;
}

export interface GoalUpdate {
  name?: string;
  description?: string;
  target_value?: number;
  is_active?: boolean;
  notifications_enabled?: boolean;
}

export interface GoalProgress {
  total_goals: number;
  completed_today: number;
  on_track: number;
  at_risk: number;
  goals: Goal[];
}

export interface Streak {
  id: number;
  streak_type: string;
  current_count: number;
  best_count: number;
  last_updated?: string;
  last_achieved_date?: string;
}

export interface Achievement {
  id: number;
  achievement_type: string;
  name: string;
  description?: string;
  icon?: string;
  earned_at?: string;
  progress: number;
  target?: number;
  is_unlocked: boolean;
  progress_percentage: number;
}

export interface StreakCalendarDay {
  date: string;
  value: number;
  achieved: boolean;
}

export interface StreakCalendar {
  days: StreakCalendarDay[];
  streak_type: string;
}

export interface FocusSession {
  id: number;
  name?: string;
  duration_planned: number;
  duration_actual?: number;
  started_at: string;
  ended_at?: string;
  was_completed: boolean;
  was_interrupted: boolean;
  interruption_count: number;
  notes?: string;
  block_distractions: boolean;
  break_reminder: boolean;
  primary_app?: string;
  primary_category?: string;
  productive_time: number;
  completion_percentage: number;
}

export interface FocusSessionCreate {
  name?: string;
  duration_planned: number;
  block_distractions?: boolean;
  break_reminder?: boolean;
}

export interface FocusSessionEnd {
  notes?: string;
  was_completed?: boolean;
}

export interface FocusStats {
  total_sessions: number;
  completed_sessions: number;
  total_focus_time: number;
  average_session_length: number;
  completion_rate: number;
  best_day?: string;
  best_day_time: number;
  today_sessions: number;
  today_focus_time: number;
  week_sessions: number;
  week_focus_time: number;
  current_streak: number;
}

// ============================================================================
// Goals API Functions
// ============================================================================

export async function fetchGoals(activeOnly: boolean = true): Promise<Goal[]> {
  const response = await apiClient.get('/api/goals/', {
    params: { active_only: activeOnly },
  });
  return response.data;
}

export async function fetchGoal(goalId: number): Promise<Goal> {
  const response = await apiClient.get(`/api/goals/${goalId}`);
  return response.data;
}

export async function createGoal(goal: GoalCreate): Promise<Goal> {
  const response = await apiClient.post('/api/goals/', goal);
  return response.data;
}

export async function updateGoal(goalId: number, goal: GoalUpdate): Promise<Goal> {
  const response = await apiClient.put(`/api/goals/${goalId}`, goal);
  return response.data;
}

export async function deleteGoal(goalId: number): Promise<{ status: string; id: number }> {
  const response = await apiClient.delete(`/api/goals/${goalId}`);
  return response.data;
}

export async function fetchGoalProgress(): Promise<GoalProgress> {
  const response = await apiClient.get('/api/goals/progress/summary');
  return response.data;
}

export async function updateGoalProgress(goalId: number, value: number): Promise<Goal> {
  const response = await apiClient.post(`/api/goals/${goalId}/progress`, null, {
    params: { value },
  });
  return response.data;
}

// ============================================================================
// Streaks API Functions
// ============================================================================

export async function fetchStreaks(): Promise<Streak[]> {
  const response = await apiClient.get('/api/goals/streaks/');
  return response.data;
}

export async function fetchStreak(streakType: string): Promise<Streak> {
  const response = await apiClient.get(`/api/goals/streaks/${streakType}`);
  return response.data;
}

export async function fetchStreakCalendar(
  streakType: string,
  days: number = 365
): Promise<StreakCalendar> {
  const response = await apiClient.get(`/api/goals/streaks/${streakType}/calendar`, {
    params: { days },
  });
  return response.data;
}

// ============================================================================
// Achievements API Functions
// ============================================================================

export async function fetchAchievements(): Promise<Achievement[]> {
  const response = await apiClient.get('/api/goals/achievements/');
  return response.data;
}

export async function fetchAchievement(achievementType: string): Promise<Achievement> {
  const response = await apiClient.get(`/api/goals/achievements/${achievementType}`);
  return response.data;
}

// ============================================================================
// Focus Session API Functions
// ============================================================================

export async function startFocusSession(session: FocusSessionCreate): Promise<FocusSession> {
  const response = await apiClient.post('/api/goals/focus/start', session);
  return response.data;
}

export async function getActiveFocusSession(): Promise<FocusSession | null> {
  const response = await apiClient.get('/api/goals/focus/active');
  return response.data;
}

export async function endFocusSession(endData: FocusSessionEnd): Promise<FocusSession> {
  const response = await apiClient.post('/api/goals/focus/end', endData);
  return response.data;
}

export async function recordInterruption(sessionId: number): Promise<{ status: string; interruption_count: number }> {
  const response = await apiClient.post(`/api/goals/focus/${sessionId}/interrupt`);
  return response.data;
}

export async function fetchFocusHistory(limit: number = 50, days: number = 30): Promise<FocusSession[]> {
  const response = await apiClient.get('/api/goals/focus/history', {
    params: { limit, days },
  });
  return response.data;
}

export async function fetchFocusStats(): Promise<FocusStats> {
  const response = await apiClient.get('/api/goals/focus/stats');
  return response.data;
}
