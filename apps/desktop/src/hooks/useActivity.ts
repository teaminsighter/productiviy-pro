import { useQuery } from '@tanstack/react-query';

// API base URL - use environment variable
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/api';

export interface Activity {
  id: string;
  appName: string;
  windowTitle: string;
  url?: string;
  domain?: string;
  platform?: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  category: string;
  productivityScore: number;
  isProductive: boolean;
}

export function useCurrentActivity() {
  return useQuery<Activity | null>({
    queryKey: ['currentActivity'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/activities/current`);
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: 3000, // Refresh every 3 seconds
  });
}

export function useActivities(date?: string) {
  return useQuery<Activity[]>({
    queryKey: ['activities', date],
    queryFn: async () => {
      const url = date
        ? `${API_URL}/activities?date=${date}`
        : `${API_URL}/activities`;
      const response = await fetch(url);
      if (!response.ok) return [];
      return response.json();
    },
  });
}

export function useDailySummary(date?: string) {
  return useQuery({
    queryKey: ['dailySummary', date],
    queryFn: async () => {
      const url = date
        ? `${API_URL}/activities/summary/${date}`
        : `${API_URL}/activities/summary/today`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    },
  });
}
