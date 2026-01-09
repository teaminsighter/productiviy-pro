import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type ProgressColor = 'primary' | 'productive' | 'neutral' | 'distracting' | 'gradient';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: ProgressColor;
  showValue?: boolean;
  valueLabel?: string;
  className?: string;
  animate?: boolean;
}

const colorConfig: Record<ProgressColor, string> = {
  primary: '#6366f1',
  productive: '#10b981',
  neutral: '#f59e0b',
  distracting: '#ef4444',
  gradient: 'url(#progressGradient)',
};

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color = 'primary',
  showValue = true,
  valueLabel,
  className,
  animate = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Gradient definition */}
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colorConfig[color]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            filter: 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.4))',
          }}
        />
      </svg>

      {/* Center content */}
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-2xl font-bold text-white"
            initial={animate ? { opacity: 0, scale: 0.5 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {Math.round(value)}%
          </motion.span>
          {valueLabel && (
            <span className="text-xs text-white/50 mt-0.5">{valueLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Mini progress ring for inline use
export function ProgressRingMini({
  value,
  color = 'primary',
  className,
}: {
  value: number;
  color?: ProgressColor;
  className?: string;
}) {
  return (
    <ProgressRing
      value={value}
      size={32}
      strokeWidth={3}
      color={color}
      showValue={false}
      animate={false}
      className={className}
    />
  );
}

// Progress bar alternative
export function ProgressBar({
  value,
  color = 'primary',
  height = 8,
  showLabel = false,
  className,
}: {
  value: number;
  color?: ProgressColor;
  height?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const getBarColor = () => {
    switch (color) {
      case 'productive':
        return 'bg-productive';
      case 'neutral':
        return 'bg-neutral';
      case 'distracting':
        return 'bg-distracting';
      case 'gradient':
        return 'bg-gradient-to-r from-primary to-secondary';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-white/70">Progress</span>
          <span className="text-sm font-medium text-white">{Math.round(value)}%</span>
        </div>
      )}
      <div
        className="w-full bg-white/10 rounded-full overflow-hidden"
        style={{ height }}
      >
        <motion.div
          className={cn('h-full rounded-full', getBarColor())}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
