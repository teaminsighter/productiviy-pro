/**
 * End Session Modal
 * Beautiful summary display when ending a work session
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Square, Clock, Camera, Activity, FileText, CheckCircle } from 'lucide-react';
import { useEndWorkSession } from '@/hooks/useWorkSessions';
import type { WorkSession } from '@/lib/api/work-sessions';
import { formatDurationLong } from '@/lib/api/work-sessions';

interface EndSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: WorkSession | null;
}

export function EndSessionModal({ isOpen, onClose, session }: EndSessionModalProps) {
  const endSession = useEndWorkSession();
  const [notes, setNotes] = useState('');
  const [isEnding, setIsEnding] = useState(false);

  const handleEnd = async () => {
    setIsEnding(true);

    try {
      await endSession.mutateAsync({ notes: notes.trim() || undefined });
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Failed to end session:', error);
    }

    setIsEnding(false);
  };

  if (!session) return null;

  // Calculate live duration
  const startTime = new Date(session.startedAt).getTime();
  const currentDuration = Math.floor((Date.now() - startTime) / 1000) - session.pausedDuration;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative p-6 text-center bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20 border-b border-white/10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 mb-4"
                >
                  <Square className="w-8 h-8 text-red-400" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-1">End Session</h2>
                <p className="text-white/50 text-sm">Review your work before finishing</p>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {/* Session Summary */}
              <div className="p-6 space-y-5">
                {/* Project Info */}
                <div className="text-center pb-4 border-b border-white/10">
                  <p className="text-white/50 text-sm">Project</p>
                  <p className="text-xl font-semibold text-white mt-1">{session.projectName || 'Untitled'}</p>
                  {session.clientName && (
                    <p className="text-white/50 text-sm mt-1">{session.clientName}</p>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Duration */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
                  >
                    <Clock className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white font-mono">
                      {formatDurationLong(currentDuration).split(':').slice(0, 2).join(':')}
                    </p>
                    <p className="text-xs text-white/50 mt-1">Duration</p>
                  </motion.div>

                  {/* Screenshots */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
                  >
                    <Camera className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{session.screenshotCount}</p>
                    <p className="text-xs text-white/50 mt-1">Screenshots</p>
                  </motion.div>

                  {/* Activity */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20"
                  >
                    <Activity className="w-5 h-5 text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{Math.round(session.activityLevel)}%</p>
                    <p className="text-xs text-white/50 mt-1">Activity</p>
                  </motion.div>
                </div>

                {/* Notes */}
                <div>
                  <label className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2">
                    <FileText className="w-4 h-4" />
                    Session Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about what you accomplished..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all resize-none"
                  />
                </div>

                {/* Billable Time Info */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-green-300 font-medium">Billable Time Calculated</p>
                    <p className="text-white/50 mt-1">
                      Active time will be calculated based on screenshots and activity level for accurate client billing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 p-6 border-t border-white/10 bg-white/[0.02]">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition-all font-medium"
                >
                  Continue Working
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEnd}
                  disabled={isEnding}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all"
                >
                  {isEnding ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Ending...
                    </>
                  ) : (
                    <>
                      <Square className="w-5 h-5" />
                      End Session
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
