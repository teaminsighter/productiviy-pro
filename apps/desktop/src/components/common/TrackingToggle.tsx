/**
 * Tracking Toggle - Start/Stop activity tracking
 */
import { motion } from 'framer-motion';
import { Play, Pause, Circle } from 'lucide-react';
import { useActivityStore } from '@/stores/activityStore';

interface TrackingToggleProps {
  size?: 'sm' | 'md' | 'lg';
}

export function TrackingToggle({ size = 'md' }: TrackingToggleProps) {
  const { isTracking, toggleTracking } = useActivityStore();

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const controlIconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <motion.button
      onClick={toggleTracking}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        flex items-center rounded-full font-medium
        transition-all duration-300
        ${sizeClasses[size]}
        ${isTracking
          ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
          : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
        }
      `}
    >
      {isTracking ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Circle className={`${iconSizes[size]} fill-green-500 text-green-500`} />
          </motion.div>
          <span>Tracking</span>
          <Pause className={controlIconSizes[size]} />
        </>
      ) : (
        <>
          <Circle className={`${iconSizes[size]} fill-gray-500 text-gray-500`} />
          <span>Paused</span>
          <Play className={controlIconSizes[size]} />
        </>
      )}
    </motion.button>
  );
}

export default TrackingToggle;
