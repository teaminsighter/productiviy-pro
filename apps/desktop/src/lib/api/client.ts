import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - backend may be offline');
      return Promise.reject(new Error('Backend server is not available. Please ensure the backend is running.'));
    }

    if (error.response) {
      const status = error.response.status;
      const message = (error.response.data as { detail?: string })?.detail || error.message;

      // Handle auth errors - redirect to login
      if (status === 401) {
        useAuthStore.getState().logout();
        // Only redirect if we're in a browser context
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('Session expired. Please login again.'));
      }

      if (status === 403) {
        return Promise.reject(new Error('Access denied. You do not have permission.'));
      }

      if (status === 404) {
        return Promise.reject(new Error(`Resource not found: ${message}`));
      }

      if (status === 500) {
        return Promise.reject(new Error(`Server error: ${message}`));
      }

      return Promise.reject(new Error(message));
    }

    return Promise.reject(error);
  }
);

// Health check function
export async function checkBackendHealth(): Promise<{
  status: string;
  activitywatch: boolean;
  websocket_connections: number;
}> {
  const response = await apiClient.get('/health');
  return response.data;
}

export default apiClient;
