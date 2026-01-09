import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchScreenshots,
  fetchScreenshot,
  captureScreenshot,
  deleteScreenshot,
  fetchScreenshotSettings,
  updateScreenshotSettings,
  fetchScreenshotStats,
  cleanupScreenshots,
  Screenshot,
  ScreenshotFilters,
  ScreenshotSettings,
  ScreenshotStats,
  CaptureResult,
} from '@/lib/api/screenshots';

// Query Keys
export const screenshotKeys = {
  all: ['screenshots'] as const,
  list: (filters?: ScreenshotFilters) => [...screenshotKeys.all, 'list', filters] as const,
  detail: (id: string) => [...screenshotKeys.all, 'detail', id] as const,
  settings: () => [...screenshotKeys.all, 'settings'] as const,
  stats: (days: number) => [...screenshotKeys.all, 'stats', days] as const,
};

// Screenshots List Hook
export function useScreenshots(filters?: ScreenshotFilters) {
  return useQuery<Screenshot[], Error>({
    queryKey: screenshotKeys.list(filters),
    queryFn: () => fetchScreenshots(filters),
    staleTime: 30000,
  });
}

// Single Screenshot Hook
export function useScreenshot(id: string) {
  return useQuery<Screenshot, Error>({
    queryKey: screenshotKeys.detail(id),
    queryFn: () => fetchScreenshot(id),
    enabled: !!id,
  });
}

// Screenshot Settings Hook
export function useScreenshotSettings() {
  return useQuery<ScreenshotSettings, Error>({
    queryKey: screenshotKeys.settings(),
    queryFn: fetchScreenshotSettings,
    staleTime: 60000,
  });
}

// Screenshot Stats Hook
export function useScreenshotStats(days: number = 7) {
  return useQuery<ScreenshotStats, Error>({
    queryKey: screenshotKeys.stats(days),
    queryFn: () => fetchScreenshotStats(days),
    staleTime: 60000,
  });
}

// Capture Screenshot Mutation
export function useCaptureScreenshot() {
  const queryClient = useQueryClient();

  return useMutation<CaptureResult, Error>({
    mutationFn: captureScreenshot,
    onSuccess: () => {
      // Invalidate screenshots list to show the new one
      queryClient.invalidateQueries({ queryKey: screenshotKeys.all });
    },
  });
}

// Delete Screenshot Mutation
export function useDeleteScreenshot() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: string; id: string; permanent: boolean },
    Error,
    { id: string; permanent?: boolean }
  >({
    mutationFn: ({ id, permanent }) => deleteScreenshot(id, permanent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: screenshotKeys.all });
    },
  });
}

// Update Screenshot Settings Mutation
export function useUpdateScreenshotSettings() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: string; settings: ScreenshotSettings },
    Error,
    Partial<ScreenshotSettings>
  >({
    mutationFn: updateScreenshotSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: screenshotKeys.settings() });
    },
  });
}

// Cleanup Screenshots Mutation
export function useCleanupScreenshots() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: string; deleted_count: number; freed_mb: number },
    Error,
    number
  >({
    mutationFn: cleanupScreenshots,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: screenshotKeys.all });
    },
  });
}
