import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, UserPlus, Settings, Shield,
  MoreVertical, Mail, Trash2, Eye, EyeOff, Clock,
  TrendingUp, Activity, Plus, X, Loader2, AlertCircle,
  Monitor, CheckCircle2, Copy, Brain, Github, GitCommit,
  GitPullRequest, Code2
} from 'lucide-react';
import { toast } from 'sonner';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { GlassCard } from '@/components/common/GlassCard';
import { getTeamGitHubActivity } from '@/lib/api/integrations';

// Format duration in hours and minutes
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function Team() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    teams, currentTeam, members, invites, dashboard, myPermissions, isLoading, error,
    fetchTeams, setCurrentTeam, fetchInvites, fetchDashboard, fetchMyPermissions,
    createTeam, inviteMember, removeMember, updateMemberSettings,
    cancelInvite, clearError
  } = useTeamStore();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (teams.length > 0 && !currentTeam) {
      setCurrentTeam(teams[0]);
    }
  }, [teams]);

  useEffect(() => {
    if (currentTeam) {
      fetchInvites(currentTeam.id);
      fetchDashboard(currentTeam.id);
      fetchMyPermissions(currentTeam.id);
    }
  }, [currentTeam]);

  // Refresh dashboard every 30 seconds
  useEffect(() => {
    if (!currentTeam) return;
    const interval = setInterval(() => {
      fetchDashboard(currentTeam.id);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentTeam]);

  // Fetch team GitHub activity
  const { data: teamGitHub } = useQuery({
    queryKey: ['team-github-activity', currentTeam?.id],
    queryFn: () => getTeamGitHubActivity(currentTeam!.id, 7),
    enabled: !!currentTeam,
    refetchInterval: 60000, // Refresh every minute
  });

  const isOwner = myPermissions?.is_owner || false;
  const isAdmin = isOwner || myPermissions?.role === 'admin' || (
    currentTeam && members.some(
      m => m.user_id === user?.id && ['owner', 'admin'].includes(m.role)
    )
  );

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setActionLoading('create');
    try {
      const team = await createTeam(newTeamName, newTeamDescription || undefined);
      setShowCreateModal(false);
      setNewTeamName('');
      setNewTeamDescription('');
      setCurrentTeam(team);
    } catch (err) {
      // Error handled by store
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvite = async () => {
    if (!currentTeam || !inviteEmail) return;
    setActionLoading('invite');
    try {
      const result = await inviteMember(currentTeam.id, inviteEmail, inviteRole);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');

      // Show success toast with copy link option
      toast.success(
        <div className="flex flex-col gap-2">
          <span>Invitation sent to {inviteEmail}</span>
          {result?.invite_url && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.invite_url);
                toast.success('Invite link copied to clipboard!');
              }}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
            >
              <Copy className="w-3 h-3" />
              Copy invite link
            </button>
          )}
        </div>,
        { duration: 5000 }
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (userId: number, memberName: string) => {
    if (!currentTeam) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) return;
    setActionLoading(`remove-${userId}`);
    try {
      await removeMember(currentTeam.id, userId);
      toast.success(`${memberName} has been removed from the team`, {
        icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove member');
    } finally {
      setActionLoading(null);
      setOpenDropdown(null);
    }
  };

  const handlePromoteToAdmin = async (userId: number, memberName: string) => {
    if (!currentTeam) return;
    setActionLoading(`promote-${userId}`);
    try {
      await updateMemberSettings(currentTeam.id, userId, { role: 'admin' });
      toast.success(`${memberName} is now an admin`, {
        icon: <Shield className="w-5 h-5 text-indigo-400" />,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to promote member');
    } finally {
      setActionLoading(null);
      setOpenDropdown(null);
    }
  };

  const handleCancelInvite = async (inviteId: number, email: string) => {
    if (!currentTeam) return;
    setActionLoading(`cancel-${inviteId}`);
    try {
      await cancelInvite(currentTeam.id, inviteId);
      toast.success(`Invitation to ${email} cancelled`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel invite');
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      owner: 'bg-yellow-500/20 text-yellow-400',
      admin: 'bg-indigo-500/20 text-indigo-400',
      member: 'bg-gray-500/20 text-gray-400',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] || styles.member}`}>
        {role}
      </span>
    );
  };

  // No team state
  if (!isLoading && teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Team Yet</h2>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Create a team to collaborate with your colleagues and track productivity together.
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-medium flex items-center gap-2 hover:from-indigo-600 hover:to-purple-600 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Team
        </button>

        {/* Create Team Modal */}
        <CreateTeamModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTeam}
          name={newTeamName}
          setName={setNewTeamName}
          description={newTeamDescription}
          setDescription={setNewTeamDescription}
          isLoading={actionLoading === 'create'}
        />
      </div>
    );
  }

  // Loading state
  if (isLoading && teams.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
            <button onClick={clearError} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{currentTeam?.name}</h1>
          <p className="text-gray-400">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/team/deepwork')}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-lg font-medium flex items-center gap-2 transition-all"
            >
              <Brain className="w-4 h-4" />
              Deep Work Dashboard
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
            <button
              onClick={() => navigate('/team/settings')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Team Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(dashboard as any)?.stats?.total_members || members.length || 0}</p>
              <p className="text-xs text-gray-400">Members</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(dashboard as any)?.stats?.active_today || 0}</p>
              <p className="text-xs text-gray-400">Active Now</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatDuration(((dashboard as any)?.stats?.total_hours_today || 0) * 3600)}
              </p>
              <p className="text-xs text-gray-400">Productive Today</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {(dashboard as any)?.stats?.avg_productivity ? `${Math.round((dashboard as any).stats.avg_productivity)}%` : '--'}
              </p>
              <p className="text-xs text-gray-400">Avg Productivity</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Team GitHub Activity */}
      {teamGitHub && (teamGitHub.totalCommits > 0 || teamGitHub.totalPrs > 0) && (
        <GlassCard>
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                <Github className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Team Code Activity</h3>
                <p className="text-xs text-gray-400">Last 7 days</p>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-green-400" />
                <span className="font-bold">{teamGitHub.totalCommits}</span>
                <span className="text-gray-400">commits</span>
              </div>
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-purple-400" />
                <span className="font-bold">{teamGitHub.totalPrs}</span>
                <span className="text-gray-400">PRs</span>
              </div>
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-400" />
                <span className="font-bold">{teamGitHub.totalReviews}</span>
                <span className="text-gray-400">reviews</span>
              </div>
            </div>
          </div>

          {/* Member contributions */}
          <div className="divide-y divide-gray-700/50">
            {teamGitHub.members.filter(m => m.commits > 0 || m.pullRequests > 0).map((member, index) => (
              <div
                key={member.userId}
                className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    {index === 0 && (teamGitHub.members[0].commits > 0 || teamGitHub.members[0].pullRequests > 0) && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                        Top Contributor
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-green-400">{member.commits}</p>
                    <p className="text-xs text-gray-500">commits</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-purple-400">{member.pullRequests}</p>
                    <p className="text-xs text-gray-500">PRs</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-blue-400">{member.reviews}</p>
                    <p className="text-xs text-gray-500">reviews</p>
                  </div>
                  <div className="text-center min-w-[60px]">
                    <p className="font-bold text-gray-300">
                      {member.linesChanged > 1000
                        ? `${(member.linesChanged / 1000).toFixed(1)}k`
                        : member.linesChanged}
                    </p>
                    <p className="text-xs text-gray-500">lines</p>
                  </div>
                </div>
              </div>
            ))}

            {teamGitHub.members.filter(m => m.commits === 0 && m.pullRequests === 0).length > 0 && (
              <div className="p-3 text-center text-xs text-gray-500">
                {teamGitHub.members.filter(m => m.commits === 0 && m.pullRequests === 0).length} member(s) haven't connected GitHub yet
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Members List */}
      <GlassCard>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold">Team Members</h3>
          {invites.length > 0 && (
            <span className="text-xs text-gray-400">
              {invites.length} pending invite{invites.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="divide-y divide-gray-700/50">
          {((dashboard as any)?.members || members).map((member: any) => {
            // Get dashboard data for this member if available
            const dashboardMember = (dashboard as any)?.members?.find((m: any) => m.user_id === member.user_id);
            const status = dashboardMember?.status || 'offline';
            const currentApp = dashboardMember?.current_app;
            const todayTime = dashboardMember?.today_time || 0;
            const productivity = dashboardMember?.productivity || 0;

            const statusColors: Record<string, string> = {
              active: 'bg-green-500',
              idle: 'bg-yellow-500',
              offline: 'bg-gray-500',
            };

            return (
              <motion.div
                key={member.user_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors cursor-pointer"
                onClick={() => {
                  if (myPermissions?.can_view_activity || member.user_id === user?.id) {
                    navigate(`/team/member/${member.user_id}`);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-sm">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        member.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {/* Status indicator */}
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1a1a1f] ${statusColors[status]}`}
                      title={status.charAt(0).toUpperCase() + status.slice(1)}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      {getRoleBadge(member.role)}
                      {member.user_id === user?.id && (
                        <span className="text-xs text-gray-500">(you)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {currentApp && status === 'active' ? (
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          {currentApp}
                        </span>
                      ) : (
                        <span>{member.email}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Activity stats - only show if sharing */}
                  {member.share_activity && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="text-gray-400">Today</p>
                        <p className="font-medium">{formatDuration(todayTime)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400">Productivity</p>
                        <p className={`font-medium ${
                          productivity >= 70 ? 'text-green-400' :
                          productivity >= 40 ? 'text-yellow-400' : 'text-gray-400'
                        }`}>
                          {productivity > 0 ? `${Math.round(productivity)}%` : '--'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Privacy indicators */}
                  <div className="flex gap-2" title={member.share_activity ? 'Sharing activity' : 'Activity hidden'}>
                    {member.share_activity ? (
                      <Eye className="w-4 h-4 text-green-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    )}
                  </div>

                  {/* Actions */}
                  {isAdmin && member.user_id !== user?.id && member.role !== 'owner' && (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === member.user_id ? null : member.user_id)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {openDropdown === member.user_id && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute right-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-10"
                          >
                            {member.role === 'member' && isOwner && (
                              <button
                                onClick={() => handlePromoteToAdmin(member.user_id, member.name)}
                                disabled={actionLoading === `promote-${member.user_id}`}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                              >
                                {actionLoading === `promote-${member.user_id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Shield className="w-4 h-4" />
                                )}
                                Make Admin
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member.user_id, member.name)}
                              disabled={actionLoading === `remove-${member.user_id}`}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 text-red-400 flex items-center gap-2 disabled:opacity-50"
                            >
                              {actionLoading === `remove-${member.user_id}` ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                              Remove
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Pending Invites */}
          {invites.length > 0 && isAdmin && (
            <>
              <div className="p-3 bg-gray-800/50">
                <span className="text-xs font-medium text-gray-400 uppercase">Pending Invitations</span>
              </div>
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="p-4 flex items-center justify-between bg-yellow-500/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-gray-400">
                        Invited as {invite.role} · Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelInvite(invite.id, invite.email)}
                    disabled={actionLoading === `cancel-${invite.id}`}
                    className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Cancel invitation"
                  >
                    {actionLoading === `cancel-${invite.id}` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </GlassCard>

      {/* Invite Modal */}
      <InviteModal
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        email={inviteEmail}
        setEmail={setInviteEmail}
        role={inviteRole}
        setRole={setInviteRole}
        isLoading={actionLoading === 'invite'}
      />

      {/* Create Team Modal */}
      <CreateTeamModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateTeam}
        name={newTeamName}
        setName={setNewTeamName}
        description={newTeamDescription}
        setDescription={setNewTeamDescription}
        isLoading={actionLoading === 'create'}
      />
    </div>
  );
}

// Invite Modal Component
function InviteModal({
  show, onClose, onInvite, email, setEmail, role, setRole, isLoading
}: {
  show: boolean;
  onClose: () => void;
  onInvite: () => void;
  email: string;
  setEmail: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  isLoading: boolean;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Invite Team Member</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onInvite}
            disabled={!email || isLoading}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Send Invite
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Create Team Modal Component
function CreateTeamModal({
  show, onClose, onCreate, name, setName, description, setDescription, isLoading
}: {
  show: boolean;
  onClose: () => void;
  onCreate: () => void;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  isLoading: boolean;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Create Team</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Team Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your team..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={!name.trim() || isLoading}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Team
          </button>
        </div>
      </motion.div>
    </div>
  );
}
