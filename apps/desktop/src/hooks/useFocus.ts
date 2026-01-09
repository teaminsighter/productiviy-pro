import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  startFocusSession,
  getActiveFocusSession,
  endFocusSession,
  recordInterruption,
  fetchFocusHistory,
  fetchFocusStats,
  FocusSession,
  FocusSessionCreate,
  FocusSessionEnd,
  FocusStats,
} from '@/lib/api/goals';

// ============================================================================
// Query Keys
// ============================================================================

export const focusKeys = {
  all: ['focus'] as const,
  active: () => [...focusKeys.all, 'active'] as const,
  history: (limit: number, days: number) => [...focusKeys.all, 'history', limit, days] as const,
  stats: () => [...focusKeys.all, 'stats'] as const,
};

// ============================================================================
// Focus Session Hooks
// ============================================================================

export function useActiveFocusSession() {
  return useQuery<FocusSession | null, Error>({
    queryKey: focusKeys.active(),
    queryFn: getActiveFocusSession,
    refetchInterval: 1000, // Poll every second for active session
    staleTime: 0,
  });
}

export function useStartFocusSession() {
  const queryClient = useQueryClient();

  return useMutation<FocusSession, Error, FocusSessionCreate>({
    mutationFn: startFocusSession,
    onSuccess: (data) => {
      queryClient.setQueryData(focusKeys.active(), data);
      queryClient.invalidateQueries({ queryKey: focusKeys.history(50, 30) });
    },
  });
}

export function useEndFocusSession() {
  const queryClient = useQueryClient();

  return useMutation<FocusSession, Error, FocusSessionEnd>({
    mutationFn: endFocusSession,
    onSuccess: () => {
      queryClient.setQueryData(focusKeys.active(), null);
      queryClient.invalidateQueries({ queryKey: focusKeys.all });
    },
  });
}

export function useRecordInterruption() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; interruption_count: number }, Error, number>({
    mutationFn: recordInterruption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: focusKeys.active() });
    },
  });
}

export function useFocusHistory(limit: number = 50, days: number = 30) {
  return useQuery<FocusSession[], Error>({
    queryKey: focusKeys.history(limit, days),
    queryFn: () => fetchFocusHistory(limit, days),
    staleTime: 30000,
  });
}

export function useFocusStats() {
  return useQuery<FocusStats, Error>({
    queryKey: focusKeys.stats(),
    queryFn: fetchFocusStats,
    staleTime: 30000,
  });
}

// ============================================================================
// Focus Timer Hook (Client-side timer management)
// ============================================================================

interface FocusTimerState {
  isActive: boolean;
  isPaused: boolean;
  timeRemaining: number; // In seconds
  totalDuration: number; // In seconds
  elapsedTime: number; // In seconds
  sessionId: number | null;
  sessionName: string | null;
}

interface UseFocusTimerReturn {
  state: FocusTimerState;
  start: (duration: number, name?: string, blockDistractions?: boolean) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: (completed?: boolean, notes?: string) => Promise<void>;
  formatTime: (seconds: number) => string;
  progress: number; // 0-100
}

export function useFocusTimer(): UseFocusTimerReturn {
  const [state, setState] = useState<FocusTimerState>({
    isActive: false,
    isPaused: false,
    timeRemaining: 0,
    totalDuration: 0,
    elapsedTime: 0,
    sessionId: null,
    sessionName: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startMutation = useStartFocusSession();
  const endMutation = useEndFocusSession();
  const queryClient = useQueryClient();

  // Check for existing active session on mount
  const { data: activeSession } = useActiveFocusSession();

  useEffect(() => {
    if (activeSession && !state.isActive) {
      const startTime = new Date(activeSession.started_at).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, activeSession.duration_planned - elapsed);

      setState({
        isActive: true,
        isPaused: false,
        timeRemaining: remaining,
        totalDuration: activeSession.duration_planned,
        elapsedTime: elapsed,
        sessionId: activeSession.id,
        sessionName: activeSession.name || null,
      });
    }
  }, [activeSession]);

  // Timer interval
  useEffect(() => {
    if (state.isActive && !state.isPaused) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.timeRemaining <= 1) {
            // Timer complete
            return {
              ...prev,
              timeRemaining: 0,
              elapsedTime: prev.totalDuration,
            };
          }
          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1,
            elapsedTime: prev.elapsedTime + 1,
          };
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isActive, state.isPaused]);

  // Auto-complete when timer reaches 0
  useEffect(() => {
    if (state.isActive && state.timeRemaining === 0 && state.elapsedTime > 0) {
      stop(true);
    }
  }, [state.timeRemaining, state.isActive, state.elapsedTime]);

  const start = useCallback(
    async (duration: number, name?: string, blockDistractions: boolean = true) => {
      try {
        const session = await startMutation.mutateAsync({
          duration_planned: duration,
          name: name,
          block_distractions: blockDistractions,
          break_reminder: true,
        });

        setState({
          isActive: true,
          isPaused: false,
          timeRemaining: duration,
          totalDuration: duration,
          elapsedTime: 0,
          sessionId: session.id,
          sessionName: name || null,
        });
      } catch (error) {
        console.error('Failed to start focus session:', error);
        throw error;
      }
    },
    [startMutation]
  );

  const pause = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resume = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const stop = useCallback(
    async (completed: boolean = false, notes?: string) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      try {
        await endMutation.mutateAsync({
          was_completed: completed,
          notes,
        });
      } catch (error) {
        console.error('Failed to end focus session:', error);
      }

      setState({
        isActive: false,
        isPaused: false,
        timeRemaining: 0,
        totalDuration: 0,
        elapsedTime: 0,
        sessionId: null,
        sessionName: null,
      });

      queryClient.invalidateQueries({ queryKey: focusKeys.all });
    },
    [endMutation, queryClient]
  );

  const formatTime = useCallback((seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const progress = state.totalDuration > 0
    ? ((state.totalDuration - state.timeRemaining) / state.totalDuration) * 100
    : 0;

  return {
    state,
    start,
    pause,
    resume,
    stop,
    formatTime,
    progress,
  };
}

// ============================================================================
// Convenience Hook
// ============================================================================

export function useFocus() {
  const activeSession = useActiveFocusSession();
  const stats = useFocusStats();
  const history = useFocusHistory();
  const timer = useFocusTimer();

  return {
    activeSession: activeSession.data,
    isSessionActive: !!activeSession.data,
    stats: stats.data,
    history: history.data,
    timer,
    isLoading: activeSession.isLoading || stats.isLoading,
  };
}
