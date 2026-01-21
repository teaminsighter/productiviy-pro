/**
 * Team Settings Page - Manage team settings and permissions
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Settings, Shield, Users, Trash2,
  Eye, EyeOff, Clock, Globe, Activity, Download,
  Plus, X, Loader2, AlertCircle, Check
} from 'lucide-react';
import { useTeamStore } from '@/stores/teamStore';
import { GlassCard } from '@/components/common/GlassCard';

type SettingsTab = 'general' | 'members' | 'permissions';

export default function TeamSettings() {
  const navigate = useNavigate();
  const {
    currentTeam, members, permissions, myPermissions, error,
    updateTeam, deleteTeam, fetchPermissions, grantPermission, revokePermission,
    clearError
  } = useTeamStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [teamName, setTeamName] = useState(currentTeam?.name || '');
  const [teamDescription, setTeamDescription] = useState(currentTeam?.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGrantModal, setShowGrantModal] = useState(false);

  // Permission grant form
  const [granteeId, setGranteeId] = useState<number | null>(null);
  const [targetUserId, setTargetUserId] = useState<number | 'all'>('all');
  const [permissionSettings, setPermissionSettings] = useState({
    can_view_activity: true,
    can_view_screenshots: false,
    can_view_urls: true,
    can_view_analytics: true,
    can_export_data: false,
  });

  const isOwner = myPermissions?.is_owner || false;
  const isAdmin = myPermissions?.role === 'admin' || isOwner;

  useEffect(() => {
    if (currentTeam && isOwner) {
      fetchPermissions(currentTeam.id);
    }
  }, [currentTeam, isOwner]);

  useEffect(() => {
    if (currentTeam) {
      setTeamName(currentTeam.name);
      setTeamDescription(currentTeam.description || '');
    }
  }, [currentTeam]);

  // Redirect if not admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-400 mb-6">Only admins can access team settings.</p>
        <button
          onClick={() => navigate('/team')}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team
        </button>
      </div>
    );
  }

  const handleSaveGeneral = async () => {
    if (!currentTeam) return;
    setIsLoading(true);
    try {
      await updateTeam(currentTeam.id, { name: teamName, description: teamDescription });
    } catch (err) {
      // Error handled by store
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!currentTeam) return;
    setIsLoading(true);
    try {
      await deleteTeam(currentTeam.id);
      navigate('/team');
    } catch (err) {
      // Error handled by store
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleGrantPermission = async () => {
    if (!currentTeam || !granteeId) return;
    setIsLoading(true);
    try {
      await grantPermission(currentTeam.id, {
        grantee_id: granteeId,
        target_user_id: targetUserId === 'all' ? null : targetUserId,
        ...permissionSettings,
      });
      setShowGrantModal(false);
      resetGrantForm();
    } catch (err) {
      // Error handled by store
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokePermission = async (permissionId: number) => {
    if (!currentTeam) return;
    if (!confirm('Are you sure you want to revoke this permission?')) return;
    try {
      await revokePermission(currentTeam.id, permissionId);
    } catch (err) {
      // Error handled by store
    }
  };

  const resetGrantForm = () => {
    setGranteeId(null);
    setTargetUserId('all');
    setPermissionSettings({
      can_view_activity: true,
      can_view_screenshots: false,
      can_view_urls: true,
      can_view_analytics: true,
      can_export_data: false,
    });
  };

  // Get admins who can receive permissions
  const admins = members.filter(m => m.role === 'admin');
  // Get members who can be targets
  const regularMembers = members.filter(m => m.role === 'member');

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'members' as const, label: 'Members', icon: Users },
    { id: 'permissions' as const, label: 'Permissions', icon: Shield, ownerOnly: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/team')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Team Settings</h1>
          <p className="text-gray-400">{currentTeam?.name}</p>
        </div>
      </div>

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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {tabs.map((tab) => {
          if (tab.ownerOnly && !isOwner) return null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Team Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <button
                onClick={handleSaveGeneral}
                disabled={isLoading}
                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </GlassCard>

          {isOwner && (
            <GlassCard className="p-6 border-red-500/20">
              <h3 className="text-lg font-semibold mb-2 text-red-400">Danger Zone</h3>
              <p className="text-gray-400 text-sm mb-4">
                Deleting the team will permanently remove all members and data.
              </p>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteTeam}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Team
                </button>
              )}
            </GlassCard>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <GlassCard>
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold">Team Members ({members.length})</h3>
          </div>
          <div className="divide-y divide-gray-700/50">
            {members.map((member) => (
              <div key={member.user_id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-sm">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-400">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    member.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                    member.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {member.role}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    {member.share_activity ? (
                      <Eye className="w-4 h-4 text-green-400" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Permissions Tab (Owner Only) */}
      {activeTab === 'permissions' && isOwner && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Permission Grants</h3>
                <p className="text-sm text-gray-400">
                  Control which admins can view member data
                </p>
              </div>
              <button
                onClick={() => setShowGrantModal(true)}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Grant Permission
              </button>
            </div>

            {/* Permissions List */}
            <div className="space-y-3">
              {permissions.length > 0 ? (
                permissions.map((permission) => {
                  const grantee = members.find(m => m.user_id === permission.grantee_id);
                  const target = permission.target_user_id
                    ? members.find(m => m.user_id === permission.target_user_id)
                    : null;

                  return (
                    <div
                      key={permission.id}
                      className="p-4 bg-gray-800/50 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                          <Shield className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {grantee?.name || 'Unknown'} can view {target?.name || 'all members'}
                          </p>
                          <div className="flex gap-2 mt-1">
                            {permission.can_view_activity && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                                Activity
                              </span>
                            )}
                            {permission.can_view_screenshots && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                                Screenshots
                              </span>
                            )}
                            {permission.can_view_urls && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                URLs
                              </span>
                            )}
                            {permission.can_view_analytics && (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                Analytics
                              </span>
                            )}
                            {permission.can_export_data && (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                                Export
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokePermission(permission.id)}
                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No permission grants yet</p>
                  <p className="text-sm">Admins can only see their own data by default</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Permission Info */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Permission Hierarchy</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="font-medium text-yellow-400">Owner</p>
                  <p className="text-gray-400">
                    Full access to all member data and can grant permissions to admins
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-indigo-400">Admin</p>
                  <p className="text-gray-400">
                    Can only view data for members they have been granted access to
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-500/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-400">Member</p>
                  <p className="text-gray-400">
                    Can only see their own data and choose what to share with the team
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Grant Permission Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Grant Permission</h3>
              <button onClick={() => setShowGrantModal(false)} className="p-1 hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Select Admin */}
              <div>
                <label className="block text-sm font-medium mb-2">Grant to Admin</label>
                <select
                  value={granteeId || ''}
                  onChange={(e) => setGranteeId(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select an admin...</option>
                  {admins.map((admin) => (
                    <option key={admin.user_id} value={admin.user_id}>
                      {admin.name} ({admin.email})
                    </option>
                  ))}
                </select>
                {admins.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">No admins to grant permissions to</p>
                )}
              </div>

              {/* Select Target */}
              <div>
                <label className="block text-sm font-medium mb-2">For Member</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Members</option>
                  {regularMembers.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Permission Toggles */}
              <div>
                <label className="block text-sm font-medium mb-2">Permissions</label>
                <div className="space-y-2">
                  {[
                    { key: 'can_view_activity', label: 'View Activity', icon: Activity },
                    { key: 'can_view_screenshots', label: 'View Screenshots', icon: Eye },
                    { key: 'can_view_urls', label: 'View URLs', icon: Globe },
                    { key: 'can_view_analytics', label: 'View Analytics', icon: Clock },
                    { key: 'can_export_data', label: 'Export Data', icon: Download },
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-700/50"
                    >
                      <input
                        type="checkbox"
                        checked={permissionSettings[perm.key as keyof typeof permissionSettings]}
                        onChange={(e) => setPermissionSettings({
                          ...permissionSettings,
                          [perm.key]: e.target.checked,
                        })}
                        className="w-4 h-4 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-800"
                      />
                      <perm.icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGrantModal(false)}
                className="px-4 py-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantPermission}
                disabled={!granteeId || isLoading}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Grant Permission
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
