/**
 * AFK Warning Modal
 *
 * Shows when user is detected as AFK (away from keyboard)
 * - Warning at 10 minutes of inactivity
 * - Auto-pause at 15 minutes
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Play, X, Clock, AlertTriangle } from 'lucide-react';

interface AfkWarningModalProps {
  isVisible: boolean;
  afkDuration: number; // seconds
  isAutoPaused: boolean;
  onDismiss: () => void;
  onResume: () => void;
}

export function AfkWarningModal({
  isVisible,
  afkDuration,
  isAutoPaused,
  onDismiss,
  onResume
}: AfkWarningModalProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const timeUntilPause = Math.max(0, 15 * 60 - afkDuration);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className={`p-6 text-center ${isAutoPaused ? 'bg-red-500/20' : 'bg-orange-500/20'}`}>
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatType: 'reverse'
                  }}
                  className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    isAutoPaused ? 'bg-red-500' : 'bg-orange-500'
                  }`}
                >
                  {isAutoPaused ? (
                    <AlertTriangle className="w-10 h-10 text-white" />
                  ) : (
                    <Coffee className="w-10 h-10 text-white" />
                  )}
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-2">
                  {isAutoPaused ? 'Tracking Paused' : 'Are You Still There?'}
                </h2>
                <p className="text-white/70">
                  {isAutoPaused
                    ? 'You were away for 15 minutes. Tracking has been automatically paused.'
                    : 'No activity detected for a while'}
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* AFK Duration */}
                <div className="flex items-center justify-center gap-3 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                  <Clock className="w-5 h-5 text-white/50" />
                  <span className="text-white/70">Idle for</span>
                  <span className="text-2xl font-bold text-white tabular-nums">
                    {formatDuration(afkDuration)}
                  </span>
                </div>

                {/* Auto-pause countdown (if not yet paused) */}
                {!isAutoPaused && timeUntilPause > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-6 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30"
                  >
                    <p className="text-sm text-orange-400 text-center">
                      Tracking will auto-pause in{' '}
                      <span className="font-bold">{formatDuration(timeUntilPause)}</span>
                    </p>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {!isAutoPaused && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onDismiss}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 border border-white/20 transition-all flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Dismiss
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onResume}
                    className="flex-1 px-4 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 shadow-lg shadow-green-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    {isAutoPaused ? 'Resume Tracking' : "I'm Back"}
                  </motion.button>
                </div>

                {/* Note */}
                <p className="text-xs text-white/40 text-center mt-4">
                  AFK time is not counted towards your productive hours
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default AfkWarningModal;
