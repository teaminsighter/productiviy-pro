/**
 * Notification Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  fetchUnreadCount,
  createNotification,
  markNotificationRead,
  deleteNotification,
  markAllNotificationsRead,
  clearAllNotifications,
  fetchNotificationSettings,
  updateNotificationSettings,
  Notification,
  NotificationCreate,
  NotificationType,
  NotificationSettings,
  NotificationSettingsUpdate,
} from '@/lib/api/notifications';

// ============================================================================
// Query Keys
// ============================================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (limit: number, unreadOnly: boolean, type?: NotificationType) =>
    [...notificationKeys.all, 'list', limit, unreadOnly, type] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  settings: () => [...notificationKeys.all, 'settings'] as const,
};

// ============================================================================
// Notification Hooks
// ============================================================================

/**
 * Fetch notifications list
 */
export function useNotifications(
  limit: number = 50,
  unreadOnly: boolean = false,
  type?: NotificationType
) {
  return useQuery<Notification[], Error>({
    queryKey: notificationKeys.list(limit, unreadOnly, type),
    queryFn: () => fetchNotifications(limit, unreadOnly, type),
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Fetch unread notification count (for badge)
 */
export function useUnreadCount() {
  return useQuery<number, Error>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: fetchUnreadCount,
    staleTime: 5000,
    refetchInterval: 15000, // Check more frequently
  });
}

/**
 * Create a new notification
 */
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation<Notification, Error, NotificationCreate>({
    mutationFn: createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mark a notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation<Notification, Error, number>({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Delete (dismiss) a notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Clear all notifications
 */
export function useClearNotifications() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: clearAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// ============================================================================
// Notification Settings Hooks
// ============================================================================

/**
 * Fetch notification settings
 */
export function useNotificationSettings() {
  return useQuery<NotificationSettings, Error>({
    queryKey: notificationKeys.settings(),
    queryFn: fetchNotificationSettings,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Update notification settings
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation<NotificationSettings, Error, NotificationSettingsUpdate>({
    mutationFn: updateNotificationSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(notificationKeys.settings(), data);
    },
  });
}
