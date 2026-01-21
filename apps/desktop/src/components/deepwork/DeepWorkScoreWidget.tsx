/**
 * Deep Work Score Widget for Dashboard
 * Enhanced design with animated circular progress
 */
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Clock,
  Video,
  Zap,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTodayScore } from '@/lib/api/deepwork';
import { getCalendarConnection } from '@/lib/api/calendar';

interface DeepWorkScoreWidgetProps {
  compact?: boolean;
}

export function DeepWorkScoreWidget({ compact = false }: DeepWorkScoreWidgetProps) {
  const { data: score, isLoading, error } = useQuery({
    queryKey: ['today-deep-work-score'],
    queryFn: getTodayScore,
    refetchInterval: 60000,
  });

  const { data: calendarConnection } = useQuery({
    queryKey: ['calendar-connection'],
    queryFn: getCalendarConnection,
  });

  if (isLoading) {
    return (
      <div className="glass-card p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/10" />
          <div className="h-5 w-32 bg-white/10 rounded" />
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      </div>
    );
  }

  // If no calendar connected, show prompt
  if (!calendarConnection?.is_active) {
    return (
      <Link to="/meetings" className="block">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          className="glass-card p-5 cursor-pointer group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-white">Deep Work Score</h3>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 group-hover:border-primary/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">Connect Your Calendar</p>
              <p className="text-white/60 text-sm">See how meetings impact your focus</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>
      </Link>
    );
  }

  if (error || !score) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="font-semibold text-white">Deep Work Score</h3>
        </div>
        <p className="text-white/60 text-sm">Unable to load score. Try refreshing.</p>
      </div>
    );
  }

  const statusConfig = {
    excellent: {
      color: 'from-green-500 to-emerald-500',
      ring: 'text-green-500',
      bg: 'bg-green-500/20 text-green-400',
      glow: 'shadow-green-500/20'
    },
    good: {
      color: 'from-blue-500 to-cyan-500',
      ring: 'text-blue-500',
      bg: 'bg-blue-500/20 text-blue-400',
      glow: 'shadow-blue-500/20'
    },
    fair: {
      color: 'from-yellow-500 to-orange-500',
      ring: 'text-yellow-500',
      bg: 'bg-yellow-500/20 text-yellow-400',
      glow: 'shadow-yellow-500/20'
    },
    poor: {
      color: 'from-red-500 to-pink-500',
      ring: 'text-red-500',
      bg: 'bg-red-500/20 text-red-400',
      glow: 'shadow-red-500/20'
    },
  };

  const config = statusConfig[score.status];
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score.deep_work_score / 100) * circumference;

  if (compact) {
    return (
      <Link to="/meetings" className="block">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          className="glass-card p-4 cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            {/* Mini Score Ring */}
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-white/10"
                />
                <motion.circle
                  cx="50" cy="50" r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className={config.ring}
                  initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{score.deep_work_score}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">Deep Work</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg}`}>
                  {score.status.charAt(0).toUpperCase() + score.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className="text-green-400">{score.deep_work_hours}h focus</span>
                <span className="text-red-400">{score.meeting_hours}h meetings</span>
              </div>
            </div>

            {score.vs_yesterday !== null && (
              <div className={`flex items-center gap-1 text-sm ${
                score.vs_yesterday > 0 ? 'text-green-400' : score.vs_yesterday < 0 ? 'text-red-400' : 'text-white/50'
              }`}>
                {score.vs_yesterday > 0 ? <TrendingUp className="w-4 h-4" /> : score.vs_yesterday < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                {score.vs_yesterday !== 0 && `${Math.abs(score.vs_yesterday)}%`}
              </div>
            )}

            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-white">Deep Work Score</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg}`}>
          {score.status.charAt(0).toUpperCase() + score.status.slice(1)}
        </span>
      </div>

      {/* Score Display */}
      <div className="flex items-center gap-6 mb-5">
        {/* Animated Ring */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="40"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-white/10"
            />
            <motion.circle
              cx="50" cy="50" r="40"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              className={config.ring}
              initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-white"
            >
              {score.deep_work_score}
            </motion.span>
            <span className="text-xs text-white/50">/ 100</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex-1 space-y-3">
          <MetricRow
            icon={<Clock className="w-4 h-4 text-green-400" />}
            label="Deep Work"
            value={`${score.deep_work_hours}h`}
            color="green"
          />
          <MetricRow
            icon={<Video className="w-4 h-4 text-red-400" />}
            label="Meetings"
            value={`${score.meeting_hours}h`}
            color="red"
          />
          <MetricRow
            icon={<Zap className="w-4 h-4 text-purple-400" />}
            label="Best Block"
            value={`${score.longest_focus_block}m`}
            color="purple"
          />
        </div>
      </div>

      {/* Trend */}
      {score.vs_yesterday !== null && (
        <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${
          score.vs_yesterday > 0 ? 'bg-green-500/10' : score.vs_yesterday < 0 ? 'bg-red-500/10' : 'bg-white/5'
        }`}>
          {score.vs_yesterday > 0 ? (
            <TrendingUp className="w-5 h-5 text-green-400" />
          ) : score.vs_yesterday < 0 ? (
            <TrendingDown className="w-5 h-5 text-red-400" />
          ) : (
            <Sparkles className="w-5 h-5 text-white/50" />
          )}
          <span className={`text-sm font-medium ${
            score.vs_yesterday > 0 ? 'text-green-400' : score.vs_yesterday < 0 ? 'text-red-400' : 'text-white/60'
          }`}>
            {score.vs_yesterday > 0 ? '+' : ''}{score.vs_yesterday}% compared to yesterday
          </span>
        </div>
      )}

      {/* Message */}
      {score.message && (
        <p className="text-white/60 text-sm mb-4">{score.message}</p>
      )}

      {/* Fragmentation Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-white/50">Day Fragmentation</span>
          <span className={`font-medium ${
            score.fragmentation_score < 30 ? 'text-green-400' :
            score.fragmentation_score < 60 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {score.fragmentation_score < 30 ? 'Low' : score.fragmentation_score < 60 ? 'Medium' : 'High'}
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${100 - score.fragmentation_score}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              score.fragmentation_score < 30 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
              score.fragmentation_score < 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
              'bg-gradient-to-r from-red-500 to-pink-400'
            }`}
          />
        </div>
      </div>

      {/* View Details Link */}
      <Link
        to="/meetings"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm group"
      >
        View Full Report
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
}

function MetricRow({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'green' | 'red' | 'purple';
}) {
  const colorClasses = {
    green: 'text-green-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-white/60 text-sm">{label}</span>
      </div>
      <span className={`font-semibold ${colorClasses[color]}`}>{value}</span>
    </div>
  );
}

export default DeepWorkScoreWidget;
