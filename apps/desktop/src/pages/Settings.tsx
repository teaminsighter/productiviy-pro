import { useState } from 'react';
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
  X,
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
} from 'lucide-react';
import RulesSettings from './settings/Rules';

// Types
interface SettingsState {
  // General
  theme: 'dark' | 'light' | 'system';
  language: string;
  startOnBoot: boolean;
  startMinimized: boolean;
  showInTray: boolean;

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
  trackingEnabled: true,
  workStartTime: '09:00',
  workEndTime: '17:00',
  workDays: [1, 2, 3, 4, 5],
  idleTimeout: 300,
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
  { id: 'rules', label: 'Rules', icon: ListChecks },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Legacy model' },
];

const SHORTCUTS = [
  { action: 'Toggle Tracking', keys: ['⌘', 'Shift', 'T'] },
  { action: 'Take Screenshot', keys: ['⌘', 'Shift', 'S'] },
  { action: 'Open Dashboard', keys: ['⌘', 'D'] },
  { action: 'Open Activity', keys: ['⌘', '1'] },
  { action: 'Open Analytics', keys: ['⌘', '2'] },
  { action: 'Open Screenshots', keys: ['⌘', '3'] },
  { action: 'Open Settings', keys: ['⌘', ','] },
  { action: 'Toggle Incognito', keys: ['⌘', 'Shift', 'I'] },
  { action: 'Quick Search', keys: ['⌘', 'K'] },
  { action: 'Minimize to Tray', keys: ['⌘', 'M'] },
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
  const sizeClasses = size === 'sm' ? 'w-8 h-4' : 'w-11 h-6';
  const dotSize = size === 'sm' ? 'w-3 h-3' : 'w-5 h-5';
  const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex ${sizeClasses} items-center rounded-full transition-colors ${
        enabled ? 'bg-accent' : 'bg-white/20'
      }`}
    >
      <span
        className={`inline-block ${dotSize} transform rounded-full bg-white shadow transition-transform ${
          enabled ? translate : 'translate-x-0.5'
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
    <div className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-white/5">
            <Icon size={18} className="text-white/60" />
          </div>
        )}
        <div>
          <p className="text-white font-medium">{label}</p>
          {description && <p className="text-white/50 text-sm mt-0.5">{description}</p>}
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
      className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-gray-900">
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
      className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
    />
  );
}

