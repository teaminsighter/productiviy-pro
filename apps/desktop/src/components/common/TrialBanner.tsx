import { motion } from 'framer-motion';
import { Clock, Crown, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function TrialBanner() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed) return null;

  // Don't show for premium users
  if (user.has_premium_access && !user.is_trial_active) return null;

  const isTrialEnding = user.is_trial_active && user.days_left_trial <= 3;
  const isTrialExpired = !user.is_trial_active && user.plan === 'free';

  if (isTrialExpired) {
    return (
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border-b border-red-500/30"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">
              Your trial has expired. Upgrade to continue using premium features.
            </span>
          </div>
          <button
            onClick={() => navigate('/settings')}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
          >
            Upgrade Now
          </button>
        </div>
      </motion.div>
    );
  }

  if (isTrialEnding) {
    return (
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b border-yellow-500/30"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-300">
              {user.days_left_trial} days left in your trial. Upgrade to keep premium features.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="px-3 py-1 bg-yellow-500 text-gray-900 text-sm rounded-lg hover:bg-yellow-400 transition-colors font-medium"
            >
              Upgrade Now
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-yellow-400 hover:text-yellow-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Show trial info
  if (user.is_trial_active) {
    return (
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-indigo-500/20"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300">
              Free trial: {user.days_left_trial} days remaining
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-indigo-400 hover:text-indigo-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}
