import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  Trash2,
  Eye,
  Mail,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Crown,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAdminUsers, getAdminUserDetail, updateAdminUser, deleteAdminUser, type AdminUser } from '@/lib/api/admin';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data = { items: [], pages: 0, total: 0, page: 1, limit: 15 }, isLoading } = useQuery({
    queryKey: ['admin-users', search, planFilter, statusFilter, page],
    queryFn: () =>
      getAdminUsers({
        search: search || undefined,
        plan: planFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 15,
      }),
    placeholderData: keepPreviousData,
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: { isActive?: boolean; isAdmin?: boolean; plan?: string } }) =>
      updateAdminUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User deleted successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleToggleActive = (user: AdminUser) => {
    updateMutation.mutate({
      userId: user.id,
      data: { isActive: !user.isActive },
    });
  };

  const handleToggleAdmin = (user: AdminUser) => {
    updateMutation.mutate({
      userId: user.id,
      data: { isAdmin: !user.isAdmin },
    });
  };

  const handleDelete = (user: AdminUser) => {
    if (confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const openUserDetail = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'team':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'enterprise':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'personal':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-400" />
          User Management
        </h1>
        <p className="text-white/60">Manage all users in the system</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Plan Filter */}
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="personal">Personal</option>
          <option value="pro">Pro</option>
          <option value="team">Team</option>
          <option value="enterprise">Enterprise</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">User</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">Plan</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">Teams</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">Joined</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">Last Active</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-white/60">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                  Loading users...
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                  No users found
                </td>
              </tr>
            ) : (
              data?.items.map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                          {user.name?.[0] || user.email[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{user.name || 'No Name'}</p>
                          {user.isAdmin && (
                            <span title="Admin">
                              <Crown className="w-4 h-4 text-amber-400" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/50">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getPlanBadgeColor(
                        user.plan
                      )}`}
                    >
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                        <Ban className="w-4 h-4" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/70">{user.teamCount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/70 text-sm">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/70 text-sm">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openUserDetail(user)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                          user.isActive ? 'text-green-400 hover:text-red-400' : 'text-red-400 hover:text-green-400'
                        }`}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleToggleAdmin(user)}
                        className={`p-2 rounded-lg hover:bg-white/10 transition-colors ${
                          user.isAdmin ? 'text-amber-400' : 'text-white/60'
                        }`}
                        title={user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      >
                        {user.isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/50">
            Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, data.total)} of {data.total} users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 py-2 text-white">
              Page {page} of {data.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page === data.pages}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
}

// ============================================================================
// User Detail Modal
// ============================================================================

function UserDetailModal({
  user,
  isOpen,
  onClose,
}: {
  user: AdminUser | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin-user-detail', user?.id],
    queryFn: () => getAdminUserDetail(user!.id),
    enabled: !!user && isOpen,
  });

  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-2xl bg-gray-900 border border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">User Details</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-white/40">Loading...</div>
              </div>
            ) : detail ? (
              <div className="space-y-6">
                {/* Profile */}
                <div className="flex items-center gap-4">
                  {detail.avatarUrl ? (
                    <img src={detail.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-white text-2xl font-medium">
                      {detail.name?.[0] || detail.email[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      {detail.name || 'No Name'}
                      {detail.isAdmin && <Crown className="w-5 h-5 text-amber-400" />}
                    </h3>
                    <p className="text-white/60">{detail.email}</p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem icon={Mail} label="Email" value={detail.email} />
                  <InfoItem
                    icon={Shield}
                    label="Auth Provider"
                    value={detail.authProvider}
                  />
                  <InfoItem
                    icon={Calendar}
                    label="Joined"
                    value={detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : 'N/A'}
                  />
                  <InfoItem
                    icon={Clock}
                    label="Last Login"
                    value={detail.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleDateString() : 'Never'}
                  />
                  <InfoItem icon={Activity} label="Total Activities" value={detail.totalActivities.toString()} />
                  <InfoItem
                    icon={Activity}
                    label="Subscription"
                    value={detail.subscriptionStatus || 'None'}
                  />
                </div>

                {/* Teams */}
                {detail.teams.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white/60 mb-2">Teams</h4>
                    <div className="space-y-2">
                      {detail.teams.map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                        >
                          <span className="text-white">{team.name}</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-400">
                            {team.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-white/5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-white/40" />
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}
