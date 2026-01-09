import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';

interface DailyData {
  date: string;
  day: string;
  total_time: number;
  productivity_score: number;
}

interface WeeklyBarChartProps {
  data: DailyData[];
  height?: number;
  animated?: boolean;
}

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    let dateLabel = label;
    try {
      dateLabel = format(parseISO(data.date), 'EEE, MMM d');
    } catch {
      dateLabel = data.day || data.date;
    }

    return (
      <div className="glass-card p-3">
        <p className="text-white font-medium text-sm mb-2">{dateLabel}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-white/60">Total Time:</span>
            <span className="text-white">{formatTime(data.total_time)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-white/60">Productivity:</span>
            <span className="text-productive">{data.productivity_score.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function WeeklyBarChart({
  data,
  height = 250,
  animated = true,
}: WeeklyBarChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      displayDay: item.day.slice(0, 3),
      // Convert time to hours for better visualization
      timeHours: item.total_time / 3600,
    }));
  }, [data]);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.1)"
            vertical={false}
          />
          <XAxis
            dataKey="displayDay"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}h`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar
            dataKey="timeHours"
            fill="url(#barGradient)"
            radius={[4, 4, 0, 0]}
            animationDuration={animated ? 1000 : 0}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
