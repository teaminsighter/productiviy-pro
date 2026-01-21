/**
 * Start Session Modal
 * Beautiful form to start a new work session with project/client/task
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Briefcase, User, FileText, Sparkles } from 'lucide-react';
import { useStartWorkSession } from '@/hooks/useWorkSessions';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StartSessionModal({ isOpen, onClose }: StartSessionModalProps) {
  const startSession = useStartWorkSession();

  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setProjectName('');
      setClientName('');
      setTaskDescription('');
    }
  }, [isOpen]);

  const handleStart = async () => {
    if (!projectName.trim()) return;

    setIsStarting(true);

    try {
      await startSession.mutateAsync({
        projectName: projectName.trim(),
        clientName: clientName.trim() || undefined,
        taskDescription: taskDescription.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to start session:', error);
    }

    setIsStarting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && projectName.trim()) {
      handleStart();
    }
  };

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
            onKeyDown={handleKeyDown}
          >
            <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div className="relative p-6 text-center bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 border-b border-white/10">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 mb-4"
                >
                  <Briefcase className="w-8 h-8 text-green-400" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-1">Start Work Session</h2>
                <p className="text-white/50 text-sm">Track your time for billing and productivity</p>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-5">
                {/* Project Name */}
                <div>
                  <label className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2">
                    <Briefcase className="w-4 h-4" />
                    Project Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., Website Redesign, Mobile App, API Development"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
                    autoFocus
                  />
                </div>

                {/* Client Name */}
                <div>
                  <label className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2">
                    <User className="w-4 h-4" />
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g., Acme Corp, John Smith, Startup Inc"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Task Description */}
                <div>
                  <label className="flex items-center gap-2 text-white/70 text-sm font-medium mb-2">
                    <FileText className="w-4 h-4" />
                    What are you working on?
                  </label>
                  <textarea
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Describe your task (optional)"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all resize-none"
                  />
                </div>

                {/* Info box */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-indigo-300 font-medium">Auto-tracking enabled</p>
                    <p className="text-white/50 mt-1">
                      Screenshots will be captured periodically. Activity level and productivity will be tracked automatically.
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
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStart}
                  disabled={isStarting || !projectName.trim()}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all"
                >
                  {isStarting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start Session
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
