import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';
import { v4 as uuidv4 } from 'uuid';

interface LicenseFeatures {
  time_tracking: boolean;
  history_days: number;
  screenshots: boolean;
  ai_insights: boolean;
  reports: boolean;
  goals: boolean;
  website_blocking: boolean;
  team_dashboard: boolean;
  api_access: boolean;
  sso?: boolean;
  dedicated_support?: boolean;
}

interface LicenseStatus {
  valid: boolean;
  plan: string;
  status: string;
  features: LicenseFeatures;
  limited?: boolean;
  upgrade_prompt?: boolean;
  error?: string;
  should_logout?: boolean;
  can_deactivate?: boolean;
  current_device?: string;
  trial_ends_at?: string;
  days_left?: number;
  message?: string;
}

const DEFAULT_FEATURES: LicenseFeatures = {
  time_tracking: true,
  history_days: 7,
  screenshots: false,
  ai_insights: false,
  reports: false,
  goals: false,
  website_blocking: false,
  team_dashboard: false,
  api_access: false,
};

export function useLicense() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [deviceConflict, setDeviceConflict] = useState(false);

  const getDeviceId = useCallback(() => {
    let deviceId = localStorage.getItem('productify_device_id');
    if (!deviceId) {
      deviceId = uuidv4();
      localStorage.setItem('productify_device_id', deviceId);
    }
    return deviceId;
  }, []);

  const getDeviceName = useCallback(() => {
    const platform = navigator.platform || 'Unknown';
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';
    return platform;
  }, []);

  const checkLicense = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsChecking(false);
      setLicense({
        valid: false,
        plan: 'free',
        status: 'unauthenticated',
        features: DEFAULT_FEATURES,
        limited: true,
      });
      return;
    }

    try {
      const deviceId = getDeviceId();
      const deviceName = getDeviceName();

      const response = await apiClient.post('/api/billing/validate-license', {
        device_id: deviceId,
        device_name: deviceName,
      });

      const data = response.data as LicenseStatus;
      setLicense(data);

      if (data.should_logout) {
        logout();
      }

      if (data.can_deactivate && data.error?.includes('another device')) {
        setDeviceConflict(true);
      }
    } catch (error) {
      console.error('License check failed:', error);
      setLicense({
        valid: true,
        plan: 'free',
        status: 'error',
        features: DEFAULT_FEATURES,
        limited: true,
      });
    } finally {
      setIsChecking(false);
    }
  }, [isAuthenticated, user, getDeviceId, getDeviceName, logout]);

  const deactivateDevice = useCallback(async () => {
    try {
      await apiClient.post('/api/billing/deactivate-device');
      setDeviceConflict(false);
      // Re-check license after deactivating other device
      await checkLicense();
    } catch (error) {
      console.error('Failed to deactivate device:', error);
      throw error;
    }
  }, [checkLicense]);

  const refreshLicense = useCallback(() => {
    setIsChecking(true);
    checkLicense();
  }, [checkLicense]);

  useEffect(() => {
    checkLicense();
  }, [checkLicense]);

  // Check license periodically (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      checkLicense();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, checkLicense]);

  const hasFeature = useCallback((feature: keyof LicenseFeatures): boolean => {
    return Boolean(license?.features?.[feature] ?? DEFAULT_FEATURES[feature] ?? false);
  }, [license]);

  return {
    license,
    isChecking,
    isPremium: license?.plan !== 'free' && license?.status === 'active',
    isTrialing: license?.status === 'trialing',
    shouldUpgrade: license?.upgrade_prompt || license?.limited,
    deviceConflict,
    deactivateDevice,
    refreshLicense,
    hasFeature,
    features: license?.features ?? DEFAULT_FEATURES,
    plan: license?.plan ?? 'free',
    daysLeft: license?.days_left,
    trialEndsAt: license?.trial_ends_at,
  };
}
