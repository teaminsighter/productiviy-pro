import { useQuery } from '@tanstack/react-query';
import {
  fetchDailyAnalytics,
  fetchWeeklyAnalytics,
  fetchTopApps,
  fetchCategories,
  fetchTrends,
  DailyAnalytics,
  WeeklyAnalytics,
  TopApp,
  CategoryBreakdown,
  TrendData,
} from '@/lib/api/analytics';

// Query Keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  daily: (date?: string) => [...analyticsKeys.all, 'daily', date] as const,
  weekly: () => [...analyticsKeys.all, 'weekly'] as const,
  topApps: (date?: string, limit?: number) => [...analyticsKeys.all, 'topApps', date, limit] as const,
  categories: (date?: string) => [...analyticsKeys.all, 'categories', date] as const,
  trends: (days: number) => [...analyticsKeys.all, 'trends', days] as const,
};

// Daily Analytics Hook
export function useDailyAnalytics(date?: string) {
  return useQuery<DailyAnalytics, Error>({
    queryKey: analyticsKeys.daily(date),
    queryFn: () => fetchDailyAnalytics(date),
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // 2 minutes
  });
}

// Weekly Analytics Hook
export function useWeeklyAnalytics() {
  return useQuery<WeeklyAnalytics, Error>({
    queryKey: analyticsKeys.weekly(),
    queryFn: fetchWeeklyAnalytics,
    staleTime: 300000, // 5 minutes
  });
}

// Top Apps Hook
export function useTopApps(date?: string, limit: number = 10) {
  return useQuery<TopApp[], Error>({
    queryKey: analyticsKeys.topApps(date, limit),
    queryFn: () => fetchTopApps(date, limit),
    staleTime: 60000,
  });
}

// Categories Hook
export function useCategories(date?: string) {
  return useQuery<CategoryBreakdown[], Error>({
    queryKey: analyticsKeys.categories(date),
    queryFn: () => fetchCategories(date),
    staleTime: 60000,
  });
}

// Trends Hook
export function useTrends(days: number = 7) {
  return useQuery<TrendData, Error>({
    queryKey: analyticsKeys.trends(days),
    queryFn: () => fetchTrends(days),
    staleTime: 300000, // 5 minutes
  });
}
