import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

interface TeamMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  share_activity: boolean;
  share_screenshots: boolean;
  share_urls: boolean;
  blur_screenshots: boolean;
  hide_window_titles: boolean;
  working_hours_only: boolean;
  work_start_time: string;
  work_end_time: string;
  today_time?: number;
  today_productivity?: number;
  current_app?: string;
  status?: 'active' | 'idle' | 'offline';
}

interface TeamPermission {
  id: number;
  team_id: number;
  granter_id: number;
  grantee_id: number;
  target_user_id: number | null;
  can_view_activity: boolean;
  can_view_screenshots: boolean;
  can_view_urls: boolean;
  can_view_analytics: boolean;
  can_export_data: boolean;
  created_at: string;
  expires_at: string | null;
}

interface MyPermissions {
  role: 'owner' | 'admin' | 'member';
  is_owner: boolean;
  can_view_activity: boolean;
  can_view_screenshots: boolean;
  can_view_urls: boolean;
  can_view_analytics: boolean;
  can_export_data: boolean;
  target_user_ids: number[] | 'all';
}

interface DashboardStats {
  team_id: number;
  team_name: string;
  total_members: number;
  active_now: number;
  total_productive_time_today: number;
  total_neutral_time_today: number;
  total_distracting_time_today: number;
  avg_productivity: number;
  members: {
    user_id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    role: string;
    status: 'active' | 'idle' | 'offline';
    current_app: string | null;
    today_time: number;
    productivity: number;
    share_activity: boolean;
    share_screenshots: boolean;
  }[];
}

interface MemberTimeline {
  user_id: number;
  date: string;
  total_time: number;
  productive_time: number;
  neutral_time: number;
  distracting_time: number;
  productivity_score: number;
  activities: {
    app: string;
    title: string;
    duration: number;
    category: string;
    started_at: string;
  }[];
  top_apps: {
    app: string;
    duration: number;
    category: string;
  }[];
}

interface Team {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  member_count: number;
  owner_id: number;
  created_at: string;
}

interface TeamInvite {
  id: number;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

interface TeamAnalytics {
  total_members: number;
  active_today: number;
  total_productive_time: number;
  avg_productivity: number;
  members: {
    user_id: number;
    name: string;
    avatar_url: string | null;
    today_time: number;
    productivity: number;
    status: string;
  }[];
}

export type { TeamMember, Team, TeamInvite, TeamAnalytics, TeamPermission, MyPermissions, DashboardStats, MemberTimeline };

interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  members: TeamMember[];
  invites: TeamInvite[];
  analytics: TeamAnalytics | null;
  dashboard: DashboardStats | null;
  myPermissions: MyPermissions | null;
  permissions: TeamPermission[];
  selectedMemberTimeline: MemberTimeline | null;
  isLoading: boolean;
  error: string | null;

  // Basic CRUD
  fetchTeams: () => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
  fetchMembers: (teamId: number) => Promise<void>;
  fetchInvites: (teamId: number) => Promise<void>;
  fetchAnalytics: (teamId: number) => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<Team>;
  updateTeam: (teamId: number, data: { name?: string; description?: string }) => Promise<void>;
  deleteTeam: (teamId: number) => Promise<void>;
  inviteMember: (teamId: number, email: string, role?: string) => Promise<{ message: string; invite_url: string } | void>;
  cancelInvite: (teamId: number, inviteId: number) => Promise<void>;
  removeMember: (teamId: number, userId: number) => Promise<void>;
  updateMemberSettings: (teamId: number, userId: number, settings: Partial<TeamMember>) => Promise<void>;
  leaveTeam: (teamId: number) => Promise<void>;
  acceptInvite: (token: string) => Promise<void>;
  clearError: () => void;

  // Dashboard & Permissions
  fetchDashboard: (teamId: number) => Promise<void>;
  fetchMyPermissions: (teamId: number) => Promise<void>;
  fetchPermissions: (teamId: number) => Promise<void>;
  grantPermission: (teamId: number, data: {
    grantee_id: number;
    target_user_id?: number | null;
    can_view_activity?: boolean;
    can_view_screenshots?: boolean;
    can_view_urls?: boolean;
    can_view_analytics?: boolean;
    can_export_data?: boolean;
    expires_at?: string | null;
  }) => Promise<void>;
  updatePermission: (teamId: number, permissionId: number, data: Partial<TeamPermission>) => Promise<void>;
  revokePermission: (teamId: number, permissionId: number) => Promise<void>;

  // Member details
  fetchMemberTimeline: (teamId: number, userId: number, date?: string) => Promise<void>;
  clearMemberTimeline: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  currentTeam: null,
  members: [],
  invites: [],
  analytics: null,
  dashboard: null,
  myPermissions: null,
  permissions: [],
  selectedMemberTimeline: null,
  isLoading: false,
  error: null,

