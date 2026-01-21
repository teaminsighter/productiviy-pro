/**
 * Work Sessions Page
 * Beautiful freelancer time tracking with billable hours
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Plus,
  Clock,
  Camera,
  Activity,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Users,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  useWorkSessions,
  useWorkSessionHistory,
  useSessionSummary,
  usePauseWorkSession,
  useResumeWorkSession,
} from '@/hooks/useWorkSessions';
import {
  StartSessionModal,
  EndSessionModal,
  ActiveSessionHero,
  SessionCard,
} from '@/components/work-sessions';
import { formatDuration } from '@/lib/api/work-sessions';

export default function WorkSessions() {
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month'>('week');

  const {
    currentSession,
  } = useWorkSessions();

  const { data: summary, isLoading: summaryLoading } = useSessionSummary(periodFilter);
  const { data: sessions, isLoading: sessionsLoading } = useWorkSessionHistory({ limit: 20 });
  const pauseSession = usePauseWorkSession();
  const resumeSession = useResumeWorkSession();

  const handlePause = async () => {
    try {
      await pauseSession.mutateAsync();
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  const handleResume = async () => {
    try {
      await resumeSession.mutateAsync();
    } catch (error) {
      console.error('Failed to resume:', error);
    }
  };

  // Stats calculation
  const totalHours = summary?.totalTime ? Math.round(summary.totalTime / 3600 * 10) / 10 : 0;
  const billableHours = summary?.billableTime ? Math.round(summary.billableTime / 3600 * 10) / 10 : 0;
  const avgActivity = sessions?.length
    ? Math.round(sessions.reduce((sum, s) => sum + s.activityLevel, 0) / sessions.length)
    : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20"
          >
            <Briefcase className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-white">Work Sessions</h1>
            <p className="text-white/50 text-sm">Track billable hours for clients</p>
          </div>
        </div>

        {/* Start Session Button */}
        {!currentSession && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowStartModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all"
          >
            <Plus className="w-5 h-5" />
            Start Session
          </motion.button>
        )}
      </div>

      {/* Active Session Hero */}
      {currentSession && (
        <ActiveSessionHero
          session={currentSession}
          onPause={handlePause}
          onResume={handleResume}
          onEnd={() => setShowEndModal(true)}
          isPausing={pauseSession.isPending}
          isResuming={resumeSession.isPending}
        />
      )}

      {/* Period Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['today', 'week', 'month'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setPeriodFilter(period)}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all
              ${periodFilter === period
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white'
              }
            `}
          >
            {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Total Hours */}
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Total Hours"
          value={`${totalHours}h`}
          subtext={summary?.totalTimeFormatted || '0h 0m'}
          color="indigo"
          isLoading={summaryLoading}
        />

        {/* Billable Hours */}
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Billable Hours"
          value={`${billableHours}h`}
          subtext={summary?.billableTimeFormatted || '0h 0m'}
          color="green"
          isLoading={summaryLoading}
        />

        {/* Screenshots */}
        <StatCard
          icon={<Camera className="w-5 h-5" />}
          label="Screenshots"
          value={String(summary?.totalScreenshots || 0)}
          subtext="Proof of work"
          color="purple"
          isLoading={summaryLoading}
        />

        {/* Activity Level */}
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Avg Activity"
          value={`${avgActivity}%`}
          subtext="Keyboard/mouse"
          color="orange"
          isLoading={summaryLoading}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sessions List (2 columns) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Recent Sessions
              </h3>
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <Filter className="w-4 h-4 text-white/50" />
                </button>
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <Download className="w-4 h-4 text-white/50" />
                </button>
              </div>
            </div>

            {/* Sessions */}
            <div className="divide-y divide-white/5">
              {sessionsLoading ? (
                // Skeleton loading
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-16 space-y-1">
                        <div className="h-3 bg-white/10 rounded w-12" />
                        <div className="h-4 bg-white/10 rounded w-14" />
                      </div>
                      <div className="w-3 h-3 rounded-full bg-white/10 mt-1.5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/10 rounded w-48" />
                        <div className="h-3 bg-white/5 rounded w-32" />
                        <div className="flex gap-4">
                          <div className="h-3 bg-white/5 rounded w-16" />
                          <div className="h-3 bg-white/5 rounded w-12" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : sessions && sessions.length > 0 ? (
                sessions.map((session, index) => (
                  <SessionCard key={session.id} session={session} index={index} />
                ))
              ) : (
                <div className="px-5 py-12 text-center">
                  <Briefcase className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 font-medium">No sessions yet</p>
                  <p className="text-white/30 text-sm mt-1">Start a session to begin tracking</p>
                  <button
                    onClick={() => setShowStartModal(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/30 transition-colors"
                  >
                    Start Your First Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Sidebar (1 column) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Client Breakdown */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold flex items-center gap-2 text-white">
                <Users className="w-4 h-4 text-purple-400" />
                By Client
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {summary?.byClient && Object.keys(summary.byClient).length > 0 ? (
                Object.entries(summary.byClient)
                  .sort(([, a], [, b]) => b.totalTime - a.totalTime)
                  .slice(0, 5)
                  .map(([client, data], index) => {
                    const maxTime = Math.max(
                      ...Object.values(summary.byClient).map((c) => c.totalTime)
                    );
                    const progress = (data.totalTime / maxTime) * 100;

                    return (
                      <motion.div
                        key={client}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white truncate" style={{ maxWidth: '60%' }}>
                            {client}
                          </span>
                          <span className="text-sm font-medium text-white/70">
                            {formatDuration(data.totalTime)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-purple-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })
              ) : (
                <p className="text-white/40 text-sm text-center py-4">
                  No client data yet
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="font-semibold flex items-center gap-2 text-white mb-4">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Total Sessions</span>
                <span className="font-medium text-white">{summary?.totalSessions || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Avg Session Length</span>
                <span className="font-medium text-white">
                  {summary?.totalSessions && summary.totalTime
                    ? formatDuration(Math.round(summary.totalTime / summary.totalSessions))
                    : '0m'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Active Clients</span>
                <span className="font-medium text-white">
                  {summary?.byClient ? Object.keys(summary.byClient).length : 0}
                </span>
              </div>
            </div>
          </div>

          {/* Pro Tip */}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-5">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-indigo-300 font-medium text-sm">Pro Tip</p>
                <p className="text-white/50 text-sm mt-1">
                  Sessions with higher activity levels and more screenshots are more verifiable for client billing.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <StartSessionModal
        isOpen={showStartModal}
        onClose={() => setShowStartModal(false)}
      />
      <EndSessionModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        session={currentSession ?? null}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Stat Card Component
// ═══════════════════════════════════════════════════════════════════

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'green' | 'purple' | 'indigo' | 'orange';
  isLoading?: boolean;
}) {
  const colorConfig = {
    green: { bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-400' },
    purple: { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400' },
    indigo: { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-400' },
    orange: { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400' },
  };

  const config = colorConfig[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`relative overflow-hidden p-4 rounded-2xl border transition-all cursor-default
        ${config.bg} ${config.border}`}
    >
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="w-5 h-5 bg-white/10 rounded" />
          <div className="h-6 bg-white/10 rounded w-16" />
          <div className="h-4 bg-white/5 rounded w-20" />
        </div>
      ) : (
        <div className="relative z-10">
          <div className={`mb-2 ${config.text}`}>{icon}</div>
          <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
          <p className="text-sm text-white/60">{label}</p>
          <p className="text-xs text-white/40 mt-1">{subtext}</p>
        </div>
      )}
    </motion.div>
  );
}
