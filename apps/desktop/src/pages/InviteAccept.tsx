/**
 * Invite Accept Page - Public page for accepting team invitations
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, CheckCircle2, XCircle, Loader2,
  Mail, Shield, Clock, LogIn
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useTeamStore } from '@/stores/teamStore';

interface InviteInfo {
  team_name: string;
  team_description: string | null;
  team_avatar_url: string | null;
  member_count: number;
  role: string;
  expires_at: string;
  inviter_name: string | null;
}

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { acceptInvite } = useTeamStore();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch invite info on mount
  useEffect(() => {
    async function fetchInviteInfo() {
      if (!token) {
        setError('Invalid invitation link');
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(`/api/teams/invite/${token}/info`);
        setInviteInfo(response.data);
      } catch (err: any) {
        const message = err.response?.data?.detail || 'Failed to load invitation';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInviteInfo();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setIsAccepting(true);
    setError(null);

    try {
      await acceptInvite(token);
      setSuccess(true);
      // Redirect to team page after 2 seconds
      setTimeout(() => navigate('/team'), 2000);
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || 'Failed to accept invitation';
      setError(message);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleLoginFirst = () => {
    // Store the invite token in session storage to continue after login
    sessionStorage.setItem('pendingInvite', token || '');
    navigate('/login');
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      owner: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      admin: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      member: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[role] || styles.member}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const isExpired = inviteInfo && new Date(inviteInfo.expires_at) < new Date();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading invitation...</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to the Team!</h1>
          <p className="text-gray-400 mb-2">
            You've joined <span className="text-white font-medium">{inviteInfo?.team_name}</span>
          </p>
          <p className="text-gray-500 text-sm">Redirecting to team page...</p>
        </motion.div>
      </div>
    );
  }

  // Expired state
  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invitation Expired</h1>
          <p className="text-gray-400 mb-6">
            This invitation to join <span className="text-white">{inviteInfo?.team_name}</span> has expired.
            Please ask the team admin to send a new invitation.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // Main invite view
  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-[#1a1a1f] rounded-2xl border border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-800 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              {inviteInfo?.team_avatar_url ? (
                <img
                  src={inviteInfo.team_avatar_url}
                  alt={inviteInfo.team_name}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                <Users className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-xl font-bold text-white mb-1">
              You're invited to join
            </h1>
            <h2 className="text-2xl font-bold text-indigo-400">
              {inviteInfo?.team_name}
            </h2>
            {inviteInfo?.team_description && (
              <p className="text-gray-400 text-sm mt-2">
                {inviteInfo.team_description}
              </p>
            )}
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            {/* Inviter */}
            {inviteInfo?.inviter_name && (
              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Invited by</p>
                  <p className="text-white font-medium">{inviteInfo.inviter_name}</p>
                </div>
              </div>
            )}

            {/* Role */}
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
              <Shield className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-400">Your role</p>
                <div className="mt-1">
                  {getRoleBadge(inviteInfo?.role || 'member')}
                </div>
              </div>
            </div>

            {/* Team Size */}
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Team size</p>
                <p className="text-white font-medium">
                  {inviteInfo?.member_count} member{inviteInfo?.member_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Expiration */}
            <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Expires</p>
                <p className="text-white font-medium">
                  {new Date(inviteInfo?.expires_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-gray-800">
            {isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 text-center mb-4">
                  Logged in as <span className="text-white">{user?.email}</span>
                </p>
                <button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(16, 185, 129, 0.85)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.35), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Accept Invitation
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors"
                >
                  Decline
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 text-center mb-4">
                  You need to sign in to accept this invitation
                </p>
                <button
                  onClick={handleLoginFirst}
                  className="w-full py-3 rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(99, 102, 241, 0.85)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <LogIn className="w-5 h-5" />
                  Sign In to Accept
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          By joining, you agree to share your activity data according to team privacy settings.
        </p>
      </motion.div>
    </div>
  );
}
