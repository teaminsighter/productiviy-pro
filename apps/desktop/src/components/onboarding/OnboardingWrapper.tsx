/**
 * Onboarding Wrapper Component
 *
 * Wraps the main app and shows onboarding if not completed
 */
import { useOnboardingStatus } from '@/hooks/useOnboarding';
import { OnboardingFlow } from './OnboardingFlow';
import { useQueryClient } from '@tanstack/react-query';
import { onboardingKeys } from '@/hooks/useOnboarding';

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { data: status, isLoading } = useOnboardingStatus();
  const queryClient = useQueryClient();

  const handleComplete = () => {
    // Invalidate to refetch status
    queryClient.invalidateQueries({ queryKey: onboardingKeys.status() });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if not completed
  if (!status?.completed) {
    return <OnboardingFlow onComplete={handleComplete} />;
  }

  // Show main app
  return <>{children}</>;
}

export default OnboardingWrapper;
