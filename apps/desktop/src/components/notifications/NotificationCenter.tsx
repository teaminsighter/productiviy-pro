/**
 * Notification Center Component
 *
 * Bell icon with dropdown showing notification history
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  Brain,
  Target,
  Coffee,
  Trophy,
  Flame,
  AlertTriangle,
  Zap,
  BarChart3,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useClearNotifications,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import type { Notification } from '@/lib/api/notifications';

// Icon mapping
const iconMap: Record<string, typeof Bell> = {
  brain: Brain,
  target: Target,
  coffee: Coffee,
  trophy: Trophy,
  flame: Flame,
  'alert-triangle': AlertTriangle,
  zap: Zap,
  'bar-chart': BarChart3,
  info: Info,
  'check-circle': CheckCircle2,
  'x-circle': XCircle,
  sparkles: Zap,
  star: Trophy,
};

// Default icon for each type
const typeIcons: Record<string, typeof Bell> = {
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

// Type colors
const typeColors: Record<string, string> = {
  success: 'text-productive',
  error: 'text-distracting',
  warning: 'text-amber-400',
  info: 'text-blue-400',
  ai_insight: 'text-accent',
  distraction_alert: 'text-distracting',
  goal_progress: 'text-accent',
  goal_achieved: 'text-productive',
  focus_reminder: 'text-purple-400',
  break_suggestion: 'text-blue-400',
  daily_summary: 'text-accent',
  streak_alert: 'text-orange-400',
  weekly_report: 'text-accent',
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: NotificationItemProps) {
  const Icon =
    (notification.icon ? iconMap[notification.icon] : null) ||
    typeIcons[notification.type] ||
    Bell;
  const color = typeColors[notification.type] || 'text-white/50';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
        !notification.is_read ? 'bg-white/[0.02]' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`p-2 rounded-lg bg-white/5 ${color}`}
        >
          <Icon size={16} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm font-medium ${
                notification.is_read ? 'text-white/70' : 'text-white'
              }`}
            >
              {notification.title}
            </h4>
            {!notification.is_read && (
              <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-white/50 text-xs mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-white/30 text-xs mt-1">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.is_read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Mark as read"
            >
              <Check size={14} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-white/40 hover:text-distracting hover:bg-distracting/10 transition-colors"
            title="Delete"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications, isLoading } = useNotifications(50);
  const { data: unreadCount } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const clearAll = useClearNotifications();
  const deleteNotification = useDeleteNotification();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  const handleClearAll = () => {
    clearAll.mutate();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Bell size={20} />

        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount && unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center"
            >
              <span className="text-white text-xs font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] rounded-xl bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-white font-medium">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount && unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markAllAsRead.isPending}
                    className="flex items-center gap-1 px-2 py-1 rounded text-white/50 hover:text-white hover:bg-white/10 text-xs transition-colors"
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
                {notifications && notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    disabled={clearAll.isPending}
                    className="flex items-center gap-1 px-2 py-1 rounded text-white/50 hover:text-distracting hover:bg-distracting/10 text-xs transition-colors"
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[50vh] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
                  <p className="text-white/50 text-sm mt-2">Loading...</p>
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="group">
                  <AnimatePresence>
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkRead={() => markAsRead.mutate(notification.id)}
                        onDelete={() =>
                          deleteNotification.mutate(notification.id)
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 text-sm">No notifications yet</p>
                  <p className="text-white/30 text-xs mt-1">
                    You're all caught up!
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationCenter;
