/**
 * Onboarding Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchOnboardingStatus,
  fetchUserProfile,
  updateUserProfile,
  saveOnboardingStep,
  completeOnboarding,
  resetOnboarding,
  fetchCommonApps,
  fetchProfileTypes,
  OnboardingStatus,
  UserProfile,
  UserProfileUpdate,
  CommonApp,
  UserProfileType,
} from '@/lib/api/notifications';

// ============================================================================
// Query Keys
// ============================================================================

export const onboardingKeys = {
  all: ['onboarding'] as const,
  status: () => [...onboardingKeys.all, 'status'] as const,
  profile: () => [...onboardingKeys.all, 'profile'] as const,
  commonApps: () => [...onboardingKeys.all, 'common-apps'] as const,
  profileTypes: () => [...onboardingKeys.all, 'profile-types'] as const,
};

// ============================================================================
// Status Hooks
// ============================================================================

/**
 * Check onboarding status
 */
export function useOnboardingStatus() {
  return useQuery<OnboardingStatus, Error>({
    queryKey: onboardingKeys.status(),
    queryFn: fetchOnboardingStatus,
    staleTime: Infinity, // Don't refetch unless invalidated
  });
}

/**
 * Get user profile
 */
export function useUserProfile() {
  return useQuery<UserProfile, Error>({
    queryKey: onboardingKeys.profile(),
    queryFn: fetchUserProfile,
    staleTime: 60000,
  });
}

/**
 * Update user profile
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, Error, UserProfileUpdate>({
    mutationFn: updateUserProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingKeys.profile(), data);
    },
  });
}

// ============================================================================
// Onboarding Flow Hooks
// ============================================================================

/**
 * Save onboarding step data
 */
export function useSaveOnboardingStep() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { step: number; data: Record<string, unknown> }>({
    mutationFn: ({ step, data }) => saveOnboardingStep(step, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.status() });
    },
  });
}

/**
 * Complete onboarding
 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation<
    {
      status: string;
      message: string;
      profile: {
        profile_type: string;
        work_apps: string[];
        daily_productive_hours: number;
      };
    },
    Error,
    void
  >({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
    },
  });
}

/**
 * Reset onboarding (for testing)
 */
export function useResetOnboarding() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: resetOnboarding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
    },
  });
}

// ============================================================================
// Reference Data Hooks
// ============================================================================

/**
 * Get common apps for selection
 */
export function useCommonApps() {
  return useQuery<CommonApp[], Error>({
    queryKey: onboardingKeys.commonApps(),
    queryFn: fetchCommonApps,
    staleTime: Infinity, // Static data
  });
}

/**
 * Get profile types for selection
 */
export function useProfileTypes() {
  return useQuery<
    {
      types: Array<{
        value: UserProfileType;
        label: string;
        description: Record<string, unknown>;
      }>;
    },
    Error
  >({
    queryKey: onboardingKeys.profileTypes(),
    queryFn: fetchProfileTypes,
    staleTime: Infinity, // Static data
  });
}
