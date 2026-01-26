import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Monitor,
  Camera,
  Brain,
  Shield,
  Bell,
  Database,
  Keyboard,
  Sun,
  Moon,
  Clock,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Download,
  Upload,
  Trash2,
  Key,
  Zap,
  Globe,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Lock,
  HardDrive,
  RefreshCw,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  ListChecks,
  User,
  LogOut,
  ExternalLink,
  Info,
  Minimize2,
  Square,
  Link2,
  Chrome,
  Copy,
} from 'lucide-react';
import RulesSettings from './settings/Rules';
import { useSettings, useUpdateSettings, useAppInfo, useAutostart, useTrayVisibility } from '@/hooks/useSettings';
import { useAuthStore } from '@/stores/authStore';
import { isTauri, setCloseToTray, checkForUpdates, downloadAndInstallUpdate, UpdateStatus, DownloadProgress } from '@/lib/tauri';
import { useTheme } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/auth';

// Types
interface SettingsState {
  // General
  theme: 'dark' | 'light' | 'system';
  language: string;
  startOnBoot: boolean;
  startMinimized: boolean;
  showInTray: boolean;
  closeToTray: boolean;
  minimizeToTray: boolean;
  autoUpdate: boolean;

  // Tracking
  trackingEnabled: boolean;
  workStartTime: string;
  workEndTime: string;
  workDays: number[];
  idleTimeout: number;
  afkDetection: boolean;

  // Screenshots
  screenshotsEnabled: boolean;
  screenshotInterval: number;
  screenshotQuality: 'low' | 'medium' | 'high';
  blurScreenshots: boolean;
  autoDeleteAfter: number;
  excludedApps: string[];

  // AI Settings
  openaiApiKey: string;
  aiModel: string;
  autoAnalysis: boolean;
  analysisFrequency: 'hourly' | 'daily' | 'weekly';

  // Privacy
  incognitoMode: boolean;
  dataRetentionDays: number;
  appLockEnabled: boolean;
  appLockPin: string;

  // Notifications
  notificationsEnabled: boolean;
  productivityAlerts: boolean;
  breakReminders: boolean;
  breakInterval: number;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const defaultSettings: SettingsState = {
  theme: 'dark',
  language: 'en',
  startOnBoot: true,
  startMinimized: false,
  showInTray: true,
  closeToTray: true,
  minimizeToTray: true,
  autoUpdate: true,
  trackingEnabled: true,
  workStartTime: '09:00',
  workEndTime: '17:00',
  workDays: [1, 2, 3, 4, 5],
  idleTimeout: 600, // 10 minutes - AFK auto-pause threshold
  afkDetection: true,
  screenshotsEnabled: true,
  screenshotInterval: 300,
  screenshotQuality: 'medium',
  blurScreenshots: false,
  autoDeleteAfter: 30,
  excludedApps: [],
  openaiApiKey: '',
  aiModel: 'gpt-4o-mini',
  autoAnalysis: true,
  analysisFrequency: 'daily',
  incognitoMode: false,
  dataRetentionDays: 90,
  appLockEnabled: false,
  appLockPin: '',
  notificationsEnabled: true,
  productivityAlerts: true,
  breakReminders: true,
  breakInterval: 60,
  soundEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

const tabs = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'tracking', label: 'Tracking', icon: Monitor },
  { id: 'screenshots', label: 'Screenshots', icon: Camera },
  { id: 'ai', label: 'AI Settings', icon: Brain },
  { id: 'extension', label: 'Browser Extension', icon: Chrome },
  { id: 'integrations', label: 'Integrations', icon: Link2, link: '/settings/integrations' },
  { id: 'rules', label: 'Rules', icon: ListChecks },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
];

const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Legacy model' },
];

const SHORTCUTS = [
  { action: 'Toggle Tracking', keys: ['⌘', 'Shift', 'T'], enabled: true },
  { action: 'Take Screenshot', keys: ['⌘', 'Shift', 'S'], enabled: true },
  { action: 'Open Dashboard', keys: ['⌘', 'D'], enabled: true },
  { action: 'Open Activity', keys: ['⌘', '1'], enabled: true },
  { action: 'Open Analytics', keys: ['⌘', '2'], enabled: true },
  { action: 'Open Screenshots', keys: ['⌘', '3'], enabled: true },
  { action: 'Open Settings', keys: ['⌘', ','], enabled: true },
  { action: 'Toggle Incognito', keys: ['⌘', 'Shift', 'I'], enabled: false },
  { action: 'Quick Search', keys: ['⌘', 'K'], enabled: false },
  { action: 'Minimize to Tray', keys: ['⌘', 'M'], enabled: false },
];

// Components
function Toggle({
  enabled,
  onChange,
  size = 'md',
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  size?: 'sm' | 'md';
}) {
  const sizeClasses = size === 'sm' ? 'w-10 h-5' : 'w-12 h-7';
  const dotSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const translate = size === 'sm' ? 'translate-x-5' : 'translate-x-6';

  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex ${sizeClasses} items-center rounded-full transition-all duration-200 border-2 ${
        enabled
          ? 'bg-accent border-accent shadow-lg shadow-accent/30'
          : 'bg-white/10 border-white/30 hover:border-white/50'
      }`}
    >
      <span
        className={`inline-block ${dotSize} transform rounded-full shadow-md transition-all duration-200 ${
          enabled
            ? `${translate} bg-white`
            : 'translate-x-0.5 bg-white/70'
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon?: React.ElementType;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[var(--glass-border)] last:border-0">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-[var(--glass-bg)]">
            <Icon size={18} className="text-[var(--text-muted)]" />
          </div>
        )}
        <div>
          <p className="text-[var(--text-primary)] font-medium">{label}</p>
          {description && <p className="text-[var(--text-muted)] text-sm mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[var(--bg-primary)]">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
    />
  );
}

