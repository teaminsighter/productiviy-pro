/**
 * Reports Page - Generate and download productivity reports
 */
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Mail,
  Clock,
  Brain,
  BarChart3,
  PieChart,
  Target,
  Video,
  Zap,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  getReportPreview,
  downloadReportPDF,
  sendReportEmail,
  ReportPeriod,
} from '@/lib/api/reports';

type PeriodOption = {
  value: ReportPeriod;
  label: string;
  description: string;
};

const periodOptions: PeriodOption[] = [
  { value: 'daily', label: 'Daily', description: 'Today\'s activity' },
  { value: 'weekly', label: 'Weekly', description: 'Last 7 days' },
  { value: 'monthly', label: 'Monthly', description: 'Last 30 days' },
];

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('weekly');
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch report preview
  const { data: preview, isLoading, error, refetch } = useQuery({
    queryKey: ['report-preview', selectedPeriod],
    queryFn: () => getReportPreview(selectedPeriod),
  });

  // Email mutation
  const emailMutation = useMutation({
    mutationFn: () => sendReportEmail({ period: selectedPeriod }),
    onSuccess: () => {
      toast.success('Report sent to your email!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Failed to send email');
    },
  });

  // Handle PDF download
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadReportPDF(selectedPeriod);
      toast.success('Report downloaded successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-white/60">Generate beautiful productivity reports</p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => emailMutation.mutate()}
            disabled={emailMutation.isPending || !preview}
            className="px-4 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {emailMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Email Report
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownload}
            disabled={isDownloading || !preview}
            className="px-4 py-2 bg-gradient-to-r from-primary to-purple-500 text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </motion.button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-3">
        {periodOptions.map((option) => (
          <motion.button
            key={option.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedPeriod(option.value)}
            className={`flex-1 p-4 rounded-xl border-2 transition-all ${
              selectedPeriod === option.value
                ? 'bg-primary/20 border-primary'
                : 'bg-white/5 border-transparent hover:bg-white/10'
            }`}
          >
            <div className="text-left">
              <h3 className={`font-semibold ${selectedPeriod === option.value ? 'text-primary' : 'text-white'}`}>
                {option.label}
              </h3>
              <p className="text-white/50 text-sm">{option.description}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-white/60">Generating report preview...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glass-card p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Failed to load report</h3>
          <p className="text-white/60 text-sm mb-4">There was an error generating the report preview.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Report Preview */}
      {preview && !isLoading && (
        <div className="space-y-6">
          {/* Report Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Productivity Report
                </h2>
                <p className="text-white/60">
                  {format(new Date(preview.start_date), 'MMM d')} - {format(new Date(preview.end_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={<Brain className="w-5 h-5" />}
                label="Deep Work Score"
                value={preview.deep_work_score.toString()}
                subtext={preview.deep_work_score >= 70 ? 'Excellent' : preview.deep_work_score >= 40 ? 'Good' : 'Needs Work'}
                color={preview.deep_work_score >= 70 ? 'green' : preview.deep_work_score >= 40 ? 'yellow' : 'red'}
              />
              <MetricCard
                icon={<Clock className="w-5 h-5" />}
                label="Total Tracked"
                value={`${preview.total_tracked_hours.toFixed(1)}h`}
                subtext={`${preview.productive_hours.toFixed(1)}h productive`}
                color="blue"
              />
              <MetricCard
                icon={<Target className="w-5 h-5" />}
                label="Productivity"
                value={`${preview.productivity_percentage.toFixed(0)}%`}
                subtext={preview.productivity_trend > 0 ? `↑ ${preview.productivity_trend}%` : preview.productivity_trend < 0 ? `↓ ${Math.abs(preview.productivity_trend)}%` : 'No change'}
                color="purple"
              />
              <MetricCard
                icon={<Video className="w-5 h-5" />}
                label="Meetings"
                value={`${preview.meeting_hours.toFixed(1)}h`}
                subtext={`${preview.meeting_count} meetings`}
                color="red"
              />
            </div>
          </motion.div>

          {/* Daily Breakdown Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Daily Breakdown
            </h3>

            <div className="space-y-3">
              {preview.daily_stats.slice(-7).map((day, index) => {
                const maxHours = Math.max(...preview.daily_stats.map(d => d.total_hours || 0), 8);
                const productivePercent = (day.productive_hours / maxHours) * 100;
                const meetingPercent = (day.meeting_hours / maxHours) * 100;

                return (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-20 text-sm text-white/60">{day.day_name.slice(0, 3)}</div>
                    <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden flex">
                      <div
                        className="h-full bg-green-500/80 transition-all"
                        style={{ width: `${productivePercent}%` }}
                      />
                      <div
                        className="h-full bg-red-500/80 transition-all"
                        style={{ width: `${meetingPercent}%` }}
                      />
                    </div>
                    <div className="w-24 text-right">
                      <span className="text-green-400 text-sm">{day.productive_hours.toFixed(1)}h</span>
                      <span className="text-white/30 mx-1">/</span>
                      <span className="text-red-400 text-sm">{day.meeting_hours.toFixed(1)}h</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-sm text-white/60">Productive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-sm text-white/60">Meetings</span>
              </div>
            </div>
          </motion.div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Category Breakdown
              </h3>

              <div className="space-y-3">
                {preview.category_breakdown.slice(0, 6).map((cat, index) => {
                  const colors = ['bg-primary', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-blue-500'];
                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded ${colors[index % colors.length]}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm">{cat.category}</span>
                          <span className="text-white/60 text-sm">{cat.hours.toFixed(1)}h ({cat.percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.percentage}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className={`h-full rounded-full ${colors[index % colors.length]}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Top Apps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Top Applications
              </h3>

              <div className="space-y-3">
                {preview.top_apps.slice(0, 5).map((app, index) => (
                  <motion.div
                    key={app.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      app.is_productive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
                    }`}>
                      <span className="text-sm font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{app.name}</div>
                      <div className="text-white/50 text-xs">
                        {app.is_productive ? 'Productive' : 'Other'}
                      </div>
                    </div>
                    <div className="text-white/70 font-medium">{app.hours.toFixed(1)}h</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Insights & Recommendations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Insights & Recommendations
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Insights */}
              <div>
                <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Key Insights</h4>
                <div className="space-y-2">
                  {preview.insights.map((insight, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-white/5"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-white/80 text-sm">{insight}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {preview.recommendations.map((rec, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20"
                    >
                      <ChevronRight className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-white/80 text-sm">{rec}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Download CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6 text-center"
          >
            <h3 className="text-lg font-semibold text-white mb-2">Ready to share?</h3>
            <p className="text-white/60 mb-4">Download a beautifully formatted PDF report with all your productivity data.</p>
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-6 py-3 bg-gradient-to-r from-primary to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                Download PDF Report
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => emailMutation.mutate()}
                disabled={emailMutation.isPending}
                className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {emailMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mail className="w-5 h-5" />
                )}
                Send to Email
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({
  icon,
  label,
  value,
  subtext,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'purple';
}) {
  const colorClasses = {
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/20 text-red-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="p-4 rounded-xl bg-white/5">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-white/50 text-sm">{label}</div>
      <div className={`text-xs mt-1 ${colorClasses[color].split(' ')[1]}`}>{subtext}</div>
    </div>
  );
}
