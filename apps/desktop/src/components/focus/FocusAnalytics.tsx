/**
 * FocusAnalytics Component
 *
 * Displays comprehensive focus mode analytics including:
 * - Daily/weekly/monthly focus time trends
 * - Session completion rates
 * - Distraction blocking statistics
 * - Streak tracking
 * - Productivity score
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Timer,
  Target,
  TrendingUp,
  Zap,
  Shield,
  Clock,
  Award,
  BarChart3,
  Activity,
} from 'lucide-react';
import { getFocusStats, type FocusStats } from '@/lib/api/focus';

interface FocusAnalyticsProps {
  days?: number;
  compact?: boolean;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function FocusAnalytics({ days = 7, compact = false }: FocusAnalyticsProps) {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['focus-stats', days],
    queryFn: () => getFocusStats(days),
    staleTime: 30000,
  });

  // Calculate additional analytics
  const analytics = useMemo(() => {
    if (!stats) return null;

    const dailyStats = stats.dailyStats || [];
    const focusMinutes = dailyStats.map((d) => d.focusMinutes);
    const totalMinutes = focusMinutes.reduce((a, b) => a + b, 0);
    const avgDailyMinutes = dailyStats.length > 0 ? totalMinutes / dailyStats.length : 0;
    const maxDailyMinutes = Math.max(...focusMinutes, 0);
    const minDailyMinutes = focusMinutes.length > 0 ? Math.min(...focusMinutes) : 0;

    // Calculate productivity score (0-100)
    const targetDailyMinutes = 240; // 4 hours target
    const productivityScore = Math.min(100, Math.round((avgDailyMinutes / targetDailyMinutes) * 100));

    // Calculate week-over-week trend
    const midpoint = Math.floor(dailyStats.length / 2);
    const firstHalf = dailyStats.slice(0, midpoint);
    const secondHalf = dailyStats.slice(midpoint);
    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, d) => sum + d.focusMinutes, 0) / firstHalf.length
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, d) => sum + d.focusMinutes, 0) / secondHalf.length
      : 0;
    const trend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    return {
      totalMinutes,
      avgDailyMinutes,
      maxDailyMinutes,
      minDailyMinutes,
      productivityScore,
      trend,
      completionRate: stats.totalSessions > 0
        ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
        : 0,
    };
  }, [stats]);

  if (isLoading) {
    return (
      <div className={`${compact ? '' : 'p-6'} animate-pulse`}>
        <div className="h-40 bg-white/5 rounded-2xl" />
      </div>
    );
  }

  if (error || !stats || !analytics) {
    return (
      <div className={`${compact ? '' : 'p-6'} text-center text-white/40`}>
        <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p>Unable to load focus analytics</p>
      </div>
    );
  }

  if (compact) {
    return <CompactAnalytics stats={stats} analytics={analytics} />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Timer className="w-5 h-5" />}
          label="Total Focus Time"
          value={formatDuration(analytics.totalMinutes)}
          subLabel={`${days} days`}
          color="indigo"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Completion Rate"
          value={`${analytics.completionRate}%`}
          subLabel={`${stats.completedSessions}/${stats.totalSessions} sessions`}
          color="green"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Distractions Blocked"
          value={String(stats.totalDistractionsBlocked)}
          subLabel="Apps & sites"
          color="red"
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Current Streak"
          value={`${stats.currentStreak} days`}
          subLabel={`Best: ${stats.longestStreak} days`}
          color="orange"
        />
      </div>

      {/* Productivity Score */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Productivity Score</h3>
            <p className="text-white/50 text-sm">Based on daily focus time vs 4hr target</p>
          </div>
          <div className="text-right">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-4xl font-bold text-white"
            >
              {analytics.productivityScore}
            </motion.span>
            <span className="text-white/50">/100</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analytics.productivityScore}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
          />
        </div>

        {/* Trend indicator */}
        <div className="flex items-center gap-2 mt-4">
          <TrendingUp className={`w-4 h-4 ${analytics.trend >= 0 ? 'text-green-400' : 'text-red-400'}`} />
          <span className={`text-sm ${analytics.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {analytics.trend >= 0 ? '+' : ''}{analytics.trend.toFixed(1)}% vs previous period
          </span>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Daily Focus Time
        </h3>

        <div className="space-y-3">
          {(stats.dailyStats || []).slice(-7).reverse().map((day, index) => {
            const maxMinutes = Math.max(...(stats.dailyStats?.map((d) => d.focusMinutes) || [1]), 1);
            const percentage = (day.focusMinutes / maxMinutes) * 100;
            const dayDate = new Date(day.date);
            const isToday = dayDate.toDateString() === new Date().toDateString();

            return (
              <div key={day.date}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${isToday ? 'text-indigo-400 font-medium' : 'text-white/60'}`}>
                    {isToday ? 'Today' : dayDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white/40">
                      {day.sessions} sessions
                    </span>
                    <span className="text-sm font-medium text-white w-16 text-right">
                      {formatDuration(day.focusMinutes)}
                    </span>
                  </div>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${isToday ? 'bg-indigo-500' : 'bg-indigo-500/60'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Session Stats */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Session Insights
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-white/60">Average Session</span>
              <span className="text-white font-medium">
                {formatDuration(Math.round(stats.averageSessionMinutes))}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-white/60">Best Day</span>
              <span className="text-white font-medium">
                {formatDuration(analytics.maxDailyMinutes)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-white/60">Daily Average</span>
              <span className="text-white font-medium">
                {formatDuration(Math.round(analytics.avgDailyMinutes))}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-white/60">Total Sessions</span>
              <span className="text-white font-medium">{stats.totalSessions}</span>
            </div>
          </div>
        </div>

        {/* Blocking Stats */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Blocking Effectiveness
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-white/60">Total Blocked</span>
              <span className="text-red-400 font-medium">{stats.totalDistractionsBlocked}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-white/60">Avg per Session</span>
              <span className="text-white font-medium">
                {stats.totalSessions > 0
                  ? Math.round(stats.totalDistractionsBlocked / stats.totalSessions)
                  : 0}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/10">
              <span className="text-white/60">Success Rate</span>
              <span className="text-green-400 font-medium">
                {Math.round(stats.averageSuccessRate)}%
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-white/60">Streak</span>
              <span className="text-orange-400 font-medium">{stats.currentStreak} days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact version for dashboard widgets
function CompactAnalytics({
  stats,
  analytics,
}: {
  stats: FocusStats;
  analytics: {
    totalMinutes: number;
    avgDailyMinutes: number;
    productivityScore: number;
    completionRate: number;
    trend: number;
  };
}) {
  return (
    <div className="space-y-4">
      {/* Mini productivity score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm text-white/60">Focus Score</p>
            <p className="text-lg font-bold text-white">{analytics.productivityScore}/100</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-sm ${analytics.trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          <TrendingUp className="w-4 h-4" />
          {analytics.trend >= 0 ? '+' : ''}{analytics.trend.toFixed(0)}%
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <Timer className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{formatDuration(analytics.totalMinutes)}</p>
          <p className="text-xs text-white/50">This Week</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <Zap className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{stats.totalDistractionsBlocked}</p>
          <p className="text-xs text-white/50">Blocked</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <Award className="w-4 h-4 text-orange-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-white">{stats.currentStreak}</p>
          <p className="text-xs text-white/50">Day Streak</p>
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-1 h-16">
        {(stats.dailyStats || []).slice(-7).map((day, index) => {
          const maxMinutes = Math.max(...(stats.dailyStats?.map((d) => d.focusMinutes) || [1]), 1);
          const height = maxMinutes > 0 ? (day.focusMinutes / maxMinutes) * 100 : 0;
          const isToday = new Date(day.date).toDateString() === new Date().toDateString();

          return (
            <motion.div
              key={day.date}
              className={`flex-1 rounded-t-sm ${isToday ? 'bg-indigo-500' : 'bg-indigo-500/40'}`}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(height, 5)}%` }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            />
          );
        })}
      </div>
    </div>
  );
}

// Reusable stat card component
function StatCard({
  icon,
  label,
  value,
  subLabel,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subLabel: string;
  color: 'indigo' | 'green' | 'red' | 'orange';
}) {
  const colorConfig = {
    indigo: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
    green: 'bg-green-500/15 border-green-500/30 text-green-400',
    red: 'bg-red-500/15 border-red-500/30 text-red-400',
    orange: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-4 rounded-2xl border ${colorConfig[color].split(' ').slice(0, 2).join(' ')}`}
    >
      <div className={`mb-2 ${colorConfig[color].split(' ')[2]}`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/70">{label}</p>
      <p className="text-xs text-white/40 mt-1">{subLabel}</p>
    </motion.div>
  );
}

export default FocusAnalytics;
