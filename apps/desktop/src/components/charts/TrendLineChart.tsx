import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';

interface TrendData {
  date: string;
  productivity_score: number;
  total_time: number;
  productive_time: number;
}

interface TrendLineChartProps {
  data: TrendData[];
  height?: number;
  goalLine?: number;
  showDots?: boolean;
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
      dateLabel = data.date;
    }

    return (
      <div className="glass-card p-3">
        <p className="text-white font-medium text-sm mb-2">{dateLabel}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-white/60">Productivity:</span>
            <span className="text-productive font-medium">
              {data.productivity_score.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-white/60">Total Time:</span>
            <span className="text-white">{formatTime(data.total_time)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-white/60">Productive:</span>
            <span className="text-productive">{formatTime(data.productive_time)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function TrendLineChart({
  data,
  height = 250,
  goalLine = 70,
  showDots = true,
  animated = true,
}: TrendLineChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => {
      let dayLabel = item.date;
      try {
        dayLabel = format(parseISO(item.date), 'EEE');
      } catch {
        // Keep original if parsing fails
      }

      return {
        ...item,
        dayLabel,
      };
    });
  }, [data]);

  const { minValue, maxValue, avgValue } = useMemo(() => {
    const scores = data.map((d) => d.productivity_score);
    return {
      minValue: Math.min(...scores, goalLine) - 10,
      maxValue: Math.max(...scores, goalLine) + 10,
      avgValue: scores.reduce((a, b) => a + b, 0) / scores.length,
    };
  }, [data, goalLine]);

  const trend = useMemo(() => {
    if (data.length < 2) return 'stable';
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b.productivity_score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.productivity_score, 0) / secondHalf.length;
    if (secondAvg - firstAvg > 5) return 'improving';
    if (firstAvg - secondAvg > 5) return 'declining';
    return 'stable';
  }, [data]);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.1)"
            vertical={false}
          />
          <XAxis
            dataKey="dayLabel"
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
            tickFormatter={(value) => `${value}%`}
            domain={[Math.max(0, minValue), Math.min(100, maxValue)]}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Goal reference line */}
          <ReferenceLine
            y={goalLine}
            stroke="#F59E0B"
            strokeDasharray="5 5"
            strokeWidth={1}
            label={{
              value: `Goal: ${goalLine}%`,
              fill: '#F59E0B',
              fontSize: 10,
              position: 'right',
            }}
          />

          <Line
            type="monotone"
            dataKey="productivity_score"
            stroke="url(#lineGradient)"
            strokeWidth={3}
            dot={
              showDots
                ? {
                    fill: '#10B981',
                    stroke: '#0D9668',
                    strokeWidth: 2,
                    r: 4,
                  }
                : false
            }
            activeDot={{
              fill: '#10B981',
              stroke: '#fff',
              strokeWidth: 2,
              r: 6,
            }}
            animationDuration={animated ? 1500 : 0}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Trend indicator */}
      <div className="flex justify-center mt-2">
        <div
          className={`text-xs px-2 py-1 rounded-full ${
            trend === 'improving'
              ? 'bg-productive/20 text-productive'
              : trend === 'declining'
              ? 'bg-distracting/20 text-distracting'
              : 'bg-white/10 text-white/60'
          }`}
        >
          {trend === 'improving' && '↗ Improving'}
          {trend === 'declining' && '↘ Declining'}
          {trend === 'stable' && '→ Stable'}
          {' '}• Avg: {avgValue.toFixed(0)}%
        </div>
      </div>
    </motion.div>
  );
}
