import apiClient from './client';

// ============================================================================
// Types
// ============================================================================

export interface TeamDashboardSummary {
  avgDeepWorkScore: number;
  avgDeepWorkMinutes: number;
  avgMeetingLoad: number;
  memberCount: number;
  membersWithDeepWork: number;
  membersOverMeeting: number;
  needsAttention: number;
  trend: 'improving' | 'declining' | 'stable';
  vsYesterday: number;
}

export interface TeamPeriodStats {
  days: number;
  avgScore: number;
  avgDeepWorkMinutes: number;
  avgMeetingMinutes: number;
}

export interface TeamDailyScore {
  date: string;
  score: number;
  deepWorkMinutes: number;
  meetingMinutes: number;
  memberCount: number;
}

export interface TeamMemberMetrics {
  userId: number;
  name: string;
  avatarUrl: string | null;
  avgScore: number;
  avgDeepWorkMinutes: number;
  avgMeetingLoad: number;
  role: string;
}

export interface TeamAlert {
  id: string;
  type: 'over_meeting' | 'focus_deficit' | 'meeting_suggestion' | 'focus_improvement' | 'team_trend';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  targetUserId: number | null;
  suggestion: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface MeetingFreeZone {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isEnforced: boolean;
  notificationEnabled: boolean;
  isActive: boolean;
}

export interface SchedulingSuggestion {
  id: string;
  suggestionType: string;
  suggestedStart: string;
  suggestedEnd: string;
  dayOfWeek: number | null;
  reason: string;
  impactScore: number;
  availabilityScore: number;
}

export interface TeamDashboardData {
  summary: TeamDashboardSummary;
  periodStats: TeamPeriodStats;
  dailyScores: TeamDailyScore[];
  distributions: {
    score: Record<string, number>;
    meetingLoad: Record<string, number>;
  };
  members: TeamMemberMetrics[];
  alerts: TeamAlert[];
  meetingFreeZones: MeetingFreeZone[];
}

export interface MemberDetailData {
  userId: number;
  name: string;
  avatarUrl: string | null;
  role: string;
  periodDays: number;
  summary: {
    avgScore: number;
    avgDeepWorkMinutes: number;
    avgMeetingLoad: number;
    avgFragmentation: number;
  };
  dailyScores: Array<{
    date: string;
    score: number;
    deepWorkMinutes: number;
    meetingMinutes: number;
    meetingLoad: number;
    fragmentation: number;
  }>;
}

// ============================================================================
// API Functions
// ============================================================================

export async function getTeamDashboard(
  teamId: number,
  days: number = 7
): Promise<TeamDashboardData> {
  const response = await apiClient.get(`/api/teams/${teamId}/deepwork/dashboard`, {
    params: { days },
  });
  return transformDashboardData(response.data);
}

export async function calculateTeamScore(
  teamId: number,
  date?: string
): Promise<{ status: string; date: string; avgScore: number; memberCount: number }> {
  const response = await apiClient.post(`/api/teams/${teamId}/deepwork/calculate`, null, {
    params: date ? { date } : undefined,
  });
  return response.data;
}

export async function getMemberInsights(
  teamId: number,
  days: number = 7
): Promise<{ members: TeamMemberMetrics[]; periodDays: number }> {
  const response = await apiClient.get(`/api/teams/${teamId}/deepwork/members`, {
    params: { days },
  });
  return {
    members: response.data.members.map(transformMemberMetrics),
    periodDays: response.data.period_days,
  };
}

export async function getMemberDetail(
  teamId: number,
  userId: number,
  days: number = 7
): Promise<MemberDetailData> {
  const response = await apiClient.get(`/api/teams/${teamId}/deepwork/members/${userId}`, {
    params: { days },
  });
  return transformMemberDetail(response.data);
}

// ============================================================================
// Alerts API
// ============================================================================

export async function getTeamAlerts(teamId: number): Promise<TeamAlert[]> {
  const response = await apiClient.get(`/api/teams/${teamId}/deepwork/alerts`);
  return response.data.map(transformAlert);
}

export async function generateAlerts(
  teamId: number
): Promise<{ generated: number; alerts: Array<{ id: string; type: string; title: string }> }> {
  const response = await apiClient.post(`/api/teams/${teamId}/deepwork/alerts/generate`);
  return response.data;
}

export async function dismissAlert(teamId: number, alertId: string): Promise<void> {
  await apiClient.post(`/api/teams/${teamId}/deepwork/alerts/${alertId}/dismiss`);
}

export async function markAlertRead(teamId: number, alertId: string): Promise<void> {
  await apiClient.post(`/api/teams/${teamId}/deepwork/alerts/${alertId}/read`);
}

// ============================================================================
// Meeting-Free Zones API
// ============================================================================

export async function getMeetingFreeZones(teamId: number): Promise<MeetingFreeZone[]> {
  const response = await apiClient.get(`/api/teams/${teamId}/deepwork/zones`);
  return response.data.map(transformZone);
}

export async function createMeetingFreeZone(
  teamId: number,
  zone: {
    name: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    isEnforced?: boolean;
  }
): Promise<MeetingFreeZone> {
  const response = await apiClient.post(`/api/teams/${teamId}/deepwork/zones`, {
    name: zone.name,
    start_time: zone.startTime,
    end_time: zone.endTime,
    days_of_week: zone.daysOfWeek,
    is_enforced: zone.isEnforced || false,
  });
  return transformZone(response.data);
}

export async function deleteMeetingFreeZone(teamId: number, zoneId: string): Promise<void> {
  await apiClient.delete(`/api/teams/${teamId}/deepwork/zones/${zoneId}`);
}

// ============================================================================
// Scheduling Suggestions API
// ============================================================================

export async function getSchedulingSuggestions(teamId: number): Promise<SchedulingSuggestion[]> {
  const response = await apiClient.get(`/api/teams/${teamId}/deepwork/suggestions`);
  return response.data.map(transformSuggestion);
}

export async function generateSchedulingSuggestions(
  teamId: number
): Promise<{ generated: number; suggestions: Array<{ id: string; type: string; reason: string }> }> {
  const response = await apiClient.post(`/api/teams/${teamId}/deepwork/suggestions/generate`);
  return response.data;
}

export async function dismissSuggestion(teamId: number, suggestionId: string): Promise<void> {
  await apiClient.post(`/api/teams/${teamId}/deepwork/suggestions/${suggestionId}/dismiss`);
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformDashboardData(data: Record<string, unknown>): TeamDashboardData {
  const summary = data.summary as Record<string, unknown>;
  const periodStats = data.period_stats as Record<string, unknown>;

  return {
    summary: {
      avgDeepWorkScore: summary.avg_deep_work_score as number,
      avgDeepWorkMinutes: summary.avg_deep_work_minutes as number,
      avgMeetingLoad: summary.avg_meeting_load as number,
      memberCount: summary.member_count as number,
      membersWithDeepWork: summary.members_with_deep_work as number,
      membersOverMeeting: summary.members_over_meeting as number,
      needsAttention: summary.needs_attention as number,
      trend: summary.trend as 'improving' | 'declining' | 'stable',
      vsYesterday: summary.vs_yesterday as number,
    },
    periodStats: {
      days: periodStats.days as number,
      avgScore: periodStats.avg_score as number,
      avgDeepWorkMinutes: periodStats.avg_deep_work_minutes as number,
      avgMeetingMinutes: periodStats.avg_meeting_minutes as number,
    },
    dailyScores: ((data.daily_scores as Array<Record<string, unknown>>) || []).map((d) => ({
      date: d.date as string,
      score: d.score as number,
      deepWorkMinutes: d.deep_work_minutes as number,
      meetingMinutes: d.meeting_minutes as number,
      memberCount: d.member_count as number,
    })),
    distributions: {
      score: (data.distributions as Record<string, unknown>)?.score as Record<string, number> || {},
      meetingLoad: (data.distributions as Record<string, unknown>)?.meeting_load as Record<string, number> || {},
    },
    members: ((data.members as Array<Record<string, unknown>>) || []).map(transformMemberMetrics),
    alerts: ((data.alerts as Array<Record<string, unknown>>) || []).map(transformAlert),
    meetingFreeZones: ((data.meeting_free_zones as Array<Record<string, unknown>>) || []).map(transformZone),
  };
}

function transformMemberMetrics(m: Record<string, unknown>): TeamMemberMetrics {
  return {
    userId: m.user_id as number,
    name: m.name as string,
    avatarUrl: m.avatar_url as string | null,
    avgScore: m.avg_score as number,
    avgDeepWorkMinutes: m.avg_deep_work_minutes as number,
    avgMeetingLoad: m.avg_meeting_load as number,
    role: m.role as string,
  };
}

function transformMemberDetail(data: Record<string, unknown>): MemberDetailData {
  const summary = data.summary as Record<string, unknown>;
  return {
    userId: data.user_id as number,
    name: data.name as string,
    avatarUrl: data.avatar_url as string | null,
    role: data.role as string,
    periodDays: data.period_days as number,
    summary: {
      avgScore: summary.avg_score as number,
      avgDeepWorkMinutes: summary.avg_deep_work_minutes as number,
      avgMeetingLoad: summary.avg_meeting_load as number,
      avgFragmentation: summary.avg_fragmentation as number,
    },
    dailyScores: ((data.daily_scores as Array<Record<string, unknown>>) || []).map((d) => ({
      date: d.date as string,
      score: d.score as number,
      deepWorkMinutes: d.deep_work_minutes as number,
      meetingMinutes: d.meeting_minutes as number,
      meetingLoad: d.meeting_load as number,
      fragmentation: d.fragmentation as number,
    })),
  };
}

function transformAlert(a: Record<string, unknown>): TeamAlert {
  return {
    id: a.id as string,
    type: a.type as TeamAlert['type'],
    priority: a.priority as TeamAlert['priority'],
    title: a.title as string,
    message: a.message as string,
    targetUserId: a.target_user_id as number | null,
    suggestion: a.suggestion as string | null,
    isRead: a.is_read as boolean,
    createdAt: a.created_at as string,
  };
}

function transformZone(z: Record<string, unknown>): MeetingFreeZone {
  return {
    id: z.id as string,
    name: z.name as string,
    startTime: z.start_time as string,
    endTime: z.end_time as string,
    daysOfWeek: z.days_of_week as number[],
    isEnforced: z.is_enforced as boolean,
    notificationEnabled: z.notification_enabled as boolean,
    isActive: z.is_active as boolean,
  };
}

function transformSuggestion(s: Record<string, unknown>): SchedulingSuggestion {
  return {
    id: s.id as string,
    suggestionType: s.suggestion_type as string,
    suggestedStart: s.suggested_start as string,
    suggestedEnd: s.suggested_end as string,
    dayOfWeek: s.day_of_week as number | null,
    reason: s.reason as string,
    impactScore: s.impact_score as number,
    availabilityScore: s.availability_score as number,
  };
}
