import { motion } from 'framer-motion';

interface LiveTimeDisplayProps {
  seconds: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSeconds?: boolean;
  color?: string;
  animate?: boolean;
}

export function LiveTimeDisplay({
  seconds,
  label,
  size = 'md',
  showSeconds = true,
  color = 'text-white',
  animate = true
}: LiveTimeDisplayProps) {
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (showSeconds) {
      if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      return `${minutes}:${String(secs).padStart(2, '0')}`;
    } else {
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    }
  };

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <motion.span
      key={seconds}
      initial={animate ? { scale: 1.02, opacity: 0.9 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={`font-mono font-bold tabular-nums ${sizeClasses[size]} ${color}`}
    >
      {formatTime(seconds)}
      {label && <span className="text-sm font-normal text-white/40 ml-2">{label}</span>}
    </motion.span>
  );
}

// Compact version for sidebar/header
export function LiveTimeCompact({
  seconds,
  productivity,
  isTracking
}: {
  seconds: number;
  productivity: number;
  isTracking: boolean;
}) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {isTracking && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-green-500/30 rounded-full blur-md"
          />
        )}
        <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-500'}`} />
      </div>
      <div>
        <p className="font-mono font-bold text-lg tabular-nums">
          {hours > 0 && <span>{hours}:</span>}
          <span>{String(minutes).padStart(2, '0')}</span>
          <span className="text-white/40">:{String(secs).padStart(2, '0')}</span>
        </p>
        <p className="text-xs text-white/50">
          {productivity}% productive
        </p>
      </div>
    </div>
  );
}
