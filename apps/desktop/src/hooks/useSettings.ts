import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchSettings,
  updateSettings,
  updateGeneralSettings,
  updateTrackingSettings,
  updateScreenshotSettings,
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
  clearAllData,
  deleteAllScreenshots,
  resetSettings,
  getStorageInfo,
  AllSettings,
  SettingsUpdate,
  GeneralSettings,
  TrackingSettings,
  ScreenshotSettings,
  PrivacySettings,
  NotificationSettings,
  CustomLists,
  CustomListItem,
  APIKeyStatus,
  APIKeyTestResult,
  StorageInfo,
} from '@/lib/api/settings';
import {
  getAppInfo,
  getAutostart,
  setAutostart,
  getSystemTheme,
  setWindowTheme,
  setTrayVisible,
  isTauri,
  AppInfo,
} from '@/lib/tauri';

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
    { aiModel: string; autoAnalysis: boolean; analysisFrequency: string }
  >({
    mutationFn: updateAISettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.list() });
    },
  });
}

export function useUpdateScreenshotSettings() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string }, Error, ScreenshotSettings>({
    mutationFn: updateScreenshotSettings,
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
  return useMutation<void, Error>({
    mutationFn: async () => {
      const { downloadExportAsFile } = await import('@/lib/api/settings');
      await downloadExportAsFile();
    },
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

// ============================================================================
// Native Settings Hooks (Tauri)
// ============================================================================

export const nativeSettingsKeys = {
  all: ['nativeSettings'] as const,
  appInfo: () => [...nativeSettingsKeys.all, 'appInfo'] as const,
  autostart: () => [...nativeSettingsKeys.all, 'autostart'] as const,
  systemTheme: () => [...nativeSettingsKeys.all, 'systemTheme'] as const,
};

/**
 * Get app version and build info
 */
export function useAppInfo() {
  return useQuery<AppInfo, Error>({
    queryKey: nativeSettingsKeys.appInfo(),
    queryFn: getAppInfo,
    staleTime: Infinity, // Never stale - version doesn't change
  });
}

/**
 * Get and set autostart status
 */
export function useAutostart() {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAutostart() {
      try {
        const enabled = await getAutostart();
        setIsEnabled(enabled);
      } catch (error) {
        console.error('Failed to get autostart status:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAutostart();
  }, []);

  const toggle = useCallback(async (enabled: boolean) => {
    try {
      await setAutostart(enabled);
      setIsEnabled(enabled);
      queryClient.invalidateQueries({ queryKey: nativeSettingsKeys.autostart() });
      return true;
    } catch (error) {
      console.error('Failed to set autostart:', error);
      return false;
    }
  }, [queryClient]);

  return { isEnabled, isLoading, toggle };
}

/**
 * Get system theme preference
 */
export function useSystemTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    async function fetchTheme() {
      try {
        const systemTheme = await getSystemTheme();
        setTheme(systemTheme);
      } catch (error) {
        console.error('Failed to get system theme:', error);
      }
    }
    fetchTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return theme;
}

/**
 * Apply theme to window
 */
export function useApplyTheme() {
  const applyTheme = useCallback(async (theme: 'dark' | 'light' | 'system') => {
    try {
      await setWindowTheme(theme);

      // Also update CSS class for immediate visual feedback
      const root = document.documentElement;
      root.classList.remove('dark', 'light');

      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(isDark ? 'dark' : 'light');
      } else {
        root.classList.add(theme);
      }

      return true;
    } catch (error) {
      console.error('Failed to apply theme:', error);
      return false;
    }
  }, []);

  return applyTheme;
}

/**
 * Control tray visibility
 */
export function useTrayVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  const setVisible = useCallback(async (visible: boolean) => {
    try {
      await setTrayVisible(visible);
      setIsVisible(visible);
      return true;
    } catch (error) {
      console.error('Failed to set tray visibility:', error);
      return false;
    }
  }, []);

  return { isVisible, setVisible };
}

/**
 * Combined hook for all general settings with native integration
 */
export function useGeneralSettingsWithNative() {
  const settings = useSettings();
  const updateGeneral = useUpdateGeneralSettings();
  const { isEnabled: autostartEnabled, toggle: toggleAutostart, isLoading: autostartLoading } = useAutostart();
  const applyTheme = useApplyTheme();
  const { isVisible: trayVisible, setVisible: setTrayVisible } = useTrayVisibility();
  const appInfo = useAppInfo();

  // Sync theme when settings change
  useEffect(() => {
    if (settings.data?.general.theme) {
      applyTheme(settings.data.general.theme);
    }
  }, [settings.data?.general.theme, applyTheme]);

  const updateSetting = useCallback(async <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K]
  ) => {
    if (!settings.data) return;

    const newSettings = { ...settings.data.general, [key]: value };

    // Handle native settings
    if (key === 'startOnBoot') {
      await toggleAutostart(value as boolean);
    }
    if (key === 'theme') {
      await applyTheme(value as 'dark' | 'light' | 'system');
    }
    if (key === 'showInTray') {
      await setTrayVisible(value as boolean);
    }

    // Update backend
    await updateGeneral.mutateAsync(newSettings);
  }, [settings.data, updateGeneral, toggleAutostart, applyTheme, setTrayVisible]);

  return {
    settings: settings.data?.general,
    isLoading: settings.isLoading || autostartLoading,
    error: settings.error,
    updateSetting,
    appInfo: appInfo.data,
    autostartEnabled,
    trayVisible,
    isTauri: isTauri(),
  };
}
