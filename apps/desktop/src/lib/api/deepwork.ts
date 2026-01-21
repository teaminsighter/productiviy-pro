/**
 * Deep Work API client for productivity analytics
 */
import { apiClient } from './client';

// Types
export interface DeepWorkScore {
  id: string;
  date: string;
  deep_work_score: number;
  deep_work_minutes: number;
  deep_work_hours: number;
  total_tracked_minutes: number;
  total_meeting_minutes: number;
  meeting_count: number;
  meeting_load_percent: number;
  fragmentation_score: number;
  context_switches: number;
  longest_focus_block_minutes: number;
  average_focus_block_minutes: number;
  focus_blocks_count: number;
  productive_minutes: number;
  neutral_minutes: number;
  distracting_minutes: number;
  focus_efficiency: number;
  work_start_time: string | null;
  work_end_time: string | null;
  best_focus_hour: number | null;
  vs_yesterday: number | null;
  vs_week_avg: number | null;
  vs_month_avg: number | null;
  ai_summary: string | null;
  ai_recommendations: string[];
}

export interface TodayScore {
  deep_work_score: number;
  deep_work_hours: number;
  meeting_hours: number;
  fragmentation_score: number;
  longest_focus_block: number;
  focus_efficiency: number;
  vs_yesterday: number | null;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  message: string;
}

export interface WeeklySummary {
  week_start: string;
  week_end: string;
  avg_deep_work_score: number;
  total_deep_work_hours: number;
  total_meeting_hours: number;
  avg_fragmentation: number;
  avg_focus_efficiency: number;
  best_day: { date: string; score: number } | null;
  worst_day: { date: string; score: number } | null;
  days_tracked: number;
  daily_scores: Array<{
    date: string;
    deep_work_score: number;
    deep_work_hours: number;
    meeting_hours: number;
    fragmentation_score: number;
  }>;
}

export interface ChartData {
  daily_breakdown: Array<{
    date: string;
    full_date: string;
    deep_work: number;
    meetings: number;
    other: number;
  }>;
  productivity_trend: Array<{
    date: string;
    full_date: string;
    score: number;
    fragmentation: number;
  }>;
  category_distribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  meeting_heatmap: Array<{
    day: number;
    hour: number;
    meetings: number;
  }>;
}

export interface DeepWorkInsights {
  summary: string;
  insights: Array<{
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
  }>;
  recommendations: string[];
}

export interface PeriodComparison {
  period1: {
    start: string;
    end: string;
    days: number;
    avg_score: number;
    avg_deep_work_hours: number;
    avg_meeting_hours: number;
    avg_fragmentation: number;
  };
  period2: {
    start: string;
    end: string;
    days: number;
    avg_score: number;
    avg_deep_work_hours: number;
    avg_meeting_hours: number;
    avg_fragmentation: number;
  };
  comparison: {
    score_change: number;
    deep_work_change: number;
    meeting_change: number;
    fragmentation_change: number;
  };
}

// API Functions

/**
 * Get today's deep work score (for dashboard widget)
 */
export async function getTodayScore(): Promise<TodayScore> {
  const response = await apiClient.get('/api/deepwork/score/today');
  return response.data;
}

/**
 * Get deep work score for a specific date
 */
export async function getScoreForDate(date: string): Promise<DeepWorkScore> {
  const response = await apiClient.get(`/api/deepwork/score/${date}`);
  return response.data;
}

/**
 * Force recalculation of deep work score for a date
 */
export async function calculateScoreForDate(date: string): Promise<DeepWorkScore> {
  const response = await apiClient.post(`/api/deepwork/score/${date}/calculate`);
  return response.data;
}

/**
 * Get deep work scores for a date range
 */
export async function getScoresRange(
  startDate: string,
  endDate: string
): Promise<DeepWorkScore[]> {
  const response = await apiClient.get(
    `/api/deepwork/scores?start_date=${startDate}&end_date=${endDate}`
  );
  return response.data;
}

/**
 * Get weekly summary
 */
export async function getWeeklySummary(weekOffset: number = 0): Promise<WeeklySummary> {
  const response = await apiClient.get(`/api/deepwork/weekly?week_offset=${weekOffset}`);
  return response.data;
}

/**
 * Get chart data for visualizations
 */
export async function getChartData(days: number = 7): Promise<ChartData> {
  const response = await apiClient.get(`/api/deepwork/charts?days=${days}`);
  return response.data;
}

/**
 * Get AI-powered deep work insights
 */
export async function getDeepWorkInsights(): Promise<DeepWorkInsights> {
  const response = await apiClient.get('/api/deepwork/insights');
  return response.data;
}

/**
 * Compare two time periods
 */
export async function comparePeriods(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string
): Promise<PeriodComparison> {
  const params = new URLSearchParams({
    period1_start: period1Start,
    period1_end: period1End,
    period2_start: period2Start,
    period2_end: period2End,
  });
  const response = await apiClient.get(`/api/deepwork/compare?${params}`);
  return response.data;
}
