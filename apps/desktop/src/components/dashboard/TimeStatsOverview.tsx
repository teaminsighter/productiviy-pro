import { motion } from 'framer-motion';
import { Clock, Zap, Calendar, TrendingUp } from 'lucide-react';
import { LiveTimeDisplay } from '@/components/common/LiveTimeDisplay';

interface TimeStatsOverviewProps {
  todayTotal: number;
  todayProductive: number;
  productivity: number;
  weekTotal: number;
  monthTotal: number;
}

export function TimeStatsOverview({
  todayTotal,
  todayProductive,
  productivity,
  weekTotal,
  monthTotal
}: TimeStatsOverviewProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Today Total */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20"
      >
        <div className="flex items-center gap-2 text-blue-400 mb-3">
          <Clock className="w-5 h-5" />
          <span className="text-sm font-medium">Today</span>
        </div>
        <LiveTimeDisplay
          seconds={todayTotal}
          size="xl"
          showSeconds={true}
          color="text-white"
        />
        <p className="text-xs text-white/40 mt-2">
          Total tracked time
        </p>
      </motion.div>

      {/* Today Productive */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/20"
      >
        <div className="flex items-center gap-2 text-green-400 mb-3">
          <Zap className="w-5 h-5" />
          <span className="text-sm font-medium">Productive</span>
        </div>
        <LiveTimeDisplay
          seconds={todayProductive}
          size="xl"
          showSeconds={true}
          color="text-green-400"
        />
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${productivity}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-green-500 rounded-full"
            />
          </div>
          <span className="text-xs text-green-400 font-medium">{productivity}%</span>
        </div>
      </motion.div>

      {/* This Week */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20"
      >
        <div className="flex items-center gap-2 text-purple-400 mb-3">
          <Calendar className="w-5 h-5" />
          <span className="text-sm font-medium">This Week</span>
        </div>
        <LiveTimeDisplay
          seconds={weekTotal}
          size="xl"
          showSeconds={false}
          color="text-purple-400"
        />
        <p className="text-xs text-white/40 mt-2">
          {weekTotal > 0 ? `${Math.round(weekTotal / 3600 / 7 * 10) / 10}h daily avg` : 'No data yet'}
        </p>
      </motion.div>

      {/* This Month */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-5 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/20"
      >
        <div className="flex items-center gap-2 text-pink-400 mb-3">
          <TrendingUp className="w-5 h-5" />
          <span className="text-sm font-medium">This Month</span>
        </div>
        <LiveTimeDisplay
          seconds={monthTotal}
          size="xl"
          showSeconds={false}
          color="text-pink-400"
        />
        <p className="text-xs text-white/40 mt-2">
          {Math.round(monthTotal / 3600)} hours total
        </p>
      </motion.div>
    </div>
  );
}
