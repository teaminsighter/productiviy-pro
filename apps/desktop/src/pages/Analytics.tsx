import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  PieChart,
  Calendar,
  Target,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  Flame,
  Activity,
  Brain,
} from 'lucide-react';
import { format } from 'date-fns';
import { GlassCard, ProgressRing } from '@/components/common';
import {
  ProductivityAreaChart,
  CategoryPieChart,
  TopAppsBarChart,
  TrendLineChart,
  WeeklyBarChart,
  ActivityHeatmap,
} from '@/components/charts';
import {
  useDailyAnalytics,
  useWeeklyAnalytics,
  useTopApps,
  useCategories,
  useTrends,
} from '@/hooks/useAnalytics';
import { DailyInsightsPanel, AIStatusIndicator, WeeklyReportModal } from '@/components/ai';
import { useAIStatus } from '@/hooks/useAI';

// Helpers
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatTimeShort = (seconds: number): string => {
  const hours = seconds / 3600;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  return `${Math.round(seconds / 60)}m`;
};

// Loading skeleton components
function ChartSkeleton({ height = 250 }: { height?: number }) {
  return (
    <div className="animate-pulse" style={{ height }}>
      <div className="h-full bg-white/5 rounded-xl" />
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <GlassCard>
      <div className="animate-pulse flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10" />
        <div>
          <div className="h-3 bg-white/10 rounded w-16 mb-2" />
          <div className="h-6 bg-white/10 rounded w-20" />
        </div>
      </div>
    </GlassCard>
  );
}

// Period selector tabs
type Period = 'today' | 'week' | 'month';

