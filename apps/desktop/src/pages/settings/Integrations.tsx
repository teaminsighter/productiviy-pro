import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Link2,
  Link2Off,
  RefreshCw,
  Github,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  GitCommit,
  GitPullRequest,
  Code2,
  BarChart3,
  TrendingUp,
  Lightbulb,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getIntegrations,
  getAvailableIntegrations,
  disconnectIntegration,
  toggleIntegrationSync,
  startGitHubConnect,
  startSlackConnect,
  syncGitHub,
  getGitHubActivity,
  getDeveloperMetrics,
  type Integration,
  type AvailableIntegration,
  type IntegrationType,
} from '@/lib/api/integrations';

// ============================================================================
// Icon mapping
// ============================================================================

const integrationIcons: Record<string, React.ReactNode> = {
  github: <Github className="w-6 h-6" />,
  gitlab: <Code2 className="w-6 h-6" />,
  slack: <MessageSquare className="w-6 h-6" />,
  linear: <BarChart3 className="w-6 h-6" />,
  notion: <Code2 className="w-6 h-6" />,
};

const statusColors: Record<string, string> = {
  active: 'text-green-400',
  inactive: 'text-gray-400',
  error: 'text-red-400',
  pending: 'text-yellow-400',
};

// ============================================================================
// Integration Info Data (Short & Clean)
// ============================================================================

interface IntegrationInfo {
  benefit: string;
  howItWorks: string;
}

const integrationInfoData: Record<string, IntegrationInfo> = {
  github: {
    benefit: 'Track commits, PRs & code reviews as productive work time',
    howItWorks: 'Syncs your GitHub activity automatically to measure coding productivity',
  },
  gitlab: {
    benefit: 'Track merge requests & commits alongside other metrics',
    howItWorks: 'Connects via OAuth to sync your GitLab coding activity',
  },
  slack: {
    benefit: 'Auto-update your status when in deep work mode',
    howItWorks: 'Sets "Focusing" status automatically so teammates know not to disturb',
  },
  linear: {
    benefit: 'Track time spent on issues & sprints automatically',
    howItWorks: 'Detects which tasks you\'re working on and logs time to them',
  },
  jira: {
    benefit: 'Log work hours to Jira tickets automatically',
    howItWorks: 'Tracks active tickets and syncs time spent to your Jira board',
  },
  notion: {
    benefit: 'Count documentation & planning as productive work',
    howItWorks: 'Tracks time in Notion pages as knowledge work activity',
  },
  vscode: {
    benefit: 'Track coding sessions with language & project insights',
    howItWorks: 'Monitors active coding time and tracks languages used',
  },
};

// ============================================================================
// Main Component
// ============================================================================

