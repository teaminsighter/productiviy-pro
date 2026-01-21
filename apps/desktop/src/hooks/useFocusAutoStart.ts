import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  checkAutoStart,
  getFocusSettings,
  startFocusSession,
  getActiveSession,
} from '@/lib/api/focus';
import {
  enableBlocking,
  sendNativeNotification,
  isTauri,
} from '@/lib/tauri';

interface AutoStartEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
}

interface UseFocusAutoStartOptions {
  enabled?: boolean;
  checkInterval?: number; // in ms, default 30 seconds
  onAutoStart?: (event: AutoStartEvent) => void;
}

export function useFocusAutoStart(options: UseFocusAutoStartOptions = {}) {
  const {
    enabled = true,
    checkInterval = 30000, // Check every 30 seconds
    onAutoStart,
  } = options;

  const queryClient = useQueryClient();
  const [pendingAutoStart, setPendingAutoStart] = useState<AutoStartEvent | null>(null);
  const [showAutoStartPrompt, setShowAutoStartPrompt] = useState(false);
  const lastCheckedEventRef = useRef<string | null>(null);

  // Get focus settings to check if auto-start is enabled
  const { data: settings } = useQuery({
    queryKey: ['focus-settings'],
    queryFn: getFocusSettings,
    enabled,
  });

  // Get active session to prevent overlapping
  const { data: activeSession } = useQuery({
    queryKey: ['active-session'],
    queryFn: getActiveSession,
    enabled,
    refetchInterval: checkInterval,
  });

  // Mutation to start focus session
  const startSessionMutation = useMutation({
    mutationFn: (blockId: string) => startFocusSession(blockId),
    onSuccess: async (block) => {
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['focus-blocks'] });

      // Enable blocking in Tauri
      if (isTauri() && block.blockingEnabled) {
        await enableBlocking(
          block.blockedApps,
          block.blockedWebsites,
          settings?.blockingMode || 'soft'
        );
      }

      // Send notification
      await sendNativeNotification(
        'Focus Session Started',
        `${block.title} - ${block.durationMinutes} minutes`
      );

      toast.success('Focus session auto-started!');

      if (onAutoStart && pendingAutoStart) {
        onAutoStart(pendingAutoStart);
      }

      setPendingAutoStart(null);
      setShowAutoStartPrompt(false);
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setPendingAutoStart(null);
      setShowAutoStartPrompt(false);
    },
  });

  // Check for auto-start events
  const checkForAutoStart = useCallback(async () => {
    if (!enabled || !settings?.autoStartFromCalendar) return;

    // Don't check if there's already an active session
    if (activeSession?.status === 'active' || activeSession?.status === 'paused') {
      return;
    }

    try {
      const result = await checkAutoStart();

      if (result.shouldStart && result.event) {
        const event = result.event as Record<string, unknown>;
        const eventId = event.id as string;

        // Don't prompt for the same event twice
        if (lastCheckedEventRef.current === eventId) {
          return;
        }

        lastCheckedEventRef.current = eventId;

        const autoStartEvent: AutoStartEvent = {
          id: eventId,
          title: (event.title as string) || 'Focus Time',
          startTime: event.start_time as string,
          endTime: event.end_time as string,
          duration: event.duration_minutes as number || 50,
        };

        setPendingAutoStart(autoStartEvent);
        setShowAutoStartPrompt(true);

        // Send notification about upcoming focus
        await sendNativeNotification(
          'Focus Time Starting',
          `"${autoStartEvent.title}" is about to begin. Click to start.`
        );
      }
    } catch (error) {
      console.error('Error checking auto-start:', error);
    }
  }, [enabled, settings?.autoStartFromCalendar, activeSession]);

  // Set up polling for auto-start
  useEffect(() => {
    if (!enabled || !settings?.autoStartFromCalendar) return;

    // Initial check
    checkForAutoStart();

    // Set up interval
    const interval = setInterval(checkForAutoStart, checkInterval);

    return () => clearInterval(interval);
  }, [enabled, settings?.autoStartFromCalendar, checkInterval, checkForAutoStart]);

  // Handle confirm auto-start
  const confirmAutoStart = useCallback(() => {
    if (pendingAutoStart) {
      startSessionMutation.mutate(pendingAutoStart.id);
    }
  }, [pendingAutoStart, startSessionMutation]);

  // Handle dismiss auto-start
  const dismissAutoStart = useCallback(() => {
    setPendingAutoStart(null);
    setShowAutoStartPrompt(false);
    // Reset the last checked event to allow showing again later if needed
    setTimeout(() => {
      lastCheckedEventRef.current = null;
    }, 60000); // Allow showing again after 1 minute
  }, []);

  // Handle snooze auto-start
  const snoozeAutoStart = useCallback((minutes: number = 5) => {
    setShowAutoStartPrompt(false);
    // Allow showing again after snooze period
    setTimeout(() => {
      if (pendingAutoStart) {
        setShowAutoStartPrompt(true);
      }
    }, minutes * 60000);
  }, [pendingAutoStart]);

  return {
    pendingAutoStart,
    showAutoStartPrompt,
    isStarting: startSessionMutation.isPending,
    confirmAutoStart,
    dismissAutoStart,
    snoozeAutoStart,
    checkForAutoStart,
  };
}

export default useFocusAutoStart;