function DaySelector({ selected, onChange }: { selected: number[]; onChange: (days: number[]) => void }) {
  const toggleDay = (day: number) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort());
    }
  };

  return (
    <div className="flex gap-1">
      {DAYS.map((day, index) => (
        <button
          key={day}
          onClick={() => toggleDay(index)}
          className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
            selected.includes(index)
              ? 'bg-accent text-white'
              : 'bg-white/10 text-white/50 hover:bg-white/20'
          }`}
        >
          {day}
        </button>
      ))}
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
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>
        <div className="space-y-1">
          <SettingRow icon={Sun} label="Theme" description="Choose your preferred color scheme">
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSetting('theme', theme)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.theme === theme
                      ? 'bg-accent text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {theme === 'dark' && <Moon size={14} className="inline mr-1" />}
                  {theme === 'light' && <Sun size={14} className="inline mr-1" />}
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
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

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Startup</h3>
        <div className="space-y-1">
          <SettingRow icon={Play} label="Start on boot" description="Launch app when you start your computer">
            <Toggle enabled={settings.startOnBoot} onChange={(v) => updateSetting('startOnBoot', v)} />
          </SettingRow>

          <SettingRow
            icon={Pause}
            label="Start minimized"
            description="Start the app in the system tray"
          >
            <Toggle
              enabled={settings.startMinimized}
              onChange={(v) => updateSetting('startMinimized', v)}
            />
          </SettingRow>

          <SettingRow
            icon={Monitor}
            label="Show in system tray"
            description="Keep the app in your system tray"
          >
            <Toggle enabled={settings.showInTray} onChange={(v) => updateSetting('showInTray', v)} />
          </SettingRow>
        </div>
      </div>
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
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Activity Tracking</h3>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              settings.trackingEnabled ? 'bg-productive/20 text-productive' : 'bg-white/10 text-white/50'
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
              onChange={(v) => updateSetting('trackingEnabled', v)}
            />
          </SettingRow>

          <SettingRow
            icon={Eye}
            label="AFK Detection"
            description="Detect when you're away from keyboard"
          >
            <Toggle enabled={settings.afkDetection} onChange={(v) => updateSetting('afkDetection', v)} />
          </SettingRow>

          <SettingRow
            icon={Clock}
            label="Idle timeout"
            description="Mark as idle after this duration of inactivity"
          >
            <Select
              value={settings.idleTimeout.toString()}
              onChange={(v) => updateSetting('idleTimeout', Number(v))}
              options={[
                { value: '60', label: '1 minute' },
                { value: '120', label: '2 minutes' },
                { value: '300', label: '5 minutes' },
                { value: '600', label: '10 minutes' },
                { value: '900', label: '15 minutes' },
              ]}
            />
          </SettingRow>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Work Schedule</h3>
        <div className="space-y-4">
          <div>
            <p className="text-white/60 text-sm mb-3">Working days</p>
            <DaySelector
              selected={settings.workDays}
              onChange={(days) => updateSetting('workDays', days)}
            />
          </div>

          <div className="flex gap-6">
            <div>
              <p className="text-white/60 text-sm mb-2">Start time</p>
              <TimeInput
                value={settings.workStartTime}
                onChange={(v) => updateSetting('workStartTime', v)}
              />
            </div>
            <div>
              <p className="text-white/60 text-sm mb-2">End time</p>
              <TimeInput
                value={settings.workEndTime}
                onChange={(v) => updateSetting('workEndTime', v)}
              />
            </div>
          </div>
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
  const [newExcludedApp, setNewExcludedApp] = useState('');

  const addExcludedApp = () => {
    if (newExcludedApp.trim() && !settings.excludedApps.includes(newExcludedApp.trim())) {
      updateSetting('excludedApps', [...settings.excludedApps, newExcludedApp.trim()]);
      setNewExcludedApp('');
    }
  };

  const removeExcludedApp = (app: string) => {
    updateSetting(
      'excludedApps',
      settings.excludedApps.filter((a) => a !== app)
    );
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Screenshot Capture</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Camera}
            label="Enable screenshots"
            description="Automatically capture screenshots at intervals"
          >
            <Toggle
              enabled={settings.screenshotsEnabled}
              onChange={(v) => updateSetting('screenshotsEnabled', v)}
            />
          </SettingRow>

          <SettingRow
            icon={Clock}
            label="Capture interval"
            description="Time between automatic screenshots"
          >
            <Select
              value={settings.screenshotInterval.toString()}
              onChange={(v) => updateSetting('screenshotInterval', Number(v))}
              options={[
                { value: '60', label: 'Every minute' },
                { value: '120', label: 'Every 2 minutes' },
                { value: '300', label: 'Every 5 minutes' },
                { value: '600', label: 'Every 10 minutes' },
                { value: '900', label: 'Every 15 minutes' },
              ]}
            />
          </SettingRow>

          <SettingRow icon={Zap} label="Quality" description="Screenshot image quality">
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((quality) => (
                <button
                  key={quality}
                  onClick={() => updateSetting('screenshotQuality', quality)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    settings.screenshotQuality === quality
                      ? 'bg-accent text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
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
              onChange={(v) => updateSetting('blurScreenshots', v)}
            />
          </SettingRow>

          <SettingRow
            icon={Trash2}
            label="Auto-delete"
            description="Automatically delete old screenshots"
          >
            <Select
              value={settings.autoDeleteAfter.toString()}
              onChange={(v) => updateSetting('autoDeleteAfter', Number(v))}
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

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Excluded Applications</h3>
        <p className="text-white/50 text-sm mb-4">
          Screenshots won't be captured when these apps are in focus
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newExcludedApp}
            onChange={(e) => setNewExcludedApp(e.target.value)}
            placeholder="Enter app name..."
            className="flex-1 bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50"
            onKeyDown={(e) => e.key === 'Enter' && addExcludedApp()}
          />
          <button
            onClick={addExcludedApp}
            className="px-4 py-2 bg-accent rounded-lg text-white font-medium hover:bg-accent/80 transition-colors"
          >
            Add
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {settings.excludedApps.map((app) => (
            <div
              key={app}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg text-sm"
            >
              <span className="text-white">{app}</span>
              <button
                onClick={() => removeExcludedApp(app)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {settings.excludedApps.length === 0 && (
            <p className="text-white/30 text-sm">No excluded apps</p>
          )}
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
            <h3 className="text-lg font-semibold text-white">OpenAI Integration</h3>
            <p className="text-white/50 text-sm">Power AI features with your OpenAI API key</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.openaiApiKey}
                  onChange={(e) => {
                    updateSetting('openaiApiKey', e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="sk-..."
                  className="w-full bg-white/10 border border-white/10 rounded-lg pl-10 pr-10 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono text-sm"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
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

            <p className="text-xs text-white/40 mt-3">
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
            <label className="block text-white/60 text-sm mb-2">Model</label>
            <div className="grid grid-cols-2 gap-3">
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => updateSetting('aiModel', model.id)}
                  className={`p-4 rounded-xl text-left transition-all ${
                    settings.aiModel === model.id
                      ? 'bg-accent/20 border-2 border-accent'
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  <p className="text-white font-medium">{model.name}</p>
                  <p className="text-white/50 text-xs mt-1">{model.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">AI Analysis</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Brain}
            label="Auto-analysis"
            description="Automatically analyze your productivity patterns"
          >
            <Toggle
              enabled={settings.autoAnalysis}
              onChange={(v) => updateSetting('autoAnalysis', v)}
            />
          </SettingRow>

          <SettingRow
            icon={RefreshCw}
            label="Analysis frequency"
            description="How often to generate AI insights"
          >
            <Select
              value={settings.analysisFrequency}
              onChange={(v) => updateSetting('analysisFrequency', v as 'hourly' | 'daily' | 'weekly')}
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
            <p className="text-white font-medium">AI Features Unlocked</p>
            <p className="text-white/60 text-sm mt-1">
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

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Privacy Mode</h3>
        <div className="space-y-1">
          <SettingRow
            icon={EyeOff}
            label="Incognito mode"
            description="Temporarily pause all tracking and screenshots"
          >
            <Toggle
              enabled={settings.incognitoMode}
              onChange={(v) => updateSetting('incognitoMode', v)}
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
        <h3 className="text-lg font-semibold text-white mb-4">Data Retention</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Database}
            label="Keep data for"
            description="Automatically delete data older than this"
          >
            <Select
              value={settings.dataRetentionDays.toString()}
              onChange={(v) => updateSetting('dataRetentionDays', Number(v))}
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
        <h3 className="text-lg font-semibold text-white mb-4">App Lock</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Lock}
            label="Enable app lock"
            description="Require PIN to access the app"
          >
            <Toggle
              enabled={settings.appLockEnabled}
              onChange={(v) => updateSetting('appLockEnabled', v)}
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
                  className="w-24 bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
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
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Bell}
            label="Enable notifications"
            description="Receive alerts and reminders"
          >
            <Toggle
              enabled={settings.notificationsEnabled}
              onChange={(v) => updateSetting('notificationsEnabled', v)}
            />
          </SettingRow>

          <SettingRow
            icon={AlertTriangle}
            label="Productivity alerts"
            description="Get notified when productivity drops"
          >
            <Toggle
              enabled={settings.productivityAlerts}
              onChange={(v) => updateSetting('productivityAlerts', v)}
            />
          </SettingRow>

          <SettingRow
            icon={Clock}
            label="Break reminders"
            description="Remind you to take regular breaks"
          >
            <Toggle
              enabled={settings.breakReminders}
              onChange={(v) => updateSetting('breakReminders', v)}
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
                onChange={(v) => updateSetting('breakInterval', Number(v))}
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
              onChange={(v) => updateSetting('soundEnabled', v)}
            />
          </SettingRow>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quiet Hours</h3>
        <div className="space-y-1">
          <SettingRow
            icon={Moon}
            label="Enable quiet hours"
            description="Mute notifications during specified hours"
          >
            <Toggle
              enabled={settings.quietHoursEnabled}
              onChange={(v) => updateSetting('quietHoursEnabled', v)}
            />
          </SettingRow>

          {settings.quietHoursEnabled && (
            <div className="flex gap-6 pt-4">
              <div>
                <p className="text-white/60 text-sm mb-2">Start</p>
                <TimeInput
                  value={settings.quietHoursStart}
                  onChange={(v) => updateSetting('quietHoursStart', v)}
                />
              </div>
              <div>
                <p className="text-white/60 text-sm mb-2">End</p>
                <TimeInput
                  value={settings.quietHoursEnd}
                  onChange={(v) => updateSetting('quietHoursEnd', v)}
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
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    // Simulate export
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setExporting(false);
  };

  const handleImport = async () => {
    setImporting(true);
    // Simulate import
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setImporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Export Data</h3>
        <p className="text-white/50 text-sm mb-4">
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
            Export All Data
          </button>

          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/10 rounded-lg text-white font-medium hover:bg-white/20 transition-colors">
            <Download size={18} />
            Export Screenshots
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Import Data</h3>
        <p className="text-white/50 text-sm mb-4">
          Restore data from a previous backup
        </p>

        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 rounded-lg text-white font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
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
        <h3 className="text-lg font-semibold text-white mb-4">Storage</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="text-white/40" size={20} />
              <span className="text-white">Activity Data</span>
            </div>
            <span className="text-white/60">128 MB</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Camera className="text-white/40" size={20} />
              <span className="text-white">Screenshots</span>
            </div>
            <span className="text-white/60">2.4 GB</span>
          </div>

          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-accent to-accent/60 rounded-full" />
          </div>
          <p className="text-white/40 text-sm">2.5 GB of 10 GB used</p>
        </div>
      </div>

      <div className="glass-card p-6 border-red-500/20">
        <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Clear all activity data</p>
              <p className="text-white/50 text-sm">This will permanently delete all tracked activity</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors">
              <Trash2 size={16} />
              Clear Data
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Delete all screenshots</p>
              <p className="text-white/50 text-sm">Remove all captured screenshots permanently</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors">
              <Trash2 size={16} />
              Delete
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Reset all settings</p>
              <p className="text-white/50 text-sm">Restore all settings to their defaults</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors">
              <RefreshCw size={16} />
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutsTab() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h3>
        <p className="text-white/50 text-sm mb-6">
          Use these shortcuts to quickly navigate and control the app
        </p>

        <div className="space-y-1">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.action}
              className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
            >
              <span className="text-white">{shortcut.action}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, index) => (
                  <span key={index}>
                    <kbd className="px-2 py-1 bg-white/10 rounded text-white/80 text-sm font-mono">
                      {key}
                    </kbd>
                    {index < shortcut.keys.length - 1 && (
                      <span className="text-white/30 mx-1">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex gap-3">
          <Keyboard className="text-white/40 flex-shrink-0" size={20} />
          <p className="text-white/60 text-sm">
            Shortcuts are currently not customizable. Custom shortcut support is coming in a future
            update.
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

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    setHasChanges(false);
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
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/60">Customize your Productify Pro experience</p>
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

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-accent text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>

          {/* Version info */}
          <div className="mt-4 p-4 text-center">
            <p className="text-white/30 text-xs">Productify Pro v1.0.0</p>
            <p className="text-white/20 text-xs mt-1">Made with care</p>
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
