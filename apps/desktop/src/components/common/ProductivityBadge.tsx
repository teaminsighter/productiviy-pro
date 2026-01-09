import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export type ProductivityType = 'productive' | 'neutral' | 'distracting';
type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface ProductivityBadgeProps {
  type?: ProductivityType;
  size?: BadgeSize;
  showLabel?: boolean;
  glow?: boolean;
  className?: string;
  // Alternative props for numeric productivity
  productivity?: number;
}

const typeConfig: Record<ProductivityType, { label: string; color: string; bgColor: string; borderColor: string }> = {
  productive: {
    label: 'Productive',
    color: 'text-productive',
    bgColor: 'bg-productive/15',
    borderColor: 'border-productive/30',
  },
  neutral: {
    label: 'Neutral',
    color: 'text-neutral',
    bgColor: 'bg-neutral/15',
    borderColor: 'border-neutral/30',
  },
  distracting: {
    label: 'Distracting',
    color: 'text-distracting',
    bgColor: 'bg-distracting/15',
    borderColor: 'border-distracting/30',
  },
};

const sizeConfig: Record<BadgeSize, { padding: string; text: string; dot: string }> = {
  xs: { padding: 'px-1.5 py-0.5', text: 'text-[10px]', dot: 'w-1.5 h-1.5' },
  sm: { padding: 'px-2 py-1', text: 'text-xs', dot: 'w-2 h-2' },
  md: { padding: 'px-3 py-1.5', text: 'text-sm', dot: 'w-2.5 h-2.5' },
  lg: { padding: 'px-4 py-2', text: 'text-base', dot: 'w-3 h-3' },
};

const glowColors: Record<ProductivityType, string> = {
  productive: 'shadow-[0_0_10px_rgba(16,185,129,0.3)]',
  neutral: 'shadow-[0_0_10px_rgba(245,158,11,0.3)]',
  distracting: 'shadow-[0_0_10px_rgba(239,68,68,0.3)]',
};

// Helper to convert numeric productivity to type
function getProductivityType(productivity?: number): ProductivityType {
  if (productivity === undefined || productivity === null || isNaN(productivity)) {
    return 'neutral';
  }
  if (productivity >= 60) return 'productive';
  if (productivity <= 35) return 'distracting';
  return 'neutral';
}

export function ProductivityBadge({
  type,
  size = 'sm',
  showLabel = true,
  glow = false,
  className,
  productivity,
}: ProductivityBadgeProps) {
  // Determine the type - use explicit type if provided, otherwise derive from productivity
  let resolvedType: ProductivityType = 'neutral';

  if (type && typeConfig[type]) {
    resolvedType = type;
  } else if (productivity !== undefined) {
    resolvedType = getProductivityType(productivity);
  }

  // Get config with fallback
  const config = typeConfig[resolvedType] || typeConfig.neutral;
  const sizeStyles = sizeConfig[size] || sizeConfig.sm;

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        config.bgColor,
        config.borderColor,
        config.color,
        sizeStyles.padding,
        sizeStyles.text,
        glow && glowColors[resolvedType],
        className
      )}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <span className={cn('rounded-full', sizeStyles.dot, {
        'bg-productive': resolvedType === 'productive',
        'bg-neutral': resolvedType === 'neutral',
        'bg-distracting': resolvedType === 'distracting',
      })} />
      {showLabel && config.label}
    </motion.span>
  );
}

// Dot-only variant
export function ProductivityDot({
  type,
  size = 'sm',
  pulse = false,
  className,
}: {
  type?: ProductivityType;
  size?: BadgeSize;
  pulse?: boolean;
  className?: string;
}) {
  // Default to neutral if type is undefined
  const safeType: ProductivityType = type && typeConfig[type] ? type : 'neutral';
  const sizeStyles = sizeConfig[size] || sizeConfig.sm;

  return (
    <motion.span
      className={cn(
        'rounded-full',
        sizeStyles.dot,
        {
          'bg-productive': safeType === 'productive',
          'bg-neutral': safeType === 'neutral',
          'bg-distracting': safeType === 'distracting',
        },
        className
      )}
      animate={pulse ? {
        scale: [1, 1.2, 1],
        opacity: [1, 0.7, 1],
      } : undefined}
      transition={pulse ? {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      } : undefined}
    />
  );
}

// Export a score-based badge for numeric values
export function ProductivityScoreBadge({
  score = 0,
  size = 'md',
  className,
}: {
  score?: number;
  size?: BadgeSize;
  className?: string;
}) {
  const safeScore = typeof score === 'number' && !isNaN(score) ? Math.max(0, Math.min(100, score)) : 0;
  const type = getProductivityType(safeScore);
  const config = typeConfig[type];
  const sizeStyles = sizeConfig[size] || sizeConfig.md;

  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        config.bgColor,
        config.borderColor,
        config.color,
        sizeStyles.padding,
        sizeStyles.text,
        className
      )}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <span className={cn('rounded-full', sizeStyles.dot, {
        'bg-productive': type === 'productive',
        'bg-neutral': type === 'neutral',
        'bg-distracting': type === 'distracting',
      })} />
      {safeScore}%
    </motion.span>
  );
}
