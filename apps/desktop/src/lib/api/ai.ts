import apiClient from './client';

// ============================================================================
// Types
// ============================================================================

export interface AIStatus {
  configured: boolean;
  available: boolean;
  online: boolean;
  cache_size: number;
  queue_size: number;
  rate_limited: boolean;
}

export interface ClassificationResult {
  is_productive: boolean;
  productivity_score: number;
  category: string;
  reasoning: string;
  confidence: number;
}

export interface YouTubeClassificationResult {
  category: string;
  is_productive: boolean;
  productivity_score: number;
  reasoning: string;
}

export interface DailyInsightItem {
  insight_type: string;
  title: string;
  description: string;
  icon: string;
}

export interface DailyInsights {
  date: string;
  summary: string;
  productivity_score: number;
  wins: string[];
  improvements: string[];
  tip: string;
  focus_score_explanation: string;
  insights: DailyInsightItem[];
  generated_at: string;
  ai_powered: boolean;
}

export interface WeeklyTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  insight: string;
}

export interface WeeklyGoal {
  title: string;
  description: string;
  target?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface WeeklyReport {
  week_start: string;
  week_end: string;
  executive_summary: string;
  average_productivity_score: number;
  total_productive_hours: number;
  total_tracked_hours: number;
  best_day?: string;
  productivity_trend?: 'up' | 'down' | 'stable';
  achievements: string[];
  challenges: string[];
  trends: WeeklyTrend[];
  goals: WeeklyGoal[];
  recommendations: string[];
  ai_analysis?: string;
  comparison_to_previous?: string;
  generated_at: string;
  ai_powered: boolean;
}

export interface QuickTip {
  tip: string;
  category: string;
  generated_at: string;
}

export interface QueueStatus {
  total: number;
  pending: number;
  processing: number;
  failed: number;
  requests: Array<{
    id: string;
    request_type: string;
    status: string;
    created_at: string;
  }>;
}

export interface QueueProcessResult {
  processed: number;
  failed: number;
  remaining: number;
  error?: string;
}

// ============================================================================
// API Functions
// ============================================================================

// Status
export async function getAIStatus(): Promise<AIStatus> {
  const response = await apiClient.get('/api/ai/status');
  return response.data;
}

// Classification
export async function classifyActivity(
  appName: string,
  windowTitle: string,
  url?: string,
  userContext?: string
): Promise<ClassificationResult> {
  const response = await apiClient.post('/api/ai/classify', {
    app_name: appName,
    window_title: windowTitle,
    url,
    user_context: userContext,
  });
  return response.data;
}

export async function classifyYouTubeVideo(
  videoTitle: string,
  channelName: string,
  userContext?: string
): Promise<YouTubeClassificationResult> {
  const response = await apiClient.post('/api/ai/classify/youtube', {
    video_title: videoTitle,
    channel_name: channelName,
    user_context: userContext,
  });
  return response.data;
}

// Daily Insights
export async function getDailyInsights(date?: string): Promise<DailyInsights> {
  const params = date ? { date_str: date } : {};
  const response = await apiClient.get('/api/ai/insights/daily', { params });
  return response.data;
}

export async function regenerateDailyInsights(date?: string): Promise<DailyInsights> {
  const params = date ? { date_str: date } : {};
  const response = await apiClient.post('/api/ai/insights/daily/generate', null, { params });
  return response.data;
}

// Weekly Report
export async function getWeeklyReport(weekOffset: number = 0): Promise<WeeklyReport> {
  const response = await apiClient.get('/api/ai/insights/weekly', {
    params: { week_offset: weekOffset },
  });
  return response.data;
}

export async function regenerateWeeklyReport(weekOffset: number = 0): Promise<WeeklyReport> {
  const response = await apiClient.post('/api/ai/insights/weekly/generate', null, {
    params: { week_offset: weekOffset },
  });
  return response.data;
}

// Quick Tip
export async function getQuickTip(): Promise<QuickTip> {
  const response = await apiClient.get('/api/ai/tip');
  return response.data;
}

// Queue Management
export async function getQueueStatus(): Promise<QueueStatus> {
  const response = await apiClient.get('/api/ai/queue');
  return response.data;
}

export async function processQueue(): Promise<QueueProcessResult> {
  const response = await apiClient.post('/api/ai/queue/process');
  return response.data;
}

export async function clearQueue(): Promise<{ cleared: number }> {
  const response = await apiClient.delete('/api/ai/queue');
  return response.data;
}

// Cache Management
export async function clearAICache(): Promise<{ cleared: Record<string, number> }> {
  const response = await apiClient.delete('/api/ai/cache');
  return response.data;
}
