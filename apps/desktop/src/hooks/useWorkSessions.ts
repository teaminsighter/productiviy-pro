/**
 * Work Sessions React Query Hooks
 * For managing freelancer work session state
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  startWorkSession,
  endWorkSession,
  pauseWorkSession,
  resumeWorkSession,
  getCurrentWorkSession,
  getWorkSessions,
  getSessionSummary,
  getClientReport,
  WorkSession,
  SessionSummary,
  ClientReport,
  StartSessionRequest,
} from '@/lib/api/work-sessions';

// ═══════════════════════════════════════════════════════════════════
// Query Keys
// ═══════════════════════════════════════════════════════════════════

export const workSessionKeys = {
  all: ['work-sessions'] as const,
  current: () => [...workSessionKeys.all, 'current'] as const,
  list: (filters?: Record<string, unknown>) => [...workSessionKeys.all, 'list', filters] as const,
  summary: (period: string) => [...workSessionKeys.all, 'summary', period] as const,
  clientReport: (params: Record<string, unknown>) => [...workSessionKeys.all, 'client-report', params] as const,
};

// ═══════════════════════════════════════════════════════════════════
// Query Hooks
// ═══════════════════════════════════════════════════════════════════

/**
 * Get current active/paused work session
 * Polls every second when session is active for live timer
 */
export function useCurrentWorkSession() {
  return useQuery<WorkSession | null, Error>({
    queryKey: workSessionKeys.current(),
    queryFn: getCurrentWorkSession,
    refetchInterval: (query) => {
      // Poll every second if session is active
      const data = query.state.data;
      return data?.status === 'active' ? 1000 : 5000;
    },
    staleTime: 0,
  });
}

/**
 * Get work session history with optional filters
 */
export function useWorkSessionHistory(filters?: {
  dateFrom?: string;
  dateTo?: string;
  clientName?: string;
  projectName?: string;
  status?: string;
  limit?: number;
}) {
  return useQuery<WorkSession[], Error>({
    queryKey: workSessionKeys.list(filters),
    queryFn: () => getWorkSessions(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get session summary for a period
 */
export function useSessionSummary(period: 'today' | 'week' | 'month' = 'week') {
  return useQuery<SessionSummary, Error>({
    queryKey: workSessionKeys.summary(period),
    queryFn: () => getSessionSummary(period),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get client report for billing
 */
export function useClientReport(params: {
  clientName?: string;
  projectName?: string;
  dateFrom: string;
  dateTo: string;
}) {
  return useQuery<ClientReport, Error>({
    queryKey: workSessionKeys.clientReport(params),
    queryFn: () => getClientReport(params),
    staleTime: 60000,
    enabled: !!params.dateFrom && !!params.dateTo,
  });
}

// ═══════════════════════════════════════════════════════════════════
// Mutation Hooks
// ═══════════════════════════════════════════════════════════════════

/**
 * Start a new work session
 */
export function useStartWorkSession() {
  const queryClient = useQueryClient();

  return useMutation<WorkSession, Error, StartSessionRequest>({
    mutationFn: startWorkSession,
    onSuccess: (data) => {
      // Update current session cache
      queryClient.setQueryData(workSessionKeys.current(), data);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: workSessionKeys.list() });
      queryClient.invalidateQueries({ queryKey: workSessionKeys.summary('today') });
      queryClient.invalidateQueries({ queryKey: workSessionKeys.summary('week') });
    },
  });
}

/**
 * End the current work session
 */
export function useEndWorkSession() {
  const queryClient = useQueryClient();

  return useMutation<WorkSession, Error, { notes?: string }>({
    mutationFn: ({ notes }) => endWorkSession(notes),
    onSuccess: () => {
      // Clear current session
      queryClient.setQueryData(workSessionKeys.current(), null);
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries({ queryKey: workSessionKeys.all });
    },
  });
}

/**
 * Pause the current work session
 */
export function usePauseWorkSession() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; sessionId: string }, Error, void>({
    mutationFn: pauseWorkSession,
    onSuccess: () => {
      // Refresh current session
      queryClient.invalidateQueries({ queryKey: workSessionKeys.current() });
    },
  });
}

/**
 * Resume a paused work session
 */
export function useResumeWorkSession() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; sessionId: string }, Error, void>({
    mutationFn: resumeWorkSession,
    onSuccess: () => {
      // Refresh current session
      queryClient.invalidateQueries({ queryKey: workSessionKeys.current() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// Combined Hook
// ═══════════════════════════════════════════════════════════════════

/**
 * Combined hook for work sessions - provides all data and actions
 */
export function useWorkSessions(period: 'today' | 'week' | 'month' = 'week') {
  const currentSession = useCurrentWorkSession();
  const summary = useSessionSummary(period);
  const history = useWorkSessionHistory({ limit: 20 });

  const startSession = useStartWorkSession();
  const endSession = useEndWorkSession();
  const pauseSession = usePauseWorkSession();
  const resumeSession = useResumeWorkSession();

  return {
    // Data
    currentSession: currentSession.data,
    isSessionActive: currentSession.data?.status === 'active',
    isSessionPaused: currentSession.data?.status === 'paused',
    summary: summary.data,
    history: history.data || [],

    // Loading states
    isLoading: currentSession.isLoading || summary.isLoading,
    isHistoryLoading: history.isLoading,

    // Actions
    startSession: startSession.mutateAsync,
    endSession: (notes?: string) => endSession.mutateAsync({ notes }),
    pauseSession: pauseSession.mutateAsync,
    resumeSession: resumeSession.mutateAsync,

    // Mutation states
    isStarting: startSession.isPending,
    isEnding: endSession.isPending,
    isPausing: pauseSession.isPending,
    isResuming: resumeSession.isPending,
  };
}
