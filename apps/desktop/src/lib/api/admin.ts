import apiClient from './client';

// ============================================================================
// Types
// ============================================================================

export interface AdminStats {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  newUsersToday: number;
  newUsersWeek: number;
  totalTeams: number;
  totalActivities: number;
  revenueMtd: number;
  userGrowthPercent: number;
  planDistribution: Record<string, number>;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface ChartData {
  userSignups: ChartDataPoint[];
  activeUsers: ChartDataPoint[];
}

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: string;
  isActive: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  subscriptionStatus: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  teamCount: number;
}

export interface AdminUserDetail extends AdminUser {
  authProvider: string;
  stripeCustomerId: string | null;
  trialEndsAt: string | null;
  totalActivities: number;
  totalScreenshots: number;
  teams: Array<{
    id: number;
    name: string;
    role: string;
  }>;
}

export interface AdminTeam {
  id: number;
  name: string;
  ownerId: number;
  ownerEmail: string;
  memberCount: number;
  plan: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminTeamDetail {
  id: number;
  name: string;
  description: string | null;
  owner: {
    id: number;
    email: string;
    name: string | null;
  };
  members: Array<{
    id: number;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    joinedAt: string | null;
  }>;
  memberCount: number;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  userId: number;
  userEmail: string;
  appName: string;
  windowTitle: string | null;
  duration: number;
  timestamp: string;
}

export interface OnlineUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  lastActive: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ============================================================================
// Stats API
// ============================================================================

export async function getAdminStats(): Promise<AdminStats> {
  const response = await apiClient.get('/api/admin/stats');
  return {
    totalUsers: response.data.total_users,
    activeUsers24h: response.data.active_users_24h,
    activeUsers7d: response.data.active_users_7d,
    newUsersToday: response.data.new_users_today,
    newUsersWeek: response.data.new_users_week,
    totalTeams: response.data.total_teams,
    totalActivities: response.data.total_activities,
    revenueMtd: response.data.revenue_mtd,
    userGrowthPercent: response.data.user_growth_percent,
    planDistribution: response.data.plan_distribution,
  };
}

export async function getChartData(days: number = 30): Promise<ChartData> {
  const response = await apiClient.get('/api/admin/stats/chart-data', {
    params: { days },
  });
  return {
    userSignups: response.data.user_signups,
    activeUsers: response.data.active_users,
  };
}

// ============================================================================
// User Management API
// ============================================================================

export async function getAdminUsers(params: {
  search?: string;
  plan?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AdminUser>> {
  const response = await apiClient.get('/api/admin/users', {
    params: {
      search: params.search,
      plan: params.plan,
      status: params.status,
      sort_by: params.sortBy,
      sort_order: params.sortOrder,
      page: params.page || 1,
      limit: params.limit || 20,
    },
  });

  return {
    items: response.data.users.map((u: Record<string, unknown>) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatar_url,
      plan: u.plan,
      isActive: u.is_active,
      isVerified: u.is_verified,
      isAdmin: u.is_admin,
      subscriptionStatus: u.subscription_status,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
      teamCount: u.team_count,
    })),
    total: response.data.total,
    page: response.data.page,
    limit: response.data.limit,
    pages: response.data.pages,
  };
}

export async function getAdminUserDetail(userId: number): Promise<AdminUserDetail> {
  const response = await apiClient.get(`/api/admin/users/${userId}`);
  const u = response.data;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatar_url,
    plan: u.plan,
    isActive: u.is_active,
    isVerified: u.is_verified,
    isAdmin: u.is_admin,
    authProvider: u.auth_provider,
    subscriptionStatus: u.subscription_status,
    stripeCustomerId: u.stripe_customer_id,
    trialEndsAt: u.trial_ends_at,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    totalActivities: u.total_activities,
    totalScreenshots: u.total_screenshots,
    teams: u.teams,
    teamCount: u.teams?.length || 0,
  };
}

export async function updateAdminUser(
  userId: number,
  data: {
    isActive?: boolean;
    isAdmin?: boolean;
    plan?: string;
  }
): Promise<void> {
  await apiClient.put(`/api/admin/users/${userId}`, {
    is_active: data.isActive,
    is_admin: data.isAdmin,
    plan: data.plan,
  });
}

export async function deleteAdminUser(userId: number): Promise<void> {
  await apiClient.delete(`/api/admin/users/${userId}`);
}

// ============================================================================
// Team Management API
// ============================================================================

export async function getAdminTeams(params: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AdminTeam>> {
  const response = await apiClient.get('/api/admin/teams', {
    params: {
      search: params.search,
      page: params.page || 1,
      limit: params.limit || 20,
    },
  });

  return {
    items: response.data.teams.map((t: Record<string, unknown>) => ({
      id: t.id,
      name: t.name,
      ownerId: t.owner_id,
      ownerEmail: t.owner_email,
      memberCount: t.member_count,
      plan: t.plan,
      isActive: t.is_active,
      createdAt: t.created_at,
    })),
    total: response.data.total,
    page: response.data.page,
    limit: response.data.limit,
    pages: response.data.pages,
  };
}

export async function getAdminTeamDetail(teamId: number): Promise<AdminTeamDetail> {
  const response = await apiClient.get(`/api/admin/teams/${teamId}`);
  const t = response.data;
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    owner: t.owner,
    members: t.members.map((m: Record<string, unknown>) => ({
      id: m.id,
      email: m.email,
      name: m.name,
      avatarUrl: m.avatar_url,
      role: m.role,
      joinedAt: m.joined_at,
    })),
    memberCount: t.member_count,
    createdAt: t.created_at,
  };
}

// ============================================================================
// Activity Logs API
// ============================================================================

export async function getActivityLogs(params?: {
  userId?: number;
  limit?: number;
}): Promise<ActivityLog[]> {
  const response = await apiClient.get('/api/admin/activity-logs', {
    params: {
      user_id: params?.userId,
      limit: params?.limit || 50,
    },
  });

  return response.data.activities.map((a: Record<string, unknown>) => ({
    id: a.id,
    userId: a.user_id,
    userEmail: a.user_email,
    appName: a.app_name,
    windowTitle: a.window_title,
    duration: a.duration,
    timestamp: a.timestamp,
  }));
}

// ============================================================================
// Online Users API
// ============================================================================

export async function getOnlineUsers(): Promise<{
  onlineCount: number;
  users: OnlineUser[];
}> {
  const response = await apiClient.get('/api/admin/online-users');
  return {
    onlineCount: response.data.online_count,
    users: response.data.users.map((u: Record<string, unknown>) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatar_url,
      lastActive: u.last_active,
    })),
  };
}
