import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Target,
  Minimize2,
  Volume2,
  VolumeX,
  Coffee,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useFocusTimer } from '@/hooks/useFocus';

interface FocusTimerProps {
  onMinimize?: () => void;
  onComplete?: () => void;
}

const motivationalMessages = [
  "You're doing great! Keep going.",
  "Stay focused, you've got this!",
  "Deep work creates deep value.",
  "One step at a time.",
  "Your future self will thank you.",
  "Focus is your superpower.",
  "Great things take time and focus.",
  "You're building something amazing.",
  "Stay in the zone.",
  "Progress, not perfection.",
];

export function FocusTimer({ onMinimize, onComplete }: FocusTimerProps) {
  const { state, pause, resume, stop, formatTime, progress } = useFocusTimer();
  const [message, setMessage] = useState(motivationalMessages[0]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);

  // Rotate motivational messages
  useEffect(() => {
    if (!state.isActive || state.isPaused) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
      setMessage(motivationalMessages[randomIndex]);
    }, 30000); // Change every 30 seconds

    return () => clearInterval(interval);
  }, [state.isActive, state.isPaused]);

  // Handle completion
  useEffect(() => {
    if (state.timeRemaining === 0 && state.elapsedTime > 0 && state.isActive) {
      setShowCompletion(true);
      onComplete?.();
    }
  }, [state.timeRemaining, state.elapsedTime, state.isActive, onComplete]);

  const handleEnd = async (completed: boolean = false) => {
    await stop(completed);
    if (completed) {
      setShowCompletion(true);
    }
  };

  // Calculate circle properties
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-gray-950 to-black flex flex-col"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Target className="text-accent" size={24} />
          <span className="text-white font-medium">Focus Mode</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Minimize2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {showCompletion ? (
            <motion.div
              key="completion"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-32 h-32 rounded-full bg-gradient-to-r from-productive to-green-400 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="text-white" size={64} />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-white mb-2"
              >
                Session Complete!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-white/60 mb-8"
              >
                Great job staying focused for {formatTime(state.totalDuration)}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-4"
              >
                <button
                  onClick={() => setShowCompletion(false)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <Coffee size={20} />
                  Take a Break
                </button>
                <button
                  onClick={() => {
                    setShowCompletion(false);
                    // Could trigger new session setup here
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-purple-500 text-white hover:opacity-90 transition-opacity"
                >
                  <Sparkles size={20} />
                  New Session
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              {/* Timer Circle */}
              <div className="relative w-80 h-80 mb-8">
                <svg className="w-full h-full -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="160"
                    cy="160"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-white/10"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="160"
                    cy="160"
                    r={radius}
                    fill="none"
                    stroke="url(#timerGradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  />
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7c3aed" />
                      <stop offset="50%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    key={state.timeRemaining}
                    initial={{ opacity: 0.5, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-6xl font-mono font-bold text-white"
                  >
                    {formatTime(state.timeRemaining)}
                  </motion.span>
                  <span className="text-white/40 text-sm mt-2">
                    {state.isPaused ? 'Paused' : 'remaining'}
                  </span>
                </div>
              </div>

              {/* Session Name */}
              {state.sessionName && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white/70 text-xl mb-4"
                >
                  {state.sessionName}
                </motion.p>
              )}

              {/* Motivational Message */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={message}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-white/50 text-lg mb-8 h-6"
                >
                  {message}
                </motion.p>
              </AnimatePresence>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={state.isPaused ? resume : pause}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  {state.isPaused ? (
                    <>
                      <Play size={24} />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause size={24} />
                      Pause
                    </>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleEnd(false)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <Square size={24} />
                  End Session
                </motion.button>
              </div>

              {/* Progress Stats */}
              <div className="flex items-center justify-center gap-8 mt-8 text-white/40">
                <div className="text-center">
                  <p className="text-2xl font-mono text-white">{Math.round(progress)}%</p>
                  <p className="text-xs">Complete</p>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <p className="text-2xl font-mono text-white">{formatTime(state.elapsedTime)}</p>
                  <p className="text-xs">Elapsed</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom hint */}
      <div className="p-4 text-center">
        <p className="text-white/30 text-xs">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Esc</kbd> to minimize
        </p>
      </div>
    </motion.div>
  );
}

export default FocusTimer;
