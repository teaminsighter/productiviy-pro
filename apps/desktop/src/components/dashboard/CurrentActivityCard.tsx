import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Globe, Clock, Zap, Pause, Play } from 'lucide-react';
import { LiveTimeDisplay } from '@/components/common/LiveTimeDisplay';

interface CurrentActivityProps {
  activity: {
    app_name: string;
    title: string;
    duration: number;
    category: string;
    is_productive: boolean;
  } | null;
  isTracking: boolean;
  onToggleTracking: () => void;
}

export function CurrentActivityCard({
  activity,
  isTracking,
  onToggleTracking
}: CurrentActivityProps) {
  const [pulseKey, setPulseKey] = useState(0);

  // Pulse effect every second when tracking
  useEffect(() => {
    if (isTracking && activity) {
      const interval = setInterval(() => {
        setPulseKey(k => k + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isTracking, activity]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      development: 'from-blue-500 to-cyan-500',
      design: 'from-purple-500 to-pink-500',
      communication: 'from-green-500 to-emerald-500',
      entertainment: 'from-red-500 to-orange-500',
      productivity: 'from-indigo-500 to-violet-500',
      browsing: 'from-yellow-500 to-amber-500',
      social: 'from-pink-500 to-rose-500',
      other: 'from-gray-500 to-gray-600',
    };
    return colors[category?.toLowerCase()] || 'from-gray-500 to-gray-600';
  };

  return (
    <motion.div
      layout
      className="relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
    >
      {/* Animated background pulse when tracking */}
      {isTracking && activity && (
        <motion.div
          key={pulseKey}
          initial={{ opacity: 0.2, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className={`absolute inset-0 bg-gradient-to-r ${getCategoryColor(activity.category)} rounded-2xl`}
        />
      )}

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              {isTracking && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-green-500 rounded-full"
                />
              )}
              <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-500'}`} />
            </div>
            <span className="text-sm font-medium text-white/60">
              {isTracking ? 'Currently Tracking' : 'Tracking Paused'}
            </span>
          </div>

          <button
            onClick={onToggleTracking}
            className={`p-2 rounded-lg transition-colors ${
              isTracking
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            }`}
          >
            {isTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>

        {/* Current Activity */}
        <AnimatePresence mode="wait">
          {activity ? (
            <motion.div
              key={activity.app_name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${getCategoryColor(activity.category)} flex items-center justify-center`}>
                  {activity.app_name.toLowerCase().includes('chrome') ||
                   activity.app_name.toLowerCase().includes('firefox') ||
                   activity.app_name.toLowerCase().includes('safari') ? (
                    <Globe className="w-7 h-7 text-white" />
                  ) : (
                    <Monitor className="w-7 h-7 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white truncate">{activity.app_name}</h3>
                  <p className="text-white/50 text-sm truncate">{activity.title}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                      activity.is_productive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-white/10 text-white/50'
                    }`}>
                      {activity.category || 'Other'}
                    </span>
                    {activity.is_productive && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <Zap className="w-3 h-3" />
                        Productive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Duration */}
              <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                <div className="flex items-center gap-2 text-white/50">
                  <Clock className="w-5 h-5" />
                  <span>Session Time</span>
                </div>
                <LiveTimeDisplay
                  seconds={activity.duration}
                  size="lg"
                  color={activity.is_productive ? 'text-green-400' : 'text-white'}
                  animate={true}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-white/40"
            >
              <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activity detected</p>
              <p className="text-sm">Start using an app to begin tracking</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
