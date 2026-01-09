import { motion } from 'framer-motion';
import { LucideIcon, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductivityBadge, ProductivityType } from './ProductivityBadge';

interface ActivityItemProps {
  appName: string;
  windowTitle: string;
  duration: string;
  category?: string;
  productivityType?: ProductivityType;
  timestamp?: string;
  icon?: LucideIcon | string;
  onClick?: () => void;
}

export function ActivityItem({
  appName = 'Unknown App',
  windowTitle = '',
  duration = '0m',
  category,
  productivityType,
  timestamp = '',
  icon,
  onClick,
}: ActivityItemProps) {
  // Ensure we have a valid productivity type
  const safeProductivityType: ProductivityType = productivityType && ['productive', 'neutral', 'distracting'].includes(productivityType)
    ? productivityType
    : 'neutral';

  const renderIcon = () => {
    if (typeof icon === 'string') {
      // Emoji icon
      return <span className="text-lg">{icon}</span>;
    }
    if (icon) {
      const IconComponent = icon;
      return <IconComponent className="w-5 h-5 text-white/70" />;
    }
    // Default app icons
    const defaultIcons: Record<string, string> = {
      'VS Code': '💻',
      'Visual Studio Code': '💻',
      'Cursor': '💻',
      'Chrome': '🌐',
      'Google Chrome': '🌐',
      'Firefox': '🦊',
      'Safari': '🧭',
      'Slack': '💬',
      'Discord': '🎮',
      'YouTube': '📺',
      'Spotify': '🎵',
      'Notion': '📝',
      'Figma': '🎨',
      'Terminal': '⬛',
      'iTerm2': '⬛',
      'Finder': '📁',
    };
    return <span className="text-lg">{defaultIcons[appName] || '📱'}</span>;
  };

  return (
    <motion.div
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
        'hover:bg-white/5 group cursor-pointer'
      )}
      onClick={onClick}
      whileHover={{ x: 4 }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* App Icon */}
      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/15 transition-colors">
        {renderIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white text-sm font-medium truncate">{appName}</p>
          {category && (
            <span className="text-white/40 text-xs px-2 py-0.5 rounded-full bg-white/5">
              {category}
            </span>
          )}
        </div>
        <p className="text-white/50 text-sm truncate">{windowTitle || 'No title'}</p>
      </div>

      {/* Duration & Time */}
      <div className="text-right flex-shrink-0">
        <div className="flex items-center gap-1 text-white/70">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">{duration}</span>
        </div>
        {timestamp && (
          <p className="text-white/40 text-xs mt-0.5">{timestamp}</p>
        )}
      </div>

      {/* Productivity Badge */}
      <ProductivityBadge type={safeProductivityType} size="sm" />

      {/* Hover indicator */}
      <motion.div
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        initial={false}
      >
        <ExternalLink className="w-4 h-4 text-white/30" />
      </motion.div>
    </motion.div>
  );
}

// Compact variant for dashboard
export function ActivityItemCompact({
  appName = 'Unknown App',
  windowTitle = '',
  duration = '0m',
  productivityType,
  icon,
}: Pick<ActivityItemProps, 'appName' | 'windowTitle' | 'duration' | 'productivityType' | 'icon'>) {
  // Ensure we have a valid productivity type
  const safeProductivityType: ProductivityType = productivityType && ['productive', 'neutral', 'distracting'].includes(productivityType)
    ? productivityType
    : 'neutral';

  const renderIcon = () => {
    if (typeof icon === 'string') {
      return <span className="text-base">{icon}</span>;
    }
    const appLower = (appName || '').toLowerCase();
    if (appLower.includes('code') || appLower.includes('cursor')) return <span className="text-base">💻</span>;
    if (appLower.includes('chrome') || appLower.includes('firefox') || appLower.includes('safari')) return <span className="text-base">🌐</span>;
    if (appLower.includes('slack') || appLower.includes('discord')) return <span className="text-base">💬</span>;
    if (appLower.includes('youtube')) return <span className="text-base">📺</span>;
    if (appLower.includes('terminal') || appLower.includes('iterm')) return <span className="text-base">⬛</span>;
    if (appLower.includes('figma') || appLower.includes('sketch')) return <span className="text-base">🎨</span>;
    if (appLower.includes('notion') || appLower.includes('obsidian')) return <span className="text-base">📝</span>;
    return <span className="text-base">📱</span>;
  };

  return (
    <motion.div
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
      whileHover={{ x: 2 }}
    >
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
        {renderIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">{appName}</p>
        <p className="text-white/50 text-xs truncate">{windowTitle || 'No title'}</p>
      </div>
      <span className="text-white/60 text-xs">{duration}</span>
      <ProductivityBadge type={safeProductivityType} size="xs" />
    </motion.div>
  );
}
