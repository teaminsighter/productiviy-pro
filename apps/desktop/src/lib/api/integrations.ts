import apiClient from './client';

// ============================================================================
// Types
// ============================================================================

export interface Integration {
  id: number;
  type: IntegrationType;
  status: IntegrationStatus;
  externalUsername: string | null;
  workspaceName: string | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

export type IntegrationType = 'github' | 'gitlab' | 'slack' | 'linear' | 'jira' | 'vscode' | 'notion';
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

export interface AvailableIntegration {
  type: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
  comingSoon?: boolean;
}

export interface GitHubActivity {
  periodDays: number;
  totalActivities: number;
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  dailyActivity: Array<{ date: string; count: number }>;
  topRepos: Array<{ name: string; count: number }>;
}

export interface DeveloperMetrics {
  periodDays: number;
  totalCommits: number;
  totalPrs: number;
  totalReviews: number;
  totalLinesChanged: number;
  avgCommitsPerDay: number;
  dailyMetrics: Array<{
    date: string;
    commits: number;
    prsOpened: number;
    prsReviewed: number;
    linesAdded: number;
    linesDeleted: number;
  }>;
}

// ============================================================================
// API Functions
// ============================================================================

export async function getIntegrations(): Promise<Integration[]> {
  const response = await apiClient.get('/api/integrations/');
  return response.data.integrations.map(transformIntegration);
}

export async function getAvailableIntegrations(): Promise<AvailableIntegration[]> {
  const response = await apiClient.get('/api/integrations/available');
  return response.data.integrations;
}

export async function disconnectIntegration(type: IntegrationType): Promise<void> {
  await apiClient.delete(`/api/integrations/${type}`);
}

export async function toggleIntegrationSync(
  type: IntegrationType,
  enabled: boolean
): Promise<{ syncEnabled: boolean }> {
  const response = await apiClient.post(`/api/integrations/${type}/toggle-sync`, { enabled });
  return { syncEnabled: response.data.sync_enabled };
}

// GitHub
export async function startGitHubConnect(): Promise<{ authUrl: string }> {
  const response = await apiClient.get('/api/integrations/github/connect');
  return { authUrl: response.data.auth_url };
}

export async function syncGitHub(days: number = 7): Promise<{ commits: number; prs: number; issues: number }> {
  const response = await apiClient.post('/api/integrations/github/sync', null, {
    params: { days },
  });
  return response.data.stats;
}

export async function getGitHubActivity(days: number = 7): Promise<GitHubActivity> {
  const response = await apiClient.get('/api/integrations/github/activity', {
    params: { days },
  });
  return transformGitHubActivity(response.data);
}

// Slack
export async function startSlackConnect(): Promise<{ authUrl: string }> {
  const response = await apiClient.get('/api/integrations/slack/connect');
  return { authUrl: response.data.auth_url };
}

export async function setSlackStatus(
  statusText: string,
  statusEmoji: string = ':computer:',
  expirationMinutes: number = 0
): Promise<void> {
  await apiClient.post('/api/integrations/slack/status', {
    status_text: statusText,
    status_emoji: statusEmoji,
    expiration_minutes: expirationMinutes,
  });
}

export async function clearSlackStatus(): Promise<void> {
  await apiClient.delete('/api/integrations/slack/status');
}

// Developer Metrics
export async function getDeveloperMetrics(days: number = 7): Promise<DeveloperMetrics> {
  const response = await apiClient.get('/api/integrations/metrics/developer', {
    params: { days },
  });
  return transformDeveloperMetrics(response.data);
}

export async function calculateMetrics(date?: string): Promise<{ date: string; commits: number }> {
  const response = await apiClient.post('/api/integrations/metrics/calculate', null, {
    params: date ? { date } : undefined,
  });
  return {
    date: response.data.date,
    commits: response.data.commits,
  };
}

// ============================================================================
// Team GitHub Activity
// ============================================================================

export interface TeamMemberGitHubStats {
  userId: number;
  name: string;
  avatarUrl: string | null;
  commits: number;
  pullRequests: number;
  reviews: number;
  linesChanged: number;
}

export interface TeamGitHubActivity {
  periodDays: number;
  totalCommits: number;
  totalPrs: number;
  totalReviews: number;
  members: TeamMemberGitHubStats[];
  dailyActivity: Array<{ date: string; count: number }>;
}

export async function getTeamGitHubActivity(teamId: number, days: number = 7): Promise<TeamGitHubActivity> {
  const response = await apiClient.get(`/api/integrations/github/team/${teamId}`, {
    params: { days },
  });
  return transformTeamGitHubActivity(response.data);
}

function transformTeamGitHubActivity(data: Record<string, unknown>): TeamGitHubActivity {
  return {
    periodDays: data.period_days as number,
    totalCommits: data.total_commits as number,
    totalPrs: data.total_prs as number,
    totalReviews: data.total_reviews as number,
    members: (data.members as Array<Record<string, unknown>> || []).map((m) => ({
      userId: m.user_id as number,
      name: m.name as string,
      avatarUrl: m.avatar_url as string | null,
      commits: m.commits as number,
      pullRequests: m.pull_requests as number,
      reviews: m.reviews as number,
      linesChanged: m.lines_changed as number,
    })),
    dailyActivity: (data.daily_activity as Array<Record<string, unknown>> || []).map((d) => ({
      date: d.date as string,
      count: d.count as number,
    })),
  };
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformIntegration(data: Record<string, unknown>): Integration {
  return {
    id: data.id as number,
    type: data.type as IntegrationType,
    status: data.status as IntegrationStatus,
    externalUsername: data.external_username as string | null,
    workspaceName: data.workspace_name as string | null,
    syncEnabled: data.sync_enabled as boolean,
    lastSyncAt: data.last_sync_at as string | null,
    createdAt: data.created_at as string,
  };
}

function transformGitHubActivity(data: Record<string, unknown>): GitHubActivity {
  return {
    periodDays: data.period_days as number,
    totalActivities: data.total_activities as number,
    commits: data.commits as number,
    pullRequests: data.pull_requests as number,
    issues: data.issues as number,
    reviews: data.reviews as number,
    dailyActivity: (data.daily_activity as Array<Record<string, unknown>> || []).map((d) => ({
      date: d.date as string,
      count: d.count as number,
    })),
    topRepos: (data.top_repos as Array<Record<string, unknown>> || []).map((r) => ({
      name: r.name as string,
      count: r.count as number,
    })),
  };
}

function transformDeveloperMetrics(data: Record<string, unknown>): DeveloperMetrics {
  return {
    periodDays: data.period_days as number,
    totalCommits: data.total_commits as number,
    totalPrs: data.total_prs as number,
    totalReviews: data.total_reviews as number,
    totalLinesChanged: data.total_lines_changed as number,
    avgCommitsPerDay: data.avg_commits_per_day as number,
    dailyMetrics: (data.daily_metrics as Array<Record<string, unknown>> || []).map((d) => ({
      date: d.date as string,
      commits: d.commits as number,
      prsOpened: d.prs_opened as number,
      prsReviewed: d.prs_reviewed as number,
      linesAdded: d.lines_added as number,
      linesDeleted: d.lines_deleted as number,
    })),
  };
}
