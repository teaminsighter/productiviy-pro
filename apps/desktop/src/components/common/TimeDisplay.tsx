import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type TimeFormat = 'short' | 'long' | 'digital';

interface TimeDisplayProps {
  seconds: number;
  live?: boolean;
  format?: TimeFormat;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeConfig = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
};

function formatTime(totalSeconds: number, format: TimeFormat): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  switch (format) {
    case 'short':
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      }
      return `${seconds}s`;

    case 'long':
      const parts = [];
      if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
      if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
      if (seconds > 0 && hours === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
      return parts.join(' ') || '0 seconds';

    case 'digital':
      const pad = (n: number) => n.toString().padStart(2, '0');
      if (hours > 0) {
        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      }
      return `${pad(minutes)}:${pad(seconds)}`;

    default:
      return formatTime(totalSeconds, 'short');
  }
}

export function TimeDisplay({
  seconds: initialSeconds,
  live = false,
  format = 'short',
  className,
  size = 'md',
}: TimeDisplayProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!live) return;

    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [live]);

  return (
    <motion.span
      className={cn('font-mono font-semibold text-white', sizeConfig[size], className)}
      key={seconds}
      initial={live ? { opacity: 0.5 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {formatTime(seconds, format)}
    </motion.span>
  );
}

// Countdown variant
export function CountdownDisplay({
  targetSeconds,
  onComplete,
  format = 'digital',
  className,
  size = 'md',
}: {
  targetSeconds: number;
  onComplete?: () => void;
  format?: TimeFormat;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [remaining, setRemaining] = useState(targetSeconds);

  useEffect(() => {
    setRemaining(targetSeconds);
  }, [targetSeconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, onComplete]);

  const isUrgent = remaining <= 60;

  return (
    <motion.span
      className={cn(
        'font-mono font-semibold',
        sizeConfig[size],
        isUrgent ? 'text-distracting' : 'text-white',
        className
      )}
      animate={isUrgent ? { scale: [1, 1.05, 1] } : undefined}
      transition={isUrgent ? { duration: 0.5, repeat: Infinity } : undefined}
    >
      {formatTime(remaining, format)}
    </motion.span>
  );
}

// Session timer for current activity
export function SessionTimer({
  startTime,
  className,
}: {
  startTime: Date;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      return Math.floor((Date.now() - startTime.getTime()) / 1000);
    };

    setElapsed(calculateElapsed());

    const timer = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <TimeDisplay
      seconds={elapsed}
      format="digital"
      size="lg"
      className={className}
    />
  );
}
