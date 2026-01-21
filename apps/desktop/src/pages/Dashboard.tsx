import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Globe, Clock, Zap, Calendar, Target,
  ChevronRight, Play, Pause, BarChart3,
  Sun, Sunrise, Sunset, Moon, Trophy, Coffee,
  RefreshCw, Timer, FileText, AlertTriangle, Layers
} from 'lucide-react';

// Mini Sparkline Component for stat cards
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-20"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
      <linearGradient id={`sparkline-fill-${color}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
      <polygon
        fill={`url(#sparkline-fill-${color})`}
        points={`0,100 ${points} 100,100`}
      />
    </svg>
  );
}
import { Link } from 'react-router-dom';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';
import { useSettings } from '@/hooks/useSettings';
import { apiClient } from '@/lib/api/client';
import { AfkWarningModal } from '@/components/AfkWarningModal';
import { DeepWorkScoreWidget } from '@/components/deepwork';
import { FocusAnalytics } from '@/components/focus';
import { ExtensionPrompt, useExtensionStatus } from '@/components/ExtensionPrompt';

export default function Dashboard() {
  // Check if extension is installed
  const { isInstalled: extensionInstalled } = useExtensionStatus();
  // Get settings for AFK timeout
  const { data: settings } = useSettings();
  const afkTimeout = settings?.tracking?.idleTimeout ?? 600; // Default 10 minutes
  const afkEnabled = settings?.tracking?.afkDetection ?? true;

  const {
    currentActivity,
    timeStats,
    isTracking,
    toggleTracking,
    // AFK Detection
    isAfk,
    afkDuration,
    showAfkWarning,
    dismissAfkWarning,
    resumeFromAfk,
    // Data source
    dataSource
  } = useRealTimeActivity({
    afkTimeoutSeconds: afkTimeout,
    afkDetectionEnabled: afkEnabled
  });

  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [greeting, setGreeting] = useState({ text: 'Hello', icon: Sun });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting({ text: 'Good morning', icon: Sunrise });
    } else if (hour >= 12 && hour < 17) {
      setGreeting({ text: 'Good afternoon', icon: Sun });
    } else if (hour >= 17 && hour < 21) {
      setGreeting({ text: 'Good evening', icon: Sunset });
    } else {
      setGreeting({ text: 'Good night', icon: Moon });
    }

    fetchRecentActivities();

    // Auto-refresh recent activities every 10 seconds for real-time updates
    const refreshInterval = setInterval(fetchRecentActivities, 10000);
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchRecentActivities = async () => {
    // Only show loading on first fetch, not refreshes (prevents flash)
    if (recentActivities.length === 0) {
      setActivitiesLoading(true);
    }
    try {
      const response = await apiClient.get('/api/activities/recent', { params: { limit: 5 } });
      const data = response.data || [];
      // Only update if we have data (prevents clearing on error)
      if (data.length > 0 || recentActivities.length === 0) {
        setRecentActivities(data);
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
      // Don't clear existing data on error
    }
    setActivitiesLoading(false);
  };

  const formatTime = (seconds: number): { h: number; m: number; s: number } => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { h, m, s };
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0s';
    const { h, m, s } = formatTime(seconds);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const GreetingIcon = greeting.icon;
  const todayTime = formatTime(timeStats.today_total);

  return (
    <div className="space-y-6 pb-8">

      {/* Extension Install Prompt - only show if not installed */}
      {!extensionInstalled && <ExtensionPrompt variant="card" />}

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1: HEADER + CURRENT ACTIVITY (TOP PRIORITY)
          ═══════════════════════════════════════════════════════════ */}

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left: Greeting + Live Time */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="flex items-center gap-2 text-white/50 mb-2">
            <GreetingIcon className="w-4 h-4" />
            <span className="text-sm">{greeting.text}</span>
          </div>

          {/* Big Live Time Display */}
          <div className="mb-4">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold tabular-nums text-white">
                {String(todayTime.h).padStart(2, '0')}
              </span>
              <span className="text-2xl text-white/40">h</span>

              <span className="text-5xl font-bold tabular-nums ml-2 text-white">
                {String(todayTime.m).padStart(2, '0')}
              </span>
              <span className="text-2xl text-white/40">m</span>

              <span className="text-3xl font-medium text-white/40 tabular-nums ml-2">
                {String(todayTime.s).padStart(2, '0')}
              </span>
              <span className="text-lg text-white/30">s</span>
            </div>
            <p className="text-white/40 text-sm mt-1">Total time today</p>
          </div>

          {/* Productivity Ring - Fixed positioning */}
          <div className="flex items-center gap-4 mt-2">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40" cy="40" r="34"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-white/10"
                />
                <motion.circle
                  cx="40" cy="40" r="34"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className="text-green-500"
                  initial={{ strokeDasharray: '0 214' }}
                  animate={{
                    strokeDasharray: `${(timeStats.productivity / 100) * 214} 214`
                  }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{timeStats.productivity}%</span>
              </div>
            </div>
            <div>
              <p className="font-semibold text-white">Productivity</p>
              <p className="text-sm text-white/50">
                {formatDuration(timeStats.today_productive)} productive
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right: Current Activity Card (MAIN FOCUS) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <CurrentActivityHero
            activity={currentActivity}
            isTracking={isTracking}
            onToggle={toggleTracking}
            dataSource={dataSource}
          />
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: TIME STATS ROW (5 Cards with Sparklines)
          ═══════════════════════════════════════════════════════════ */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Productive"
          value={formatDuration(timeStats.today_productive)}
          subtext={`${timeStats.productivity}% of total`}
          color="green"
          sparklineData={[30, 45, 60, 55, 70, 65, 80, timeStats.productivity]}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="This Week"
          value={formatDuration(timeStats.week_total)}
          subtext={`${Math.round(timeStats.week_total / 3600 / 7 * 10) / 10}h avg`}
          color="purple"
          sparklineData={[20, 35, 45, 55, 50, 60, 55]}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Distraction"
          value={formatDuration(timeStats.distracting_time || 0)}
          subtext="Time lost"
          color="red"
          sparklineData={[10, 15, 25, 20, 30, 25, 15]}
        />
        <StatCard
          icon={<Coffee className="w-5 h-5" />}
          label="AFK/Neutral"
          value={formatDuration(timeStats.afk_time || 0)}
          subtext="Away time"
          color="orange"
          sparklineData={[15, 20, 10, 25, 15, 30, 20]}
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Focus Score"
          value={timeStats.productivity >= 70 ? 'A' : timeStats.productivity >= 50 ? 'B' : 'C'}
          subtext={timeStats.productivity >= 70 ? 'Excellent!' : 'Keep going'}
          color="indigo"
          highlight={timeStats.productivity >= 70}
          sparklineData={[40, 55, 60, 65, 70, 75, timeStats.productivity]}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3: ACTIVITY LIST + QUICK ACTIONS
          ═══════════════════════════════════════════════════════════ */}

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent Activity (2 columns) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2 text-white">
                <Clock className="w-4 h-4 text-indigo-400" />
                Recent Activity
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchRecentActivities}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 text-white/40 ${activitiesLoading ? 'animate-spin' : ''}`} />
                </button>
                <Link
                  to="/activity"
                  className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {activitiesLoading && recentActivities.length === 0 ? (
                // Skeleton - only show on initial load
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-white/10" />
                    <div className="flex-1">
                      <div className="h-4 bg-white/10 rounded w-32 mb-2" />
                      <div className="h-3 bg-white/5 rounded w-48" />
                    </div>
                    <div className="h-5 bg-white/10 rounded-lg w-20" />
                    <div className="w-16 text-right">
                      <div className="h-4 bg-white/10 rounded w-12 ml-auto mb-1" />
                      <div className="h-2 bg-white/5 rounded w-10 ml-auto" />
                    </div>
                  </div>
                ))
              ) : recentActivities.length > 0 ? (
                // Show activities (limit to 5)
                recentActivities.slice(0, 5).map((activity, index) => (
                  <ActivityRow key={activity.id || index} activity={activity} index={index} />
                ))
              ) : (
                // Empty state
                <div className="px-5 py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Monitor className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/60 font-medium mb-1">No activity yet</p>
                  <p className="text-sm text-white/30">Start using apps to begin tracking your time</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right Sidebar: Deep Work Score + Top Platforms + Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* Deep Work Score Widget */}
          <DeepWorkScoreWidget compact />

          {/* Focus Analytics Widget */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Timer className="w-4 h-4 text-indigo-400" />
              Focus Mode
            </h3>
            <FocusAnalytics days={7} compact />
          </div>

          {/* Top Platforms/Websites Box */}
          <TopPlatformsWebsites formatDuration={formatDuration} />

          {/* Quick Actions (moved down) */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white/40 text-sm uppercase tracking-wider">
              Quick Actions
            </h3>

            <QuickAction
              icon={<Timer className="w-5 h-5" />}
              title="Start Focus Session"
              description="25 min deep work"
              color="indigo"
            />
            <QuickAction
              icon={<Target className="w-5 h-5" />}
              title="View Goals"
              description="Track progress"
              href="/goals"
              color="green"
            />
            <QuickAction
              icon={<BarChart3 className="w-5 h-5" />}
              title="Analytics"
              description="Deep dive into stats"
              href="/analytics"
              color="purple"
            />
            <QuickAction
              icon={<FileText className="w-5 h-5" />}
              title="Export Report"
              description="Download PDF"
              color="orange"
            />
          </div>
        </motion.div>
      </div>

      {/* AFK Warning Modal */}
      <AfkWarningModal
        isVisible={showAfkWarning}
        afkDuration={afkDuration}
        isAutoPaused={!isTracking && isAfk}
        onDismiss={dismissAfkWarning}
        onResume={resumeFromAfk}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════

// Current Activity Hero Component (TOP OF PAGE)
function CurrentActivityHero({
  activity,
  isTracking,
  onToggle,
  dataSource
}: {
  activity: any;
  isTracking: boolean;
  onToggle: () => void;
  dataSource: 'native' | 'activitywatch' | 'mock' | 'none';
}) {
  const [elapsed, setElapsed] = useState(0);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<number>(Date.now());

  // Reset timer when activity changes (new app/window)
  useEffect(() => {
    if (activity) {
      const activityKey = `${activity.app_name}:${activity.title}`;
      if (lastActivity !== activityKey) {
        // Activity changed - reset timer
        setLastActivity(activityKey);
        setSessionStart(Date.now());
        setElapsed(0);
      }
    }
  }, [activity?.app_name, activity?.title, lastActivity]);

  // Count up every second
  useEffect(() => {
    if (isTracking && activity) {
      const interval = setInterval(() => {
        const now = Date.now();
        const secondsSinceStart = Math.floor((now - sessionStart) / 1000);
        setElapsed(secondsSinceStart);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isTracking, activity, sessionStart]);

  const formatElapsed = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Solid colors for categories (no gradients)
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      development: 'bg-blue-500',
      design: 'bg-purple-500',
      productivity: 'bg-indigo-500',
      communication: 'bg-green-500',
      entertainment: 'bg-red-500',
      browsing: 'bg-yellow-500',
      social: 'bg-pink-500',
    };
    return colors[category?.toLowerCase()] || 'bg-gray-500';
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-6
      ${isTracking
        ? 'bg-white/10 border border-green-500/30'
        : 'bg-white/5 border border-white/10'
      }
    `}>
      {/* Animated background when tracking (solid color) */}
      {isTracking && activity && (
        <motion.div
          className={`absolute inset-0 ${getCategoryColor(activity.category)} opacity-5`}
          animate={{ opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}

      <div className="relative">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Pulsing indicator */}
            <div className="relative">
              {isTracking && (
                <motion.div
                  className="absolute inset-0 bg-green-500 rounded-full"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-500'}`} />
            </div>
            <span className={`text-sm font-medium ${isTracking ? 'text-green-400' : 'text-white/40'}`}>
              {isTracking ? 'Tracking Active' : 'Tracking Paused'}
            </span>
            {/* Data Source Indicator */}
            {dataSource === 'mock' && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                Demo Mode
              </span>
            )}
            {dataSource === 'native' && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                Live
              </span>
            )}
            {dataSource === 'activitywatch' && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                ActivityWatch
              </span>
            )}
          </div>

          {/* Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggle}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all
              ${isTracking
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
              }
            `}
          >
            {isTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isTracking ? 'Pause' : 'Resume'}
          </motion.button>
        </div>

        {/* Activity Content */}
        <AnimatePresence mode="wait">
          {activity ? (
            <motion.div
              key={activity.app_name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start gap-5"
            >
              {/* App Icon (solid color) */}
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center
                ${getCategoryColor(activity.category)}
                shadow-lg
              `}>
                {activity.app_name?.toLowerCase().includes('chrome') ||
                 activity.app_name?.toLowerCase().includes('firefox') ||
                 activity.app_name?.toLowerCase().includes('safari') ? (
                  <Globe className="w-8 h-8 text-white" />
                ) : (
                  <Monitor className="w-8 h-8 text-white" />
                )}
              </div>

              {/* App Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate mb-1 text-white">
                  {activity.app_name}
                </h2>
                <p className="text-white/40 text-sm truncate mb-3">
                  {activity.title || 'No title'}
                </p>

                {/* Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`
                    px-2.5 py-1 rounded-lg text-xs font-medium capitalize
                    ${activity.is_productive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/10 text-white/50'
                    }
                  `}>
                    {activity.category || 'Other'}
                  </span>
                  {activity.is_productive && (
                    <span className="flex items-center gap-1 text-xs text-green-400">
                      <Zap className="w-3 h-3" /> Productive
                    </span>
                  )}
                </div>
              </div>

              {/* Timer */}
              <div className="text-right">
                <motion.div
                  key={elapsed}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-3xl font-mono font-bold tabular-nums text-white"
                >
                  {formatElapsed(elapsed)}
                </motion.div>
                <p className="text-xs text-white/40 mt-1">Session time</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-6 text-white/40"
            >
              <div className="text-center">
                <Coffee className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No activity detected</p>
                <p className="text-sm text-white/30">Start using an app to begin tracking</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Stat Card Component with Sparkline (No Gradients - Solid Colors)
function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
  highlight,
  sparklineData = []
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'green' | 'purple' | 'pink' | 'indigo' | 'blue' | 'orange' | 'red';
  highlight?: boolean;
  sparklineData?: number[];
}) {
  // Solid background colors (no gradients)
  const colorConfig = {
    green: { bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-400', hex: '#22c55e' },
    purple: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400', hex: '#a855f7' },
    pink: { bg: 'bg-pink-500/15', border: 'border-pink-500/30', text: 'text-pink-400', hex: '#ec4899' },
    indigo: { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-400', hex: '#6366f1' },
    blue: { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400', hex: '#3b82f6' },
    orange: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400', hex: '#f97316' },
    red: { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', hex: '#ef4444' },
  };

  const config = colorConfig[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`
        relative overflow-hidden p-4 rounded-2xl border transition-all cursor-default
        ${config.bg} ${config.border}
        ${highlight ? 'ring-2 ring-yellow-500/50' : ''}
      `}
    >
      {/* Sparkline Background */}
      {sparklineData.length > 0 && (
        <MiniSparkline data={sparklineData} color={config.hex} />
      )}

      {/* Content */}
      <div className="relative z-10">
        <div className={`mb-2 ${config.text}`}>
          {icon}
        </div>
        <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
        <p className="text-sm text-white/60">{label}</p>
        <p className="text-xs text-white/40 mt-1">{subtext}</p>

        {highlight && (
          <div className="mt-2">
            <Trophy className="w-4 h-4 text-yellow-400 inline" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Activity Row Component
function ActivityRow({ activity, index }: { activity: any; index: number }) {
  const formatDuration = (s: number) => {
    if (!s) return '0s';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return '';
    const now = new Date();
    // API returns UTC timestamps without timezone indicator - add 'Z' to parse as UTC
    const utcTimestamp = timestamp.includes('Z') || timestamp.includes('+') ? timestamp : timestamp + 'Z';
    const time = new Date(utcTimestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return time.toLocaleDateString();
  };

  // Category colors
  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      development: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
      design: { bg: 'bg-purple-500/15', text: 'text-purple-400' },
      productivity: { bg: 'bg-indigo-500/15', text: 'text-indigo-400' },
      communication: { bg: 'bg-green-500/15', text: 'text-green-400' },
      browsing: { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
      video: { bg: 'bg-red-500/15', text: 'text-red-400' },
      entertainment: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
      music: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
      system: { bg: 'bg-gray-500/15', text: 'text-gray-400' },
    };
    return styles[category?.toLowerCase()] || { bg: 'bg-white/10', text: 'text-white/50' };
  };

  const categoryStyle = getCategoryStyle(activity.category);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="px-5 py-3.5 flex items-center gap-4 hover:bg-white/5 transition-all cursor-default group"
    >
      {/* App Icon */}
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center shrink-0
        ${activity.is_productive
          ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400'
          : `${categoryStyle.bg} ${categoryStyle.text}`
        }
      `}>
        <Monitor className="w-5 h-5" />
      </div>

      {/* App Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate text-sm text-white">
            {activity.app_name || 'Unknown'}
          </p>
          {activity.is_productive && (
            <Zap className="w-3 h-3 text-green-400 shrink-0" />
          )}
        </div>
        <p className="text-xs text-white/40 truncate mt-0.5">
          {activity.title || 'No title'}
        </p>
      </div>

      {/* Category Badge */}
      <span className={`
        px-2.5 py-1 rounded-lg text-xs font-medium capitalize shrink-0
        ${categoryStyle.bg} ${categoryStyle.text}
      `}>
        {activity.category || 'Other'}
      </span>

      {/* Duration */}
      <div className="text-right shrink-0 w-16">
        <p className="text-sm font-semibold text-white">
          {formatDuration(activity.duration)}
        </p>
        <p className="text-[10px] text-white/30">
          {formatTimeAgo(activity.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}

// Top Platforms/Websites Component
function TopPlatformsWebsites({ formatDuration }: { formatDuration: (s: number) => string }) {
  const [activeTab, setActiveTab] = useState<'platforms' | 'websites'>('platforms');
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [platformsRes, websitesRes] = await Promise.all([
          apiClient.get('/api/activities/platforms', { params: { period: 'today' } }),
          apiClient.get('/api/activities/websites', { params: { period: 'today' } })
        ]);
        setPlatforms(platformsRes.data.platforms || []);
        setWebsites(websitesRes.data.websites || []);
      } catch (error) {
        console.error('Failed to fetch platforms/websites:', error);
      }
      setIsLoading(false);
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const maxTime = activeTab === 'platforms'
    ? (platforms[0]?.total_time || 1)
    : (websites[0]?.total_time || 1);

  const items = activeTab === 'platforms' ? platforms.slice(0, 5) : websites.slice(0, 5);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('platforms')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'platforms'
              ? 'text-white bg-white/5 border-b-2 border-primary'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          Platforms
        </button>
        <button
          onClick={() => setActiveTab('websites')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'websites'
              ? 'text-white bg-white/5 border-b-2 border-primary'
              : 'text-white/50 hover:text-white hover:bg-white/5'
          }`}
        >
          <Globe className="w-4 h-4" />
          Websites
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          // Skeleton loading
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between mb-1">
                <div className="h-4 bg-white/10 rounded w-24" />
                <div className="h-4 bg-white/10 rounded w-12" />
              </div>
              <div className="h-2 bg-white/5 rounded-full" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-white/40">
            <p className="text-sm">No {activeTab} tracked today</p>
          </div>
        ) : (
          items.map((item, index) => {
            const name = activeTab === 'platforms' ? item.domain : item.site;
            const time = item.total_time || 0;
            const progress = (time / maxTime) * 100;

            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white truncate pr-2" style={{ maxWidth: '60%' }}>
                    {name}
                  </span>
                  <span className="text-sm font-medium text-white/70">
                    {formatDuration(time)}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      item.productivity === 'productive'
                        ? 'bg-green-500'
                        : item.productivity === 'distracting'
                        ? 'bg-red-500'
                        : 'bg-indigo-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* View All Link */}
      <Link
        to="/activity"
        className="flex items-center justify-center gap-1 px-4 py-2 text-xs text-indigo-400 hover:text-indigo-300 border-t border-white/10 hover:bg-white/5 transition-colors"
      >
        View all <ChevronRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// Quick Action Component
function QuickAction({
  icon,
  title,
  description,
  href,
  color,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  color: 'indigo' | 'green' | 'purple' | 'orange';
  onClick?: () => void;
}) {
  const colorClasses = {
    indigo: 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30',
    green: 'bg-green-500/20 text-green-400 group-hover:bg-green-500/30',
    purple: 'bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30',
    orange: 'bg-orange-500/20 text-orange-400 group-hover:bg-orange-500/30',
  };

  const Component = href ? Link : 'button';
  const props = href ? { to: href } : { onClick };

  return (
    <Component
      {...props as any}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10
        hover:bg-white/10 hover:border-white/20 transition-all group text-left"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm text-white">{title}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
    </Component>
  );
}
