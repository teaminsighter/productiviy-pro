/**
 * Meetings Page - Enhanced Calendar integration with visual timeline
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar,
  Video,
  Users,
  Clock,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  CalendarPlus,
  CalendarX,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Loader2,
  Shield,
  Brain,
  Zap,
  Coffee,
  Sun,
  Moon,
  Target,
  BarChart3,
  Mic,
} from 'lucide-react';
import MeetingIntelligence from '@/components/meetings/MeetingIntelligence';
import { format, parseISO, isToday, isTomorrow, addDays, startOfWeek, isSameDay, getHours, getMinutes } from 'date-fns';
import {
  getCalendarConnection,
  getCalendarAuthUrl,
  disconnectCalendar,
  syncCalendar,
  getWeekEvents,
  getMeetingStats,
  getTodayEvents,
  CalendarEvent,
} from '@/lib/api';
import { getTodayScore } from '@/lib/api/deepwork';

export default function Meetings() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  // Queries
  const { data: connection, isLoading: connectionLoading } = useQuery({
    queryKey: ['calendar-connection'],
    queryFn: getCalendarConnection,
  });

  const { isLoading: eventsLoading } = useQuery({
    queryKey: ['today-events'],
    queryFn: getTodayEvents,
    enabled: !!connection?.is_active,
  });

  const { data: weekEvents } = useQuery({
    queryKey: ['week-events'],
    queryFn: getWeekEvents,
    enabled: !!connection?.is_active,
  });

  const { data: meetingStats } = useQuery({
    queryKey: ['meeting-stats'],
    queryFn: () => getMeetingStats(),
    enabled: !!connection?.is_active,
  });

  const { data: deepWorkScore } = useQuery({
    queryKey: ['today-deep-work-score'],
    queryFn: getTodayScore,
  });

  // Mutations
  const connectMutation = useMutation({
    mutationFn: async () => {
      const { authorization_url } = await getCalendarAuthUrl();
      window.open(authorization_url, '_blank');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connection'] });
      queryClient.invalidateQueries({ queryKey: ['today-events'] });
      queryClient.invalidateQueries({ queryKey: ['week-events'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: syncCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-events'] });
      queryClient.invalidateQueries({ queryKey: ['week-events'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-stats'] });
      queryClient.invalidateQueries({ queryKey: ['today-deep-work-score'] });
    },
  });

  // Get week dates
  const weekDates = useMemo(() => {
    const start = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekOffset]);

  // Group events by day
  const eventsByDay = useMemo(() => {
    if (!weekEvents) return {};
    return weekEvents.reduce((acc, event) => {
      const day = format(parseISO(event.start_time), 'yyyy-MM-dd');
      if (!acc[day]) acc[day] = [];
      acc[day].push(event);
      return acc;
    }, {} as Record<string, CalendarEvent[]>);
  }, [weekEvents]);

  // Events for selected date
  const selectedDayEvents = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDay[key] || [];
  }, [selectedDate, eventsByDay]);

  if (connectionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not connected state
  if (!connection?.is_active) {
    return <CalendarConnectView onConnect={() => connectMutation.mutate()} isPending={connectMutation.isPending} />;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Meetings & Focus</h1>
          <p className="text-white/60">
            Connected to {connection.provider_email}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors flex items-center gap-2"
          >
            <CalendarX className="w-4 h-4" />
            Disconnect
          </motion.button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Deep Work Score + Stats */}
        <div className="space-y-6">
          {/* Deep Work Score Circle */}
          <DeepWorkScoreCard score={deepWorkScore} />

          {/* Quick Stats */}
          {meetingStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-5"
            >
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">This Week</h3>
              <div className="grid grid-cols-2 gap-3">
                <QuickStat
                  icon={<Video className="w-4 h-4" />}
                  label="Meetings"
                  value={meetingStats.total_meetings}
                  color="blue"
                />
                <QuickStat
                  icon={<Clock className="w-4 h-4" />}
                  label="Hours"
                  value={`${meetingStats.total_meeting_hours}h`}
                  color="red"
                />
                <QuickStat
                  icon={<Users className="w-4 h-4" />}
                  label="Organized"
                  value={meetingStats.meetings_as_organizer}
                  color="purple"
                />
                <QuickStat
                  icon={<Target className="w-4 h-4" />}
                  label="Focus Blocks"
                  value={meetingStats.focus_time_blocks}
                  color="green"
                />
              </div>
            </motion.div>
          )}

          {/* Focus Time Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-5"
          >
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Best Focus Times</h3>
            <div className="space-y-3">
              <FocusTimeSlot time="9:00 - 11:00" label="Morning Peak" icon={<Sun className="w-4 h-4 text-yellow-400" />} score={95} />
              <FocusTimeSlot time="14:00 - 16:00" label="Afternoon" icon={<Coffee className="w-4 h-4 text-orange-400" />} score={78} />
              <FocusTimeSlot time="20:00 - 22:00" label="Evening" icon={<Moon className="w-4 h-4 text-indigo-400" />} score={65} />
            </div>
          </motion.div>
        </div>

        {/* Right Column - Calendar & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Week Calendar Widget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {format(weekDates[0], 'MMMM yyyy')}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setWeekOffset(w => w - 1)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white/60" />
                </button>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-3 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => setWeekOffset(w => w + 1)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            {/* Week Days Grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDates.map((date) => {
                const dayKey = format(date, 'yyyy-MM-dd');
                const dayEvents = eventsByDay[dayKey] || [];
                const isSelected = isSameDay(date, selectedDate);
                const isTodayDate = isToday(date);
                const totalMinutes = dayEvents.reduce((sum, e) => sum + e.duration_minutes, 0);
                const meetingHours = totalMinutes / 60;

                return (
                  <motion.button
                    key={dayKey}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(date)}
                    className={`relative p-3 rounded-xl text-center transition-all ${
                      isSelected
                        ? 'bg-primary/30 border-2 border-primary'
                        : isTodayDate
                        ? 'bg-white/10 border-2 border-white/30'
                        : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className="text-xs text-white/50 mb-1">{format(date, 'EEE')}</div>
                    <div className={`text-lg font-semibold ${isSelected ? 'text-primary' : isTodayDate ? 'text-white' : 'text-white/70'}`}>
                      {format(date, 'd')}
                    </div>
                    {dayEvents.length > 0 && (
                      <div className="mt-1">
                        <div className={`text-xs font-medium ${
                          meetingHours >= 4 ? 'text-red-400' : meetingHours >= 2 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {dayEvents.length} · {meetingHours.toFixed(1)}h
                        </div>
                        {/* Meeting density bar */}
                        <div className="h-1 mt-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              meetingHours >= 4 ? 'bg-red-500' : meetingHours >= 2 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, (meetingHours / 8) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {dayEvents.length === 0 && (
                      <div className="text-xs text-green-400/60 mt-1">Free</div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Daily Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {isToday(selectedDate) ? "Today's Schedule" : isTomorrow(selectedDate) ? "Tomorrow's Schedule" : format(selectedDate, 'EEEE, MMM d')}
              </h3>
              <span className="text-sm text-white/50">
                {selectedDayEvents.length} meeting{selectedDayEvents.length !== 1 ? 's' : ''}
              </span>
            </div>

            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-white/50" />
              </div>
            ) : selectedDayEvents.length > 0 ? (
              <DayTimeline events={selectedDayEvents} />
            ) : (
              <div className="text-center py-12">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </motion.div>
                <p className="text-white font-medium">No meetings scheduled</p>
                <p className="text-white/50 text-sm">Perfect day for deep work!</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Meeting Intelligence Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Meeting Intelligence</h2>
            <p className="text-white/50 text-sm">Transcribe, analyze, and calculate meeting costs</p>
          </div>
        </div>
        <MeetingIntelligence />
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function CalendarConnectView({ onConnect, isPending }: { onConnect: () => void; isPending: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Meetings</h1>
        <p className="text-white/60">Connect your calendar to track meeting impact on deep work</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-center">
        {/* Left - Features */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div className="space-y-4">
            {[
              { icon: <Brain className="w-6 h-6" />, title: 'Deep Work Score', desc: 'See how meetings fragment your focus time' },
              { icon: <BarChart3 className="w-6 h-6" />, title: 'Meeting Analytics', desc: 'Track time spent in meetings vs. productive work' },
              { icon: <Target className="w-6 h-6" />, title: 'Focus Windows', desc: 'Find your best times for uninterrupted work' },
              { icon: <Zap className="w-6 h-6" />, title: 'Smart Insights', desc: 'Get AI recommendations to protect focus time' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/5"
              >
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-medium text-white">{feature.title}</h4>
                  <p className="text-white/60 text-sm">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right - Connect Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mx-auto mb-6"
          >
            <Calendar className="w-10 h-10 text-white" />
          </motion.div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Connect Your Calendar
          </h2>
          <p className="text-white/60 mb-8">
            One-click integration with Google Calendar
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConnect}
            disabled={isPending}
            className="w-full px-6 py-4 bg-gradient-to-r from-primary to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CalendarPlus className="w-5 h-5" />
                Connect Google Calendar
              </>
            )}
          </motion.button>

          <div className="flex items-center gap-2 justify-center mt-4 text-white/40 text-xs">
            <Shield className="w-4 h-4" />
            <span>Read-only access. We never modify your calendar.</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function DeepWorkScoreCard({ score }: { score: any }) {
  const statusColors = {
    excellent: { ring: 'text-green-500', bg: 'bg-green-500', label: 'text-green-400' },
    good: { ring: 'text-blue-500', bg: 'bg-blue-500', label: 'text-blue-400' },
    fair: { ring: 'text-yellow-500', bg: 'bg-yellow-500', label: 'text-yellow-400' },
    poor: { ring: 'text-red-500', bg: 'bg-red-500', label: 'text-red-400' },
  };

  const colors = statusColors[score?.status as keyof typeof statusColors] || statusColors.poor;
  const scoreValue = score?.deep_work_score || 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (scoreValue / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-white">Deep Work Score</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Score Ring */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-white/10"
            />
            <motion.circle
              cx="50" cy="50" r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={colors.ring}
              initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{scoreValue}</span>
            <span className={`text-xs font-medium ${colors.label}`}>
              {score?.status?.toUpperCase() || 'N/A'}
            </span>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Deep Work</span>
            <span className="text-green-400 font-medium">{score?.deep_work_hours || 0}h</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Meetings</span>
            <span className="text-red-400 font-medium">{score?.meeting_hours || 0}h</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-sm">Best Focus</span>
            <span className="text-purple-400 font-medium">{score?.longest_focus_block || 0}m</span>
          </div>
          {score?.vs_yesterday !== null && score?.vs_yesterday !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${
              score.vs_yesterday > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {score.vs_yesterday > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {score.vs_yesterday > 0 ? '+' : ''}{score.vs_yesterday}% vs yesterday
            </div>
          )}
        </div>
      </div>

      {score?.message && (
        <p className="text-white/60 text-sm mt-4 p-3 rounded-lg bg-white/5">{score.message}</p>
      )}
    </motion.div>
  );
}

function QuickStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="p-3 rounded-xl bg-white/5">
      <div className={`w-8 h-8 rounded-lg ${colorClasses[color as keyof typeof colorClasses]} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}

function FocusTimeSlot({ time, label, icon, score }: { time: string; label: string; icon: React.ReactNode; score: number }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-white font-medium text-sm">{time}</div>
        <div className="text-white/50 text-xs">{label}</div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-medium ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-white/50'}`}>
          {score}%
        </div>
        <div className="text-xs text-white/40">focus</div>
      </div>
    </div>
  );
}

function DayTimeline({ events }: { events: CalendarEvent[] }) {
  // Work hours: 8 AM to 8 PM
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return (
    <div className="relative">
      {/* Timeline Grid */}
      <div className="absolute left-12 right-0 top-0 bottom-0">
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute w-full border-t border-white/5"
            style={{ top: `${((hour - 8) / 12) * 100}%` }}
          />
        ))}
      </div>

      {/* Hour Labels */}
      <div className="relative" style={{ height: '520px' }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute left-0 text-xs text-white/40 -translate-y-1/2"
            style={{ top: `${((hour - 8) / 12) * 100}%` }}
          >
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}

        {/* Events */}
        <div className="absolute left-14 right-0 top-0 bottom-0">
          {sortedEvents.map((event) => {
            const startDate = parseISO(event.start_time);
            const startHour = getHours(startDate) + getMinutes(startDate) / 60;
            const endDate = parseISO(event.end_time);
            const endHour = getHours(endDate) + getMinutes(endDate) / 60;

            // Clamp to visible range
            const visibleStart = Math.max(8, startHour);
            const visibleEnd = Math.min(20, endHour);

            if (visibleEnd <= visibleStart) return null;

            const top = ((visibleStart - 8) / 12) * 100;
            const height = ((visibleEnd - visibleStart) / 12) * 100;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`absolute left-0 right-2 rounded-lg p-3 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ${
                  event.is_focus_time
                    ? 'bg-gradient-to-r from-green-500/30 to-green-600/20 border-l-4 border-green-500'
                    : 'bg-gradient-to-r from-blue-500/30 to-purple-500/20 border-l-4 border-blue-500'
                }`}
                style={{ top: `${top}%`, height: `${Math.max(height, 4)}%`, minHeight: '40px' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{event.title}</div>
                    <div className="text-xs text-white/60 flex items-center gap-2 mt-0.5">
                      <span>{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</span>
                      {event.attendee_count > 1 && (
                        <span className="flex items-center gap-0.5">
                          <Users className="w-3 h-3" />
                          {event.attendee_count}
                        </span>
                      )}
                    </div>
                  </div>
                  {event.meeting_url && (
                    <a
                      href={event.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Video className="w-3.5 h-3.5 text-white/70" />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Current Time Indicator */}
          {(() => {
            const now = new Date();
            const currentHour = getHours(now) + getMinutes(now) / 60;
            if (currentHour >= 8 && currentHour <= 20) {
              const top = ((currentHour - 8) / 12) * 100;
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute left-0 right-0 flex items-center"
                  style={{ top: `${top}%` }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </motion.div>
              );
            }
            return null;
          })()}
        </div>
      </div>
    </div>
  );
}
