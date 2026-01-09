import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchGoals,
  fetchGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  fetchGoalProgress,
  updateGoalProgress,
  fetchStreaks,
  fetchStreak,
  fetchStreakCalendar,
  fetchAchievements,
  fetchAchievement,
  Goal,
  GoalCreate,
  GoalUpdate,
  GoalProgress,
  Streak,
  StreakCalendar,
  Achievement,
} from '@/lib/api/goals';

// ============================================================================
// Query Keys
// ============================================================================

export const goalsKeys = {
  all: ['goals'] as const,
  list: (activeOnly?: boolean) => [...goalsKeys.all, 'list', activeOnly] as const,
  detail: (id: number) => [...goalsKeys.all, 'detail', id] as const,
  progress: () => [...goalsKeys.all, 'progress'] as const,
  streaks: () => [...goalsKeys.all, 'streaks'] as const,
  streak: (type: string) => [...goalsKeys.all, 'streaks', type] as const,
  streakCalendar: (type: string, days: number) => [...goalsKeys.all, 'streaks', type, 'calendar', days] as const,
  achievements: () => [...goalsKeys.all, 'achievements'] as const,
  achievement: (type: string) => [...goalsKeys.all, 'achievements', type] as const,
};

// ============================================================================
// Goals Hooks
// ============================================================================

export function useGoals(activeOnly: boolean = true) {
  return useQuery<Goal[], Error>({
    queryKey: goalsKeys.list(activeOnly),
    queryFn: () => fetchGoals(activeOnly),
    staleTime: 30000,
  });
}

export function useGoal(goalId: number) {
  return useQuery<Goal, Error>({
    queryKey: goalsKeys.detail(goalId),
    queryFn: () => fetchGoal(goalId),
    enabled: goalId > 0,
  });
}

export function useGoalProgress() {
  return useQuery<GoalProgress, Error>({
    queryKey: goalsKeys.progress(),
    queryFn: fetchGoalProgress,
    staleTime: 30000,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation<Goal, Error, GoalCreate>({
    mutationFn: createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation<Goal, Error, { goalId: number; goal: GoalUpdate }>({
    mutationFn: ({ goalId, goal }) => updateGoal(goalId, goal),
    onSuccess: (data) => {
      queryClient.setQueryData(goalsKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: goalsKeys.list() });
      queryClient.invalidateQueries({ queryKey: goalsKeys.progress() });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation<{ status: string; id: number }, Error, number>({
    mutationFn: deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
    },
  });
}

export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation<Goal, Error, { goalId: number; value: number }>({
    mutationFn: ({ goalId, value }) => updateGoalProgress(goalId, value),
    onSuccess: (data) => {
      queryClient.setQueryData(goalsKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: goalsKeys.progress() });
    },
  });
}

// ============================================================================
// Streaks Hooks
// ============================================================================

export function useStreaks() {
  return useQuery<Streak[], Error>({
    queryKey: goalsKeys.streaks(),
    queryFn: fetchStreaks,
    staleTime: 60000,
  });
}

export function useStreak(streakType: string) {
  return useQuery<Streak, Error>({
    queryKey: goalsKeys.streak(streakType),
    queryFn: () => fetchStreak(streakType),
    enabled: !!streakType,
  });
}

export function useStreakCalendar(streakType: string, days: number = 365) {
  return useQuery<StreakCalendar, Error>({
    queryKey: goalsKeys.streakCalendar(streakType, days),
    queryFn: () => fetchStreakCalendar(streakType, days),
    enabled: !!streakType,
    staleTime: 300000, // 5 minutes
  });
}

// ============================================================================
// Achievements Hooks
// ============================================================================

export function useAchievements() {
  return useQuery<Achievement[], Error>({
    queryKey: goalsKeys.achievements(),
    queryFn: fetchAchievements,
    staleTime: 60000,
  });
}

export function useAchievement(achievementType: string) {
  return useQuery<Achievement, Error>({
    queryKey: goalsKeys.achievement(achievementType),
    queryFn: () => fetchAchievement(achievementType),
    enabled: !!achievementType,
  });
}
