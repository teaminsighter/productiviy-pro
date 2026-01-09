import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

interface HeatmapData {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  value: number; // Activity duration in seconds
  productivity?: number; // 0-1
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  height?: number;
  animated?: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const getColor = (value: number, max: number): string => {
  if (value === 0) return 'rgba(255,255,255,0.03)';
  const intensity = Math.min(value / max, 1);

  // Gradient from low activity (dark blue) to high activity (bright green)
  if (intensity < 0.25) return `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`;
  if (intensity < 0.5) return `rgba(34, 197, 94, ${0.3 + intensity * 0.6})`;
  if (intensity < 0.75) return `rgba(16, 185, 129, ${0.5 + intensity * 0.4})`;
  return `rgba(16, 185, 129, ${0.7 + intensity * 0.3})`;
};

const formatTime = (seconds: number): string => {
  if (seconds === 0) return 'No activity';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export function ActivityHeatmap({
  data,
  height = 200,
  animated = true,
}: ActivityHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);

  const { grid, maxValue } = useMemo(() => {
    // Create a 7x24 grid initialized with zeros
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let max = 0;

    data.forEach((item) => {
      if (item.day >= 0 && item.day < 7 && item.hour >= 0 && item.hour < 24) {
        grid[item.day][item.hour] = item.value;
        if (item.value > max) max = item.value;
      }
    });

    return { grid, maxValue: max || 1 };
  }, [data]);


  return (
    <motion.div
      initial={animated ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
      style={{ minHeight: height }}
    >
      {/* Hour labels */}
      <div className="flex mb-1 pl-10">
        {HOURS.filter((h) => h % 3 === 0).map((hour) => (
          <div
            key={hour}
            className="text-[10px] text-white/40"
            style={{ width: `${100 / 8}%` }}
          >
            {hour}:00
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="space-y-1">
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="flex items-center gap-2">
            <div className="w-8 text-[10px] text-white/50 text-right">{day}</div>
            <div className="flex-1 flex gap-0.5">
              {HOURS.map((hour) => {
                const value = grid[dayIndex][hour];
                const isHovered = hoveredCell?.day === dayIndex && hoveredCell?.hour === hour;

                return (
                  <motion.div
                    key={`${day}-${hour}`}
                    className="flex-1 aspect-square rounded-sm relative"
                    style={{
                      backgroundColor: getColor(value, maxValue),
                      minWidth: 8,
                      maxWidth: 20,
                    }}
                    initial={animated ? { opacity: 0, scale: 0 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: animated ? (dayIndex * 24 + hour) * 0.002 : 0,
                      duration: 0.2,
                    }}
                    whileHover={{ scale: 1.3, zIndex: 10 }}
                    onMouseEnter={() => setHoveredCell({ day: dayIndex, hour })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
                      >
                        <div className="glass-card p-2 text-[10px] whitespace-nowrap">
                          <p className="text-white font-medium">
                            {DAYS[dayIndex]} {hour}:00
                          </p>
                          <p className="text-white/60">{formatTime(value)}</p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-3">
        <span className="text-[10px] text-white/40">Less</span>
        <div className="flex gap-0.5">
          {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getColor(intensity * maxValue, maxValue) }}
            />
          ))}
        </div>
        <span className="text-[10px] text-white/40">More</span>
      </div>
    </motion.div>
  );
}
