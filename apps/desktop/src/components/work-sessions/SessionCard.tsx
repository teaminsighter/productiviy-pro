/**
 * Session Card
 * Individual session item for the session list
 */
import { motion } from 'framer-motion';
import { Clock, Camera, Activity, Briefcase, User } from 'lucide-react';
import type { WorkSession } from '@/lib/api/work-sessions';
import { formatDuration } from '@/lib/api/work-sessions';

interface SessionCardProps {
  session: WorkSession;
  index?: number;
}

export function SessionCard({ session, index = 0 }: SessionCardProps) {
  const startDate = new Date(session.startedAt);
  const isToday = new Date().toDateString() === startDate.toDateString();
  const isYesterday = new Date(Date.now() - 86400000).toDateString() === startDate.toDateString();

  const dateLabel = isToday
    ? 'Today'
    : isYesterday
    ? 'Yesterday'
    : startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const timeLabel = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const statusColors = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    paused: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="px-5 py-4 hover:bg-white/5 transition-colors group"
    >
      <div className="flex items-start gap-4">
        {/* Time indicator */}
        <div className="flex-shrink-0 text-center w-16">
          <p className="text-xs text-white/40">{dateLabel}</p>
          <p className="text-sm font-medium text-white/70">{timeLabel}</p>
        </div>

        {/* Timeline dot */}
        <div className="relative flex-shrink-0">
          <div className={`
            w-3 h-3 rounded-full mt-1.5
            ${session.status === 'completed' ? 'bg-green-500' : 'bg-orange-500'}
          `} />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-px h-full bg-white/10 -z-10" />
        </div>

        {/* Session info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {/* Project name */}
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <h4 className="font-medium text-white truncate">
                  {session.projectName || 'Untitled Project'}
                </h4>
              </div>

              {/* Client */}
              {session.clientName && (
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <p className="text-sm text-white/50 truncate">{session.clientName}</p>
                </div>
              )}

              {/* Task description */}
              {session.taskDescription && (
                <p className="text-sm text-white/40 truncate mt-1">{session.taskDescription}</p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-white/50 text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDuration(session.totalDuration)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/50 text-sm">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{session.screenshotCount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/50 text-sm">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{Math.round(session.activityLevel)}%</span>
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div className={`
              flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium capitalize border
              ${statusColors[session.status]}
            `}>
              {session.status}
            </div>
          </div>

          {/* Notes preview */}
          {session.notes && (
            <div className="mt-2 p-2 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/50 line-clamp-2">{session.notes}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
