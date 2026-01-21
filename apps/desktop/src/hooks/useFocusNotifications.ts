import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getFocusSettings,
  getActiveSession,
  type FocusBlock,
} from '@/lib/api/focus';
import {
  sendSmartNotification,
} from '@/lib/tauri';

interface UseFocusNotificationsOptions {
  enabled?: boolean;
  onBreakSuggested?: () => void;
  onSessionEnding?: (minutesRemaining: number) => void;
  onSessionComplete?: (session: FocusBlock) => void;
}

export function useFocusNotifications(options: UseFocusNotificationsOptions = {}) {
  const {
    enabled = true,
    onBreakSuggested,
    onSessionEnding,
    onSessionComplete,
  } = options;

  const [breakReminderShown, setBreakReminderShown] = useState(false);
  const [endingReminderShown, setEndingReminderShown] = useState(false);
  const lastSessionIdRef = useRef<string | null>(null);
  const pomodoroCountRef = useRef(0);

  // Get focus settings
  const { data: settings } = useQuery({
    queryKey: ['focus-settings'],
    queryFn: getFocusSettings,
    enabled,
  });

  // Get active session with polling
  const { data: activeSession } = useQuery({
    queryKey: ['active-session'],
    queryFn: getActiveSession,
    enabled,
    refetchInterval: 5000, // Check every 5 seconds
  });

  // Calculate time remaining
  const getTimeRemaining = useCallback((session: FocusBlock | null): number => {
    if (!session || session.status !== 'active') return 0;
    const end = new Date(session.endTime).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((end - now) / 60000)); // minutes
  }, []);

  // Send break reminder
  const sendBreakReminder = useCallback(async (sessionDuration: number) => {
    pomodoroCountRef.current++;

    const isLongBreakTime = settings?.sessionsBeforeLongBreak
      && pomodoroCountRef.current >= settings.sessionsBeforeLongBreak;

    const breakDuration = isLongBreakTime
      ? (settings?.longBreakDurationMinutes || 15)
      : (settings?.breakDurationMinutes || 5);

    const title = isLongBreakTime ? 'Time for a Long Break!' : 'Take a Break!';
    const body = isLongBreakTime
      ? `Great work! You've completed ${pomodoroCountRef.current} focus sessions. Take a ${breakDuration} minute break to recharge.`
      : `You've been focused for ${sessionDuration} minutes. Take a ${breakDuration} minute break.`;

    await sendSmartNotification('break_suggestion', title, body);
    onBreakSuggested?.();

    if (isLongBreakTime) {
      pomodoroCountRef.current = 0;
    }
  }, [settings, onBreakSuggested]);

  // Send session ending warning
  const sendEndingWarning = useCallback(async (minutesRemaining: number) => {
    await sendSmartNotification(
      'focus_reminder',
      'Focus Session Ending Soon',
      `Your focus session ends in ${minutesRemaining} minutes. Wrap up your current task.`
    );
    onSessionEnding?.(minutesRemaining);
  }, [onSessionEnding]);

  // Send session complete notification
  const sendSessionComplete = useCallback(async (session: FocusBlock) => {
    const title = session.successRate && session.successRate >= 80
      ? 'Excellent Focus Session!'
      : 'Focus Session Complete';

    const body = `${session.title} completed. You focused for ${session.completedMinutes} minutes` +
      (session.distractionsBlocked > 0 ? ` and blocked ${session.distractionsBlocked} distractions.` : '.');

    await sendSmartNotification('goal_achieved', title, body);
    onSessionComplete?.(session);
  }, [onSessionComplete]);

  // Monitor active session for notifications
  useEffect(() => {
    if (!enabled || !settings?.breakRemindersEnabled || !activeSession) return;

    const minutesRemaining = getTimeRemaining(activeSession);
    const sessionDuration = activeSession.durationMinutes;

    // Reset flags when session changes
    if (activeSession.id !== lastSessionIdRef.current) {
      lastSessionIdRef.current = activeSession.id;
      setBreakReminderShown(false);
      setEndingReminderShown(false);
    }

    // Session ending warning (5 minutes before end)
    if (
      activeSession.status === 'active' &&
      minutesRemaining <= 5 &&
      minutesRemaining > 0 &&
      !endingReminderShown
    ) {
      sendEndingWarning(minutesRemaining);
      setEndingReminderShown(true);
    }

    // Session complete (when time hits 0 or status changes to completed)
    if (
      (activeSession.status === 'completed' || minutesRemaining === 0) &&
      lastSessionIdRef.current === activeSession.id &&
      !breakReminderShown
    ) {
      sendBreakReminder(sessionDuration);
      setBreakReminderShown(true);
    }
  }, [
    enabled,
    settings?.breakRemindersEnabled,
    activeSession,
    getTimeRemaining,
    sendBreakReminder,
    sendEndingWarning,
    breakReminderShown,
    endingReminderShown,
  ]);

  // Detect session completion
  useEffect(() => {
    if (!enabled || !activeSession) return;

    if (
      activeSession.status === 'completed' &&
      lastSessionIdRef.current === activeSession.id
    ) {
      sendSessionComplete(activeSession);
      lastSessionIdRef.current = null;
    }
  }, [enabled, activeSession, sendSessionComplete]);

  // Manual break reminder trigger
  const triggerBreakReminder = useCallback(() => {
    if (activeSession) {
      sendBreakReminder(activeSession.completedMinutes);
    }
  }, [activeSession, sendBreakReminder]);

  // Reset pomodoro count
  const resetPomodoroCount = useCallback(() => {
    pomodoroCountRef.current = 0;
  }, []);

  return {
    pomodoroCount: pomodoroCountRef.current,
    triggerBreakReminder,
    resetPomodoroCount,
    timeRemaining: activeSession ? getTimeRemaining(activeSession) : 0,
    isInFocus: activeSession?.status === 'active',
  };
}

export default useFocusNotifications;