// Updates Section Component
function UpdatesSection({
  settings,
  updateSetting,
  appInfo,
}: {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  appInfo: { version: string; name: string; build_type: string } | undefined;
}) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);

  const handleCheckForUpdates = async () => {
    setChecking(true);
    setUpdateStatus(null);

    try {
      const status = await checkForUpdates();
      setUpdateStatus(status);

      if (status.error) {
        toast.error(status.error);
      } else if (status.available) {
        toast.success(`Update available: v${status.latest_version}`);
      } else {
        toast.success('You are running the latest version!');
      }
    } catch (error) {
      toast.error('Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  const handleDownloadAndInstall = async () => {
    setDownloading(true);
    setDownloadProgress({ downloaded: 0, total: 0, percentage: 0 });

    try {
      const result = await downloadAndInstallUpdate((progress) => {
        setDownloadProgress(progress);
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to install update');
      }
      // If successful, the app will relaunch automatically
    } catch (error) {
      toast.error('Failed to download update');
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Updates</h3>
      <div className="space-y-4">
        {/* Current Version Status */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <div>
            <p className="text-[var(--text-primary)] font-medium">Current Version</p>
            <p className="text-[var(--text-muted)] text-sm">v{appInfo?.version || '1.0.0'}</p>
          </div>
          {updateStatus?.available ? (
            <div className="flex items-center gap-2 text-accent">
              <Download size={16} />
              <span className="text-sm">v{updateStatus.latest_version} available</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-productive">
              <CheckCircle2 size={16} />
              <span className="text-sm">Up to date</span>
            </div>
          )}
        </div>

        {/* Update Available Card */}
        {updateStatus?.available && updateStatus.update_info && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 rounded-xl bg-accent/10 border border-accent/20"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Zap className="text-accent" size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-[var(--text-primary)] font-semibold">
                  Version {updateStatus.latest_version} Available
                </h4>
                <p className="text-[var(--text-muted)] text-sm mt-1">
                  {updateStatus.update_info.body}
                </p>

                {/* Download Progress */}
                {downloading && downloadProgress && (
                  <div className="mt-3">
                    <div className="h-2 bg-[var(--glass-bg)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadProgress.percentage}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Downloading... {downloadProgress.percentage}%
                    </p>
                  </div>
                )}

                {/* Install Button */}
                {!downloading && (
                  <button
                    onClick={handleDownloadAndInstall}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
                  >
                    <Download size={16} />
                    Download & Install
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Auto-update Setting */}
        <SettingRow
          icon={RefreshCw}
          label="Auto-update"
          description="Automatically download and install updates"
        >
          <Toggle
            enabled={settings.autoUpdate}
            onChange={(v) => {
              updateSetting('autoUpdate', v);
              toast.success(v ? 'Auto-update enabled' : 'Auto-update disabled');
            }}
          />
        </SettingRow>

        {/* Check for Updates Button */}
        <button
          onClick={handleCheckForUpdates}
          disabled={checking || downloading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] transition-colors border border-[var(--glass-border)] disabled:opacity-50"
        >
          {checking ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Check for Updates
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Tab Components
function GeneralTab({
  settings,
  updateSetting,
}: {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}) {
  const { user, logout, updateUser } = useAuthStore();
  const { data: appInfo } = useAppInfo();
  const { isEnabled: autostartEnabled, toggle: toggleAutostart, isLoading: autostartLoading } = useAutostart();
  const { setVisible: setTrayVisible } = useTrayVisibility();
  const { setTheme, theme: currentTheme } = useTheme();
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleThemeChange = async (theme: 'dark' | 'light' | 'system') => {
    // Light theme coming soon
    if (theme === 'light') {
      toast.info('Light theme coming soon!');
      return;
    }
    setTheme(theme);
    updateSetting('theme', theme);
    toast.success(`Theme changed to ${theme}`);
  };

  const handleStartOnBootChange = async (enabled: boolean) => {
    try {
      await toggleAutostart(enabled);
      updateSetting('startOnBoot', enabled);
      toast.success(enabled ? 'Start on boot enabled' : 'Start on boot disabled');
    } catch (error) {
      toast.error('Failed to change startup setting');
    }
  };

  const handleShowInTrayChange = async (visible: boolean) => {
    try {
      await setTrayVisible(visible);
      updateSetting('showInTray', visible);
      toast.success(visible ? 'System tray enabled' : 'System tray disabled');
    } catch (error) {
      toast.error('Failed to change tray setting');
    }
  };

  const handleEditProfile = () => {
    setProfileName(user?.name || '');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setSavingProfile(true);
    try {
      const updatedUser = await authApi.updateProfile({ name: profileName.trim() });
      // Update the auth store with the new user data - cast plan to the correct type
      updateUser({
        ...updatedUser,
        plan: updatedUser.plan as 'free' | 'personal' | 'pro' | 'team' | 'enterprise',
      });
      toast.success('Profile updated successfully');
      setShowProfileModal(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <User size={20} />
          Account
        </h3>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-2xl font-bold text-accent">
            {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <h4 className="text-[var(--text-primary)] font-semibold">{user?.name || 'User'}</h4>
            <p className="text-[var(--text-muted)] text-sm">{user?.email || 'Not logged in'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full text-xs bg-accent/20 text-accent capitalize">
                {user?.plan || 'Free'}
              </span>
              {user?.is_trial_active && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                  Trial
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleEditProfile}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-[var(--text-secondary)] hover:bg-white/20 transition-colors text-sm cursor-pointer"
            >
              <ExternalLink size={14} />
              Edit Profile
            </button>
            <button
              onClick={() => {
                logout();
                toast.success('Signed out successfully');
                navigate('/login');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm cursor-pointer"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Appearance</h3>
        <div className="space-y-1">
          <SettingRow icon={Sun} label="Theme" description="Choose your preferred color scheme">
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as const).map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => handleThemeChange(themeOption)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                    themeOption === 'light'
                      ? 'bg-[var(--glass-bg)] text-[var(--text-muted)] border border-[var(--glass-border)] opacity-60 cursor-not-allowed'
                      : currentTheme === themeOption
                      ? 'bg-accent text-white shadow-lg shadow-accent/25'
                      : 'bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]'
                  }`}
                >
                  {themeOption === 'dark' && <Moon size={14} className="inline mr-1" />}
                  {themeOption === 'light' && <Sun size={14} className="inline mr-1" />}
                  {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                  {themeOption === 'light' && <span className="ml-1 text-xs">(Soon)</span>}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow icon={Globe} label="Language" description="Select your preferred language">
            <Select
              value={settings.language}
              onChange={(v) => updateSetting('language', v)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Español' },
                { value: 'fr', label: 'Français' },
                { value: 'de', label: 'Deutsch' },
                { value: 'ja', label: '日本語' },
              ]}
            />
          </SettingRow>
        </div>
      </div>

      {/* Startup Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Startup</h3>
        <div className="space-y-1">
          <SettingRow icon={Play} label="Start on boot" description="Launch app when you start your computer">
            <div className="flex items-center gap-2">
              {autostartLoading && <Loader2 size={14} className="animate-spin text-[var(--text-muted)]" />}
              <Toggle enabled={autostartEnabled ?? settings.startOnBoot} onChange={handleStartOnBootChange} />
            </div>
          </SettingRow>

          <SettingRow
            icon={Pause}
            label="Start minimized"
            description="Start the app in the system tray"
          >
            <Toggle
              enabled={settings.startMinimized}
              onChange={(v) => {
                updateSetting('startMinimized', v);
                toast.success(v ? 'Start minimized enabled' : 'Start minimized disabled');
              }}
            />
          </SettingRow>

          <SettingRow
            icon={Monitor}
            label="Show in system tray"
            description="Keep the app in your system tray"
          >
            <Toggle enabled={settings.showInTray} onChange={handleShowInTrayChange} />
          </SettingRow>
        </div>
      </div>

      {/* Window Behavior Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Window Behavior</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Square}
            label="Close button action"
            description="What happens when you click the close button"
          >
            <Select
              value={settings.closeToTray ? 'tray' : 'quit'}
              onChange={async (v) => {
                const closeToTray = v === 'tray';
                updateSetting('closeToTray', closeToTray);
                // Sync with Tauri store for native window handling
                try {
                  await setCloseToTray(closeToTray);
                  toast.success(closeToTray ? 'Close to tray enabled' : 'Close to quit enabled');
                } catch (error) {
                  toast.error('Failed to update close behavior');
                }
              }}
              options={[
                { value: 'tray', label: 'Minimize to tray' },
                { value: 'quit', label: 'Quit application' },
              ]}
            />
          </SettingRow>

          <SettingRow
            icon={Minimize2}
            label="Minimize to tray"
            description="Minimize button hides to system tray"
          >
            <Toggle
              enabled={settings.minimizeToTray}
              onChange={(v) => {
                updateSetting('minimizeToTray', v);
                toast.success(v ? 'Minimize to tray enabled' : 'Minimize to tray disabled');
              }}
            />
          </SettingRow>
        </div>
      </div>

      {/* Updates Section */}
      {isTauri() && (
        <UpdatesSection settings={settings} updateSetting={updateSetting} appInfo={appInfo} />
      )}

      {/* About Section */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Info size={20} />
          About
        </h3>
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/20 flex items-center justify-center">
            <Zap size={32} className="text-accent" />
          </div>
          <h4 className="text-xl font-bold text-[var(--text-primary)]">Productify Pro</h4>
          <p className="text-[var(--text-muted)] text-sm mt-1">v{appInfo?.version || '1.0.0'} ({appInfo?.build_type || 'release'})</p>
          <p className="text-[var(--text-muted)] text-xs mt-4">{new Date().getFullYear()} Productify Pro. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => window.open('https://productify.pro/privacy', '_blank')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors"
            >
              Privacy Policy
            </button>
            <span className="text-[var(--glass-border)]">|</span>
            <button
              onClick={() => window.open('https://productify.pro/terms', '_blank')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors"
            >
              Terms of Service
            </button>
            <span className="text-[var(--glass-border)]">|</span>
            <button
              onClick={() => toast.info('Open source licenses coming soon!')}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-colors"
            >
              Licenses
            </button>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <User size={20} />
                Edit Profile
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 rounded-lg bg-white/10 text-[var(--text-secondary)] hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrackingTab({
  settings,
  updateSetting,
}: {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}) {
  if (!settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Activity Tracking</h3>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              settings.trackingEnabled ? 'bg-productive/20 text-productive' : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'
            }`}
          >
            {settings.trackingEnabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {settings.trackingEnabled ? 'Active' : 'Paused'}
          </div>
        </div>

        <div className="space-y-1">
          <SettingRow icon={Monitor} label="Enable tracking" description="Track your activity and productivity">
            <Toggle
              enabled={settings.trackingEnabled}
              onChange={(v) => {
                updateSetting('trackingEnabled', v);
                toast.success(v ? 'Tracking enabled' : 'Tracking disabled');
              }}
            />
          </SettingRow>

          <SettingRow
            icon={Eye}
            label="AFK Detection"
            description="Detect when you're away from keyboard"
          >
            <Toggle
              enabled={settings.afkDetection}
              onChange={(v) => {
                updateSetting('afkDetection', v);
                toast.success(v ? 'AFK detection enabled' : 'AFK detection disabled');
              }}
            />
          </SettingRow>

          <SettingRow
            icon={Clock}
            label="AFK Auto-Pause"
            description="Auto-pause tracking after this duration of inactivity"
          >
            <Select
              value={settings.idleTimeout.toString()}
              onChange={(v) => {
                updateSetting('idleTimeout', Number(v));
                const minutes = Number(v) / 60;
                toast.success(`AFK auto-pause set to ${minutes} minutes`);
              }}
              options={[
                { value: '480', label: '8 minutes' },
                { value: '600', label: '10 minutes' },
                { value: '720', label: '12 minutes' },
                { value: '900', label: '15 minutes' },
              ]}
            />
          </SettingRow>
        </div>
      </div>

      {/* Work Schedule moved to Rules Settings */}
      <div className="glass-card p-4 bg-[var(--glass-bg)]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-[var(--text-muted)]" />
            <div>
              <p className="text-[var(--text-primary)] font-medium">Work Schedule</p>
              <p className="text-[var(--text-muted)] text-sm">Configure work hours and days in Rules Settings</p>
            </div>
          </div>
          <button
            onClick={() => {
              const rulesTab = document.querySelector('[data-tab="rules"]');
              if (rulesTab) (rulesTab as HTMLElement).click();
            }}
            className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-sm hover:bg-accent/20 transition-colors"
          >
            Go to Rules
          </button>
        </div>
      </div>
    </div>
  );
}

function ScreenshotsTab({
  settings,
  updateSetting,
}: {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}) {
  if (!settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Screenshot Capture</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Camera}
            label="Enable screenshots"
            description="Automatically capture screenshots at random intervals"
          >
            <Toggle
              enabled={settings.screenshotsEnabled}
              onChange={(v) => {
                updateSetting('screenshotsEnabled', v);
                toast.success(v ? 'Screenshots enabled' : 'Screenshots disabled');
              }}
            />
          </SettingRow>

          <SettingRow
            icon={Clock}
            label="Random capture window"
            description="Screenshots captured randomly within this time window"
          >
            <Select
              value={settings.screenshotInterval.toString()}
              onChange={(v) => {
                updateSetting('screenshotInterval', Number(v));
                const minutes = Number(v) / 60;
                toast.success(`Random capture set to within ${minutes} minutes`);
              }}
              options={[
                { value: '300', label: 'Within 5 min' },
                { value: '600', label: 'Within 10 min' },
                { value: '900', label: 'Within 15 min' },
              ]}
            />
          </SettingRow>

          {/* Info about random capture */}
          <div className="mt-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-[var(--text-muted)] text-sm">
              <span className="text-accent font-medium">Random timing:</span> Screenshots are captured at unpredictable intervals (e.g., 2, 7, 11, 14 min) within your selected window for natural monitoring.
            </p>
          </div>

          <SettingRow icon={Zap} label="Quality" description="Screenshot compression quality (lower = smaller files)">
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((quality) => (
                <button
                  key={quality}
                  onClick={() => {
                    updateSetting('screenshotQuality', quality);
                    toast.success(`Screenshot quality set to ${quality}`);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.screenshotQuality === quality
                      ? 'bg-accent text-white'
                      : 'bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)]'
                  }`}
                >
                  {quality.charAt(0).toUpperCase() + quality.slice(1)}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow
            icon={EyeOff}
            label="Blur screenshots"
            description="Apply blur to protect sensitive content"
          >
            <Toggle
              enabled={settings.blurScreenshots}
              onChange={(v) => {
                updateSetting('blurScreenshots', v);
                toast.success(v ? 'Screenshot blur enabled' : 'Screenshot blur disabled');
              }}
            />
          </SettingRow>

          <SettingRow
            icon={Trash2}
            label="Auto-delete"
            description="Automatically delete old screenshots"
          >
            <Select
              value={settings.autoDeleteAfter.toString()}
              onChange={(v) => {
                updateSetting('autoDeleteAfter', Number(v));
                const label = v === '0' ? 'Never' : `${v} days`;
                toast.success(`Auto-delete set to ${label}`);
              }}
              options={[
                { value: '7', label: 'After 7 days' },
                { value: '14', label: 'After 14 days' },
                { value: '30', label: 'After 30 days' },
                { value: '60', label: 'After 60 days' },
                { value: '90', label: 'After 90 days' },
                { value: '0', label: 'Never' },
              ]}
            />
          </SettingRow>
        </div>
      </div>
    </div>
  );
}

function AISettingsTab({
  settings,
  updateSetting,
}: {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  if (!settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const testApiKey = async () => {
    if (!settings.openaiApiKey) return;

    setTestingKey(true);
    setTestResult(null);

    try {
      // Simulate API test - in real app, call backend endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check if key starts with 'sk-' as a basic validation
      if (settings.openaiApiKey.startsWith('sk-')) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTestingKey(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Brain className="text-purple-400" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">OpenAI Integration</h3>
            <p className="text-[var(--text-muted)] text-sm">Power AI features with your OpenAI API key</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[var(--text-muted)] text-sm mb-2">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.openaiApiKey}
                  onChange={(e) => {
                    updateSetting('openaiApiKey', e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="sk-..."
                  className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg pl-10 pr-10 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono text-sm"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button
                onClick={testApiKey}
                disabled={!settings.openaiApiKey || testingKey}
                className="px-4 py-2 bg-accent rounded-lg text-white font-medium hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testingKey ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test'
                )}
              </button>
            </div>

            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-center gap-2 mt-3 text-sm ${
                    testResult === 'success' ? 'text-productive' : 'text-distracting'
                  }`}
                >
                  {testResult === 'success' ? (
                    <>
                      <CheckCircle2 size={16} />
                      API key is valid! Connection successful.
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      Invalid API key. Please check and try again.
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-xs text-[var(--text-muted)] mt-3">
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                className="text-accent hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                platform.openai.com
              </a>
            </p>
          </div>

          <div>
            <label className="block text-[var(--text-muted)] text-sm mb-2">Model</label>
            <div className="grid grid-cols-2 gap-3">
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    updateSetting('aiModel', model.id);
                    toast.success(`AI model set to ${model.name}`);
                  }}
                  className={`p-4 rounded-xl text-left transition-all ${
                    settings.aiModel === model.id
                      ? 'bg-accent/20 border-2 border-accent'
                      : 'bg-[var(--glass-bg)] border-2 border-transparent hover:bg-[var(--glass-bg-hover)]'
                  }`}
                >
                  <p className="text-[var(--text-primary)] font-medium">{model.name}</p>
                  <p className="text-[var(--text-muted)] text-xs mt-1">{model.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">AI Analysis</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Brain}
            label="Auto-analysis"
            description="Automatically analyze your productivity patterns"
          >
            <Toggle
              enabled={settings.autoAnalysis}
              onChange={(v) => {
                updateSetting('autoAnalysis', v);
                toast.success(v ? 'Auto-analysis enabled' : 'Auto-analysis disabled');
              }}
            />
          </SettingRow>

          <SettingRow
            icon={RefreshCw}
            label="Analysis frequency"
            description="How often to generate AI insights"
          >
            <Select
              value={settings.analysisFrequency}
              onChange={(v) => {
                updateSetting('analysisFrequency', v as 'hourly' | 'daily' | 'weekly');
                toast.success(`Analysis frequency set to ${v}`);
              }}
              options={[
                { value: 'hourly', label: 'Hourly' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
            />
          </SettingRow>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
        <div className="flex gap-3">
          <Zap className="text-purple-400 flex-shrink-0" size={20} />
          <div>
            <p className="text-[var(--text-primary)] font-medium">AI Features Unlocked</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              With an API key, you get: smart categorization, productivity insights, break
              recommendations, and personalized tips based on your work patterns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyTab({
  settings,
  updateSetting,
}: {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}) {
  const [showPin, setShowPin] = useState(false);

  if (!settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Privacy Mode</h3>
        <div className="space-y-1">
          <SettingRow
            icon={EyeOff}
            label="Incognito mode"
            description="Temporarily pause all tracking and screenshots"
          >
            <Toggle
              enabled={settings.incognitoMode}
              onChange={(v) => {
                updateSetting('incognitoMode', v);
                toast.success(v ? 'Incognito mode enabled' : 'Incognito mode disabled');
              }}
            />
          </SettingRow>
        </div>

        {settings.incognitoMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
          >
            <div className="flex gap-2">
              <AlertTriangle className="text-yellow-500 flex-shrink-0" size={18} />
              <p className="text-yellow-200/80 text-sm">
                Incognito mode is active. No activity or screenshots will be recorded.
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Data Retention</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Database}
            label="Keep data for"
            description="Automatically delete data older than this"
          >
            <Select
              value={settings.dataRetentionDays.toString()}
              onChange={(v) => {
                updateSetting('dataRetentionDays', Number(v));
                const label = v === '0' ? 'Forever' : v === '180' ? '6 months' : v === '365' ? '1 year' : `${v} days`;
                toast.success(`Data retention set to ${label}`);
              }}
              options={[
                { value: '30', label: '30 days' },
                { value: '60', label: '60 days' },
                { value: '90', label: '90 days' },
                { value: '180', label: '6 months' },
                { value: '365', label: '1 year' },
                { value: '0', label: 'Forever' },
              ]}
            />
          </SettingRow>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">App Lock</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Lock}
            label="Enable app lock"
            description="Require PIN to access the app"
          >
            <Toggle
              enabled={settings.appLockEnabled}
              onChange={(v) => {
                updateSetting('appLockEnabled', v);
                toast.success(v ? 'App lock enabled' : 'App lock disabled');
              }}
            />
          </SettingRow>

          {settings.appLockEnabled && (
            <SettingRow
              icon={Key}
              label="PIN Code"
              description="4-digit PIN for app access"
            >
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={settings.appLockPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    updateSetting('appLockPin', value);
                  }}
                  placeholder="••••"
                  maxLength={4}
                  className="w-24 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-lg px-4 py-2 text-[var(--text-primary)] text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </SettingRow>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({
  settings,
  updateSetting,
}: {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}) {
  if (!settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Notifications</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Bell}
            label="Enable notifications"
            description="Receive alerts and reminders"
          >
            <Toggle
              enabled={settings.notificationsEnabled}
              onChange={(v) => {
                updateSetting('notificationsEnabled', v);
                toast.success(v ? 'Notifications enabled' : 'Notifications disabled');
              }}
            />
          </SettingRow>

          <SettingRow
            icon={AlertTriangle}
            label="Productivity alerts"
            description="Get notified when productivity drops"
          >
            <Toggle
              enabled={settings.productivityAlerts}
              onChange={(v) => {
                updateSetting('productivityAlerts', v);
                toast.success(v ? 'Productivity alerts enabled' : 'Productivity alerts disabled');
              }}
            />
          </SettingRow>

          <SettingRow
            icon={Clock}
            label="Break reminders"
            description="Remind you to take regular breaks"
          >
            <Toggle
              enabled={settings.breakReminders}
              onChange={(v) => {
                updateSetting('breakReminders', v);
                toast.success(v ? 'Break reminders enabled' : 'Break reminders disabled');
              }}
            />
          </SettingRow>

          {settings.breakReminders && (
            <SettingRow
              icon={RefreshCw}
              label="Break interval"
              description="Remind to take a break every"
            >
              <Select
                value={settings.breakInterval.toString()}
                onChange={(v) => {
                  updateSetting('breakInterval', Number(v));
                  const label = v === '60' ? '1 hour' : v === '90' ? '1.5 hours' : v === '120' ? '2 hours' : `${v} minutes`;
                  toast.success(`Break interval set to ${label}`);
                }}
                options={[
                  { value: '30', label: '30 minutes' },
                  { value: '45', label: '45 minutes' },
                  { value: '60', label: '1 hour' },
                  { value: '90', label: '1.5 hours' },
                  { value: '120', label: '2 hours' },
                ]}
              />
            </SettingRow>
          )}

          <SettingRow
            icon={settings.soundEnabled ? Volume2 : VolumeX}
            label="Sound"
            description="Play sounds for notifications"
          >
            <Toggle
              enabled={settings.soundEnabled}
              onChange={(v) => {
                updateSetting('soundEnabled', v);
                toast.success(v ? 'Sound enabled' : 'Sound disabled');
              }}
            />
          </SettingRow>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Quiet Hours</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Moon}
            label="Enable quiet hours"
            description="Mute notifications during specified hours"
          >
            <Toggle
              enabled={settings.quietHoursEnabled}
              onChange={(v) => {
                updateSetting('quietHoursEnabled', v);
                toast.success(v ? 'Quiet hours enabled' : 'Quiet hours disabled');
              }}
            />
          </SettingRow>

          {settings.quietHoursEnabled && (
            <div className="flex gap-6 pt-4">
              <div>
                <p className="text-[var(--text-muted)] text-sm mb-2">Start</p>
                <TimeInput
                  value={settings.quietHoursStart}
                  onChange={(v) => {
                    updateSetting('quietHoursStart', v);
                    toast.success(`Quiet hours start set to ${v}`);
                  }}
                />
              </div>
              <div>
                <p className="text-[var(--text-muted)] text-sm mb-2">End</p>
                <TimeInput
                  value={settings.quietHoursEnd}
                  onChange={(v) => {
                    updateSetting('quietHoursEnd', v);
                    toast.success(`Quiet hours end set to ${v}`);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DataTab() {
  const [exporting, setExporting] = useState(false);
  const [exportingScreenshots, setExportingScreenshots] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [deletingScreenshots, setDeletingScreenshots] = useState(false);
  const [resettingSettings, setResettingSettings] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{
    activity_data_mb: number;
    screenshots_mb: number;
    total_mb: number;
    limit_mb: number;
    usage_percent: number;
  } | null>(null);

  // Fetch storage info on mount
  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const { getStorageInfo } = await import('@/lib/api/settings');
        const info = await getStorageInfo();
        setStorageInfo(info);
      } catch (error) {
        console.error('Failed to fetch storage info:', error);
      }
    };
    fetchStorage();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      toast.info('Preparing your data export...');
      const { downloadExportAsFile } = await import('@/lib/api/settings');
      await downloadExportAsFile();
      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data. Please try again.');
    }
    setExporting(false);
  };

  const handleExportScreenshots = async () => {
    setExportingScreenshots(true);
    try {
      toast.info('Screenshot export coming soon - use individual downloads for now');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      toast.error('Failed to export screenshots. Please try again.');
    }
    setExportingScreenshots(false);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      toast.info('Import feature coming soon!');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      toast.error('Failed to import data.');
    }
    setImporting(false);
  };

  const handleClearData = async () => {
    if (confirmAction !== 'clearData') {
      setConfirmAction('clearData');
      toast.warning('Click again to confirm clearing all activity data');
      setTimeout(() => setConfirmAction(null), 3000);
      return;
    }

    setClearingData(true);
    try {
      toast.info('Clearing all activity data...');
      const { clearAllData, getStorageInfo } = await import('@/lib/api/settings');
      const result = await clearAllData();
      toast.success(result.message || 'All activity data has been cleared');
      setConfirmAction(null);
      // Refresh storage info
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Clear data error:', error);
      toast.error('Failed to clear data. Please try again.');
    }
    setClearingData(false);
  };

  const handleDeleteScreenshots = async () => {
    if (confirmAction !== 'deleteScreenshots') {
      setConfirmAction('deleteScreenshots');
      toast.warning('Click again to confirm deleting all screenshots');
      setTimeout(() => setConfirmAction(null), 3000);
      return;
    }

    setDeletingScreenshots(true);
    try {
      toast.info('Deleting all screenshots...');
      const { deleteAllScreenshots, getStorageInfo } = await import('@/lib/api/settings');
      const result = await deleteAllScreenshots();
      toast.success(result.message || 'All screenshots have been deleted');
      setConfirmAction(null);
      // Refresh storage info
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Delete screenshots error:', error);
      toast.error('Failed to delete screenshots. Please try again.');
    }
    setDeletingScreenshots(false);
  };

  const handleResetSettings = async () => {
    if (confirmAction !== 'resetSettings') {
      setConfirmAction('resetSettings');
      toast.warning('Click again to confirm resetting all settings');
      setTimeout(() => setConfirmAction(null), 3000);
      return;
    }

    setResettingSettings(true);
    try {
      toast.info('Resetting all settings to defaults...');
      const { resetSettings } = await import('@/lib/api/settings');
      await resetSettings();
      toast.success('All settings have been reset to defaults');
      setConfirmAction(null);
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Reset settings error:', error);
      toast.error('Failed to reset settings. Please try again.');
    }
    setResettingSettings(false);
  };

  // Helper to format storage size
  const formatSize = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Export Data</h3>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Download all your activity data as a JSON file
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent rounded-lg text-white font-medium hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            {exporting ? 'Exporting...' : 'Export All Data'}
          </button>

          <button
            onClick={handleExportScreenshots}
            disabled={exportingScreenshots}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--glass-bg)] rounded-lg text-[var(--text-primary)] font-medium hover:bg-[var(--glass-bg-hover)] transition-colors border border-[var(--glass-border)] disabled:opacity-50"
          >
            {exportingScreenshots ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}
            {exportingScreenshots ? 'Exporting...' : 'Export Screenshots'}
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Import Data</h3>
        <p className="text-[var(--text-muted)] text-sm mb-4">
          Restore data from a previous backup
        </p>

        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--glass-bg)] rounded-lg text-[var(--text-primary)] font-medium hover:bg-[var(--glass-bg-hover)] transition-colors disabled:opacity-50 border border-[var(--glass-border)]"
        >
          {importing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Upload size={18} />
          )}
          Import Backup
        </button>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Storage</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="text-[var(--text-muted)]" size={20} />
              <span className="text-[var(--text-primary)]">Activity Data</span>
            </div>
            <span className="text-[var(--text-muted)]">
              {storageInfo ? formatSize(storageInfo.activity_data_mb) : 'Loading...'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera className="text-[var(--text-muted)]" size={20} />
              <span className="text-[var(--text-primary)]">Screenshots</span>
            </div>
            <span className="text-[var(--text-muted)]">
              {storageInfo ? formatSize(storageInfo.screenshots_mb) : 'Loading...'}
            </span>
          </div>

          <div className="h-2 bg-[var(--glass-bg)] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent/60 rounded-full transition-all duration-300"
              style={{ width: `${storageInfo?.usage_percent || 0}%` }}
            />
          </div>
          <p className="text-[var(--text-muted)] text-sm">
            {storageInfo
              ? `${formatSize(storageInfo.total_mb)} of ${formatSize(storageInfo.limit_mb)} used`
              : 'Calculating storage...'}
          </p>
        </div>
      </div>

      <div className="glass-card p-6 border-red-500/20">
        <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--text-primary)] font-medium">Clear all activity data</p>
              <p className="text-[var(--text-muted)] text-sm">This will permanently delete all tracked activity</p>
            </div>
            <button
              onClick={handleClearData}
              disabled={clearingData}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                confirmAction === 'clearData'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {clearingData ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              {confirmAction === 'clearData' ? 'Confirm' : 'Clear Data'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--text-primary)] font-medium">Delete all screenshots</p>
              <p className="text-[var(--text-muted)] text-sm">Remove all captured screenshots permanently</p>
            </div>
            <button
              onClick={handleDeleteScreenshots}
              disabled={deletingScreenshots}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                confirmAction === 'deleteScreenshots'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {deletingScreenshots ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              {confirmAction === 'deleteScreenshots' ? 'Confirm' : 'Delete'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--text-primary)] font-medium">Reset all settings</p>
              <p className="text-[var(--text-muted)] text-sm">Restore all settings to their defaults</p>
            </div>
            <button
              onClick={handleResetSettings}
              disabled={resettingSettings}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                confirmAction === 'resetSettings'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {resettingSettings ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              {confirmAction === 'resetSettings' ? 'Confirm' : 'Reset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExtensionTab() {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [_expiresAt, setExpiresAt] = useState<Date | null>(null);
  const { token } = useAuthStore();

  const generateLinkCode = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/extension-link-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLinkCode(data.code);
        setExpiresAt(new Date(Date.now() + data.expires_in * 1000));
        toast.success('Link code generated!');
      } else {
        toast.error('Failed to generate code');
      }
    } catch (error) {
      toast.error('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      toast.success('Code copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Link Extension Card */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Link Extension</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Generate a one-time code to link your Chrome extension. No need to enter email/password in the extension.
        </p>

        {linkCode ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
                <span className="text-3xl font-mono font-bold tracking-widest text-white">
                  {linkCode}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Copy size={20} />
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)] text-center">
              Enter this code in the Chrome extension popup. Expires in 5 minutes.
            </p>
            <button
              onClick={generateLinkCode}
              className="w-full py-2 text-sm text-[var(--text-muted)] hover:text-white transition-colors"
            >
              Generate New Code
            </button>
          </div>
        ) : (
          <button
            onClick={generateLinkCode}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Link2 size={18} />
            )}
            {loading ? 'Generating...' : 'Generate Link Code'}
          </button>
        )}
      </div>

      {/* Benefits Card */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Extension Benefits</h3>
        <ul className="space-y-3">
          <li className="flex items-center gap-3 text-[var(--text-secondary)]">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check size={16} className="text-green-500" />
            </div>
            <span>Track exact URLs you visit</span>
          </li>
          <li className="flex items-center gap-3 text-[var(--text-secondary)]">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check size={16} className="text-green-500" />
            </div>
            <span>Monitor video progress (YouTube, Netflix, Udemy)</span>
          </li>
          <li className="flex items-center gap-3 text-[var(--text-secondary)]">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check size={16} className="text-green-500" />
            </div>
            <span>Detailed domain-level analytics</span>
          </li>
          <li className="flex items-center gap-3 text-[var(--text-secondary)]">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Check size={16} className="text-green-500" />
            </div>
            <span>Offline sync with auto-retry</span>
          </li>
        </ul>
      </div>

      {/* Install Instructions Card */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Install Extension</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          If you haven't installed the extension yet, follow these steps:
        </p>
        <ol className="list-decimal list-inside space-y-3 text-[var(--text-secondary)]">
          <li>Open Chrome and go to <code className="bg-gray-800 px-2 py-1 rounded text-sm">chrome://extensions/</code></li>
          <li>Enable <strong className="text-white">Developer mode</strong> (toggle in top right)</li>
          <li>Click <strong className="text-white">Load unpacked</strong></li>
          <li>Select the <code className="bg-gray-800 px-2 py-1 rounded text-sm">apps/extension</code> folder</li>
        </ol>
      </div>
    </div>
  );
}

function ShortcutsTab() {
  const enabledCount = SHORTCUTS.filter((s) => s.enabled).length;

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h3>
          <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded-full">
            {enabledCount}/{SHORTCUTS.length} active
          </span>
        </div>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          Use these shortcuts to quickly navigate and control the app
        </p>

        <div className="space-y-1">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.action}
              className={`flex items-center justify-between py-3 border-b border-[var(--glass-border)] last:border-0 ${
                !shortcut.enabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-primary)]">{shortcut.action}</span>
                {!shortcut.enabled && (
                  <span className="text-xs px-1.5 py-0.5 bg-[var(--glass-bg)] text-[var(--text-muted)] rounded">
                    Coming soon
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {shortcut.keys.map((key, index) => (
                  <span key={index}>
                    <kbd className={`px-2 py-1 rounded text-sm font-mono ${
                      shortcut.enabled
                        ? 'bg-accent/20 text-accent'
                        : 'bg-[var(--glass-bg)] text-[var(--text-muted)]'
                    }`}>
                      {key}
                    </kbd>
                    {index < shortcut.keys.length - 1 && (
                      <span className="text-[var(--text-muted)] mx-1">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
        <div className="flex gap-3">
          <CheckCircle2 className="text-accent flex-shrink-0" size={20} />
          <p className="text-[var(--text-secondary)] text-sm">
            Active shortcuts work throughout the app. Press the key combination to trigger the action.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
        <div className="flex gap-3">
          <Keyboard className="text-[var(--text-muted)] flex-shrink-0" size={20} />
          <p className="text-[var(--text-muted)] text-sm">
            Custom shortcut support is coming in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // Fetch settings from backend
  const { data: apiSettings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const { data: appInfo } = useAppInfo();

  // Sync local state with API settings when loaded
  useEffect(() => {
    if (apiSettings) {
      setSettings({
        // General - with fallbacks to defaults
        theme: apiSettings.general?.theme ?? defaultSettings.theme,
        language: apiSettings.general?.language ?? defaultSettings.language,
        startOnBoot: apiSettings.general?.startOnBoot ?? defaultSettings.startOnBoot,
        startMinimized: apiSettings.general?.startMinimized ?? defaultSettings.startMinimized,
        showInTray: apiSettings.general?.showInTray ?? defaultSettings.showInTray,
        closeToTray: apiSettings.general?.closeToTray ?? defaultSettings.closeToTray,
        minimizeToTray: apiSettings.general?.minimizeToTray ?? defaultSettings.minimizeToTray,
        autoUpdate: apiSettings.general?.autoUpdate ?? defaultSettings.autoUpdate,
        // Tracking - with fallbacks to defaults
        trackingEnabled: apiSettings.tracking?.trackingEnabled ?? defaultSettings.trackingEnabled,
        workStartTime: apiSettings.tracking?.workStartTime ?? defaultSettings.workStartTime,
        workEndTime: apiSettings.tracking?.workEndTime ?? defaultSettings.workEndTime,
        workDays: apiSettings.tracking?.workDays ?? defaultSettings.workDays,
        idleTimeout: apiSettings.tracking?.idleTimeout ?? defaultSettings.idleTimeout,
        afkDetection: apiSettings.tracking?.afkDetection ?? defaultSettings.afkDetection,
        // Screenshots - with fallbacks to defaults
        screenshotsEnabled: apiSettings.screenshots?.screenshotsEnabled ?? defaultSettings.screenshotsEnabled,
        screenshotInterval: apiSettings.screenshots?.screenshotInterval ?? defaultSettings.screenshotInterval,
        screenshotQuality: apiSettings.screenshots?.screenshotQuality ?? defaultSettings.screenshotQuality,
        blurScreenshots: apiSettings.screenshots?.blurScreenshots ?? defaultSettings.blurScreenshots,
        autoDeleteAfter: apiSettings.screenshots?.autoDeleteAfter ?? defaultSettings.autoDeleteAfter,
        excludedApps: apiSettings.screenshots?.excludedApps ?? defaultSettings.excludedApps,
        // AI - with fallbacks to defaults
        openaiApiKey: '', // Not returned from API for security
        aiModel: apiSettings.ai?.aiModel ?? defaultSettings.aiModel,
        autoAnalysis: apiSettings.ai?.autoAnalysis ?? defaultSettings.autoAnalysis,
        analysisFrequency: apiSettings.ai?.analysisFrequency ?? defaultSettings.analysisFrequency,
        // Privacy - with fallbacks to defaults
        incognitoMode: apiSettings.privacy?.incognitoMode ?? defaultSettings.incognitoMode,
        dataRetentionDays: apiSettings.privacy?.dataRetentionDays ?? defaultSettings.dataRetentionDays,
        appLockEnabled: apiSettings.privacy?.appLockEnabled ?? defaultSettings.appLockEnabled,
        appLockPin: '',
        // Notifications - with fallbacks to defaults
        notificationsEnabled: apiSettings.notifications?.notificationsEnabled ?? defaultSettings.notificationsEnabled,
        productivityAlerts: apiSettings.notifications?.productivityAlerts ?? defaultSettings.productivityAlerts,
        breakReminders: apiSettings.notifications?.breakReminders ?? defaultSettings.breakReminders,
        breakInterval: apiSettings.notifications?.breakInterval ?? defaultSettings.breakInterval,
        soundEnabled: apiSettings.notifications?.soundEnabled ?? defaultSettings.soundEnabled,
        quietHoursEnabled: apiSettings.notifications?.quietHoursEnabled ?? defaultSettings.quietHoursEnabled,
        quietHoursStart: apiSettings.notifications?.quietHoursStart ?? defaultSettings.quietHoursStart,
        quietHoursEnd: apiSettings.notifications?.quietHoursEnd ?? defaultSettings.quietHoursEnd,
      });
    }
  }, [apiSettings]);

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        general: {
          theme: settings.theme,
          language: settings.language,
          startOnBoot: settings.startOnBoot,
          startMinimized: settings.startMinimized,
          showInTray: settings.showInTray,
          closeToTray: settings.closeToTray,
          minimizeToTray: settings.minimizeToTray,
          autoUpdate: settings.autoUpdate,
        },
        tracking: {
          trackingEnabled: settings.trackingEnabled,
          workStartTime: settings.workStartTime,
          workEndTime: settings.workEndTime,
          workDays: settings.workDays,
          idleTimeout: settings.idleTimeout,
          afkDetection: settings.afkDetection,
        },
        screenshots: {
          screenshotsEnabled: settings.screenshotsEnabled,
          screenshotInterval: settings.screenshotInterval,
          screenshotQuality: settings.screenshotQuality,
          blurScreenshots: settings.blurScreenshots,
          autoDeleteAfter: settings.autoDeleteAfter,
          excludedApps: settings.excludedApps,
        },
        privacy: {
          incognitoMode: settings.incognitoMode,
          dataRetentionDays: settings.dataRetentionDays,
          appLockEnabled: settings.appLockEnabled,
        },
        notifications: {
          notificationsEnabled: settings.notificationsEnabled,
          productivityAlerts: settings.productivityAlerts,
          breakReminders: settings.breakReminders,
          breakInterval: settings.breakInterval,
          soundEnabled: settings.soundEnabled,
          quietHoursEnabled: settings.quietHoursEnabled,
          quietHoursStart: settings.quietHoursStart,
          quietHoursEnd: settings.quietHoursEnd,
        },
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab settings={settings} updateSetting={updateSetting} />;
      case 'tracking':
        return <TrackingTab settings={settings} updateSetting={updateSetting} />;
      case 'screenshots':
        return <ScreenshotsTab settings={settings} updateSetting={updateSetting} />;
      case 'ai':
        return <AISettingsTab settings={settings} updateSetting={updateSetting} />;
      case 'extension':
        return <ExtensionTab />;
      case 'rules':
        return <RulesSettings />;
      case 'privacy':
        return <PrivacyTab settings={settings} updateSetting={updateSetting} />;
      case 'notifications':
        return <NotificationsTab settings={settings} updateSetting={updateSetting} />;
      case 'data':
        return <DataTab />;
      case 'shortcuts':
        return <ShortcutsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Settings</h1>
          <p className="text-[var(--text-muted)]">Customize your Productify Pro experience</p>
        </div>

        <AnimatePresence>
          {hasChanges && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-accent rounded-xl text-white font-semibold hover:bg-accent/80 transition-colors shadow-lg shadow-accent/25 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Save Changes
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="glass-card p-2 sticky top-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const tabWithLink = tab as { id: string; label: string; icon: any; link?: string };

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tabWithLink.link) {
                      navigate(tabWithLink.link);
                    } else {
                      setActiveTab(tab.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-accent text-white'
                      : 'text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                  {tabWithLink.link ? (
                    <ExternalLink size={14} className="ml-auto opacity-50" />
                  ) : isActive ? (
                    <ChevronRight size={16} className="ml-auto" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Version info */}
          <div className="mt-4 p-4 text-center">
            <p className="text-[var(--text-muted)] text-xs">Productify Pro v{appInfo?.version || '1.0.0'}</p>
            <p className="text-[var(--text-muted)] opacity-60 text-xs mt-1">Made with care</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
