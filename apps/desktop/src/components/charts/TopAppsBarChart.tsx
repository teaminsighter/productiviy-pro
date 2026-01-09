import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';

interface AppData {
  app: string;
  duration: number;
  percentage: number;
  productivity_type: string;
  category: string;
}

interface TopAppsBarChartProps {
  data: AppData[];
  height?: number;
  maxApps?: number;
  animated?: boolean;
  onAppClick?: (app: string) => void;
}

const PRODUCTIVITY_COLORS = {
  productive: '#10B981',
  neutral: '#F59E0B',
  distracting: '#EF4444',
};

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-card p-3">
        <p className="text-white font-medium text-sm mb-1">{data.app}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-white/60">Duration:</span>
            <span className="text-white">{formatTime(data.duration)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-white/60">Category:</span>
            <span className="text-white capitalize">{data.category}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-white/60">Type:</span>
            <span
              className="capitalize"
              style={{
                color: PRODUCTIVITY_COLORS[data.productivity_type as keyof typeof PRODUCTIVITY_COLORS],
              }}
            >
              {data.productivity_type}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function TopAppsBarChart({
  data,
  height = 300,
  maxApps = 8,
  animated = true,
  onAppClick,
}: TopAppsBarChartProps) {
  const chartData = useMemo(() => {
    return data.slice(0, maxApps).map((item) => ({
      ...item,
      name: item.app,
      fill: PRODUCTIVITY_COLORS[item.productivity_type as keyof typeof PRODUCTIVITY_COLORS] || PRODUCTIVITY_COLORS.neutral,
      displayDuration: formatTime(item.duration),
    }));
  }, [data, maxApps]);

  return (
    <motion.div
      initial={animated ? { opacity: 0, x: -20 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 50, left: 0, bottom: 5 }}
        >
          <XAxis
            type="number"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatTime(value)}
          />
          <YAxis
            type="category"
            dataKey="app"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Bar
            dataKey="duration"
            radius={[0, 4, 4, 0]}
            animationDuration={animated ? 1000 : 0}
            onClick={(data) => onAppClick?.(data.app)}
            style={{ cursor: onAppClick ? 'pointer' : 'default' }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
