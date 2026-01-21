import { Moon, Sun, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { NotificationCenter } from '@/components/notifications';
import { TrackingToggle, UserProfile } from '@/components/common';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Welcome back!' },
  '/activity': { title: 'Activity', subtitle: 'Your activity timeline' },
  '/analytics': { title: 'Analytics', subtitle: 'Insights & trends' },
  '/screenshots': { title: 'Screenshots', subtitle: 'Captured moments' },
  '/goals': { title: 'Goals', subtitle: 'Track your progress' },
  '/settings': { title: 'Settings', subtitle: 'Customize your experience' },
};

export function Header() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  const pageInfo = pageTitles[location.pathname] || { title: 'Productify', subtitle: '' };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-black/10 backdrop-blur-sm relative z-40">
      {/* Page Title */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h1 className="text-xl font-semibold text-white">{pageInfo.title}</h1>
        <p className="text-sm text-white/50">{pageInfo.subtitle}</p>
      </motion.div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Tracking Toggle - hide on Dashboard (has its own controls) */}
        {location.pathname !== '/' && <TrackingToggle size="sm" />}

        {/* Date & Time */}
        <motion.div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Calendar className="w-4 h-4 text-white/50" />
          <span className="text-sm text-white/70">{formatDate(currentTime)}</span>
          <span className="text-white/30">|</span>
          <span className="text-sm text-white font-medium">{formatTime(currentTime)}</span>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <motion.button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-white/10 transition-colors relative group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <motion.div
              initial={false}
              animate={{ rotate: resolvedTheme === 'dark' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-5 h-5 text-white/70 group-hover:text-yellow-400 transition-colors" />
              ) : (
                <Moon className="w-5 h-5 text-white/70 group-hover:text-blue-400 transition-colors" />
              )}
            </motion.div>
          </motion.button>

          {/* Notifications */}
          <NotificationCenter />

          {/* User Profile */}
          <UserProfile size="md" />
        </div>
      </div>
    </header>
  );
}
