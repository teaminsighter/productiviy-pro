import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Trophy,
  Flame,
  Plus,
  CheckCircle2,
  Clock,
  TrendingUp,
  Star,
  Zap,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  Shield,
  Moon,
  Sunrise,
  Crown,
} from 'lucide-react';
import { GlassCard, ProgressRing } from '@/components/common';
import { FocusWidget } from '@/components/focus';
import {
  useGoals,
  useGoalProgress,
  useStreaks,
  useAchievements,
  useStreakCalendar,
  useDeleteGoal,
} from '@/hooks/useGoals';
import { useFocusStats } from '@/hooks/useFocus';
import { GoalModal } from './GoalModal';
import type { Goal, GoalStatus, Achievement } from '@/lib/api/goals';

// Helper functions
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getStatusColor = (status: GoalStatus) => {
  switch (status) {
    case 'completed':
      return 'text-productive bg-productive/20';
    case 'on_track':
      return 'text-blue-400 bg-blue-400/20';
    case 'at_risk':
      return 'text-yellow-400 bg-yellow-400/20';
    case 'failed':
      return 'text-red-400 bg-red-400/20';
    default:
      return 'text-white/50 bg-white/10';
  }
};

const getStatusLabel = (status: GoalStatus) => {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'on_track':
      return 'On Track';
    case 'at_risk':
      return 'At Risk';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
};

const getGoalTypeLabel = (type: string) => {
  switch (type) {
    case 'productive_hours':
      return 'Productive Hours';
    case 'category_limit':
      return 'Category Limit';
    case 'focus_sessions':
      return 'Focus Sessions';
    case 'app_specific':
      return 'App Specific';
    case 'distraction_limit':
      return 'Distraction Limit';
    default:
      return type;
  }
};

const getAchievementIcon = (icon?: string) => {
  const icons: Record<string, React.ElementType> = {
    flame: Flame,
    clock: Clock,
    crown: Crown,
    target: Target,
    zap: Zap,
    sunrise: Sunrise,
    moon: Moon,
    shield: Shield,
    star: Star,
    trophy: Trophy,
    'check-circle': CheckCircle2,
    flag: Target,
  };
  return icons[icon || 'star'] || Star;
};

// Goal Card Component
function GoalCard({ goal, onEdit, onDelete }: { goal: Goal; onEdit: () => void; onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 hover:border-white/20 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-white font-medium truncate">{goal.name}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(goal.status)}`}>
              {getStatusLabel(goal.status)}
            </span>
          </div>
          <p className="text-white/50 text-sm">{getGoalTypeLabel(goal.goal_type)}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 py-1 w-32 rounded-lg bg-gray-800 border border-white/10 shadow-xl z-10">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onEdit();
                }}
                className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 flex items-center gap-2"
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete();
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-white/60">
            {goal.current_value.toFixed(1)} / {goal.target_value} {goal.goal_type === 'focus_sessions' ? 'sessions' : 'hours'}
          </span>
          <span className="text-white font-medium">{Math.round(goal.progress_percentage)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, goal.progress_percentage)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              goal.status === 'completed'
                ? 'bg-gradient-to-r from-productive to-green-400'
                : goal.status === 'at_risk'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                : 'bg-gradient-to-r from-accent to-purple-500'
            }`}
          />
        </div>
      </div>

      {/* Target info */}
      {(goal.target_app || goal.target_category) && (
        <p className="text-white/40 text-xs">
          {goal.target_app ? `App: ${goal.target_app}` : `Category: ${goal.target_category}`}
        </p>
      )}
    </motion.div>
  );
}

// Streak Card Component
function StreakCard({ type, current, best }: { type: string; current: number; best: number }) {
  const Icon = type === 'productivity_goal' ? Flame : type === 'focus_sessions' ? Target : Shield;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${current > 0 ? 'bg-orange-500/20' : 'bg-white/10'}`}>
          <Icon className={current > 0 ? 'text-orange-400' : 'text-white/40'} size={24} />
        </div>
        <div className="flex-1">
          <p className="text-white/60 text-xs capitalize">{type.replace(/_/g, ' ')}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{current}</span>
            <span className="text-white/50 text-sm">days</span>
          </div>
        </div>
        {current > 0 && (
          <div className="text-right">
            <p className="text-white/40 text-xs">Best</p>
            <p className="text-white/70 font-medium">{best}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Achievement Badge Component
function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const Icon = getAchievementIcon(achievement.icon);
  const isUnlocked = achievement.is_unlocked;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`relative p-4 rounded-xl border transition-all ${
        isUnlocked
          ? 'bg-gradient-to-br from-accent/20 to-purple-500/20 border-accent/30'
          : 'bg-white/5 border-white/10 opacity-50'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
            isUnlocked ? 'bg-accent/30' : 'bg-white/10'
          }`}
        >
          <Icon className={isUnlocked ? 'text-accent' : 'text-white/40'} size={24} />
        </div>
        <h4 className={`text-sm font-medium ${isUnlocked ? 'text-white' : 'text-white/50'}`}>
          {achievement.name}
        </h4>
        {!isUnlocked && achievement.target && (
          <div className="mt-2 w-full">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/30 rounded-full"
                style={{ width: `${achievement.progress_percentage}%` }}
              />
            </div>
            <p className="text-white/40 text-xs mt-1">
              {achievement.progress}/{achievement.target}
            </p>
          </div>
        )}
        {isUnlocked && achievement.earned_at && (
          <p className="text-white/40 text-xs mt-1">
            {new Date(achievement.earned_at).toLocaleDateString()}
          </p>
        )}
      </div>
      {isUnlocked && (
        <div className="absolute -top-1 -right-1">
          <CheckCircle2 className="text-productive" size={16} />
        </div>
      )}
    </motion.div>
  );
}

