import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
  RefreshCw,
  Brain,
} from 'lucide-react';

interface AIInsightCardProps {
  type?: 'tip' | 'pattern' | 'recommendation' | 'warning' | 'win';
  title: string;
  description: string;
  icon?: string;
  timestamp?: string;
  animated?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  lightbulb: Lightbulb,
  trending_up: TrendingUp,
  warning: AlertTriangle,
  check: CheckCircle2,
  target: Target,
  sparkles: Sparkles,
  brain: Brain,
};

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  tip: { bg: 'from-blue-500/10 to-purple-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  pattern: { bg: 'from-green-500/10 to-teal-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  recommendation: { bg: 'from-purple-500/10 to-pink-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  warning: { bg: 'from-yellow-500/10 to-orange-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  win: { bg: 'from-emerald-500/10 to-green-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

export function AIInsightCard({
  type = 'tip',
  title,
  description,
  icon = 'lightbulb',
  timestamp,
  animated = true,
  onRefresh,
  isRefreshing = false,
}: AIInsightCardProps) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(animated);

  const Icon = iconMap[icon] || Lightbulb;
  const colors = typeColors[type] || typeColors.tip;

  // Typing animation effect
  useEffect(() => {
    if (!animated) {
      setDisplayText(description);
      return;
    }

    setIsTyping(true);
    setDisplayText('');

    let index = 0;
    const interval = setInterval(() => {
      if (index < description.length) {
        setDisplayText(description.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [description, animated]);

  return (
    <motion.div
      initial={animated ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative overflow-hidden rounded-xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-4`}
    >
      {/* AI Badge */}
      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-white/40">
        <Sparkles size={10} />
        <span>AI Generated</span>
      </div>

      {/* Icon and Title */}
      <div className="flex items-start gap-3 mb-3 pr-20">
        <div className={`p-2 rounded-lg bg-white/5 ${colors.text}`}>
          <Icon size={20} />
        </div>
        <div>
          <h4 className="text-white font-medium text-sm">{title}</h4>
          {timestamp && (
            <p className="text-white/40 text-xs mt-0.5">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Description with typing animation */}
      <p className="text-white/70 text-sm leading-relaxed">
        {displayText}
        {isTyping && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="inline-block w-0.5 h-4 bg-white/50 ml-0.5 align-middle"
          />
        )}
      </p>

      {/* Refresh button */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      )}
    </motion.div>
  );
}

// Quick tip variant
export function QuickTipCard({
  tip,
  category,
  onRefresh,
  isRefreshing,
}: {
  tip: string;
  category?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
          <Sparkles size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-400 text-xs font-medium">Quick Tip</span>
            {category && (
              <span className="text-white/30 text-xs">• {category}</span>
            )}
          </div>
          <p className="text-white/80 text-sm">{tip}</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default AIInsightCard;
