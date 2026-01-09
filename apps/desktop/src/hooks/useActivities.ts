import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCurrentActivity,
  fetchActivities,
  fetchDailySummary,
  fetchTimeline,
  fetchActivityStatus,
  CurrentActivity,
  ActivityItem,
  DailySummary,
  TimelineEntry,
  ActivityFilters,
  ActivityStatus,
} from '@/lib/api/activities';

// Query Keys
export const activityKeys = {
  all: ['activities'] as const,
  current: () => [...activityKeys.all, 'current'] as const,
  list: (date: string, filters?: ActivityFilters) => [...activityKeys.all, 'list', date, filters] as const,
  summary: (date: string) => [...activityKeys.all, 'summary', date] as const,
  timeline: (date: string) => [...activityKeys.all, 'timeline', date] as const,
  status: () => [...activityKeys.all, 'status'] as const,
};

// Current Activity Hook - polls every 3 seconds
export function useCurrentActivity(enabled: boolean = true) {
  return useQuery<CurrentActivity, Error>({
    queryKey: activityKeys.current(),
    queryFn: fetchCurrentActivity,
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: false,
    staleTime: 2000,
    enabled,
    retry: 1,
  });
}

// Activities List Hook
export function useActivities(date: string, filters?: ActivityFilters) {
  return useQuery<ActivityItem[], Error>({
    queryKey: activityKeys.list(date, filters),
    queryFn: () => fetchActivities(date, filters),
    staleTime: 30000, // 30 seconds
    enabled: !!date,
  });
}

// Daily Summary Hook
export function useDailySummary(date: string) {
  return useQuery<DailySummary, Error>({
    queryKey: activityKeys.summary(date),
    queryFn: () => fetchDailySummary(date),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    enabled: !!date,
  });
}

// Timeline Hook
export function useTimeline(date: string) {
  return useQuery<TimelineEntry[], Error>({
    queryKey: activityKeys.timeline(date),
    queryFn: () => fetchTimeline(date),
    staleTime: 30000,
    enabled: !!date,
  });
}

// ActivityWatch Status Hook
export function useActivityStatus() {
  return useQuery<ActivityStatus, Error>({
    queryKey: activityKeys.status(),
    queryFn: fetchActivityStatus,
    staleTime: 60000, // 1 minute
    refetchInterval: 30000, // Check every 30 seconds
  });
}

// Invalidate activity queries (useful after WebSocket updates)
export function useInvalidateActivities() {
  const queryClient = useQueryClient();

  return {
    invalidateCurrent: () => queryClient.invalidateQueries({ queryKey: activityKeys.current() }),
    invalidateSummary: (date: string) => queryClient.invalidateQueries({ queryKey: activityKeys.summary(date) }),
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: activityKeys.all }),
  };
}
