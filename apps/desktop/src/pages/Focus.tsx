import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Focus as FocusIcon,
  Play,
  Pause,
  Square,
  Timer,
  Shield,
  ShieldOff,
  Calendar,
  Zap,
  Target,
  TrendingUp,
  Settings,
  Plus,
  Sparkles,
  Globe,
  Layers,
  X,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getFocusSettings,
  updateFocusSettings,
  getActiveSession,
  getFocusBlocks,
  getFocusSuggestions,
  getFocusStats,
  quickStartFocus,
  startFocusSession,
  endFocusSession,
  pauseFocusSession,
  scheduleFromSuggestion,
  createFocusBlock,
  deleteFocusBlock,
  type FocusSettings,
  type FocusBlock,
  type FocusSuggestion,
} from '@/lib/api/focus';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return `Today at ${formatTime(dateStr)}`;
  if (isTomorrow) return `Tomorrow at ${formatTime(dateStr)}`;

  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
    ` at ${formatTime(dateStr)}`;
}

function getTimeRemaining(endTime: string): { minutes: number; seconds: number } {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  return {
    minutes: Math.floor(diff / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Focus() {
  const queryClient = useQueryClient();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Fetch data
  const { data: settings } = useQuery({
    queryKey: ['focus-settings'],
    queryFn: getFocusSettings,
  });

  const { data: activeSession } = useQuery({
    queryKey: ['active-session'],
    queryFn: getActiveSession,
    refetchInterval: 1000, // Poll every second when active
  });

  const { data: upcomingBlocks = [] } = useQuery({
    queryKey: ['focus-blocks'],
    queryFn: () => getFocusBlocks(168), // 7 days
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['focus-suggestions'],
    queryFn: () => getFocusSuggestions(7),
  });

  const { data: stats } = useQuery({
    queryKey: ['focus-stats'],
    queryFn: () => getFocusStats(7),
  });

  // Mutations
  const quickStartMutation = useMutation({
    mutationFn: quickStartFocus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['focus-blocks'] });
      toast.success('Focus session started!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const endSessionMutation = useMutation({
    mutationFn: endFocusSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['focus-stats'] });
      toast.success('Focus session completed!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pauseSessionMutation = useMutation({
    mutationFn: pauseFocusSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      toast.info('Focus session paused');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ startTime, endTime }: { startTime: string; endTime: string }) =>
      scheduleFromSuggestion(startTime, endTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-blocks'] });
      toast.success('Focus block scheduled!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFocusBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-blocks'] });
      toast.success('Focus block deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isActive = activeSession && activeSession.status === 'active';
  const isPaused = !!(activeSession && activeSession.status === 'paused');

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <FocusIcon className="w-5 h-5 text-indigo-400" />
            </div>
            Focus Mode
          </h1>
          <p className="text-white/50 mt-1">
            Block distractions and maximize deep work
          </p>
        </div>

        <button
          onClick={() => setShowSettingsPanel(!showSettingsPanel)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10
            hover:bg-white/10 transition-colors text-white/70 hover:text-white"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Active Session or Quick Start */}
      {isActive || isPaused ? (
        <ActiveSessionCard
          session={activeSession!}
          onEnd={() => endSessionMutation.mutate(activeSession!.id)}
          onPause={() => pauseSessionMutation.mutate(activeSession!.id)}
          isPaused={isPaused}
        />
      ) : (
        <QuickStartCard
          onQuickStart={(duration) => quickStartMutation.mutate(duration)}
          isLoading={quickStartMutation.isPending}
          defaultDuration={settings?.focusDurationMinutes || 50}
        />
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Timer className="w-5 h-5" />}
          label="Today's Focus"
          value={formatDuration(stats?.dailyStats[0]?.focusMinutes || 0)}
          color="indigo"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Distractions Blocked"
          value={String(stats?.totalDistractionsBlocked || 0)}
          color="red"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Success Rate"
          value={`${Math.round(stats?.averageSuccessRate || 0)}%`}
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Current Streak"
          value={`${stats?.currentStreak || 0} days`}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Upcoming Focus Blocks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scheduled Focus Blocks */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Scheduled Focus Blocks
              </h3>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
              >
                <Plus className="w-4 h-4" />
                Schedule
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {upcomingBlocks.length === 0 ? (
                <div className="px-5 py-12 text-center text-white/40">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No scheduled focus blocks</p>
                  <p className="text-sm">Schedule one or use AI suggestions below</p>
                </div>
              ) : (
                upcomingBlocks.slice(0, 5).map((block, index) => (
                  <FocusBlockRow
                    key={block.id}
                    block={block}
                    index={index}
                    onStart={() => startFocusSession(block.id).then(() => {
                      queryClient.invalidateQueries({ queryKey: ['active-session'] });
                      toast.success('Focus session started!');
                    })}
                    onDelete={() => deleteMutation.mutate(block.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4 text-purple-400" />
                AI-Suggested Focus Times
              </h3>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['focus-suggestions'] })}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-white/40" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {suggestions.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Analyzing your calendar for optimal focus times...</p>
                </div>
              ) : (
                suggestions.slice(0, 4).map((suggestion, index) => (
                  <SuggestionCard
                    key={index}
                    suggestion={suggestion}
                    onSchedule={() => scheduleMutation.mutate({
                      startTime: suggestion.startTime,
                      endTime: suggestion.endTime,
                    })}
                    isScheduling={scheduleMutation.isPending}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Blocking Status & Settings */}
        <div className="space-y-6">
          {/* Blocking Status */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="font-semibold flex items-center gap-2 text-white mb-4">
              {isActive ? (
                <Shield className="w-4 h-4 text-green-400" />
              ) : (
                <ShieldOff className="w-4 h-4 text-white/40" />
              )}
              Distraction Blocking
            </h3>

            <div className={`p-4 rounded-xl ${isActive ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/70">Status</span>
                <span className={`text-sm font-medium ${isActive ? 'text-green-400' : 'text-white/50'}`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/70">Mode</span>
                <span className="text-sm font-medium text-white capitalize">
                  {settings?.blockingMode || 'soft'}
                </span>
              </div>

              <div className="text-xs text-white/40 mt-3">
                {settings?.blockingMode === 'soft' && 'Shows warning before allowing access'}
                {settings?.blockingMode === 'hard' && 'Blocks access with countdown'}
                {settings?.blockingMode === 'strict' && 'No bypass allowed during focus'}
              </div>
            </div>

            {/* Blocked Apps Preview */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-white/40" />
                <span className="text-sm text-white/70">Blocked Apps</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(settings?.defaultBlockedApps || []).slice(0, 5).map((app) => (
                  <span key={app} className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded-md">
                    {app}
                  </span>
                ))}
                {(settings?.defaultBlockedApps?.length || 0) > 5 && (
                  <span className="px-2 py-1 text-xs bg-white/10 text-white/50 rounded-md">
                    +{(settings?.defaultBlockedApps?.length || 0) - 5} more
                  </span>
                )}
              </div>
            </div>

            {/* Blocked Sites Preview */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-white/40" />
                <span className="text-sm text-white/70">Blocked Sites</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(settings?.defaultBlockedWebsites || []).slice(0, 5).map((site) => (
                  <span key={site} className="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded-md">
                    {site}
                  </span>
                ))}
                {(settings?.defaultBlockedWebsites?.length || 0) > 5 && (
                  <span className="px-2 py-1 text-xs bg-white/10 text-white/50 rounded-md">
                    +{(settings?.defaultBlockedWebsites?.length || 0) - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Weekly Stats */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="font-semibold flex items-center gap-2 text-white mb-4">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              This Week
            </h3>

            <div className="space-y-3">
              {(stats?.dailyStats || []).slice(0, 7).reverse().map((day, index) => {
                const maxMinutes = Math.max(...(stats?.dailyStats?.map(d => d.focusMinutes) || [1]), 1);
                const percentage = (day.focusMinutes / maxMinutes) * 100;

                return (
                  <div key={day.date}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/50">
                        {new Date(day.date).toLocaleDateString([], { weekday: 'short' })}
                      </span>
                      <span className="text-xs font-medium text-white/70">
                        {formatDuration(day.focusMinutes)}
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-500 rounded-full"
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
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        defaultDuration={settings?.focusDurationMinutes || 50}
        onCreate={(startTime, endTime, title) => {
          createFocusBlock({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            title,
          }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['focus-blocks'] });
            toast.success('Focus block scheduled!');
            setShowScheduleModal(false);
          }).catch((err) => toast.error(err.message));
        }}
      />

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettingsPanel && settings && (
          <FocusSettingsPanel
            settings={settings}
            onClose={() => setShowSettingsPanel(false)}
            onUpdate={(updates) => {
              updateFocusSettings(updates).then(() => {
                queryClient.invalidateQueries({ queryKey: ['focus-settings'] });
                toast.success('Settings updated!');
              }).catch((err) => toast.error(err.message));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ActiveSessionCard({
  session,
  onEnd,
  onPause,
  isPaused,
}: {
  session: FocusBlock;
  onEnd: () => void;
  onPause: () => void;
  isPaused?: boolean;
}) {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining(session.endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(session.endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.endTime]);

  const progress = (session.completedMinutes / session.durationMinutes) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/30 p-6 relative overflow-hidden"
    >
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 bg-indigo-500/5"
        animate={{ opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-4 h-4 rounded-full bg-green-500"
              animate={!isPaused ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-green-400 font-medium">
              {isPaused ? 'Session Paused' : 'Focus Session Active'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400
                hover:bg-yellow-500/30 transition-colors border border-yellow-500/30"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={onEnd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400
                hover:bg-red-500/30 transition-colors border border-red-500/30"
            >
              <Square className="w-4 h-4" />
              End
            </button>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* Timer Circle */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
              <circle
                cx="64" cy="64" r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-white/10"
              />
              <motion.circle
                cx="64" cy="64" r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className="text-indigo-500"
                initial={{ strokeDasharray: '0 352' }}
                animate={{ strokeDasharray: `${progress * 3.52} 352` }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white tabular-nums">
                {String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
              </span>
              <span className="text-xs text-white/50">remaining</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">{session.title}</h3>
            <p className="text-white/50 text-sm mb-4">
              {formatTime(session.startTime)} - {formatTime(session.endTime)}
            </p>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>{session.completedMinutes}m completed</span>
                <span>{session.durationMinutes}m total</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6">
              <div>
                <span className="text-2xl font-bold text-red-400">{session.distractionsBlocked}</span>
                <span className="text-xs text-white/50 ml-1">blocked</span>
              </div>
              {session.blockingEnabled && (
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <Shield className="w-4 h-4" />
                  Blocking Active
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuickStartCard({
  onQuickStart,
  isLoading,
  defaultDuration,
}: {
  onQuickStart: (duration: number) => void;
  isLoading: boolean;
  defaultDuration: number;
}) {
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration);
  const durations = [25, 50, 90, 120];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/5 border border-white/10 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Start Focus Session</h3>
          <p className="text-sm text-white/50">Block distractions and deep work</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onQuickStart(selectedDuration)}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 text-white
            hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          Start Focus
        </motion.button>
      </div>

      <div className="flex gap-3">
        {durations.map((duration) => (
          <button
            key={duration}
            onClick={() => setSelectedDuration(duration)}
            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors
              ${selectedDuration === duration
                ? 'bg-indigo-500/20 text-indigo-400 border-2 border-indigo-500/50'
                : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
          >
            {formatDuration(duration)}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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
      <p className="text-sm text-white/60">{label}</p>
    </motion.div>
  );
}

function FocusBlockRow({
  block,
  index,
  onStart,
  onDelete,
}: {
  block: FocusBlock;
  index: number;
  onStart: () => void;
  onDelete: () => void;
}) {
  const isUpcoming = new Date(block.startTime) > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors group"
    >
      <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
        <Timer className="w-6 h-6 text-indigo-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-white">{block.title}</p>
        <p className="text-sm text-white/50">
          {formatDateTime(block.startTime)} ({formatDuration(block.durationMinutes)})
        </p>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isUpcoming && block.status === 'scheduled' && (
          <>
            <button
              onClick={onStart}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm
                hover:bg-indigo-500/30 transition-colors"
            >
              Start Now
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <span className={`px-2 py-1 rounded-md text-xs capitalize
        ${block.status === 'scheduled' ? 'bg-indigo-500/10 text-indigo-400' :
          block.status === 'completed' ? 'bg-green-500/10 text-green-400' :
          'bg-white/10 text-white/50'}`}
      >
        {block.status}
      </span>
    </motion.div>
  );
}

function SuggestionCard({
  suggestion,
  onSchedule,
  isScheduling,
}: {
  suggestion: FocusSuggestion;
  onSchedule: () => void;
  isScheduling: boolean;
}) {
  const priorityColors = {
    high: 'border-green-500/30 bg-green-500/5',
    medium: 'border-yellow-500/30 bg-yellow-500/5',
    low: 'border-white/10 bg-white/5',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`p-4 rounded-xl border ${priorityColors[suggestion.priority]} transition-colors`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">
            {formatDateTime(suggestion.startTime)}
          </span>
        </div>
        <span className="text-sm text-white/60">
          {formatDuration(suggestion.durationMinutes)}
        </span>
      </div>

      <p className="text-xs text-white/50 mb-3">{suggestion.reason}</p>

      <button
        onClick={onSchedule}
        disabled={isScheduling}
        className="w-full py-2 rounded-lg bg-white/10 text-white/70 text-sm
          hover:bg-white/20 hover:text-white transition-colors flex items-center justify-center gap-2"
      >
        {isScheduling ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Calendar className="w-4 h-4" />
        )}
        Schedule This Block
      </button>
    </motion.div>
  );
}

function ScheduleModal({
  isOpen,
  onClose,
  defaultDuration,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultDuration: number;
  onCreate: (startTime: Date, endTime: Date, title: string) => void;
}) {
  const [title, setTitle] = useState('Focus Time');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(defaultDuration);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(start.getTime() + duration * 60000);
    onCreate(start, end, title);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Schedule Focus Block</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10
                text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10
                  text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10
                  text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-1">Duration</label>
            <div className="flex gap-2">
              {[25, 50, 90, 120].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-lg text-sm ${
                    duration === d
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                      : 'bg-white/5 text-white/60 border border-white/10'
                  }`}
                >
                  {formatDuration(d)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          >
            Schedule
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FocusSettingsPanel({
  settings,
  onClose,
  onUpdate,
}: {
  settings: FocusSettings;
  onClose: () => void;
  onUpdate: (updates: Partial<FocusSettings>) => void;
}) {
  const [blockedApps, setBlockedApps] = useState(settings.defaultBlockedApps);
  const [blockedSites, setBlockedSites] = useState(settings.defaultBlockedWebsites);
  const [blockingMode, setBlockingMode] = useState(settings.blockingMode);
  const [newApp, setNewApp] = useState('');
  const [newSite, setNewSite] = useState('');

  const handleSave = () => {
    onUpdate({
      defaultBlockedApps: blockedApps,
      defaultBlockedWebsites: blockedSites,
      blockingMode,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end lg:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Focus Settings</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Blocking Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">Blocking Mode</label>
          <div className="grid grid-cols-3 gap-3">
            {['soft', 'hard', 'strict'].map((mode) => (
              <button
                key={mode}
                onClick={() => setBlockingMode(mode as any)}
                className={`p-3 rounded-xl text-sm capitalize ${
                  blockingMode === mode
                    ? 'bg-indigo-500/20 text-indigo-400 border-2 border-indigo-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-2">
            {blockingMode === 'soft' && 'Shows a warning dialog before allowing access to blocked content'}
            {blockingMode === 'hard' && 'Requires waiting 30 seconds before bypassing block'}
            {blockingMode === 'strict' && 'No bypass allowed during focus session'}
          </p>
        </div>

        {/* Blocked Apps */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">
            <Layers className="w-4 h-4 inline mr-2" />
            Blocked Apps
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {blockedApps.map((app) => (
              <span
                key={app}
                className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-sm flex items-center gap-2"
              >
                {app}
                <button onClick={() => setBlockedApps(blockedApps.filter(a => a !== app))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newApp}
              onChange={(e) => setNewApp(e.target.value)}
              placeholder="Add app name..."
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10
                text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newApp.trim()) {
                  setBlockedApps([...blockedApps, newApp.trim()]);
                  setNewApp('');
                }
              }}
            />
            <button
              onClick={() => {
                if (newApp.trim()) {
                  setBlockedApps([...blockedApps, newApp.trim()]);
                  setNewApp('');
                }
              }}
              className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Blocked Sites */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">
            <Globe className="w-4 h-4 inline mr-2" />
            Blocked Websites
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {blockedSites.map((site) => (
              <span
                key={site}
                className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg text-sm flex items-center gap-2"
              >
                {site}
                <button onClick={() => setBlockedSites(blockedSites.filter(s => s !== site))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              placeholder="Add website domain..."
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10
                text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newSite.trim()) {
                  setBlockedSites([...blockedSites, newSite.trim()]);
                  setNewSite('');
                }
              }}
            />
            <button
              onClick={() => {
                if (newSite.trim()) {
                  setBlockedSites([...blockedSites, newSite.trim()]);
                  setNewSite('');
                }
              }}
              className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