// Streak Calendar Component
function StreakCalendar({ streakType }: { streakType: string }) {
  const { data: calendar, isLoading } = useStreakCalendar(streakType, 365);

  if (isLoading || !calendar) {
    return (
      <div className="h-32 animate-pulse bg-white/5 rounded-xl" />
    );
  }

  // Group days by week for GitHub-style layout
  const weeks: typeof calendar.days[] = [];
  let currentWeek: typeof calendar.days = [];

  calendar.days.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === calendar.days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getIntensityColor = (value: number) => {
    switch (value) {
      case 0:
        return 'bg-white/5';
      case 1:
        return 'bg-accent/30';
      case 2:
        return 'bg-accent/50';
      case 3:
        return 'bg-accent/70';
      case 4:
        return 'bg-accent';
      default:
        return 'bg-white/5';
    }
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-0.5" style={{ minWidth: `${weeks.length * 12}px` }}>
        {weeks.slice(-52).map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-0.5">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`w-2.5 h-2.5 rounded-sm ${getIntensityColor(day.value)}`}
                title={`${day.date}: ${day.achieved ? 'Achieved' : 'Not achieved'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 mt-2 text-xs text-white/40">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((v) => (
          <div key={v} className={`w-2.5 h-2.5 rounded-sm ${getIntensityColor(v)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// Main Goals Page
export default function Goals() {
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const { data: goals, isLoading: goalsLoading } = useGoals();
  const { data: goalProgress } = useGoalProgress();
  const { data: streaks, isLoading: streaksLoading } = useStreaks();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();
  const { data: focusStats } = useFocusStats();
  const deleteGoal = useDeleteGoal();

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowGoalModal(true);
  };

  const handleDeleteGoal = async (goalId: number) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      await deleteGoal.mutateAsync(goalId);
    }
  };

  const unlockedAchievements = achievements?.filter((a) => a.is_unlocked) || [];
  const lockedAchievements = achievements?.filter((a) => !a.is_unlocked) || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Goals & Achievements</h1>
          <p className="text-white/50 text-sm">Track your progress and unlock achievements</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingGoal(null);
            setShowGoalModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={20} />
          Add Goal
        </motion.button>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
        variants={itemVariants}
      >
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/20">
              <Target className="text-accent" size={24} />
            </div>
            <div>
              <p className="text-white/50 text-xs">Active Goals</p>
              <p className="text-2xl font-bold text-white">{goalProgress?.total_goals || 0}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-productive/20">
              <CheckCircle2 className="text-productive" size={24} />
            </div>
            <div>
              <p className="text-white/50 text-xs">Completed Today</p>
              <p className="text-2xl font-bold text-productive">{goalProgress?.completed_today || 0}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20">
              <Flame className="text-orange-400" size={24} />
            </div>
            <div>
              <p className="text-white/50 text-xs">Current Streak</p>
              <p className="text-2xl font-bold text-orange-400">
                {streaks?.find((s) => s.streak_type === 'productivity_goal')?.current_count || 0}
                <span className="text-white/50 text-sm ml-1">days</span>
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/20">
              <Trophy className="text-yellow-400" size={24} />
            </div>
            <div>
              <p className="text-white/50 text-xs">Achievements</p>
              <p className="text-2xl font-bold text-white">
                {unlockedAchievements.length}
                <span className="text-white/30 text-sm">/{achievements?.length || 0}</span>
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals Section - 2 columns */}
        <motion.div className="lg:col-span-2 space-y-6" variants={itemVariants}>
          {/* Active Goals */}
          <GlassCard title="Daily Goals" icon={Target}>
            {goalsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 animate-pulse bg-white/5 rounded-xl" />
                ))}
              </div>
            ) : goals && goals.length > 0 ? (
              <div className="grid gap-3">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => handleEditGoal(goal)}
                    onDelete={() => handleDeleteGoal(goal.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/50">No goals yet</p>
                <p className="text-white/30 text-sm">Create your first goal to start tracking</p>
                <button
                  onClick={() => setShowGoalModal(true)}
                  className="mt-4 px-4 py-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                >
                  <Plus size={16} className="inline mr-1" />
                  Add Goal
                </button>
              </div>
            )}
          </GlassCard>

          {/* Streak Calendar */}
          <GlassCard title="Activity Calendar" icon={Calendar}>
            <StreakCalendar streakType="productivity_goal" />
          </GlassCard>

          {/* Achievements */}
          <GlassCard title="Achievements" icon={Trophy}>
            {achievementsLoading ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-28 animate-pulse bg-white/5 rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                {unlockedAchievements.length > 0 && (
                  <div className="mb-4">
                    <p className="text-white/50 text-sm mb-3">Unlocked</p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {unlockedAchievements.map((achievement) => (
                        <AchievementBadge key={achievement.id} achievement={achievement} />
                      ))}
                    </div>
                  </div>
                )}
                {lockedAchievements.length > 0 && (
                  <div>
                    <p className="text-white/50 text-sm mb-3">Locked</p>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                      {lockedAchievements.slice(0, 8).map((achievement) => (
                        <AchievementBadge key={achievement.id} achievement={achievement} />
                      ))}
                    </div>
                    {lockedAchievements.length > 8 && (
                      <p className="text-center text-white/40 text-sm mt-3">
                        +{lockedAchievements.length - 8} more to unlock
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </GlassCard>
        </motion.div>

        {/* Sidebar - 1 column */}
        <motion.div className="space-y-6" variants={itemVariants}>
          {/* Focus Widget */}
          <FocusWidget showStats />

          {/* Streaks */}
          <GlassCard title="Streaks" icon={Flame}>
            {streaksLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse bg-white/5 rounded-xl" />
                ))}
              </div>
            ) : streaks && streaks.length > 0 ? (
              <div className="space-y-3">
                {streaks.map((streak) => (
                  <StreakCard
                    key={streak.id}
                    type={streak.streak_type}
                    current={streak.current_count}
                    best={streak.best_count}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-white/50 py-4">No streaks yet</p>
            )}
          </GlassCard>

          {/* Focus Stats */}
          {focusStats && (
            <GlassCard title="Focus Stats" icon={Zap}>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-white/60 text-sm">Total Sessions</span>
                  <span className="text-white font-medium">{focusStats.total_sessions}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-white/60 text-sm">Total Focus Time</span>
                  <span className="text-white font-medium">{formatTime(focusStats.total_focus_time)}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-white/60 text-sm">Completion Rate</span>
                  <span className="text-productive font-medium">{Math.round(focusStats.completion_rate)}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-white/60 text-sm">Focus Streak</span>
                  <span className="text-orange-400 font-medium">{focusStats.current_streak} days</span>
                </div>
              </div>
            </GlassCard>
          )}

          {/* Weekly Progress */}
          <GlassCard title="This Week" icon={TrendingUp}>
            <div className="flex items-center justify-center py-4">
              <ProgressRing
                value={goalProgress ? (goalProgress.completed_today / Math.max(1, goalProgress.total_goals)) * 100 : 0}
                size={100}
                strokeWidth={8}
                color="gradient"
                valueLabel="Goals Met"
              />
            </div>
            <div className="text-center text-white/50 text-sm">
              {goalProgress?.completed_today || 0} of {goalProgress?.total_goals || 0} goals completed today
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Goal Modal */}
      <GoalModal
        isOpen={showGoalModal}
        onClose={() => {
          setShowGoalModal(false);
          setEditingGoal(null);
        }}
        goal={editingGoal}
      />
    </motion.div>
  );
}
