import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSettings,
  updateSettings,
  updateGeneralSettings,
  updateTrackingSettings,
  updatePrivacySettings,
  updateNotificationSettings,
  getAPIKeyStatus,
  setAPIKey,
  removeAPIKey,
  testAPIKey,
  updateAISettings,
  fetchCustomLists,
  updateCustomLists,
  addToCustomList,
  removeFromCustomList,
  exportData,
  clearAllData,
  deleteAllScreenshots,
  resetSettings,
  getStorageInfo,
  AllSettings,
  SettingsUpdate,
  GeneralSettings,
  TrackingSettings,
  PrivacySettings,
  NotificationSettings,
  CustomLists,
  CustomListItem,
  APIKeyStatus,
  APIKeyTestResult,
  StorageInfo,
} from '@/lib/api/settings';

// ============================================================================
// Query Keys
// ============================================================================

export const settingsKeys = {
  all: ['settings'] as const,
  list: () => [...settingsKeys.all, 'list'] as const,
  apiKeyStatus: () => [...settingsKeys.all, 'apiKeyStatus'] as const,
  customLists: () => [...settingsKeys.all, 'customLists'] as const,
  storage: () => [...settingsKeys.all, 'storage'] as const,
};

// ============================================================================
// Settings Hooks
// ============================================================================

export function useSettings() {
  return useQuery<AllSettings, Error>({
    queryKey: settingsKeys.list(),
    queryFn: fetchSettings,
    staleTime: 300000, // 5 minutes
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error, SettingsUpdate>({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useUpdateGeneralSettings() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error, GeneralSettings>({
    mutationFn: updateGeneralSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.list() });
    },
  });
}

export function useUpdateTrackingSettings() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error, TrackingSettings>({
    mutationFn: updateTrackingSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.list() });
    },
  });
}

export function useUpdatePrivacySettings() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error, PrivacySettings>({
    mutationFn: updatePrivacySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.list() });
    },
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error, NotificationSettings>({
    mutationFn: updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.list() });
    },
  });
}

// ============================================================================
// API Key Hooks
// ============================================================================

export function useAPIKeyStatus() {
  return useQuery<APIKeyStatus, Error>({
    queryKey: settingsKeys.apiKeyStatus(),
    queryFn: getAPIKeyStatus,
    staleTime: 60000, // 1 minute
  });
}

export function useSetAPIKey() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; masked: string }, Error, string>({
    mutationFn: setAPIKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeyStatus() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.list() });
    },
  });
}

export function useRemoveAPIKey() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error>({
    mutationFn: removeAPIKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeyStatus() });
      queryClient.invalidateQueries({ queryKey: settingsKeys.list() });
    },
  });
}

export function useTestAPIKey() {
  return useMutation<APIKeyTestResult, Error, string>({
    mutationFn: testAPIKey,
  });
}

export function useUpdateAISettings() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: string },
    Error,
    { model: string; auto_analysis: boolean; analysis_frequency: string }
  >({
    mutationFn: updateAISettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.list() });
    },
  });
}

// ============================================================================
// Custom Lists Hooks
// ============================================================================

export function useCustomLists() {
  return useQuery<CustomLists, Error>({
    queryKey: settingsKeys.customLists(),
    queryFn: fetchCustomLists,
    staleTime: 60000,
  });
}

export function useUpdateCustomLists() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error, CustomLists>({
    mutationFn: updateCustomLists,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.customLists() });
    },
  });
}

export function useAddToCustomList() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: string },
    Error,
    {
      listType: 'productive' | 'distracting' | 'neutral' | 'excluded';
      item: CustomListItem;
    }
  >({
    mutationFn: ({ listType, item }) => addToCustomList(listType, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.customLists() });
    },
  });
}

export function useRemoveFromCustomList() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: string },
    Error,
    {
      listType: 'productive' | 'distracting' | 'neutral' | 'excluded';
      pattern: string;
    }
  >({
    mutationFn: ({ listType, pattern }) => removeFromCustomList(listType, pattern),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.customLists() });
    },
  });
}

// ============================================================================
// Data Management Hooks
// ============================================================================

export function useExportData() {
  return useMutation<{ status: string; download_url: string }, Error>({
    mutationFn: exportData,
  });
}

export function useClearAllData() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error>({
    mutationFn: clearAllData,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}

export function useDeleteAllScreenshots() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error>({
    mutationFn: deleteAllScreenshots,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screenshots'] });
    },
  });
}

export function useResetSettings() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error>({
    mutationFn: resetSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useStorageInfo() {
  return useQuery<StorageInfo, Error>({
    queryKey: settingsKeys.storage(),
    queryFn: getStorageInfo,
    staleTime: 60000, // 1 minute
  });
}