export default function Integrations() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [_selectedType, _setSelectedType] = useState<IntegrationType | null>(null);

  // Show toast for OAuth callbacks
  useEffect(() => {
    const github = searchParams.get('github');
    const slack = searchParams.get('slack');
    const message = searchParams.get('message');

    if (github === 'connected') {
      toast.success('GitHub connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    } else if (github === 'error') {
      toast.error(`GitHub connection failed: ${message || 'Unknown error'}`);
    }

    if (slack === 'connected') {
      toast.success('Slack connected successfully!');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    } else if (slack === 'error') {
      toast.error(`Slack connection failed: ${message || 'Unknown error'}`);
    }
  }, [searchParams, queryClient]);

  // Queries
  const { data: integrations = [], isLoading: loadingIntegrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: getIntegrations,
  });

  const { data: available = [], isLoading: loadingAvailable } = useQuery({
    queryKey: ['available-integrations'],
    queryFn: getAvailableIntegrations,
  });

  const { data: githubActivity } = useQuery({
    queryKey: ['github-activity'],
    queryFn: () => getGitHubActivity(7),
    enabled: integrations.some((i) => i.type === 'github' && i.status === 'active'),
  });

  const { data: _devMetrics } = useQuery({
    queryKey: ['developer-metrics'],
    queryFn: () => getDeveloperMetrics(7),
    enabled: integrations.some((i) => i.type === 'github' && i.status === 'active'),
  });

  // Mutations
  const connectGitHubMutation = useMutation({
    mutationFn: startGitHubConnect,
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connectSlackMutation = useMutation({
    mutationFn: startSlackConnect,
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectIntegration,
    onSuccess: () => {
      toast.success('Integration disconnected');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncGitHubMutation = useMutation({
    mutationFn: () => syncGitHub(7),
    onSuccess: (stats) => {
      toast.success(`Synced ${stats.commits} commits, ${stats.prs} PRs`);
      queryClient.invalidateQueries({ queryKey: ['github-activity'] });
      queryClient.invalidateQueries({ queryKey: ['developer-metrics'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleSyncMutation = useMutation({
    mutationFn: ({ type, enabled }: { type: IntegrationType; enabled: boolean }) =>
      toggleIntegrationSync(type, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  // Helpers
  const getConnectedIntegration = (type: string): Integration | undefined =>
    integrations.find((i) => i.type === type);

  const handleConnect = (type: string) => {
    if (type === 'github') {
      connectGitHubMutation.mutate();
    } else if (type === 'slack') {
      connectSlackMutation.mutate();
    } else {
      toast.info('This integration is coming soon!');
    }
  };

  const isLoading = loadingIntegrations || loadingAvailable;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-purple-400" />
          </div>
          Integrations
        </h1>
        <p className="text-white/50 mt-1">
          Connect your favorite tools to enhance productivity tracking
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : (
        <>
          {/* Connected Integrations */}
          {integrations.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Connected</h2>
              <div className="grid gap-4">
                {integrations.map((integration) => (
                  <ConnectedIntegrationCard
                    key={integration.id}
                    integration={integration}
                    onDisconnect={() => disconnectMutation.mutate(integration.type)}
                    onToggleSync={(enabled) =>
                      toggleSyncMutation.mutate({ type: integration.type, enabled })
                    }
                    onSync={
                      integration.type === 'github'
                        ? () => syncGitHubMutation.mutate()
                        : undefined
                    }
                    isSyncing={syncGitHubMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* GitHub Activity (if connected) */}
          {githubActivity && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">GitHub Activity (Last 7 Days)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<GitCommit className="w-5 h-5 text-green-400" />}
                  label="Commits"
                  value={githubActivity.commits}
                />
                <StatCard
                  icon={<GitPullRequest className="w-5 h-5 text-purple-400" />}
                  label="Pull Requests"
                  value={githubActivity.pullRequests}
                />
                <StatCard
                  icon={<Code2 className="w-5 h-5 text-blue-400" />}
                  label="Code Reviews"
                  value={githubActivity.reviews}
                />
                <StatCard
                  icon={<TrendingUp className="w-5 h-5 text-orange-400" />}
                  label="Total Activities"
                  value={githubActivity.totalActivities}
                />
              </div>

              {githubActivity.topRepos.length > 0 && (
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <h3 className="text-sm font-medium text-white/70 mb-3">Top Repositories</h3>
                  <div className="space-y-2">
                    {githubActivity.topRepos.map((repo) => (
                      <div
                        key={repo.name}
                        className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                      >
                        <span className="text-white">{repo.name}</span>
                        <span className="text-white/50">{repo.count} activities</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Available Integrations */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Available Integrations</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {available.map((integration) => {
                const connected = getConnectedIntegration(integration.type);
                if (connected) return null; // Already shown in connected section

                return (
                  <AvailableIntegrationCard
                    key={integration.type}
                    integration={integration}
                    onConnect={() => handleConnect(integration.type)}
                    isConnecting={
                      (integration.type === 'github' && connectGitHubMutation.isPending) ||
                      (integration.type === 'slack' && connectSlackMutation.isPending)
                    }
                  />
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ConnectedIntegrationCard({
  integration,
  onDisconnect,
  onToggleSync,
  onSync,
  isSyncing,
}: {
  integration: Integration;
  onDisconnect: () => void;
  onToggleSync: (enabled: boolean) => void;
  onSync?: () => void;
  isSyncing?: boolean;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const icon = integrationIcons[integration.type] || <Link2 className="w-6 h-6" />;
  const statusColor = statusColors[integration.status] || 'text-gray-400';
  const info = integrationInfoData[integration.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-white/5 border border-white/10 p-5"
    >
      {/* Info Bulb Button - Top Right Corner */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-400/20 hover:from-yellow-400/40 hover:to-orange-400/40 transition-all group"
        title="Learn more"
      >
        <Lightbulb className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* Info Tooltip */}
      <AnimatePresence>
        {showInfo && (
          <InfoTooltip
            info={info}
            isVisible={showInfo}
            onClose={() => setShowInfo(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between pr-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-white capitalize">{integration.type}</h3>
            <p className="text-sm text-white/50">
              {integration.externalUsername || integration.workspaceName || 'Connected'}
            </p>
            <div className={`flex items-center gap-1 text-xs mt-1 ${statusColor}`}>
              {integration.status === 'active' ? (
                <CheckCircle className="w-3 h-3" />
              ) : integration.status === 'error' ? (
                <XCircle className="w-3 h-3" />
              ) : (
                <AlertTriangle className="w-3 h-3" />
              )}
              <span className="capitalize">{integration.status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Sync now"
            >
              <RefreshCw className={`w-4 h-4 text-white/60 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={onDisconnect}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
            title="Disconnect"
          >
            <Link2Off className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sync toggle */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Clock className="w-4 h-4" />
          {integration.lastSyncAt
            ? `Last synced ${new Date(integration.lastSyncAt).toLocaleString()}`
            : 'Not synced yet'}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-white/60">Auto-sync</span>
          <input
            type="checkbox"
            checked={integration.syncEnabled}
            onChange={(e) => onToggleSync(e.target.checked)}
            className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500"
          />
        </label>
      </div>
    </motion.div>
  );
}

function AvailableIntegrationCard({
  integration,
  onConnect,
  isConnecting,
}: {
  integration: AvailableIntegration;
  onConnect: () => void;
  isConnecting?: boolean;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const icon = integrationIcons[integration.type] || <Link2 className="w-6 h-6" />;
  const info = integrationInfoData[integration.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col"
    >
      {/* Info Bulb Button - Top Right Corner */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="absolute top-3 right-3 p-1.5 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-400/20 hover:from-yellow-400/40 hover:to-orange-400/40 transition-all group"
        title="Learn more"
      >
        <Lightbulb className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* Info Tooltip */}
      <AnimatePresence>
        {showInfo && (
          <InfoTooltip
            info={info}
            isVisible={showInfo}
            onClose={() => setShowInfo(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-4 mb-4 pr-8">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-white">{integration.name}</h3>
          {integration.comingSoon && (
            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
              Coming Soon
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-white/60 mb-4 flex-1">{integration.description}</p>

      <div className="space-y-2 mb-4">
        {integration.features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-white/50">
            <CheckCircle className="w-3 h-3 text-green-400" />
            {feature}
          </div>
        ))}
      </div>

      <button
        onClick={onConnect}
        disabled={isConnecting || integration.comingSoon}
        className={`w-full py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
          integration.comingSoon
            ? 'bg-white/5 text-white/30 cursor-not-allowed'
            : 'bg-indigo-500 text-white hover:bg-indigo-600'
        }`}
      >
        {isConnecting ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <ExternalLink className="w-4 h-4" />
        )}
        {integration.comingSoon ? 'Coming Soon' : 'Connect'}
      </button>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

// ============================================================================
// Info Tooltip Component (Clean & Simple)
// ============================================================================

function InfoTooltip({
  info,
  isVisible,
  onClose,
}: {
  info: IntegrationInfo | null;
  isVisible: boolean;
  onClose: () => void;
}) {
  if (!info || !isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute top-10 right-0 z-50 w-64"
      onMouseLeave={onClose}
    >
      <div className="bg-slate-800 rounded-xl border border-white/10 shadow-xl p-4">
        {/* Arrow */}
        <div className="absolute -top-2 right-4 w-4 h-4 bg-slate-800 border-l border-t border-white/10 rotate-45" />

        {/* Benefit */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-green-400 mb-1">
            <Sparkles className="w-3 h-3" />
            Benefit
          </div>
          <p className="text-sm text-white/90">{info.benefit}</p>
        </div>

        {/* How it works */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400 mb-1">
            <Zap className="w-3 h-3" />
            How it works
          </div>
          <p className="text-sm text-white/70">{info.howItWorks}</p>
        </div>
      </div>
    </motion.div>
  );
}
