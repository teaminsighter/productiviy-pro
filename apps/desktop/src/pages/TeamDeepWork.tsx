import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Clock,
  Target,
  Calendar,
  Shield,
  Plus,
  X,
  ChevronRight,
  RefreshCw,
  BarChart3,
  Zap,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Sparkles,
  FileText,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getTeamDashboard,
  calculateTeamScore,
  dismissAlert,
  createMeetingFreeZone,
  deleteMeetingFreeZone,
  type TeamAlert,
  type MeetingFreeZone,
} from '@/lib/api/team-deepwork';
import { getTeamReportPreview, type ReportPeriod } from '@/lib/api/team-reports';
import { useTeamStore } from '@/stores/teamStore';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    case 'declining':
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    default:
      return <Minus className="w-4 h-4 text-white/40" />;
  }
}

function getAlertIcon(type: string) {
  switch (type) {
    case 'over_meeting':
      return <Calendar className="w-4 h-4 text-red-400" />;
    case 'focus_deficit':
      return <Target className="w-4 h-4 text-orange-400" />;
    case 'team_trend':
      return <TrendingDown className="w-4 h-4 text-yellow-400" />;
    default:
      return <AlertCircle className="w-4 h-4 text-white/60" />;
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical':
      return 'border-red-500/50 bg-red-500/10';
    case 'high':
      return 'border-orange-500/50 bg-orange-500/10';
    case 'medium':
      return 'border-yellow-500/50 bg-yellow-500/10';
    default:
      return 'border-white/10 bg-white/5';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TeamDeepWork() {
  const { currentTeam } = useTeamStore();
  const queryClient = useQueryClient();
  const [days, setDays] = useState(7);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const teamId = currentTeam?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['team-deepwork', teamId, days],
    queryFn: () => getTeamDashboard(teamId!, days),
    enabled: !!teamId,
  });

  const calculateMutation = useMutation({
    mutationFn: () => calculateTeamScore(teamId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-deepwork'] });
      toast.success('Team scores recalculated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const dismissAlertMutation = useMutation({
    mutationFn: (alertId: string) => dismissAlert(teamId!, alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-deepwork'] });
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (zoneId: string) => deleteMeetingFreeZone(teamId!, zoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-deepwork'] });
      toast.success('Meeting-free zone deleted');
    },
  });

  if (!teamId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-white/50">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg">No team selected</p>
          <p className="text-sm">Join or create a team to view deep work analytics</p>
          <Link
            to="/team"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl"
          >
            Go to Team
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-white/50">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p>Failed to load team analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            Team Deep Work
          </h1>
          <p className="text-white/50 mt-1">
            {currentTeam?.name} - {data.summary.memberCount} members tracked
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  days === d
                    ? 'bg-indigo-500 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <button
            onClick={() => calculateMutation.mutate()}
            disabled={calculateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10
              hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${calculateMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Target className="w-5 h-5" />}
          label="Team Deep Work Score"
          value={`${Math.round(data.summary.avgDeepWorkScore)}`}
          subtext={
            <span className="flex items-center gap-1">
              {getTrendIcon(data.summary.trend)}
              {data.summary.vsYesterday > 0 ? '+' : ''}{data.summary.vsYesterday.toFixed(1)}% vs yesterday
            </span>
          }
          color="indigo"
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Deep Work"
          value={formatDuration(data.summary.avgDeepWorkMinutes)}
          subtext="per member today"
          color="green"
        />
        <SummaryCard
          icon={<Calendar className="w-5 h-5" />}
          label="Meeting Load"
          value={`${Math.round(data.summary.avgMeetingLoad)}%`}
          subtext={`${data.summary.membersOverMeeting} members over threshold`}
          color={data.summary.avgMeetingLoad > 40 ? 'red' : 'orange'}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Needs Attention"
          value={`${data.summary.needsAttention}`}
          subtext="members with low focus"
          color={data.summary.needsAttention > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Charts & Trends */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Trend Chart */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Daily Deep Work Trend
            </h3>

            <div className="h-48">
              <TrendChart data={data.dailyScores} />
            </div>
          </div>

          {/* Member Leaderboard */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-400" />
                Team Members
              </h3>
              <span className="text-sm text-white/50">{days}-day average</span>
            </div>

            <div className="divide-y divide-white/5">
              {data.members.map((member, index) => (
                <MemberRow
                  key={member.userId}
                  member={member}
                  rank={index + 1}
                  teamId={teamId}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Alerts & Tools */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                Manager Alerts
                {data.alerts.length > 0 && (
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">
                    {data.alerts.length}
                  </span>
                )}
              </h3>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {data.alerts.length === 0 ? (
                <div className="px-5 py-8 text-center text-white/40">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">No alerts - team is performing well!</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {data.alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDismiss={() => dismissAlertMutation.mutate(alert.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Meeting-Free Zones */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Meeting-Free Zones
              </h3>
              <button
                onClick={() => setShowZoneModal(true)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="p-3 space-y-2">
              {data.meetingFreeZones.length === 0 ? (
                <div className="text-center py-6 text-white/40">
                  <p className="text-sm">No focus zones configured</p>
                  <button
                    onClick={() => setShowZoneModal(true)}
                    className="mt-2 text-indigo-400 text-sm hover:text-indigo-300"
                  >
                    Create one
                  </button>
                </div>
              ) : (
                data.meetingFreeZones.map((zone) => (
                  <ZoneCard
                    key={zone.id}
                    zone={zone}
                    onDelete={() => deleteZoneMutation.mutate(zone.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Period Summary
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/60">Period</span>
                <span className="text-white">{data.periodStats.days} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Avg Score</span>
                <span className="text-white">{data.periodStats.avgScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Avg Deep Work</span>
                <span className="text-white">{formatDuration(data.periodStats.avgDeepWorkMinutes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Avg Meetings</span>
                <span className="text-white">{formatDuration(data.periodStats.avgMeetingMinutes)}</span>
              </div>
            </div>
          </div>

          {/* Team Reports */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Team Reports
            </h3>

            <p className="text-sm text-white/50 mb-4">
              Generate comprehensive team productivity reports with insights and recommendations.
            </p>

            <button
              onClick={() => setShowReportModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium
                hover:from-indigo-600 hover:to-purple-600 transition-all"
            >
              <Download className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Create Zone Modal */}
      {showZoneModal && (
        <CreateZoneModal
          teamId={teamId}
          onClose={() => setShowZoneModal(false)}
          onCreated={() => {
            setShowZoneModal(false);
            queryClient.invalidateQueries({ queryKey: ['team-deepwork'] });
          }}
        />
      )}

      {/* Team Report Modal */}
      {showReportModal && (
        <TeamReportModal
          teamId={teamId}
          teamName={currentTeam?.name || 'Team'}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SummaryCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: React.ReactNode;
  color: 'indigo' | 'green' | 'orange' | 'red';
}) {
  const colorConfig = {
    indigo: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400',
    green: 'bg-green-500/15 border-green-500/30 text-green-400',
    orange: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
    red: 'bg-red-500/15 border-red-500/30 text-red-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-4 rounded-2xl border ${colorConfig[color].split(' ').slice(0, 2).join(' ')}`}
    >
      <div className={`mb-2 ${colorConfig[color].split(' ')[2]}`}>{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/60">{label}</p>
      <p className="text-xs text-white/40 mt-1">{subtext}</p>
    </motion.div>
  );
}

function TrendChart({ data }: { data: Array<{ date: string; score: number; deepWorkMinutes: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/40">
        No data available
      </div>
    );
  }

  const maxScore = Math.max(...data.map((d) => d.score), 100);
  const maxMinutes = Math.max(...data.map((d) => d.deepWorkMinutes), 120);

  return (
    <div className="flex items-end justify-between gap-2 h-full">
      {data.map((day, index) => {
        const scoreHeight = (day.score / maxScore) * 100;
        const minutesHeight = (day.deepWorkMinutes / maxMinutes) * 100;

        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex-1 w-full flex items-end gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${scoreHeight}%` }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex-1 bg-indigo-500/60 rounded-t"
                title={`Score: ${day.score}`}
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${minutesHeight}%` }}
                transition={{ duration: 0.5, delay: index * 0.05 + 0.1 }}
                className="flex-1 bg-green-500/60 rounded-t"
                title={`Deep Work: ${day.deepWorkMinutes}m`}
              />
            </div>
            <span className="text-[10px] text-white/40">
              {new Date(day.date).toLocaleDateString([], { weekday: 'short' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MemberRow({
  member,
  rank,
  teamId: _teamId,
}: {
  member: {
    userId: number;
    name: string;
    avatarUrl: string | null;
    avgScore: number;
    avgDeepWorkMinutes: number;
    avgMeetingLoad: number;
    role: string;
  };
  rank: number;
  teamId: number;
}) {
  const scoreColor =
    member.avgScore >= 70 ? 'text-green-400' :
    member.avgScore >= 50 ? 'text-yellow-400' :
    'text-red-400';

  return (
    <Link
      to={`/team/member/${member.userId}`}
      className="px-5 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors group"
    >
      <span className="w-6 text-center text-white/40 font-medium">#{rank}</span>

      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white/60 font-medium">
            {member.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{member.name}</p>
        <p className="text-xs text-white/50 capitalize">{member.role}</p>
      </div>

      <div className="text-right">
        <p className={`font-bold ${scoreColor}`}>{Math.round(member.avgScore)}</p>
        <p className="text-xs text-white/40">{formatDuration(member.avgDeepWorkMinutes)}</p>
      </div>

      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60" />
    </Link>
  );
}

function AlertCard({
  alert,
  onDismiss,
}: {
  alert: TeamAlert;
  onDismiss: () => void;
}) {
  return (
    <div className={`p-3 rounded-xl border ${getPriorityColor(alert.priority)}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm">{alert.title}</p>
          <p className="text-xs text-white/60 mt-0.5">{alert.message}</p>
          {alert.suggestion && (
            <p className="text-xs text-indigo-400 mt-1">{alert.suggestion}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-3 h-3 text-white/40" />
        </button>
      </div>
    </div>
  );
}

function ZoneCard({
  zone,
  onDelete,
}: {
  zone: MeetingFreeZone;
  onDelete: () => void;
}) {
  const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-white text-sm">{zone.name}</span>
        <button
          onClick={onDelete}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-3 h-3 text-white/40" />
        </button>
      </div>
      <p className="text-xs text-white/60">
        {zone.startTime} - {zone.endTime}
      </p>
      <p className="text-xs text-white/40 mt-1">
        {zone.daysOfWeek.map((d) => dayNames[d]).join(', ')}
      </p>
      {zone.isEnforced && (
        <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
          Enforced
        </span>
      )}
    </div>
  );
}

function CreateZoneModal({
  teamId,
  onClose,
  onCreated,
}: {
  teamId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('Focus Time');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [isEnforced, setIsEnforced] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      createMeetingFreeZone(teamId, {
        name,
        startTime,
        endTime,
        daysOfWeek: days,
        isEnforced,
      }),
    onSuccess: () => {
      toast.success('Meeting-free zone created!');
      onCreated();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleDay = (day: number) => {
    if (days.includes(day)) {
      setDays(days.filter((d) => d !== day));
    } else {
      setDays([...days, day].sort());
    }
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
        className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Create Meeting-Free Zone</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10
                text-white placeholder-white/40 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm text-white/70 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10
                  text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">Days</label>
            <div className="flex gap-2">
              {dayNames.map((day, index) => (
                <button
                  key={day}
                  onClick={() => toggleDay(index + 1)}
                  className={`flex-1 py-2 rounded-lg text-xs ${
                    days.includes(index + 1)
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                      : 'bg-white/5 text-white/60 border border-white/10'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnforced}
              onChange={(e) => setIsEnforced(e.target.checked)}
              className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500"
            />
            <span className="text-sm text-white/70">Enforce (block meeting creation)</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="flex-1 py-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TeamReportModal({
  teamId,
  teamName,
  onClose,
}: {
  teamId: number;
  teamName: string;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<ReportPeriod>('weekly');

  const { data, isLoading, error } = useQuery({
    queryKey: ['team-report-preview', teamId, period],
    queryFn: () => getTeamReportPreview(teamId, period),
  });

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
        className="bg-[#1a1a2e] rounded-2xl border border-white/10 p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Team Report: {teamName}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {(['daily', 'weekly', 'monthly'] as ReportPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                period === p
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>Failed to load report</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-2xl font-bold text-white">{Math.round(data.avgDeepWorkScore)}</p>
                <p className="text-xs text-white/60">Avg Deep Work Score</p>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-2xl font-bold text-white">{data.avgProductiveHours.toFixed(1)}h</p>
                <p className="text-xs text-white/60">Avg Productive Hours</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                <p className="text-2xl font-bold text-white">{data.avgMeetingHours.toFixed(1)}h</p>
                <p className="text-xs text-white/60">Avg Meeting Hours</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-2xl font-bold text-white">{Math.round(data.avgProductivityPercentage)}%</p>
                <p className="text-xs text-white/60">Avg Productivity</p>
              </div>
            </div>

            {/* Top Performers */}
            {data.topPerformers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  Top Performers
                </h4>
                <div className="space-y-2">
                  {data.topPerformers.map((member, i) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/10"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-green-400 font-bold">#{i + 1}</span>
                        <span className="text-white">{member.name}</span>
                      </div>
                      <span className="text-green-400 font-medium">{Math.round(member.deepWorkScore)} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Needs Attention */}
            {data.needsAttention.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  Needs Attention
                </h4>
                <div className="space-y-2">
                  {data.needsAttention.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-3 rounded-xl bg-orange-500/5 border border-orange-500/10"
                    >
                      <span className="text-white">{member.name}</span>
                      <span className="text-orange-400 font-medium">{Math.round(member.deepWorkScore)} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            {data.insights.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Insights
                </h4>
                <ul className="space-y-2">
                  {data.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                      <span className="text-purple-400 mt-0.5">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {data.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                      <span className="text-yellow-400 mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Report Period Info */}
            <div className="pt-4 border-t border-white/10 text-xs text-white/40 text-center">
              Report period: {new Date(data.startDate).toLocaleDateString()} - {new Date(data.endDate).toLocaleDateString()}
              <br />
              Total tracked time: {data.totalTeamHours.toFixed(1)} hours across {data.memberCount} members
            </div>
          </div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
