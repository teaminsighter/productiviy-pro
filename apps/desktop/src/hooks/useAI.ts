import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAIStatus,
  classifyActivity,
  classifyYouTubeVideo,
  getDailyInsights,
  regenerateDailyInsights,
  getWeeklyReport,
  regenerateWeeklyReport,
  getQuickTip,
  getQueueStatus,
  processQueue,
  clearQueue,
  clearAICache,
  AIStatus,
  ClassificationResult,
  YouTubeClassificationResult,
  DailyInsights,
  WeeklyReport,
  QuickTip,
  QueueStatus,
  QueueProcessResult,
} from '@/lib/api/ai';

// ============================================================================
// Query Keys
// ============================================================================

export const aiKeys = {
  all: ['ai'] as const,
  status: () => [...aiKeys.all, 'status'] as const,
  dailyInsights: (date?: string) => [...aiKeys.all, 'daily', date] as const,
  weeklyReport: (offset: number) => [...aiKeys.all, 'weekly', offset] as const,
  quickTip: () => [...aiKeys.all, 'tip'] as const,
  queue: () => [...aiKeys.all, 'queue'] as const,
};

// ============================================================================
// Status Hook
// ============================================================================

export function useAIStatus() {
  return useQuery<AIStatus, Error>({
    queryKey: aiKeys.status(),
    queryFn: getAIStatus,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

// ============================================================================
// Classification Hooks
// ============================================================================

export function useClassifyActivity() {
  return useMutation<
    ClassificationResult,
    Error,
    { appName: string; windowTitle: string; url?: string; userContext?: string }
  >({
    mutationFn: ({ appName, windowTitle, url, userContext }) =>
      classifyActivity(appName, windowTitle, url, userContext),
  });
}

export function useClassifyYouTube() {
  return useMutation<
    YouTubeClassificationResult,
    Error,
    { videoTitle: string; channelName: string; userContext?: string }
  >({
    mutationFn: ({ videoTitle, channelName, userContext }) =>
      classifyYouTubeVideo(videoTitle, channelName, userContext),
  });
}

// ============================================================================
// Insights Hooks
// ============================================================================

export function useDailyInsights(date?: string) {
  return useQuery<DailyInsights, Error>({
    queryKey: aiKeys.dailyInsights(date),
    queryFn: () => getDailyInsights(date),
    staleTime: 300000, // 5 minutes
    retry: 2,
  });
}

export function useRegenerateDailyInsights() {
  const queryClient = useQueryClient();

  return useMutation<DailyInsights, Error, string | undefined>({
    mutationFn: regenerateDailyInsights,
    onSuccess: (data, date) => {
      queryClient.setQueryData(aiKeys.dailyInsights(date), data);
      queryClient.invalidateQueries({ queryKey: aiKeys.dailyInsights(date) });
    },
  });
}

export function useWeeklyReport(weekOffset: number = 0) {
  return useQuery<WeeklyReport, Error>({
    queryKey: aiKeys.weeklyReport(weekOffset),
    queryFn: () => getWeeklyReport(weekOffset),
    staleTime: 600000, // 10 minutes
    retry: 2,
  });
}

export function useRegenerateWeeklyReport() {
  const queryClient = useQueryClient();

  return useMutation<WeeklyReport, Error, number>({
    mutationFn: regenerateWeeklyReport,
    onSuccess: (data, offset) => {
      queryClient.setQueryData(aiKeys.weeklyReport(offset), data);
      queryClient.invalidateQueries({ queryKey: aiKeys.weeklyReport(offset) });
    },
  });
}

// ============================================================================
// Quick Tip Hook
// ============================================================================

export function useQuickTip() {
  return useQuery<QuickTip, Error>({
    queryKey: aiKeys.quickTip(),
    queryFn: getQuickTip,
    staleTime: 1800000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

export function useRefreshQuickTip() {
  const queryClient = useQueryClient();

  return useMutation<QuickTip, Error>({
    mutationFn: getQuickTip,
    onSuccess: (data) => {
      queryClient.setQueryData(aiKeys.quickTip(), data);
    },
  });
}

// ============================================================================
// Queue Hooks
// ============================================================================

export function useAIQueue() {
  return useQuery<QueueStatus, Error>({
    queryKey: aiKeys.queue(),
    queryFn: getQueueStatus,
    staleTime: 10000, // 10 seconds
  });
}

export function useProcessQueue() {
  const queryClient = useQueryClient();

  return useMutation<QueueProcessResult, Error>({
    mutationFn: processQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.queue() });
    },
  });
}

export function useClearQueue() {
  const queryClient = useQueryClient();

  return useMutation<{ cleared: number }, Error>({
    mutationFn: clearQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.queue() });
    },
  });
}

// ============================================================================
// Cache Hook
// ============================================================================

export function useClearAICache() {
  const queryClient = useQueryClient();

  return useMutation<{ cleared: Record<string, number> }, Error>({
    mutationFn: clearAICache,
    onSuccess: () => {
      // Invalidate all AI queries after clearing cache
      queryClient.invalidateQueries({ queryKey: aiKeys.all });
    },
  });
}

// ============================================================================
// Convenience Hook - Combined AI state
// ============================================================================

export function useAI() {
  const status = useAIStatus();
  const dailyInsights = useDailyInsights();
  const quickTip = useQuickTip();

  return {
    status: status.data,
    isConfigured: status.data?.configured ?? false,
    isAvailable: status.data?.available ?? false,
    isLoading: status.isLoading || dailyInsights.isLoading,
    dailyInsights: dailyInsights.data,
    quickTip: quickTip.data,
    error: status.error || dailyInsights.error,
  };
}
