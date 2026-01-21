import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, Clock, User, Monitor, RefreshCw } from 'lucide-react';
import { getActivityLogs } from '@/lib/api/admin';

export default function AdminActivity() {
  const [limit, setLimit] = useState(50);

  const { data: activities, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-activity-logs', limit],
    queryFn: () => getActivityLogs({ limit }),
    refetchInterval: 10000, // Auto-refresh every 10s
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-400" />
            Activity Logs
          </h1>
          <p className="text-white/60">Real-time activity monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={25}>Last 25</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
          </select>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="divide-y divide-white/5">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-white/40">Loading activities...</div>
          ) : !activities || activities.length === 0 ? (
            <div className="px-6 py-12 text-center text-white/40">No activities found</div>
          ) : (
            activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-white/5 transition-colors"
              >
                {/* App Icon */}
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Monitor className="w-5 h-5 text-indigo-400" />
                </div>

                {/* Activity Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">{activity.appName}</p>
                    <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                      {formatDuration(activity.duration)}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 truncate">
                    {activity.windowTitle || 'No window title'}
                  </p>
                </div>

                {/* User */}
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <User className="w-4 h-4" />
                  <span className="truncate max-w-32">{activity.userEmail}</span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 text-sm text-white/40 flex-shrink-0">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(activity.timestamp)}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-white/40">
        <span>Auto-refreshes every 10 seconds</span>
        <span>Showing {activities?.length || 0} most recent activities</span>
      </div>
    </div>
  );
}