  fetchTeams: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get('/api/teams');
      set({ teams: response.data, isLoading: false });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch teams'
      });
    }
  },

  setCurrentTeam: (team) => {
    set({ currentTeam: team, members: [], invites: [], analytics: null });
    if (team) {
      get().fetchMembers(team.id);
    }
  },

  fetchMembers: async (teamId) => {
    try {
      const response = await apiClient.get(`/api/teams/${teamId}/members`);
      set({ members: response.data });
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  },

  fetchInvites: async (teamId) => {
    try {
      const response = await apiClient.get(`/api/teams/${teamId}/invites`);
      set({ invites: response.data });
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    }
  },

  fetchAnalytics: async (teamId) => {
    try {
      const response = await apiClient.get(`/api/teams/${teamId}/analytics`);
      set({ analytics: response.data });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  },

  createTeam: async (name, description) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/api/teams', { name, description });
      const newTeam = response.data;
      set((state) => ({
        teams: [...state.teams, newTeam],
        isLoading: false
      }));
      return newTeam;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to create team'
      });
      throw error;
    }
  },

  updateTeam: async (teamId, data) => {
    try {
      const response = await apiClient.put(`/api/teams/${teamId}`, data);
      set((state) => ({
        teams: state.teams.map((t) =>
          t.id === teamId ? { ...t, ...response.data } : t
        ),
        currentTeam: state.currentTeam?.id === teamId
          ? { ...state.currentTeam, ...response.data }
          : state.currentTeam
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update team' });
      throw error;
    }
  },

  deleteTeam: async (teamId) => {
    try {
      await apiClient.delete(`/api/teams/${teamId}`);
      set((state) => ({
        teams: state.teams.filter((t) => t.id !== teamId),
        currentTeam: state.currentTeam?.id === teamId ? null : state.currentTeam,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to delete team' });
      throw error;
    }
  },

  inviteMember: async (teamId, email, role = 'member') => {
    try {
      const response = await apiClient.post(`/api/teams/${teamId}/invites`, { email, role });
      await get().fetchInvites(teamId);
      return response.data;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to send invite' });
      throw error;
    }
  },

  cancelInvite: async (teamId, inviteId) => {
    try {
      await apiClient.delete(`/api/teams/${teamId}/invites/${inviteId}`);
      set((state) => ({
        invites: state.invites.filter((i) => i.id !== inviteId),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to cancel invite' });
      throw error;
    }
  },

  removeMember: async (teamId, userId) => {
    try {
      await apiClient.delete(`/api/teams/${teamId}/members/${userId}`);
      set((state) => ({
        members: state.members.filter((m) => m.user_id !== userId),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to remove member' });
      throw error;
    }
  },

  updateMemberSettings: async (teamId, userId, settings) => {
    try {
      await apiClient.put(`/api/teams/${teamId}/members/${userId}`, settings);
      set((state) => ({
        members: state.members.map((m) =>
          m.user_id === userId ? { ...m, ...settings } : m
        ),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update member' });
      throw error;
    }
  },

  leaveTeam: async (teamId) => {
    try {
      await apiClient.delete(`/api/teams/${teamId}/members/me`);
      set((state) => ({
        teams: state.teams.filter((t) => t.id !== teamId),
        currentTeam: state.currentTeam?.id === teamId ? null : state.currentTeam,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to leave team' });
      throw error;
    }
  },

  acceptInvite: async (token) => {
    try {
      await apiClient.post(`/api/teams/join/${token}`);
      await get().fetchTeams();
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to accept invite' });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  // Dashboard & Permissions
  fetchDashboard: async (teamId) => {
    try {
      const response = await apiClient.get(`/api/teams/${teamId}/dashboard`);
      set({ dashboard: response.data });
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  },

  fetchMyPermissions: async (teamId) => {
    try {
      const response = await apiClient.get(`/api/teams/${teamId}/my-permissions`);
      set({ myPermissions: response.data });
    } catch (error) {
      console.error('Failed to fetch my permissions:', error);
    }
  },

  fetchPermissions: async (teamId) => {
    try {
      const response = await apiClient.get(`/api/teams/${teamId}/permissions`);
      set({ permissions: response.data });
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  },

  grantPermission: async (teamId, data) => {
    try {
      await apiClient.post(`/api/teams/${teamId}/permissions`, data);
      await get().fetchPermissions(teamId);
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to grant permission' });
      throw error;
    }
  },

  updatePermission: async (teamId, permissionId, data) => {
    try {
      await apiClient.put(`/api/teams/${teamId}/permissions/${permissionId}`, data);
      await get().fetchPermissions(teamId);
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update permission' });
      throw error;
    }
  },

  revokePermission: async (teamId, permissionId) => {
    try {
      await apiClient.delete(`/api/teams/${teamId}/permissions/${permissionId}`);
      set((state) => ({
        permissions: state.permissions.filter((p) => p.id !== permissionId),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to revoke permission' });
      throw error;
    }
  },

  // Member details
  fetchMemberTimeline: async (teamId, userId, date) => {
    try {
      const params = date ? `?date=${date}` : '';
      const response = await apiClient.get(`/api/teams/${teamId}/members/${userId}/timeline${params}`);
      set({ selectedMemberTimeline: response.data });
    } catch (error) {
      console.error('Failed to fetch member timeline:', error);
    }
  },

  clearMemberTimeline: () => set({ selectedMemberTimeline: null }),
}));
