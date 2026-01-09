import { motion, HTMLMotionProps } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'title'> {
  title?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  hoverable?: boolean;
  glowOnHover?: boolean;
}

export function GlassCard({
  title,
  icon: Icon,
  children,
  className,
  contentClassName,
  headerClassName,
  hoverable = true,
  glowOnHover = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        'glass-card overflow-hidden',
        hoverable && 'hover:shadow-glass-hover',
        glowOnHover && 'hover:shadow-glow',
        className
      )}
      whileHover={hoverable ? { y: -2, scale: 1.01 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      {...props}
    >
      {(title || Icon) && (
        <div className={cn('flex items-center gap-3 p-5 pb-0', headerClassName)}>
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
          {title && (
            <h3 className="text-base font-semibold text-white">{title}</h3>
          )}
        </div>
      )}
      <div className={cn('p-5', title && 'pt-4', contentClassName)}>
        {children}
      </div>
    </motion.div>
  );
}

// Variant without hover effects for static cards
export function GlassCardStatic({
  children,
  className,
  ...props
}: Omit<GlassCardProps, 'hoverable' | 'glowOnHover'>) {
  return (
    <GlassCard
      hoverable={false}
      glowOnHover={false}
      className={className}
      {...props}
    >
      {children}
    </GlassCard>
  );
}