// Main Component
export default function Analytics() {
  const [period, setPeriod] = useState<Period>('today');
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);

  // Get today's date
  const today = format(new Date(), 'yyyy-MM-dd');

  // AI status
  const { data: aiStatus } = useAIStatus();

  // Fetch data
  const {
    data: dailyAnalytics,
    isLoading: isDailyLoading,
    error: dailyError,
    refetch: refetchDaily,
  } = useDailyAnalytics(period === 'today' ? today : undefined);

  const {
    data: weeklyAnalytics,
    isLoading: isWeeklyLoading,
    error: weeklyError,
  } = useWeeklyAnalytics();

  const {
    data: topApps,
    isLoading: isAppsLoading,
  } = useTopApps(period === 'today' ? today : undefined, 10);

  const {
    data: categories,
    isLoading: isCategoriesLoading,
  } = useCategories(period === 'today' ? today : undefined);

  const {
    data: trends,
    isLoading: isTrendsLoading,
  } = useTrends(period === 'week' ? 7 : period === 'month' ? 30 : 7);

  // Computed values
  const isLoading = isDailyLoading || isWeeklyLoading;
  const hasError = dailyError || weeklyError;

  // Generate heatmap data from weekly breakdown
  const heatmapData = useMemo(() => {
    if (!weeklyAnalytics?.daily_breakdown) return [];
    // This would normally come from the API with hourly data
    // For now, generate sample data based on daily totals
    const data: { day: number; hour: number; value: number }[] = [];
    weeklyAnalytics.daily_breakdown.forEach((day, dayIndex) => {
      // Distribute time across typical work hours
      const hoursPerSlot = day.total_time / 10; // Distribute across 10 hours
      for (let hour = 9; hour < 19; hour++) {
        data.push({
          day: dayIndex,
          hour,
          value: Math.random() * hoursPerSlot * 2, // Add some variance
        });
      }
    });
    return data;
  }, [weeklyAnalytics]);

  // Distraction time calculation - with safe array access
  const distractionTime = dailyAnalytics?.distracting_time ?? 0;
  const distractionApps = Array.isArray(topApps)
    ? topApps.filter((app) => app?.productivity_type === 'distracting')
    : [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Unable to load analytics</h2>
        <p className="text-white/50 mb-4 max-w-md">
          Make sure the backend server is running on port 8000.
        </p>
        <button
          onClick={() => refetchDaily()}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg text-primary transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

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
          <h1 className="text-lg font-bold text-white">Analytics</h1>
          <p className="text-sm text-white/50">Insights into your productivity patterns</p>
        </div>

        <div className="flex items-center gap-4">
          {/* AI Status & Weekly Report Button */}
          <div className="flex items-center gap-3">
            <AIStatusIndicator size="sm" />
            {aiStatus?.available && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowWeeklyReport(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent/20 to-purple-500/20 border border-accent/30 text-accent hover:border-accent/50 transition-colors text-sm"
              >
                <Brain size={16} />
                <span className="font-medium">AI Report</span>
              </motion.button>
            )}
          </div>

          {/* Period Tabs */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            {(['today', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-primary text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
        variants={itemVariants}
      >
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Total Time</p>
                  <p className="text-xl font-bold text-white">
                    {period === 'today'
                      ? formatTime(dailyAnalytics?.total_time ?? 0)
                      : formatTime(weeklyAnalytics?.total_time ?? 0)}
                  </p>
                  {period === 'week' && weeklyAnalytics && (
                    <p className="text-white/40 text-xs">
                      Avg: {formatTimeShort(weeklyAnalytics.average_daily_time)}/day
                    </p>
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-productive/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-productive" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Productivity</p>
                  <p className="text-xl font-bold text-productive">
                    {Math.round(
                      period === 'today'
                        ? (dailyAnalytics?.productivity_score ?? 0)
                        : (weeklyAnalytics?.productivity_score ?? 0)
                    )}%
                  </p>
                  {weeklyAnalytics?.comparison && period === 'week' && (
                    <div className="flex items-center gap-1">
                      {weeklyAnalytics.comparison.productivity_change > 0 ? (
                        <TrendingUp className="w-3 h-3 text-productive" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-distracting" />
                      )}
                      <span
                        className={`text-xs ${
                          weeklyAnalytics.comparison.productivity_change > 0
                            ? 'text-productive'
                            : 'text-distracting'
                        }`}
                      >
                        {Math.abs(weeklyAnalytics.comparison.productivity_change).toFixed(0)}% vs last week
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-neutral" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Focus Sessions</p>
                  <p className="text-xl font-bold text-white">
                    {dailyAnalytics?.focus_sessions?.length ?? 0}
                  </p>
                  <p className="text-white/40 text-xs">Deep work periods</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-distracting/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-distracting" />
                </div>
                <div>
                  <p className="text-white/50 text-xs">Distractions</p>
                  <p className="text-xl font-bold text-distracting">
                    {formatTime(distractionTime)}
                  </p>
                  <p className="text-white/40 text-xs">Time lost</p>
                </div>
              </div>
            </GlassCard>
          </>
        )}
      </motion.div>

      {/* Charts Row 1 */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={itemVariants}
      >
        {/* Productivity Timeline */}
        <GlassCard title="Productivity Timeline" icon={Activity}>
          {isDailyLoading ? (
            <ChartSkeleton height={250} />
          ) : dailyAnalytics?.hourly_productivity ? (
            <ProductivityAreaChart
              data={dailyAnalytics.hourly_productivity}
              height={250}
              animated
            />
          ) : (
            <div className="h-[250px] flex items-center justify-center text-white/40">
              No data available
            </div>
          )}
        </GlassCard>

        {/* Category Breakdown */}
        <GlassCard title="Category Breakdown" icon={PieChart}>
          {isCategoriesLoading ? (
            <ChartSkeleton height={300} />
          ) : categories && categories.length > 0 ? (
            <CategoryPieChart
              data={categories.map((c) => ({
                category: c.category,
                duration: c.duration,
                percentage: c.percentage,
              }))}
              height={300}
              animated
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-white/40">
              No data available
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Charts Row 2 */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        variants={itemVariants}
      >
        {/* Top Apps */}
        <GlassCard title="Top Applications" icon={BarChart3}>
          {isAppsLoading ? (
            <ChartSkeleton height={300} />
          ) : topApps && topApps.length > 0 ? (
            <TopAppsBarChart
              data={topApps}
              height={300}
              maxApps={8}
              animated
            />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-white/40">
              No data available
            </div>
          )}
        </GlassCard>

        {/* Productivity Trends */}
        <GlassCard title="Productivity Trend" icon={TrendingUp}>
          {isTrendsLoading ? (
            <ChartSkeleton height={280} />
          ) : trends?.trends && trends.trends.length > 0 && trends.trends[0]?.date ? (
            <TrendLineChart
              data={trends.trends.filter(t => t.date).map(t => ({
                date: t.date!,
                productivity_score: t.productivity_score ?? 0,
                total_time: t.total_time ?? 0,
                productive_time: t.productive_time ?? 0,
              }))}
              height={280}
              goalLine={70}
              animated
            />
          ) : trends?.productivity_score !== undefined ? (
            // Fallback: Show summary stats when detailed trends not available
            <div className="h-[280px] flex flex-col items-center justify-center">
              <div className="text-center">
                <p className="text-white/50 text-sm mb-2">Current Productivity</p>
                <p className="text-5xl font-bold text-productive mb-4">
                  {Math.round(trends.productivity_score)}%
                </p>
                <p className="text-white/50 text-sm">
                  {formatTime(trends.total_time ?? 0)} tracked this {period}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-white/40">
              No data available
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Weekly Overview & Heatmap */}
      {period !== 'today' && (
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={itemVariants}
        >
          {/* Weekly Bar Chart */}
          <GlassCard title="Daily Breakdown" icon={Calendar}>
            {isWeeklyLoading ? (
              <ChartSkeleton height={250} />
            ) : weeklyAnalytics?.daily_breakdown && weeklyAnalytics.daily_breakdown.length > 0 ? (
              <WeeklyBarChart
                data={weeklyAnalytics.daily_breakdown}
                height={250}
                animated
              />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-white/40">
                No data available
              </div>
            )}
          </GlassCard>

          {/* Activity Heatmap */}
          <GlassCard title="Activity Heatmap" icon={Flame}>
            {isWeeklyLoading ? (
              <ChartSkeleton height={220} />
            ) : heatmapData.length > 0 ? (
              <ActivityHeatmap
                data={heatmapData}
                height={220}
                animated
              />
            ) : (
              <div className="h-[220px] flex items-center justify-center text-white/40">
                No data available
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* AI-Powered Insights Section */}
      {aiStatus?.configured && aiStatus?.available && (
        <motion.div variants={itemVariants}>
          <DailyInsightsPanel date={today} />
        </motion.div>
      )}

      {/* Insights & Distractions */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        variants={itemVariants}
      >
        {/* Basic Insights (when AI not available) */}
        <GlassCard title={aiStatus?.configured ? "Trend Insights" : "Insights"} icon={Zap} className="lg:col-span-2">
          {isTrendsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-12 bg-white/5 rounded-xl" />
              ))}
            </div>
          ) : trends?.insights && trends.insights.length > 0 ? (
            <div className="space-y-3">
              {trends.insights.map((insight, index) => {
                // Handle both string and object formats from API
                const insightText = typeof insight === 'string' ? insight : (insight as any)?.message || '';
                const insightType = typeof insight === 'object' ? (insight as any)?.type : 'info';
                const typeColors: Record<string, string> = {
                  positive: 'bg-productive/20 text-productive',
                  warning: 'bg-distracting/20 text-distracting',
                  info: 'bg-primary/20 text-primary',
                };
                const colorClass = typeColors[insightType] || typeColors.info;

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass.split(' ')[0]}`}>
                      <Zap className={`w-4 h-4 ${colorClass.split(' ')[1]}`} />
                    </div>
                    <p className="text-white/80 text-sm">{insightText}</p>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No insights available yet</p>
              <p className="text-xs mt-1">Keep tracking to unlock insights</p>
            </div>
          )}
        </GlassCard>

        {/* Top Distractions */}
        <GlassCard title="Top Distractions" icon={AlertTriangle}>
          {isAppsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse h-10 bg-white/5 rounded-lg" />
              ))}
            </div>
          ) : distractionApps.length > 0 ? (
            <div className="space-y-3">
              {distractionApps.slice(0, 5).map((app, index) => (
                <motion.div
                  key={app.app}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-2 rounded-lg bg-distracting/10"
                >
                  <span className="text-white text-sm">{app.app}</span>
                  <span className="text-distracting text-sm font-medium">
                    {formatTime(app.duration)}
                  </span>
                </motion.div>
              ))}
              <div className="pt-3 border-t border-white/10">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Total lost:</span>
                  <span className="text-distracting font-semibold">
                    {formatTime(distractionApps.reduce((sum, app) => sum + app.duration, 0))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-white/40">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No distractions detected</p>
              <p className="text-xs mt-1">Great focus!</p>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Streak & Goals */}
      {weeklyAnalytics?.streak && (
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Flame className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-white text-lg font-bold">
                    {weeklyAnalytics.streak.current} Day Streak
                  </h3>
                  <p className="text-white/50 text-sm">
                    Best: {weeklyAnalytics.streak.best} days • Keep it up!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <ProgressRing
                    value={weeklyAnalytics.streak.goal_met_today ? 100 : 50}
                    size={60}
                    strokeWidth={5}
                    color={weeklyAnalytics.streak.goal_met_today ? 'productive' : 'neutral'}
                    showValue={false}
                  />
                  <p className="text-xs text-white/50 mt-1">
                    {weeklyAnalytics.streak.goal_met_today ? 'Goal met!' : 'In progress'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-white/50 text-xs">This week</p>
                  <p className="text-white text-xl font-bold">
                    {Math.round(weeklyAnalytics.productivity_score)}%
                  </p>
                  <p className="text-productive text-xs">productive</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Weekly Report Modal */}
      <WeeklyReportModal
        isOpen={showWeeklyReport}
        onClose={() => setShowWeeklyReport(false)}
      />
    </motion.div>
  );
}
