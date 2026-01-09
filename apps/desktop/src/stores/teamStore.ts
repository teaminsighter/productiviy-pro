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
  today_time?: number;
  today_productivity?: number;
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

interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  members: TeamMember[];
  invites: TeamInvite[];
  analytics: TeamAnalytics | null;
  isLoading: boolean;
  error: string | null;

  fetchTeams: () => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
  fetchMembers: (teamId: number) => Promise<void>;
  fetchInvites: (teamId: number) => Promise<void>;
  fetchAnalytics: (teamId: number) => Promise<void>;
  createTeam: (name: string, description?: string) => Promise<Team>;
  updateTeam: (teamId: number, data: { name?: string; description?: string }) => Promise<void>;
  deleteTeam: (teamId: number) => Promise<void>;
  inviteMember: (teamId: number, email: string, role?: string) => Promise<void>;
  cancelInvite: (teamId: number, inviteId: number) => Promise<void>;
  removeMember: (teamId: number, userId: number) => Promise<void>;
  updateMemberSettings: (teamId: number, userId: number, settings: Partial<TeamMember>) => Promise<void>;
  leaveTeam: (teamId: number) => Promise<void>;
  acceptInvite: (token: string) => Promise<void>;
  clearError: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  currentTeam: null,
  members: [],
  invites: [],
  analytics: null,
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
      await apiClient.post(`/api/teams/${teamId}/invites`, { email, role });
      await get().fetchInvites(teamId);
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
}));
