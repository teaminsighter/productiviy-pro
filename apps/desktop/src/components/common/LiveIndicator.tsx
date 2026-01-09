import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LiveIndicatorProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'green' | 'red' | 'yellow' | 'blue';
  className?: string;
}

const sizeConfig = {
  sm: { dot: 'w-2 h-2', text: 'text-xs', gap: 'gap-1.5' },
  md: { dot: 'w-2.5 h-2.5', text: 'text-sm', gap: 'gap-2' },
  lg: { dot: 'w-3 h-3', text: 'text-base', gap: 'gap-2.5' },
};

const colorConfig = {
  green: { bg: 'bg-green-500', glow: 'rgba(34, 197, 94, 0.6)' },
  red: { bg: 'bg-red-500', glow: 'rgba(239, 68, 68, 0.6)' },
  yellow: { bg: 'bg-yellow-500', glow: 'rgba(234, 179, 8, 0.6)' },
  blue: { bg: 'bg-blue-500', glow: 'rgba(59, 130, 246, 0.6)' },
};

export function LiveIndicator({
  label = 'Live',
  size = 'md',
  color = 'green',
  className,
}: LiveIndicatorProps) {
  const sizeStyles = sizeConfig[size];
  const colorStyles = colorConfig[color];

  return (
    <div className={cn('flex items-center', sizeStyles.gap, className)}>
      {/* Pulsing dot with glow */}
      <div className="relative">
        {/* Glow ring */}
        <motion.div
          className={cn('absolute inset-0 rounded-full', colorStyles.bg)}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Main dot */}
        <motion.div
          className={cn('relative rounded-full', sizeStyles.dot, colorStyles.bg)}
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            boxShadow: `0 0 10px ${colorStyles.glow}`,
          }}
        />
      </div>
      {/* Label */}
      {label && (
        <span className={cn('text-white/60 font-medium', sizeStyles.text)}>
          {label}
        </span>
      )}
    </div>
  );
}

// Recording variant with stronger animation
export function RecordingIndicator({
  label = 'Recording',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <motion.div
        className="w-3 h-3 rounded-full bg-red-500"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          boxShadow: '0 0 12px rgba(239, 68, 68, 0.7)',
        }}
      />
      <span className="text-red-400 text-sm font-medium">{label}</span>
    </div>
  );
}

// Tracking status indicator
export function TrackingIndicator({
  isTracking = true,
  className,
}: {
  isTracking?: boolean;
  className?: string;
}) {
  return (
    <LiveIndicator
      label={isTracking ? 'Tracking Active' : 'Tracking Paused'}
      color={isTracking ? 'green' : 'yellow'}
      size="sm"
      className={className}
    />
  );
}
