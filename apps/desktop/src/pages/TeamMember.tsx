/**
 * Team Member Detail View - Shows member's activity timeline
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Clock, TrendingUp, Monitor, Globe,
  Calendar, ChevronLeft, ChevronRight, Loader2,
  Eye, EyeOff, Lock, Activity
} from 'lucide-react';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { GlassCard } from '@/components/common/GlassCard';

// Format duration in hours and minutes
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Format time
function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TeamMember() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentTeam, members, dashboard, myPermissions, selectedMemberTimeline,
    fetchMemberTimeline, clearMemberTimeline
  } = useTeamStore();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);

  const memberUserId = userId ? parseInt(userId) : null;
  const member = members.find(m => m.user_id === memberUserId) ||
    dashboard?.members?.find(m => m.user_id === memberUserId);
  const isSelf = memberUserId === user?.id;
  const canViewActivity = isSelf || myPermissions?.can_view_activity || myPermissions?.is_owner;

  useEffect(() => {
    if (!currentTeam || !memberUserId) return;

    setIsLoading(true);
    fetchMemberTimeline(currentTeam.id, memberUserId, selectedDate)
      .finally(() => setIsLoading(false));

    return () => clearMemberTimeline();
  }, [currentTeam, memberUserId, selectedDate]);

  const handlePreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    const today = new Date();
    if (date < today) {
      date.setDate(date.getDate() + 1);
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // No access
  if (!canViewActivity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          You don't have permission to view this member's activity.
          Contact the team owner for access.
        </p>
        <button
          onClick={() => navigate('/team')}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team
        </button>
      </div>
    );
  }

  // Member not found
  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-gray-400">Loading member...</p>
      </div>
    );
  }

  const timeline = selectedMemberTimeline;
  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };
  const memberStatus = dashboard?.members?.find(m => m.user_id === memberUserId)?.status || 'offline';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/team')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xl">
              {member.avatar_url ? (
                <img src={member.avatar_url} className="w-full h-full rounded-full object-cover" />
              ) : (
                member.name.charAt(0).toUpperCase()
              )}
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0d0d0f] ${statusColors[memberStatus]}`}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {member.name}
              {isSelf && <span className="text-sm text-gray-500 font-normal">(you)</span>}
            </h1>
            <p className="text-gray-400">{member.email}</p>
          </div>
        </div>

        {/* Privacy Status */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
          {member.share_activity ? (
            <>
              <Eye className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Sharing Activity</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500">Activity Hidden</span>
            </>
          )}
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePreviousDay}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="font-medium">
            {isToday ? 'Today' : new Date(selectedDate).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
        <button
          onClick={handleNextDay}
          disabled={isToday}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Stats Cards */}
      {!isLoading && timeline && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatDuration(timeline.total_time)}</p>
                  <p className="text-xs text-gray-400">Total Time</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatDuration(timeline.productive_time)}</p>
                  <p className="text-xs text-gray-400">Productive</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatDuration(timeline.distracting_time)}</p>
                  <p className="text-xs text-gray-400">Distracting</p>
                </div>
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${
                    timeline.productivity_score >= 70 ? 'text-green-400' :
                    timeline.productivity_score >= 40 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {Math.round(timeline.productivity_score)}%
                  </p>
                  <p className="text-xs text-gray-400">Productivity</p>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Top Apps */}
          <div className="grid grid-cols-2 gap-6">
            <GlassCard>
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-indigo-400" />
                  Top Applications
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {timeline.top_apps?.length > 0 ? (
                  timeline.top_apps.slice(0, 5).map((app, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                          app.category === 'productive' ? 'bg-green-500/20 text-green-400' :
                          app.category === 'distracting' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium">{app.app}</span>
                      </div>
                      <span className="text-gray-400">{formatDuration(app.duration)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No activity recorded</p>
                )}
              </div>
            </GlassCard>

            {/* Activity Timeline */}
            <GlassCard>
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  Activity Timeline
                </h3>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto space-y-2">
                {timeline.activities?.length > 0 ? (
                  timeline.activities.slice(0, 10).map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <span className="text-gray-500 w-14 flex-shrink-0">
                        {formatTime(activity.started_at)}
                      </span>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        activity.category === 'productive' ? 'bg-green-400' :
                        activity.category === 'distracting' ? 'bg-red-400' :
                        'bg-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{activity.app}</p>
                        {!('hide_window_titles' in member && member.hide_window_titles) && activity.title && (
                          <p className="text-gray-500 text-xs truncate">{activity.title}</p>
                        )}
                      </div>
                      <span className="text-gray-500 flex-shrink-0">
                        {formatDuration(activity.duration)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No activity recorded</p>
                )}
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* No Data State */}
      {!isLoading && !timeline && (
        <GlassCard className="p-12 text-center">
          <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Activity Data</h3>
          <p className="text-gray-400">
            No activity was recorded for this day.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
