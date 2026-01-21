import apiClient from './client';

// ============================================================================
// Types
// ============================================================================

export interface TeamReportPreview {
  teamName: string;
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  memberCount: number;
  avgDeepWorkScore: number;
  avgProductiveHours: number;
  avgMeetingHours: number;
  avgProductivityPercentage: number;
  totalTeamHours: number;
  topPerformers: TeamMemberMetric[];
  needsAttention: TeamMemberMetric[];
  teamTrends: {
    scoreTrend: number;
    productivityTrend: number;
  };
  categoryBreakdown: CategoryItem[];
  insights: string[];
  recommendations: string[];
}

export interface TeamMemberMetric {
  userId: number;
  name: string;
  role: string;
  deepWorkScore: number;
  productiveHours: number;
  meetingHours: number;
  productivityPercentage: number;
  totalHours: number;
}

export interface CategoryItem {
  category: string;
  hours: number;
  percentage: number;
}

export interface TeamMemberReport {
  teamId: number;
  teamName: string;
  userId: number;
  name: string;
  role: string;
  period: string;
  startDate: string;
  endDate: string;
  metrics: {
    deepWorkScore: number;
    productiveHours: number;
    meetingHours: number;
    totalHours: number;
    productivityPercentage: number;
  };
  dailyStats: Array<{
    date: string;
    dayName: string;
    productiveHours: number;
    meetingHours: number;
    totalHours: number;
  }>;
  categoryBreakdown: CategoryItem[];
  topApps: Array<{
    name: string;
    hours: number;
    isProductive: boolean;
  }>;
  insights: string[];
  recommendations: string[];
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';
export type ReportFormat = 'pdf' | 'json';

// ============================================================================
// API Functions
// ============================================================================

export async function getTeamReportPreview(
  teamId: number,
  period: ReportPeriod = 'weekly',
  startDate?: string,
  endDate?: string
): Promise<TeamReportPreview> {
  const response = await apiClient.get(`/api/reports/team/${teamId}/preview`, {
    params: { period, start_date: startDate, end_date: endDate },
  });
  return transformTeamReportPreview(response.data);
}

export async function downloadTeamReport(
  teamId: number,
  period: ReportPeriod = 'weekly',
  format: ReportFormat = 'json',
  startDate?: string,
  endDate?: string
): Promise<TeamReportPreview | Blob> {
  const response = await apiClient.get(`/api/reports/team/${teamId}/download`, {
    params: { period, format, start_date: startDate, end_date: endDate },
    responseType: format === 'pdf' ? 'blob' : 'json',
  });

  if (format === 'pdf') {
    return response.data as Blob;
  }

  return transformTeamReportPreview(response.data);
}

export async function getTeamMemberReport(
  teamId: number,
  userId: number,
  period: ReportPeriod = 'weekly',
  startDate?: string,
  endDate?: string
): Promise<TeamMemberReport> {
  const response = await apiClient.get(`/api/reports/team/${teamId}/members/${userId}`, {
    params: { period, start_date: startDate, end_date: endDate },
  });
  return transformTeamMemberReport(response.data);
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformTeamReportPreview(data: Record<string, unknown>): TeamReportPreview {
  const trends = data.team_trends as Record<string, unknown> || {};

  return {
    teamName: data.team_name as string,
    period: data.period as 'daily' | 'weekly' | 'monthly',
    startDate: data.start_date as string,
    endDate: data.end_date as string,
    memberCount: data.member_count as number,
    avgDeepWorkScore: data.avg_deep_work_score as number,
    avgProductiveHours: data.avg_productive_hours as number,
    avgMeetingHours: data.avg_meeting_hours as number,
    avgProductivityPercentage: data.avg_productivity_percentage as number,
    totalTeamHours: data.total_team_hours as number,
    topPerformers: ((data.top_performers as Array<Record<string, unknown>>) || []).map(transformMemberMetric),
    needsAttention: ((data.needs_attention as Array<Record<string, unknown>>) || []).map(transformMemberMetric),
    teamTrends: {
      scoreTrend: trends.score_trend as number || 0,
      productivityTrend: trends.productivity_trend as number || 0,
    },
    categoryBreakdown: ((data.category_breakdown as Array<Record<string, unknown>>) || []).map((c) => ({
      category: c.category as string,
      hours: c.hours as number,
      percentage: c.percentage as number,
    })),
    insights: (data.insights as string[]) || [],
    recommendations: (data.recommendations as string[]) || [],
  };
}

function transformMemberMetric(m: Record<string, unknown>): TeamMemberMetric {
  return {
    userId: m.user_id as number,
    name: m.name as string,
    role: m.role as string,
    deepWorkScore: m.deep_work_score as number,
    productiveHours: m.productive_hours as number,
    meetingHours: m.meeting_hours as number,
    productivityPercentage: m.productivity_percentage as number,
    totalHours: m.total_hours as number,
  };
}

function transformTeamMemberReport(data: Record<string, unknown>): TeamMemberReport {
  const metrics = data.metrics as Record<string, unknown> || {};

  return {
    teamId: data.team_id as number,
    teamName: data.team_name as string,
    userId: data.user_id as number,
    name: data.name as string,
    role: data.role as string,
    period: data.period as string,
    startDate: data.start_date as string,
    endDate: data.end_date as string,
    metrics: {
      deepWorkScore: metrics.deep_work_score as number,
      productiveHours: metrics.productive_hours as number,
      meetingHours: metrics.meeting_hours as number,
      totalHours: metrics.total_hours as number,
      productivityPercentage: metrics.productivity_percentage as number,
    },
    dailyStats: ((data.daily_stats as Array<Record<string, unknown>>) || []).map((d) => ({
      date: d.date as string,
      dayName: d.day_name as string,
      productiveHours: d.productive_hours as number,
      meetingHours: d.meeting_hours as number,
      totalHours: d.total_hours as number,
    })),
    categoryBreakdown: ((data.category_breakdown as Array<Record<string, unknown>>) || []).map((c) => ({
      category: c.category as string,
      hours: c.hours as number,
      percentage: c.percentage as number,
    })),
    topApps: ((data.top_apps as Array<Record<string, unknown>>) || []).map((a) => ({
      name: a.name as string,
      hours: a.hours as number,
      isProductive: a.is_productive as boolean,
    })),
    insights: (data.insights as string[]) || [],
    recommendations: (data.recommendations as string[]) || [],
  };
}
