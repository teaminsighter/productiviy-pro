/**
 * Work Sessions API Client
 * For freelancer time tracking with verified work time
 */
import { apiClient } from './client';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface WorkSession {
  id: string;
  userId: number;
  projectName: string | null;
  taskDescription: string | null;
  clientName: string | null;
  startedAt: string;
  endedAt: string | null;
  totalDuration: number;
  activeDuration: number;
  idleDuration: number;
  pausedDuration: number;
  activityLevel: number;
  productivityScore: number;
  screenshotCount: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  notes: string | null;
}

export interface StartSessionRequest {
  projectName?: string;
  taskDescription?: string;
  clientName?: string;
}

export interface EndSessionRequest {
  notes?: string;
}

export interface SessionSummary {
  period: string;
  periodStart: string;
  totalSessions: number;
  totalTime: number;
  totalTimeFormatted: string;
  billableTime: number;
  billableTimeFormatted: string;
  totalScreenshots: number;
  byDay: Record<string, { sessions: number; totalTime: number; billableTime: number }>;
  byClient: Record<string, { sessions: number; totalTime: number }>;
}

export interface ClientReport {
  periodStart: string;
  periodEnd: string;
  clientName: string | null;
  projectName: string | null;
  summary: {
    totalSessions: number;
    totalTime: number;
    billableTime: number;
    idleTime: number;
    pausedTime: number;
    averageActivityLevel: number;
    averageProductivity: number;
    screenshotCount: number;
  };
  sessions: WorkSession[];
}

// ═══════════════════════════════════════════════════════════════════
// Transform Functions (snake_case to camelCase)
// ═══════════════════════════════════════════════════════════════════

function transformWorkSession(data: Record<string, unknown>): WorkSession {
  return {
    id: data.id as string,
    userId: data.user_id as number,
    projectName: data.project_name as string | null,
    taskDescription: data.task_description as string | null,
    clientName: data.client_name as string | null,
    startedAt: data.started_at as string,
    endedAt: data.ended_at as string | null,
    totalDuration: data.total_duration as number,
    activeDuration: data.active_duration as number,
    idleDuration: data.idle_duration as number,
    pausedDuration: data.paused_duration as number,
    activityLevel: data.activity_level as number,
    productivityScore: data.productivity_score as number,
    screenshotCount: data.screenshot_count as number,
    status: data.status as WorkSession['status'],
    notes: data.notes as string | null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Session Control API
// ═══════════════════════════════════════════════════════════════════

export async function startWorkSession(request: StartSessionRequest): Promise<WorkSession> {
  const response = await apiClient.post('/api/work-sessions/start', {
    project_name: request.projectName,
    task_description: request.taskDescription,
    client_name: request.clientName,
  });
  return transformWorkSession(response.data);
}

export async function endWorkSession(notes?: string): Promise<WorkSession> {
  const response = await apiClient.post('/api/work-sessions/end', {
    notes: notes,
  });
  return transformWorkSession(response.data);
}

export async function pauseWorkSession(): Promise<{ status: string; sessionId: string }> {
  const response = await apiClient.post('/api/work-sessions/pause');
  return {
    status: response.data.status,
    sessionId: response.data.session_id,
  };
}

export async function resumeWorkSession(): Promise<{ status: string; sessionId: string }> {
  const response = await apiClient.post('/api/work-sessions/resume');
  return {
    status: response.data.status,
    sessionId: response.data.session_id,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Session Queries
// ═══════════════════════════════════════════════════════════════════

export async function getCurrentWorkSession(): Promise<WorkSession | null> {
  const response = await apiClient.get('/api/work-sessions/current');
  return response.data ? transformWorkSession(response.data) : null;
}

export async function getWorkSessions(params?: {
  dateFrom?: string;
  dateTo?: string;
  clientName?: string;
  projectName?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<WorkSession[]> {
  const response = await apiClient.get('/api/work-sessions/', {
    params: {
      date_from: params?.dateFrom,
      date_to: params?.dateTo,
      client_name: params?.clientName,
      project_name: params?.projectName,
      status: params?.status,
      limit: params?.limit || 50,
      offset: params?.offset || 0,
    },
  });
  return (response.data as Record<string, unknown>[]).map(transformWorkSession);
}

// ═══════════════════════════════════════════════════════════════════
// Reports
// ═══════════════════════════════════════════════════════════════════

export async function getSessionSummary(
  period: 'today' | 'week' | 'month' = 'week'
): Promise<SessionSummary> {
  const response = await apiClient.get('/api/work-sessions/report/summary', {
    params: { period },
  });
  return {
    period: response.data.period,
    periodStart: response.data.period_start,
    totalSessions: response.data.total_sessions,
    totalTime: response.data.total_time,
    totalTimeFormatted: response.data.total_time_formatted,
    billableTime: response.data.billable_time,
    billableTimeFormatted: response.data.billable_time_formatted,
    totalScreenshots: response.data.total_screenshots,
    byDay: response.data.by_day,
    byClient: response.data.by_client,
  };
}

export async function getClientReport(params: {
  clientName?: string;
  projectName?: string;
  dateFrom: string;
  dateTo: string;
}): Promise<ClientReport> {
  const response = await apiClient.get('/api/work-sessions/report/client', {
    params: {
      client_name: params.clientName,
      project_name: params.projectName,
      date_from: params.dateFrom,
      date_to: params.dateTo,
    },
  });
  return {
    periodStart: response.data.period_start,
    periodEnd: response.data.period_end,
    clientName: response.data.client_name,
    projectName: response.data.project_name,
    summary: {
      totalSessions: response.data.summary.total_sessions,
      totalTime: response.data.summary.total_time,
      billableTime: response.data.summary.billable_time,
      idleTime: response.data.summary.idle_time,
      pausedTime: response.data.summary.paused_time,
      averageActivityLevel: response.data.summary.average_activity_level,
      averageProductivity: response.data.summary.average_productivity,
      screenshotCount: response.data.summary.screenshot_count,
    },
    sessions: (response.data.sessions as Record<string, unknown>[]).map(transformWorkSession),
  };
}

// ═══════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatDurationLong(seconds: number): string {
  if (!seconds || seconds < 0) return '00:00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
