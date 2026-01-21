import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Clock, Calendar, Timer, Zap } from 'lucide-react';

interface FocusAutoStartModalProps {
  isVisible: boolean;
  eventTitle: string;
  eventTime: string;
  duration: number;
  isStarting?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

export function FocusAutoStartModal({
  isVisible,
  eventTitle,
  eventTime,
  duration,
  isStarting = false,
  onConfirm,
  onDismiss,
  onSnooze,
}: FocusAutoStartModalProps) {
  if (!isVisible) return null;

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-[#1a1a2e] rounded-2xl border border-indigo-500/30 p-6 w-full max-w-md shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with animated icon */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-6 h-6 text-indigo-400" />
              </motion.div>
              <div>
                <h3 className="text-lg font-semibold text-white">Focus Time</h3>
                <p className="text-sm text-white/50">Auto-start enabled</p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Event Details */}
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <h4 className="text-xl font-bold text-white mb-3">{eventTitle}</h4>
            <div className="flex items-center gap-4 text-white/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{formatTime(eventTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                <span className="text-sm">{formatDuration(duration)}</span>
              </div>
            </div>
          </div>

          {/* Message */}
          <p className="text-white/70 text-sm mb-6">
            Your scheduled focus time is starting. Ready to enter deep work mode?
            Distractions will be blocked during this session.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onConfirm}
              disabled={isStarting}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white font-medium
                hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Clock className="w-5 h-5" />
                </motion.div>
              ) : (
                <Play className="w-5 h-5" />
              )}
              {isStarting ? 'Starting...' : 'Start Focus Session'}
            </motion.button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onSnooze(5)}
                className="py-2 rounded-xl bg-white/5 text-white/70 text-sm
                  hover:bg-white/10 transition-colors border border-white/10"
              >
                Snooze 5 min
              </button>
              <button
                onClick={() => onSnooze(15)}
                className="py-2 rounded-xl bg-white/5 text-white/70 text-sm
                  hover:bg-white/10 transition-colors border border-white/10"
              >
                Snooze 15 min
              </button>
            </div>

            <button
              onClick={onDismiss}
              className="w-full py-2 text-white/50 text-sm hover:text-white/70 transition-colors"
            >
              Skip this session
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default FocusAutoStartModal;
