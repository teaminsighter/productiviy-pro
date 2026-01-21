import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Custom API Error class with proper typing
export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Helper to extract error message from various API response formats
export function extractErrorMessage(data: unknown): string {
  if (!data) return 'An unknown error occurred';

  // Handle string detail
  if (typeof data === 'string') return data;

  // Handle object with detail field
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;

    // Handle FastAPI/Pydantic validation errors (array of objects)
    if (Array.isArray(obj.detail)) {
      const messages = obj.detail.map((err: unknown) => {
        if (typeof err === 'string') return err;
        if (typeof err === 'object' && err !== null) {
          const errObj = err as Record<string, unknown>;
          // Pydantic format: { msg: string, loc: string[], type: string }
          if (typeof errObj.msg === 'string') {
            const field = Array.isArray(errObj.loc) ? errObj.loc[errObj.loc.length - 1] : '';
            return field ? `${field}: ${errObj.msg}` : errObj.msg;
          }
        }
        return 'Validation error';
      });
      return messages.join('. ');
    }

    // Handle simple string detail
    if (typeof obj.detail === 'string') {
      return obj.detail;
    }

    // Handle message field
    if (typeof obj.message === 'string') {
      return obj.message;
    }

    // Handle error field
    if (typeof obj.error === 'string') {
      return obj.error;
    }
  }

  return 'An unknown error occurred';
}

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds - more forgiving for slow responses
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
      return Promise.reject(new ApiError(
        'Backend server is not available. Please ensure the backend is running.',
        0,
        'ERR_NETWORK'
      ));
    }

    if (error.response) {
      const status = error.response.status;
      const message = extractErrorMessage(error.response.data);

      // Handle auth errors - but differentiate between invalid credentials and expired session
      if (status === 401) {
        // Check if this is a login attempt (don't redirect, don't say "session expired")
        const isLoginAttempt = error.config?.url?.includes('/auth/login');
        const isRegisterAttempt = error.config?.url?.includes('/auth/register');

        if (isLoginAttempt || isRegisterAttempt) {
          // This is a failed login/register, return the actual error message
          return Promise.reject(new ApiError(message || 'Invalid email or password', status, 'AUTH_FAILED'));
        }

        // This is a real session expiry - logout and redirect
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(new ApiError('Session expired. Please login again.', status, 'SESSION_EXPIRED'));
      }

      if (status === 400) {
        // Bad request - usually validation errors
        return Promise.reject(new ApiError(message, status, 'BAD_REQUEST', error.response.data));
      }

      if (status === 403) {
        return Promise.reject(new ApiError('Access denied. You do not have permission.', status, 'FORBIDDEN'));
      }

      if (status === 404) {
        return Promise.reject(new ApiError(`Resource not found: ${message}`, status, 'NOT_FOUND'));
      }

      if (status === 422) {
        // Validation error from Pydantic
        return Promise.reject(new ApiError(message, status, 'VALIDATION_ERROR', error.response.data));
      }

      if (status === 429) {
        return Promise.reject(new ApiError('Too many requests. Please try again later.', status, 'RATE_LIMITED'));
      }

      if (status >= 500) {
        return Promise.reject(new ApiError(`Server error: ${message}`, status, 'SERVER_ERROR'));
      }

      return Promise.reject(new ApiError(message, status));
    }

    return Promise.reject(new ApiError(error.message || 'An unknown error occurred', 0));
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
