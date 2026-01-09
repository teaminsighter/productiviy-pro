import { apiClient } from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    name: string | null;
    avatar_url: string | null;
    plan: string;
    is_trial_active: boolean;
    days_left_trial: number;
    has_premium_access: boolean;
    created_at: string;
  };
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/auth/register', credentials);
    return response.data;
  },

  getMe: async (): Promise<AuthResponse['user']> => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  verifyToken: async (): Promise<{ valid: boolean; user_id: number }> => {
    const response = await apiClient.post('/api/auth/verify-token');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout');
  },

  googleAuth: async (token: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/auth/google', { token });
    return response.data;
  },
};
