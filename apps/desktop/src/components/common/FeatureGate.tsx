import { ReactNode } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { Crown, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

type FeatureKey =
  | 'time_tracking'
  | 'history_days'
  | 'screenshots'
  | 'ai_insights'
  | 'reports'
  | 'goals'
  | 'website_blocking'
  | 'team_dashboard'
  | 'api_access'
  | 'sso'
  | 'dedicated_support';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  blurContent?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  blurContent = true
}: FeatureGateProps) {
  const { hasFeature, isTrialing } = useLicense();
  const navigate = useNavigate();

  const hasAccess = hasFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  // Default locked UI
  return (
    <div className="relative">
      {blurContent && (
        <div className="opacity-50 pointer-events-none blur-sm">
          {children}
        </div>
      )}
      <div className={`${blurContent ? 'absolute inset-0' : ''} bg-gray-900/80 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center min-h-[200px]`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-6 max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
          <p className="text-sm text-gray-400 mb-6">
            Upgrade to unlock {getFeatureDisplayName(feature)} and more powerful features
          </p>
          <button
            onClick={() => navigate('/settings/billing')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-medium flex items-center gap-2 mx-auto hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Crown className="w-5 h-5" />
            Upgrade Now
          </button>
          {isTrialing && (
            <p className="text-xs text-gray-500 mt-3">
              Your trial has limited features
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function getFeatureDisplayName(feature: FeatureKey): string {
  const names: Record<FeatureKey, string> = {
    time_tracking: 'Time Tracking',
    history_days: 'Extended History',
    screenshots: 'Screenshots',
    ai_insights: 'AI Insights',
    reports: 'PDF Reports',
    goals: 'Goal Tracking',
    website_blocking: 'Website Blocking',
    team_dashboard: 'Team Dashboard',
    api_access: 'API Access',
    sso: 'Single Sign-On',
    dedicated_support: 'Dedicated Support',
  };
  return names[feature] || feature;
}

// Inline upgrade banner component
interface UpgradeBannerProps {
  feature?: FeatureKey;
  message?: string;
  compact?: boolean;
}

export function UpgradeBanner({ feature, message, compact = false }: UpgradeBannerProps) {
  const navigate = useNavigate();
  const { plan } = useLicense();

  if (plan !== 'free') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        <div className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0`}>
          <Sparkles className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-300`}>
            {message || (feature
              ? `Upgrade to unlock ${getFeatureDisplayName(feature)}`
              : 'Upgrade to Pro for unlimited features'
            )}
          </p>
        </div>
        <button
          onClick={() => navigate('/settings/billing')}
          className={`${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors flex-shrink-0`}
        >
          Upgrade
        </button>
      </div>
    </motion.div>
  );
}

// Hook to check specific feature access
export function useFeatureAccess(feature: FeatureKey): boolean {
  const { hasFeature } = useLicense();
  return hasFeature(feature);
}
