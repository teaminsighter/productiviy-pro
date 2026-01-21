import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersRound,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Crown,
  Calendar,
  Users,
} from 'lucide-react';
import { getAdminTeams, getAdminTeamDetail, type AdminTeam } from '@/lib/api/admin';

export default function AdminTeams() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState<AdminTeam | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data = { items: [], pages: 0, total: 0, page: 1, limit: 15 }, isLoading } = useQuery({
    queryKey: ['admin-teams', search, page],
    queryFn: () =>
      getAdminTeams({
        search: search || undefined,
        page,
        limit: 15,
      }),
    placeholderData: keepPreviousData,
  });

  const openTeamDetail = (team: AdminTeam) => {
    setSelectedTeam(team);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <UsersRound className="w-6 h-6 text-purple-400" />
          Team Management
        </h1>
        <p className="text-white/60">Manage all teams in the system</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Teams Table */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">Team</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">Owner</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">Members</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">Plan</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-white/60">Created</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-white/60">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                  Loading teams...
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                  No teams found
                </td>
              </tr>
            ) : (
              data?.items.map((team) => (
                <motion.tr
                  key={team.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <UsersRound className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{team.name}</p>
                        <p className="text-sm text-white/50">ID: {team.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/70">{team.ownerEmail}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-white/40" />
                      <span className="text-white">{team.memberCount}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {team.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white/70 text-sm">
                      {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => openTeamDetail(team)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
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
            Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, data.total)} of {data.total} teams
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

      {/* Team Detail Modal */}
      <TeamDetailModal
        team={selectedTeam}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTeam(null);
        }}
      />
    </div>
  );
}

// ============================================================================
// Team Detail Modal
// ============================================================================

function TeamDetailModal({
  team,
  isOpen,
  onClose,
}: {
  team: AdminTeam | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin-team-detail', team?.id],
    queryFn: () => getAdminTeamDetail(team!.id),
    enabled: !!team && isOpen,
  });

  if (!isOpen || !team) return null;

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
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <UsersRound className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{team.name}</h2>
                <p className="text-sm text-white/50">{team.memberCount} members</p>
              </div>
            </div>
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
                {/* Owner */}
                <div className="p-4 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-white/60">Team Owner</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                      {detail.owner.name?.[0] || detail.owner.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{detail.owner.name || 'No Name'}</p>
                      <p className="text-sm text-white/50">{detail.owner.email}</p>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-white/40" />
                      <span className="text-xs text-white/40">Created</span>
                    </div>
                    <p className="text-white font-medium">
                      {detail.createdAt ? new Date(detail.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-white/40" />
                      <span className="text-xs text-white/40">Members</span>
                    </div>
                    <p className="text-white font-medium">{detail.memberCount}</p>
                  </div>
                </div>

                {/* Members */}
                <div>
                  <h4 className="text-sm font-medium text-white/60 mb-3">Team Members</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {detail.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                      >
                        <div className="flex items-center gap-3">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                              {member.name?.[0] || member.email[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">{member.name || 'No Name'}</p>
                            <p className="text-xs text-white/50">{member.email}</p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            member.role === 'owner'
                              ? 'bg-amber-500/20 text-amber-400'
                              : member.role === 'admin'
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
