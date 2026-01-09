import { motion } from 'framer-motion';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  TrendingUp,
  Brain,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useDailyInsights, useRegenerateDailyInsights } from '@/hooks/useAI';
import { AIInsightCard } from './AIInsightCard';
import { AIStatusIndicator } from './AIStatusIndicator';

interface DailyInsightsPanelProps {
  date?: string;
  compact?: boolean;
}

export function DailyInsightsPanel({ date, compact = false }: DailyInsightsPanelProps) {
  const { data: insights, isLoading, error } = useDailyInsights(date);
  const regenerate = useRegenerateDailyInsights();

  const handleRegenerate = () => {
    regenerate.mutate(date);
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="animate-spin text-accent" size={24} />
          <span className="text-white/60">Generating AI insights...</span>
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className="glass-card p-6">
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <AlertCircle className="text-red-400" size={32} />
          <p className="text-white/60 text-center">
            Unable to load AI insights.
            <br />
            <span className="text-sm">Check your API key in Settings.</span>
          </p>
          <AIStatusIndicator />
        </div>
      </div>
    );
  }

  // Compact mode for sidebar/widgets
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-3"
      >
        {/* Quick Summary */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-accent/10 to-purple-500/10 border border-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-accent" size={16} />
            <span className="text-white/60 text-xs">AI Summary</span>
          </div>
          <p className="text-white text-sm">{insights.summary}</p>
        </div>

        {/* Daily Tip */}
        {insights.tip && (
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-start gap-2">
              <Lightbulb className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
              <p className="text-white/70 text-xs">{insights.tip}</p>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Full panel
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20">
            <Brain className="text-accent" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Insights</h3>
            <p className="text-white/50 text-sm">
              {insights.date === new Date().toISOString().split('T')[0] ? "Today's" : insights.date} Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!insights.ai_powered && (
            <span className="text-xs text-yellow-400/80 bg-yellow-400/10 px-2 py-1 rounded-full">
              Basic Mode
            </span>
          )}
          <button
            onClick={handleRegenerate}
            disabled={regenerate.isPending}
            className="p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={regenerate.isPending ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-white text-lg mb-4">{insights.summary}</p>

            {/* Score */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${insights.productivity_score}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-accent to-productive rounded-full"
                  />
                </div>
                <span className="text-white font-semibold">
                  {Math.round(insights.productivity_score)}%
                </span>
              </div>
              <span className="text-white/40 text-sm">{insights.focus_score_explanation}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wins & Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Wins */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="text-productive" size={18} />
            <h4 className="text-white font-medium">Wins</h4>
          </div>
          <ul className="space-y-2">
            {insights.wins.length > 0 ? (
              insights.wins.map((win, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <CheckCircle2 className="text-productive flex-shrink-0 mt-0.5" size={14} />
                  <span className="text-white/80">{win}</span>
                </motion.li>
              ))
            ) : (
              <li className="text-white/40 text-sm">Keep tracking to see your wins!</li>
            )}
          </ul>
        </div>

        {/* Improvements */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-yellow-400" size={18} />
            <h4 className="text-white font-medium">Areas to Improve</h4>
          </div>
          <ul className="space-y-2">
            {insights.improvements.length > 0 ? (
              insights.improvements.map((improvement, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <ChevronRight className="text-yellow-400 flex-shrink-0 mt-0.5" size={14} />
                  <span className="text-white/80">{improvement}</span>
                </motion.li>
              ))
            ) : (
              <li className="text-white/40 text-sm">Looking good! Keep up the great work.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Daily Tip */}
      {insights.tip && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Lightbulb className="text-purple-400" size={18} />
            </div>
            <div>
              <p className="text-purple-300 text-xs font-medium mb-1">Tomorrow's Tip</p>
              <p className="text-white/90">{insights.tip}</p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Insights */}
      {insights.insights.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-white/60 text-sm font-medium">Detailed Insights</h4>
          <div className="grid gap-3">
            {insights.insights.map((insight, index) => (
              <AIInsightCard
                key={index}
                type={insight.insight_type as any}
                title={insight.title}
                description={insight.description}
                icon={insight.icon}
                animated={index === 0}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default DailyInsightsPanel;
