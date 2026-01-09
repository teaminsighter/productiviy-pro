/**
 * Notification Provider
 *
 * Context for managing in-app notifications with queue system
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import type { Notification, NotificationType } from '@/lib/api/notifications';

// In-app notification (toast)
export interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
  duration?: number; // Auto-dismiss after ms (0 = no auto-dismiss)
  onAction?: (action: string) => void;
  onDismiss?: () => void;
}

interface NotificationContextType {
  // Toast notifications
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Quick toast helpers
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;

  // From API notification
  showNotification: (notification: Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function NotificationProvider({
  children,
  maxToasts = 5,
}: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Generate unique ID
  const generateId = () =>
    `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add a toast notification
  const addToast = useCallback(
    (toast: Omit<ToastNotification, 'id'>): string => {
      const id = generateId();
      const newToast: ToastNotification = {
        ...toast,
        id,
        duration: toast.duration ?? 5000, // Default 5 seconds
      };

      setToasts((prev) => {
        // Limit number of toasts
        const updated = [...prev, newToast];
        if (updated.length > maxToasts) {
          return updated.slice(-maxToasts);
        }
        return updated;
      });

      // Auto-dismiss if duration is set
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.duration);
      }

      return id;
    },
    [maxToasts]
  );

  // Remove a toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Quick helpers
  const showSuccess = useCallback(
    (title: string, message?: string) => {
      addToast({
        type: 'success',
        title,
        message: message || '',
        icon: 'check-circle',
      });
    },
    [addToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => {
      addToast({
        type: 'error',
        title,
        message: message || '',
        icon: 'x-circle',
        duration: 8000, // Longer for errors
      });
    },
    [addToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      addToast({
        type: 'warning',
        title,
        message: message || '',
        icon: 'alert-triangle',
      });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      addToast({
        type: 'info',
        title,
        message: message || '',
        icon: 'info',
      });
    },
    [addToast]
  );

  // Show notification from API
  const showNotification = useCallback(
    (notification: Notification) => {
      addToast({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        icon: notification.icon || undefined,
        actions: notification.actions || undefined,
        duration: notification.priority === 'high' ? 10000 : 5000,
      });
    },
    [addToast]
  );

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        clearToasts,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notification context
export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    );
  }
  return context;
}

export default NotificationProvider;
