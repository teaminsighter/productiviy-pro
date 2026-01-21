/**
 * DistractionBlockedModal
 *
 * Modal that appears when a user attempts to access a blocked app/site during focus mode.
 * Implements three blocking modes:
 * - soft: Shows warning with easy bypass option
 * - hard: Requires waiting before bypass is allowed
 * - strict: No bypass allowed during focus session
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldOff,
  AlertTriangle,
  Clock,
  Lock,
  X,
  Focus,
  ArrowRight,
  Timer,
} from 'lucide-react';

export type BlockingMode = 'soft' | 'hard' | 'strict';

interface DistractionBlockedModalProps {
  isVisible: boolean;
  blockedItem: string; // App name or website domain
  itemType: 'app' | 'website';
  blockingMode: BlockingMode;
  sessionEndTime?: string; // For showing remaining session time
  onBypass?: () => void;
  onDismiss: () => void;
  onStayFocused: () => void;
}

export function DistractionBlockedModal({
  isVisible,
  blockedItem,
  itemType,
  blockingMode,
  sessionEndTime,
  onBypass,
  onDismiss,
  onStayFocused,
}: DistractionBlockedModalProps) {
  const [bypassCountdown, setBypassCountdown] = useState(30);
  const [canBypass, setCanBypass] = useState(false);
  const [showBypassConfirm, setShowBypassConfirm] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setBypassCountdown(30);
      setCanBypass(blockingMode === 'soft');
      setShowBypassConfirm(false);
    }
  }, [isVisible, blockingMode]);

  // Countdown timer for hard mode
  useEffect(() => {
    if (!isVisible || blockingMode !== 'hard' || canBypass) return;

    const interval = setInterval(() => {
      setBypassCountdown((prev) => {
        if (prev <= 1) {
          setCanBypass(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, blockingMode, canBypass]);

  const handleBypass = useCallback(() => {
    if (blockingMode === 'strict') return;

    if (!showBypassConfirm) {
      setShowBypassConfirm(true);
      return;
    }

    onBypass?.();
    onDismiss();
  }, [blockingMode, showBypassConfirm, onBypass, onDismiss]);

  const getTimeRemaining = () => {
    if (!sessionEndTime) return null;
    const end = new Date(sessionEndTime).getTime();
    const now = Date.now();
    const diff = Math.max(0, end - now);
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeConfig = () => {
    switch (blockingMode) {
      case 'soft':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          title: 'Distraction Detected',
          description: 'You tried to access a blocked item during your focus session.',
        };
      case 'hard':
        return {
          icon: Clock,
          iconColor: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          title: 'Access Blocked',
          description: 'Wait to bypass this block, or stay focused.',
        };
      case 'strict':
        return {
          icon: Lock,
          iconColor: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          title: 'Strictly Blocked',
          description: 'This item cannot be accessed during your focus session.',
        };
    }
  };

  const config = getModeConfig();
  const Icon = config.icon;
  const remainingTime = getTimeRemaining();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={blockingMode === 'strict' ? undefined : onDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full max-w-md rounded-2xl ${config.bgColor} border ${config.borderColor} overflow-hidden`}
          >
            {/* Shield animation */}
            <motion.div
              className="absolute -top-10 -right-10 w-40 h-40 opacity-10"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Shield className={`w-full h-full ${config.iconColor}`} />
            </motion.div>

            <div className="relative p-6">
              {/* Close button - only for soft mode */}
              {blockingMode === 'soft' && (
                <button
                  onClick={onDismiss}
                  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/50" />
                </button>
              )}

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <motion.div
                  animate={blockingMode === 'strict' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-16 h-16 rounded-2xl ${config.bgColor} flex items-center justify-center`}
                >
                  <Icon className={`w-8 h-8 ${config.iconColor}`} />
                </motion.div>
              </div>

              {/* Title & Description */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">{config.title}</h2>
                <p className="text-white/60 text-sm">{config.description}</p>
              </div>

              {/* Blocked item display */}
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                    {itemType === 'app' ? (
                      <Focus className={`w-5 h-5 ${config.iconColor}`} />
                    ) : (
                      <Shield className={`w-5 h-5 ${config.iconColor}`} />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{blockedItem}</p>
                    <p className="text-white/40 text-xs capitalize">{itemType}</p>
                  </div>
                </div>
              </div>

              {/* Session time remaining */}
              {remainingTime && (
                <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-6">
                  <Timer className="w-4 h-4" />
                  <span>Focus session ends in {remainingTime}</span>
                </div>
              )}

              {/* Hard mode countdown */}
              {blockingMode === 'hard' && !canBypass && (
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span className="text-orange-400 font-medium tabular-nums">
                      Bypass available in {bypassCountdown}s
                    </span>
                  </div>
                </div>
              )}

              {/* Bypass confirmation */}
              {showBypassConfirm && blockingMode !== 'strict' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                >
                  <p className="text-red-400 text-sm text-center mb-3">
                    Breaking focus now will affect your productivity score. Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowBypassConfirm(false)}
                      className="flex-1 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBypass}
                      className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
                    >
                      Break Focus
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                {/* Primary: Stay Focused */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onStayFocused}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-500 text-white font-medium
                    hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Focus className="w-5 h-5" />
                  Stay Focused
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                {/* Secondary: Bypass (if allowed) */}
                {blockingMode !== 'strict' && !showBypassConfirm && (
                  <button
                    onClick={handleBypass}
                    disabled={!canBypass}
                    className={`w-full py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2
                      ${canBypass
                        ? 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                        : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                      }`}
                  >
                    <ShieldOff className="w-4 h-4" />
                    {canBypass ? 'Bypass Block (Not Recommended)' : `Wait ${bypassCountdown}s to bypass`}
                  </button>
                )}

                {/* Strict mode message */}
                {blockingMode === 'strict' && (
                  <div className="text-center py-2 text-white/40 text-sm">
                    <Lock className="w-4 h-4 inline mr-2" />
                    Bypass is disabled in strict mode
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DistractionBlockedModal;
