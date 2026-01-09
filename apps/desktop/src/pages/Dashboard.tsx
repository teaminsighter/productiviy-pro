import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Globe, Clock, Zap, Calendar, Target,
  ChevronRight, Play, Pause, BarChart3,
  Sun, Sunrise, Sunset, Moon, Trophy, Coffee,
  RefreshCw, Timer, FileText, AlertTriangle, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';
import { apiClient } from '@/lib/api/client';

export default function Dashboard() {
  const {
    currentActivity,
    timeStats,
    isTracking,
    toggleTracking
  } = useRealTimeActivity();

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
  }, []);

  const fetchRecentActivities = async () => {
    setActivitiesLoading(true);
    try {
      const response = await apiClient.get('/api/activities/recent', { params: { limit: 8 } });
      setRecentActivities(response.data || []);
    } catch (error) {
      console.error('Failed to fetch:', error);
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
              <motion.span
                key={todayTime.h}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-5xl font-bold tabular-nums text-white"
              >
                {todayTime.h}
              </motion.span>
              <span className="text-2xl text-white/40">h</span>

              <motion.span
                key={todayTime.m}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-5xl font-bold tabular-nums ml-2 text-white"
              >
                {String(todayTime.m).padStart(2, '0')}
              </motion.span>
              <span className="text-2xl text-white/40">m</span>

              <motion.span
                key={todayTime.s}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-3xl font-medium text-white/40 tabular-nums ml-2"
              >
                {String(todayTime.s).padStart(2, '0')}
              </motion.span>
              <span className="text-lg text-white/30">s</span>
            </div>
            <p className="text-white/40 text-sm mt-1">Total time today</p>
          </div>

          {/* Productivity Ring */}
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90">
                <circle
                  cx="32" cy="32" r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-white/10"
                />
                <motion.circle
                  cx="32" cy="32" r="28"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  className="text-green-500"
                  initial={{ strokeDasharray: '0 176' }}
                  animate={{
                    strokeDasharray: `${(timeStats.productivity / 100) * 176} 176`
                  }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{timeStats.productivity}%</span>
              </div>
            </div>
            <div>
              <p className="font-medium text-white">Productivity</p>
              <p className="text-sm text-white/40">
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
          />
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2: TIME STATS ROW
          ═══════════════════════════════════════════════════════════ */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Productive Today"
          value={formatDuration(timeStats.today_productive)}
          subtext={`${timeStats.productivity}% of total`}
          color="green"
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="This Week"
          value={formatDuration(timeStats.week_total)}
          subtext={`${Math.round(timeStats.week_total / 3600 / 7 * 10) / 10}h daily avg`}
          color="purple"
        />
        {/* Distraction & AFK Split Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="p-4 rounded-2xl border bg-gradient-to-br from-red-500/20 to-orange-600/5 border-red-500/20 transition-all cursor-default"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
              <p className="text-xl font-bold text-white">{formatDuration(timeStats.distracting_time || 0)}</p>
              <p className="text-xs text-white/50">Distraction</p>
            </div>
            <div>
              <Coffee className="w-5 h-5 text-orange-400 mb-2" />
              <p className="text-xl font-bold text-white">{formatDuration(timeStats.afk_time || 0)}</p>
              <p className="text-xs text-white/50">Neutral/AFK</p>
            </div>
          </div>
        </motion.div>
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Focus Score"
          value={timeStats.productivity >= 70 ? 'A' : timeStats.productivity >= 50 ? 'B' : 'C'}
          subtext={timeStats.productivity >= 70 ? 'Excellent!' : 'Keep going'}
          color="indigo"
          highlight={timeStats.productivity >= 70}
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
              {activitiesLoading ? (
                // Skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-white/10" />
                    <div className="flex-1">
                      <div className="h-4 bg-white/10 rounded w-32 mb-2" />
                      <div className="h-3 bg-white/5 rounded w-48" />
                    </div>
                    <div className="h-4 bg-white/10 rounded w-12" />
                  </div>
                ))
              ) : recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <ActivityRow key={activity.id || index} activity={activity} index={index} />
                ))
              ) : (
                <div className="px-5 py-12 text-center text-white/40">
                  <Monitor className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No activity yet</p>
                  <p className="text-sm">Start using apps to track</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right Sidebar: Top Platforms/Websites + Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
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
  onToggle
}: {
  activity: any;
  isTracking: boolean;
  onToggle: () => void;
}) {
  const [elapsed, setElapsed] = useState(activity?.duration || 0);

  useEffect(() => {
    if (activity) setElapsed(activity.duration);
  }, [activity?.duration]);

  useEffect(() => {
    if (isTracking && activity) {
      const interval = setInterval(() => {
        setElapsed((e: number) => e + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isTracking, activity]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const getCategoryGradient = (category: string) => {
    const gradients: Record<string, string> = {
      development: 'from-blue-500 to-cyan-400',
      design: 'from-purple-500 to-pink-400',
      productivity: 'from-indigo-500 to-violet-400',
      communication: 'from-green-500 to-emerald-400',
      entertainment: 'from-red-500 to-orange-400',
      browsing: 'from-yellow-500 to-amber-400',
      social: 'from-pink-500 to-rose-400',
    };
    return gradients[category?.toLowerCase()] || 'from-gray-500 to-gray-400';
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-6
      ${isTracking
        ? 'bg-gradient-to-br from-white/10 to-white/5 border border-green-500/30'
        : 'bg-white/5 border border-white/10'
      }
    `}>
      {/* Animated background when tracking */}
      {isTracking && activity && (
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${getCategoryGradient(activity.category)} opacity-5`}
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
              {/* App Icon */}
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center
                bg-gradient-to-br ${getCategoryGradient(activity.category)}
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

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
  highlight
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'green' | 'purple' | 'pink' | 'indigo' | 'blue' | 'orange' | 'red';
  highlight?: boolean;
}) {
  const colorClasses = {
    green: 'from-green-500/20 to-green-600/5 border-green-500/20 text-green-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20 text-purple-400',
    pink: 'from-pink-500/20 to-pink-600/5 border-pink-500/20 text-pink-400',
    indigo: 'from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-400',
    orange: 'from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-400',
    red: 'from-red-500/20 to-red-600/5 border-red-500/20 text-red-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`
        p-4 rounded-2xl border bg-gradient-to-br transition-all cursor-default
        ${colorClasses[color]}
        ${highlight ? 'ring-2 ring-yellow-500/50' : ''}
      `}
    >
      <div className={`mb-3 ${colorClasses[color].split(' ').pop()}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-sm text-white/50">{label}</p>
      <p className="text-xs text-white/30 mt-1">{subtext}</p>

      {highlight && (
        <div className="mt-2">
          <Trophy className="w-4 h-4 text-yellow-400 inline" />
        </div>
      )}
    </motion.div>
  );
}

// Activity Row Component
function ActivityRow({ activity, index }: { activity: any; index: number }) {
  const formatDuration = (s: number) => {
    if (!s) return '0s';
    const m = Math.floor(s / 60);
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors group"
    >
      {/* Icon */}
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center
        ${activity.is_productive
          ? 'bg-green-500/20 text-green-400'
          : 'bg-white/10 text-white/40'
        }
      `}>
        <Monitor className="w-5 h-5" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm text-white">{activity.app_name || 'Unknown'}</p>
        <p className="text-xs text-white/40 truncate">{activity.title || '-'}</p>
      </div>

      {/* Duration + Category */}
      <div className="flex items-center gap-3">
        <span className={`
          px-2 py-0.5 rounded-md text-xs capitalize
          ${activity.is_productive
            ? 'bg-green-500/10 text-green-400'
            : 'bg-white/10 text-white/40'
          }
        `}>
          {activity.category || 'Other'}
        </span>
        <span className="text-sm font-medium text-white/60 w-12 text-right">
          {formatDuration(activity.duration)}
        </span>
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
