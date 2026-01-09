import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Timer,
  Target,
  Zap,
  Maximize2,
} from 'lucide-react';
import { useFocusTimer, useFocusStats } from '@/hooks/useFocus';
import { FocusSetupModal } from './FocusSetupModal';

interface FocusWidgetProps {
  compact?: boolean;
  showStats?: boolean;
  onStartFocus?: () => void;
  onOpenFullScreen?: () => void;
}

export function FocusWidget({ compact = false, showStats = true, onStartFocus, onOpenFullScreen }: FocusWidgetProps) {
  const [showSetup, setShowSetup] = useState(false);
  const { state, pause, resume, stop, formatTime, progress } = useFocusTimer();
  const { data: stats } = useFocusStats();

  const handleStartFocus = () => {
    if (onStartFocus) {
      onStartFocus();
    } else {
      setShowSetup(true);
    }
  };

  const handleOpenFullScreen = () => {
    if (onOpenFullScreen) {
      onOpenFullScreen();
    }
  };

  const quickDurations = [
    { label: '25m', value: 25 * 60, icon: Timer },
    { label: '45m', value: 45 * 60, icon: Target },
    { label: '60m', value: 60 * 60, icon: Zap },
  ];

  // Compact mode - just the timer and basic controls
  if (compact) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-xl bg-gradient-to-br from-accent/10 to-purple-500/10 border border-accent/20"
        >
          {state.isActive ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <svg className="w-10 h-10 -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-white/10"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={100}
                      strokeDashoffset={100 - progress}
                      className="text-accent"
                    />
                  </svg>
                  <Timer className="absolute inset-0 m-auto w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-white font-mono text-lg">{formatTime(state.timeRemaining)}</p>
                  <p className="text-white/50 text-xs">{state.sessionName || 'Focus Session'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={state.isPaused ? resume : pause}
                  className="p-2 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                >
                  {state.isPaused ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button
                  onClick={() => stop(false)}
                  className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <Square size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="text-accent" size={18} />
                <span className="text-white/70 text-sm">Start Focus</span>
              </div>
              <button
                onClick={handleStartFocus}
                className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
              >
                <Play size={14} className="inline mr-1" />
                Start
              </button>
            </div>
          )}
        </motion.div>

        <FocusSetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} />
      </>
    );
  }

  // Full widget mode
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="text-accent" size={20} />
          <h3 className="text-white font-medium">Focus Timer</h3>
        </div>

        <AnimatePresence mode="wait">
          {state.isActive ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Timer Display */}
              <div className="flex flex-col items-center py-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-white/10"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="url(#focusGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={352}
                      strokeDashoffset={352 - (352 * progress) / 100}
                      initial={{ strokeDashoffset: 352 }}
                      animate={{ strokeDashoffset: 352 - (352 * progress) / 100 }}
                      transition={{ duration: 0.5 }}
                    />
                    <defs>
                      <linearGradient id="focusGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7c3aed" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-white text-3xl font-mono font-bold">
                      {formatTime(state.timeRemaining)}
                    </span>
                    <span className="text-white/50 text-xs">
                      {state.isPaused ? 'Paused' : 'remaining'}
                    </span>
                  </div>
                </div>

                {state.sessionName && (
                  <p className="text-white/70 text-sm mt-3">{state.sessionName}</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={state.isPaused ? resume : pause}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  {state.isPaused ? <Play size={18} /> : <Pause size={18} />}
                  {state.isPaused ? 'Resume' : 'Pause'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => stop(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <Square size={18} />
                  End
                </motion.button>
              </div>

              {/* Full Screen Button */}
              {onOpenFullScreen && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenFullScreen}
                  className="w-full py-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Maximize2 size={14} />
                  Full Screen Mode
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Quick Start Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {quickDurations.map(({ label, icon: Icon }) => (
                  <motion.button
                    key={label}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartFocus}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 transition-all"
                  >
                    <Icon className="text-accent" size={20} />
                    <span className="text-white font-medium">{label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Custom Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartFocus}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
              >
                <Play size={18} className="inline mr-2" />
                Start Focus Session
              </motion.button>

              {/* Quick Stats */}
              {showStats && stats && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-white/50 text-xs">Today</p>
                    <p className="text-white font-medium">
                      {Math.floor(stats.today_focus_time / 60)}m
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/50 text-xs">Sessions</p>
                    <p className="text-white font-medium">{stats.today_sessions}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <FocusSetupModal isOpen={showSetup} onClose={() => setShowSetup(false)} />
    </>
  );
}

export default FocusWidget;
