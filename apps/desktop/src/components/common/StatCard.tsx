import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

type TrendType = 'up' | 'down' | 'neutral';
type ColorType = 'primary' | 'productive' | 'neutral' | 'distracting' | 'default';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: TrendType;
  trendValue?: string;
  icon?: LucideIcon;
  color?: ColorType;
  animate?: boolean;
  className?: string;
}

const colorClasses: Record<ColorType, { bg: string; text: string; icon: string }> = {
  primary: {
    bg: 'bg-primary/20',
    text: 'text-primary',
    icon: 'text-primary',
  },
  productive: {
    bg: 'bg-productive/20',
    text: 'text-productive',
    icon: 'text-productive',
  },
  neutral: {
    bg: 'bg-neutral/20',
    text: 'text-neutral',
    icon: 'text-neutral',
  },
  distracting: {
    bg: 'bg-distracting/20',
    text: 'text-distracting',
    icon: 'text-distracting',
  },
  default: {
    bg: 'bg-white/10',
    text: 'text-white',
    icon: 'text-white/70',
  },
};

const trendIcons: Record<TrendType, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const trendColors: Record<TrendType, string> = {
  up: 'text-productive',
  down: 'text-distracting',
  neutral: 'text-white/50',
};

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon: Icon,
  color = 'default',
  animate = true,
  className,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(animate ? '0' : String(value));
  const colors = colorClasses[color];
  const TrendIcon = trend ? trendIcons[trend] : null;

  // Animate number counter
  useEffect(() => {
    if (!animate || typeof value !== 'number') {
      setDisplayValue(String(value));
      return;
    }

    const duration = 1000;
    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const currentValue = Math.round(easeProgress * (value as number));
      setDisplayValue(String(currentValue));

      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayValue(String(value));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, animate]);

  return (
    <motion.div
      className={cn('glass-card p-5', className)}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-white/60 text-sm font-medium">{title}</p>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.bg)}>
            <Icon className={cn('w-5 h-5', colors.icon)} />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <motion.p
          className={cn('text-3xl font-bold', colors.text)}
          key={displayValue}
        >
          {displayValue}
        </motion.p>

        {subtitle && (
          <p className="text-white/50 text-sm">{subtitle}</p>
        )}

        {trend && trendValue && TrendIcon && (
          <div className={cn('flex items-center gap-1 mt-2', trendColors[trend])}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-xs font-medium">{trendValue}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
