/**
 * Active Session Hero
 * Beautiful hero card showing the current work session with live timer
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, Square, User, Activity, Camera } from 'lucide-react';
import type { WorkSession } from '@/lib/api/work-sessions';

interface ActiveSessionHeroProps {
  session: WorkSession;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  isPausing?: boolean;
  isResuming?: boolean;
}

export function ActiveSessionHero({
  session,
  onPause,
  onResume,
  onEnd,
  isPausing,
  isResuming,
}: ActiveSessionHeroProps) {
  const [elapsed, setElapsed] = useState(0);

  // Calculate and update elapsed time
  useEffect(() => {
    const startTime = new Date(session.startedAt).getTime();
    const pausedTime = session.pausedDuration * 1000;

    const updateElapsed = () => {
      if (session.status === 'active') {
        const now = Date.now();
        setElapsed(Math.floor((now - startTime - pausedTime) / 1000));
      }
    };

    updateElapsed();

    if (session.status === 'active') {
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    }
  }, [session.startedAt, session.pausedDuration, session.status]);

  // Format time for display
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const isActive = session.status === 'active';

  // Progress ring calculation (for activity level)
  const activityProgress = (session.activityLevel / 100) * 251.2; // 2 * PI * 40

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-2xl p-6
        ${isActive
          ? 'bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 border-2 border-green-500/30'
          : 'bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-yellow-500/10 border-2 border-orange-500/30'
        }
      `}
    >
      {/* Animated background glow */}
      {isActive && (
        <motion.div
          className="absolute inset-0 bg-green-500/5"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative flex items-start gap-6">
        {/* Left: Timer Ring */}
        <div className="flex-shrink-0">
          <div className="relative w-32 h-32">
            {/* Background ring */}
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-white/10"
              />
              {/* Progress ring */}
              <motion.circle
                cx="50" cy="50" r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={isActive ? 'text-green-500' : 'text-orange-500'}
                strokeDasharray="251.2"
                initial={{ strokeDashoffset: 251.2 }}
                animate={{ strokeDashoffset: 251.2 - activityProgress }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>

            {/* Timer display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="flex items-baseline justify-center">
                  <motion.span
                    key={hours}
                    initial={{ y: -5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-2xl font-bold tabular-nums text-white"
                  >
                    {String(hours).padStart(2, '0')}
                  </motion.span>
                  <span className="text-white/40 mx-0.5">:</span>
                  <motion.span
                    key={minutes}
                    initial={{ y: -5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-2xl font-bold tabular-nums text-white"
                  >
                    {String(minutes).padStart(2, '0')}
                  </motion.span>
                  <span className="text-white/40 mx-0.5">:</span>
                  <motion.span
                    key={seconds}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-lg font-medium tabular-nums text-white/60"
                  >
                    {String(seconds).padStart(2, '0')}
                  </motion.span>
                </div>
                <p className="text-xs text-white/40 mt-1">
                  {isActive ? 'Active' : 'Paused'}
                </p>
              </div>
            </div>

            {/* Pulsing indicator for active state */}
            {isActive && (
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
        </div>

        {/* Middle: Session Info */}
        <div className="flex-1 min-w-0">
          {/* Status badge */}
          <div className="flex items-center gap-2 mb-3">
            <div className={`
              flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
              ${isActive
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              }
            `}>
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`} />
              {isActive ? 'Recording' : 'Paused'}
            </div>
          </div>

          {/* Project name */}
          <h2 className="text-xl font-bold text-white truncate mb-1">
            {session.projectName || 'Untitled Project'}
          </h2>

          {/* Task description */}
          {session.taskDescription && (
            <p className="text-white/50 text-sm truncate mb-3">
              {session.taskDescription}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm">
            {session.clientName && (
              <div className="flex items-center gap-1.5 text-white/50">
                <User className="w-4 h-4" />
                <span>{session.clientName}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-white/50">
              <Camera className="w-4 h-4" />
              <span>{session.screenshotCount} screenshots</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/50">
              <Activity className="w-4 h-4" />
              <span>{Math.round(session.activityLevel)}% activity</span>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Pause/Resume Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isActive ? onPause : onResume}
            disabled={isPausing || isResuming}
            className={`
              flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all
              ${isActive
                ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isPausing || isResuming ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full"
              />
            ) : isActive ? (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Resume
              </>
            )}
          </motion.button>

          {/* End Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnd}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all"
          >
            <Square className="w-4 h-4" />
            End Session
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
