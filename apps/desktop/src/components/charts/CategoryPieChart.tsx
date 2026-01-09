import { useMemo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';

interface CategoryData {
  category: string;
  duration: number;
  percentage: number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
  height?: number;
  showLegend?: boolean;
  animated?: boolean;
  onCategoryClick?: (category: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  development: '#10B981',
  design: '#8B5CF6',
  communication: '#F59E0B',
  productivity: '#3B82F6',
  video: '#EC4899',
  social_media: '#EF4444',
  entertainment: '#EF4444',
  research: '#06B6D4',
  email: '#F97316',
  meeting: '#6366F1',
  other: '#6B7280',
};

const getCategoryColor = (category: string): string => {
  return CATEGORY_COLORS[category.toLowerCase()] || CATEGORY_COLORS.other;
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
        <p className="text-white font-medium text-sm capitalize mb-1">
          {data.category}
        </p>
        <p className="text-white/60 text-xs">
          {formatTime(data.duration)} ({data.percentage.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload, onClick }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-4">
      {payload.map((entry: any, index: number) => (
        <motion.button
          key={`legend-${index}`}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onClick?.(entry.value)}
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-white/70 text-xs capitalize">{entry.value}</span>
        </motion.button>
      ))}
    </div>
  );
};

export function CategoryPieChart({
  data,
  height = 300,
  showLegend = true,
  animated = true,
  onCategoryClick,
}: CategoryPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      name: item.category,
      value: item.duration,
      fill: getCategoryColor(item.category),
    }));
  }, [data]);

  const totalTime = useMemo(() => {
    return data.reduce((sum, item) => sum + item.duration, 0);
  }, [data]);

  const handlePieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const handlePieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.9 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height }}
      className="relative"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={activeIndex !== null ? 90 : 85}
            paddingAngle={2}
            dataKey="value"
            onMouseEnter={handlePieEnter}
            onMouseLeave={handlePieLeave}
            onClick={(_, index) => onCategoryClick?.(chartData[index].category)}
            animationDuration={animated ? 1000 : 0}
            animationBegin={0}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill}
                stroke="transparent"
                style={{
                  filter: activeIndex === index ? 'brightness(1.2)' : 'none',
                  cursor: onCategoryClick ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              content={<CustomLegend onClick={onCategoryClick} />}
              verticalAlign="bottom"
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '-15%' }}>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{formatTime(totalTime)}</p>
          <p className="text-xs text-white/50">Total</p>
        </div>
      </div>
    </motion.div>
  );
}
