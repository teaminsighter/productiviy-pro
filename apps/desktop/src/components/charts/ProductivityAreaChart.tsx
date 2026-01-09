import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

interface HourlyData {
  hour: number;
  productivity: number;
  total_time: number;
  productive_time: number;
  distracting_time: number;
}

interface ProductivityAreaChartProps {
  data: HourlyData[];
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-card p-3 min-w-[140px]">
        <p className="text-white font-medium text-sm mb-2">
          {label}:00 - {(label + 1) % 24}:00
        </p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-white/60">Productivity:</span>
            <span className="text-productive font-medium">
              {Math.round(data.productivity * 100)}%
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/60">Total Time:</span>
            <span className="text-white">
              {Math.round(data.total_time / 60)}m
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/60">Productive:</span>
            <span className="text-productive">
              {Math.round(data.productive_time / 60)}m
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function ProductivityAreaChart({
  data,
  height = 250,
  showGrid = true,
  animated = true,
}: ProductivityAreaChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      displayHour: `${item.hour}:00`,
      productivityPercent: item.productivity * 100,
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
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#10B981" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
              vertical={false}
            />
          )}
          <XAxis
            dataKey="hour"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}h`}
            interval={2}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="productivityPercent"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#productivityGradient)"
            animationDuration={animated ? 1500 : 0}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
