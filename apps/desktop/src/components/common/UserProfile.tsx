/**
 * User Profile - Dropdown menu with user info and quick actions
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  LogOut,
  Moon,
  Sun,
  Bell,
  HelpCircle,
  ChevronRight,
  Shield,
  Palette,
  Crown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useActivityStore } from '@/stores/activityStore';
import { useAuthStore } from '@/stores/authStore';

interface UserProfileProps {
  size?: 'sm' | 'md' | 'lg';
}

export function UserProfile({ size = 'md' }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { todayProductiveTime, productivityScore } = useActivityStore();
  const { user, logout } = useAuthStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsOpen(false);
  };

  const planColors: Record<string, string> = {
    free: 'bg-gray-500/20 text-gray-400',
    personal: 'bg-blue-500/20 text-blue-400',
    pro: 'bg-indigo-500/20 text-indigo-400',
    team: 'bg-purple-500/20 text-purple-400',
    enterprise: 'bg-yellow-500/20 text-yellow-400',
  };

  const menuItems = [
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        navigate('/settings');
        setIsOpen(false);
      },
    },
    {
      icon: Bell,
      label: 'Notifications',
      onClick: () => {
        navigate('/settings');
        setIsOpen(false);
      },
    },
    {
      icon: Shield,
      label: 'Privacy',
      onClick: () => {
        navigate('/settings');
        setIsOpen(false);
      },
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onClick: () => {
        window.open('https://github.com/productify-pro/help', '_blank');
        setIsOpen(false);
      },
    },
  ];

  // Get user display info
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const userInitial = displayName.charAt(0).toUpperCase();
  const userPlan = user?.plan || 'free';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-xl hover:bg-white/10 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Profile"
      >
        <div className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-primary/50 to-secondary/50 flex items-center justify-center border border-white/10`}>
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={displayName}
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            <span className="text-white font-semibold text-sm">{userInitial}</span>
          )}
        </div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 glass-card p-0 overflow-hidden z-50"
          >
            {/* User Info Header */}
            <div className="p-4 bg-gradient-to-r from-primary/20 to-secondary/20 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={displayName}
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-lg">{userInitial}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold truncate">{displayName}</h3>
                  <p className="text-white/50 text-sm truncate">{displayEmail}</p>
                </div>
              </div>

              {/* Plan Badge */}
              <div className="flex items-center justify-between mt-3">
                <span className={`text-xs px-2 py-1 rounded-full ${planColors[userPlan]}`}>
                  {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}
                  {user?.is_trial_active && ' Trial'}
                </span>
                {user?.is_trial_active && (
                  <span className="text-xs text-white/50">
                    {user.days_left_trial} days left
                  </span>
                )}
              </div>

              {/* Upgrade Button */}
              {!user?.has_premium_access && (
                <button
                  onClick={() => {
                    navigate('/settings');
                    setIsOpen(false);
                  }}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2
                    bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg text-sm font-medium
                    hover:from-indigo-600 hover:to-purple-600 transition-colors text-white"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade to Pro
                </button>
              )}

              {/* Quick Stats */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex-1 text-center">
                  <p className="text-white font-semibold">{formatTime(todayProductiveTime)}</p>
                  <p className="text-white/40 text-xs">Today</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex-1 text-center">
                  <p className="text-green-400 font-semibold">{Math.round(productivityScore)}%</p>
                  <p className="text-white/40 text-xs">Score</p>
                </div>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="p-2 border-b border-white/10">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-white/60" />
                  <span className="text-white text-sm">Theme</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <span className="text-xs capitalize">{resolvedTheme}</span>
                  {resolvedTheme === 'dark' ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
                  )}
                </div>
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-white/60 group-hover:text-white/80 transition-colors" />
                    <span className="text-white text-sm">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                </button>
              ))}
            </div>

            {/* Sign Out */}
            <div className="p-2 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors group"
              >
                <LogOut className="w-4 h-4 text-red-400/60 group-hover:text-red-400 transition-colors" />
                <span className="text-red-400/60 group-hover:text-red-400 text-sm transition-colors">Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserProfile;
