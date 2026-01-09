/**
 * Notification Toast Component
 *
 * Beautiful glass-style toast notification
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Brain,
  Target,
  Coffee,
  Trophy,
  Flame,
  Bell,
  BarChart3,
  Zap,
} from 'lucide-react';
import type { ToastNotification } from './NotificationProvider';

interface NotificationToastProps {
  notification: ToastNotification;
  onDismiss: () => void;
  onAction?: (action: string) => void;
}

// Icon mapping
const iconMap: Record<string, typeof CheckCircle2> = {
  'check-circle': CheckCircle2,
  'x-circle': XCircle,
  'alert-triangle': AlertTriangle,
  info: Info,
  brain: Brain,
  target: Target,
  coffee: Coffee,
  trophy: Trophy,
  flame: Flame,
  bell: Bell,
  'bar-chart': BarChart3,
  zap: Zap,
  sparkles: Zap, // Using Zap as fallback for sparkles
  thumbs_up: CheckCircle2,
  star: Trophy,
};

// Type colors and styles
const typeStyles: Record<
  string,
  { bg: string; border: string; icon: string; iconBg: string }
> = {
  success: {
    bg: 'from-productive/20 to-green-500/10',
    border: 'border-productive/30',
    icon: 'text-productive',
    iconBg: 'bg-productive/20',
  },
  error: {
    bg: 'from-distracting/20 to-red-500/10',
    border: 'border-distracting/30',
    icon: 'text-distracting',
    iconBg: 'bg-distracting/20',
  },
  warning: {
    bg: 'from-amber-500/20 to-yellow-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
  },
  info: {
    bg: 'from-blue-500/20 to-cyan-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
  },
  ai_insight: {
    bg: 'from-accent/20 to-purple-500/10',
    border: 'border-accent/30',
    icon: 'text-accent',
    iconBg: 'bg-accent/20',
  },
  distraction_alert: {
    bg: 'from-distracting/20 to-orange-500/10',
    border: 'border-distracting/30',
    icon: 'text-distracting',
    iconBg: 'bg-distracting/20',
  },
  goal_progress: {
    bg: 'from-accent/20 to-blue-500/10',
    border: 'border-accent/30',
    icon: 'text-accent',
    iconBg: 'bg-accent/20',
  },
  goal_achieved: {
    bg: 'from-productive/20 to-green-500/10',
    border: 'border-productive/30',
    icon: 'text-productive',
    iconBg: 'bg-productive/20',
  },
  focus_reminder: {
    bg: 'from-purple-500/20 to-accent/10',
    border: 'border-purple-500/30',
    icon: 'text-purple-400',
    iconBg: 'bg-purple-500/20',
  },
  break_suggestion: {
    bg: 'from-blue-500/20 to-cyan-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
  },
  daily_summary: {
    bg: 'from-accent/20 to-purple-500/10',
    border: 'border-accent/30',
    icon: 'text-accent',
    iconBg: 'bg-accent/20',
  },
  streak_alert: {
    bg: 'from-orange-500/20 to-amber-500/10',
    border: 'border-orange-500/30',
    icon: 'text-orange-400',
    iconBg: 'bg-orange-500/20',
  },
  weekly_report: {
    bg: 'from-accent/20 to-purple-500/10',
    border: 'border-accent/30',
    icon: 'text-accent',
    iconBg: 'bg-accent/20',
  },
};

// Default icon for each type
const defaultIcons: Record<string, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  ai_insight: Brain,
  distraction_alert: AlertTriangle,
  goal_progress: Target,
  goal_achieved: Trophy,
  focus_reminder: Zap,
  break_suggestion: Coffee,
  daily_summary: BarChart3,
  streak_alert: Flame,
  weekly_report: BarChart3,
};

export function NotificationToast({
  notification,
  onDismiss,
  onAction,
}: NotificationToastProps) {
  const [progress, setProgress] = useState(100);

  const style = typeStyles[notification.type] || typeStyles.info;
  const IconComponent =
    (notification.icon ? iconMap[notification.icon] : null) ||
    defaultIcons[notification.type] ||
    Info;

  // Progress bar animation for auto-dismiss
  useEffect(() => {
    if (!notification.duration || notification.duration <= 0) return;

    const startTime = Date.now();
    const duration = notification.duration;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification.duration]);

  const handleAction = (action: string) => {
    if (action === 'dismiss') {
      onDismiss();
    } else {
      onAction?.(action);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative w-full max-w-sm rounded-xl bg-gradient-to-br ${style.bg} border ${style.border} backdrop-blur-xl shadow-2xl overflow-hidden`}
    >
      {/* Progress bar */}
      {notification.duration && notification.duration > 0 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
          <motion.div
            className={`h-full ${style.icon.replace('text-', 'bg-')}`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.05 }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`p-2 rounded-lg ${style.iconBg}`}>
            <IconComponent className={style.icon} size={20} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium text-sm">{notification.title}</h4>
            {notification.message && (
              <p className="text-white/60 text-xs mt-1 line-clamp-2">
                {notification.message}
              </p>
            )}

            {/* Actions */}
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                {notification.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action.action)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      action.primary
                        ? `${style.iconBg} ${style.icon} hover:opacity-80`
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Toast container component
interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  onAction?: (id: string, action: string) => void;
}

export function ToastContainer({
  toasts,
  onDismiss,
  onAction,
}: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <NotificationToast
              notification={toast}
              onDismiss={() => {
                toast.onDismiss?.();
                onDismiss(toast.id);
              }}
              onAction={(action) => {
                toast.onAction?.(action);
                onAction?.(toast.id, action);
              }}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default NotificationToast;
