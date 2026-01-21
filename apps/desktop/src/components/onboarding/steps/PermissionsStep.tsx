/**
 * Permissions Step - Request system permissions
 */
import { motion } from 'framer-motion';
import { Shield, Camera, Rocket, Check, AlertCircle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { isTauri } from '@/lib/tauri';

interface PermissionsStepProps {
  accessibility: boolean;
  screenRecording: boolean;
  launchOnStartup: boolean;
  onChangeAccessibility: (granted: boolean) => void;
  onChangeScreenRecording: (granted: boolean) => void;
  onChangeLaunchOnStartup: (enabled: boolean) => void;
  onNext: () => void;
}

interface PermissionStatus {
  granted: boolean;
  can_request: boolean;
}

interface PermissionItemProps {
  icon: typeof Shield;
  title: string;
  description: string;
  whyNeeded: string;
  checked: boolean;
  onChange: () => void;
  required?: boolean;
  isLoading?: boolean;
  isNativePermission?: boolean;
  platform?: string;
}

function PermissionItem({
  icon: Icon,
  title,
  description,
  whyNeeded,
  checked,
  onChange,
  required,
  isLoading,
  isNativePermission,
  platform,
}: PermissionItemProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        checked
          ? 'border-accent bg-accent/10'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
      onClick={onChange}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-xl ${
            checked ? 'bg-accent' : 'bg-white/10'
          }`}
        >
          <Icon className={checked ? 'text-white' : 'text-white/50'} size={24} />
        </div>

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium">{title}</h3>
            {required && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">
                Recommended
              </span>
            )}
            {isNativePermission && platform === 'macos' && !checked && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center gap-1">
                <ExternalLink size={10} />
                Opens Settings
              </span>
            )}
          </div>
          <p className="text-white/50 text-sm mt-1">{description}</p>
          <p className="text-white/30 text-xs mt-2 flex items-start gap-1">
            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
            {whyNeeded}
          </p>
        </div>

        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            checked
              ? 'border-accent bg-accent'
              : isLoading
              ? 'border-blue-400 bg-blue-500/20'
              : 'border-white/30 bg-transparent'
          }`}
        >
          {isLoading ? (
            <Loader2 size={14} className="text-blue-400 animate-spin" />
          ) : checked ? (
            <Check size={14} className="text-white" />
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export function PermissionsStep({
  accessibility,
  screenRecording,
  launchOnStartup,
  onChangeAccessibility,
  onChangeScreenRecording,
  onChangeLaunchOnStartup,
  onNext,
}: PermissionsStepProps) {
  const [platform, setPlatform] = useState<string>('unknown');
  const [isCheckingAccessibility, setIsCheckingAccessibility] = useState(false);
  const [isCheckingScreenRecording, setIsCheckingScreenRecording] = useState(false);
  const [isRequestingAccessibility, setIsRequestingAccessibility] = useState(false);
  const [isRequestingScreenRecording, setIsRequestingScreenRecording] = useState(false);

  // Check permissions on mount and periodically
  const checkPermissions = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');

      // Check accessibility permission
      setIsCheckingAccessibility(true);
      try {
        const accessibilityStatus = await invoke<PermissionStatus>('check_accessibility_permission');
        onChangeAccessibility(accessibilityStatus.granted);
      } catch (err) {
        console.error('Failed to check accessibility permission:', err);
      } finally {
        setIsCheckingAccessibility(false);
      }

      // Check screen recording permission
      setIsCheckingScreenRecording(true);
      try {
        const screenRecordingStatus = await invoke<PermissionStatus>('check_screen_recording_permission');
        onChangeScreenRecording(screenRecordingStatus.granted);
      } catch (err) {
        console.error('Failed to check screen recording permission:', err);
      } finally {
        setIsCheckingScreenRecording(false);
      }
    } catch (err) {
      console.error('Failed to check permissions:', err);
    }
  }, [onChangeAccessibility, onChangeScreenRecording]);

  // Get platform and check permissions on mount
  useEffect(() => {
    const init = async () => {
      if (!isTauri()) {
        setPlatform('web');
        return;
      }

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const detectedPlatform = await invoke<string>('get_platform');
        setPlatform(detectedPlatform);
      } catch (err) {
        console.error('Failed to get platform:', err);
      }

      // Check permissions
      await checkPermissions();
    };

    init();
  }, [checkPermissions]);

  // Poll for permission changes while on this step (user might grant in System Preferences)
  useEffect(() => {
    if (!isTauri() || platform !== 'macos') return;

    const interval = setInterval(() => {
      checkPermissions();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [platform, checkPermissions]);

  const handleRequestAccessibility = async () => {
    if (!isTauri()) {
      onChangeAccessibility(!accessibility);
      return;
    }

    if (accessibility) {
      // Already granted, no action needed
      return;
    }

    setIsRequestingAccessibility(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('request_accessibility_permission');
      // System Preferences will open - user grants there
      // The polling will detect when permission is granted
    } catch (err) {
      console.error('Failed to request accessibility permission:', err);
    } finally {
      setIsRequestingAccessibility(false);
    }
  };

  const handleRequestScreenRecording = async () => {
    if (!isTauri()) {
      onChangeScreenRecording(!screenRecording);
      return;
    }

    if (screenRecording) {
      // Already granted, no action needed
      return;
    }

    setIsRequestingScreenRecording(true);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('request_screen_recording_permission');
      // System Preferences will open - user grants there
    } catch (err) {
      console.error('Failed to request screen recording permission:', err);
    } finally {
      setIsRequestingScreenRecording(false);
    }
  };

  const handleLaunchOnStartup = async () => {
    if (!isTauri()) {
      onChangeLaunchOnStartup(!launchOnStartup);
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const newValue = !launchOnStartup;
      await invoke('set_autostart', { enabled: newValue });
      onChangeLaunchOnStartup(newValue);
    } catch (err) {
      console.error('Failed to set autostart:', err);
      // Toggle anyway for UI feedback
      onChangeLaunchOnStartup(!launchOnStartup);
    }
  };

  return (
    <div className="text-center">
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-3"
      >
        App Permissions
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-white/60 mb-8 max-w-md mx-auto"
      >
        Grant permissions to enable all features. Your privacy is our priority -
        all data stays on your device.
      </motion.p>

      {/* Permissions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 max-w-lg mx-auto mb-8"
      >
        <PermissionItem
          icon={Shield}
          title="Accessibility Access"
          description="Track active windows and applications"
          whyNeeded="Required to detect which app you're using and track your time accurately."
          checked={accessibility}
          onChange={handleRequestAccessibility}
          required
          isLoading={isCheckingAccessibility || isRequestingAccessibility}
          isNativePermission={true}
          platform={platform}
        />

        <PermissionItem
          icon={Camera}
          title="Screen Recording"
          description="Optional: Capture screenshots for visual timeline"
          whyNeeded="Screenshots help you remember what you were working on. Stored locally only."
          checked={screenRecording}
          onChange={handleRequestScreenRecording}
          isLoading={isCheckingScreenRecording || isRequestingScreenRecording}
          isNativePermission={true}
          platform={platform}
        />

        <PermissionItem
          icon={Rocket}
          title="Launch on Startup"
          description="Start tracking automatically when you log in"
          whyNeeded="Ensures you never miss tracking your work sessions."
          checked={launchOnStartup}
          onChange={handleLaunchOnStartup}
          required
          isNativePermission={false}
          platform={platform}
        />
      </motion.div>

      {/* Privacy Note */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="max-w-md mx-auto mb-8 p-4 rounded-xl bg-productive/10 border border-productive/30"
      >
        <div className="flex items-start gap-3">
          <Shield className="text-productive flex-shrink-0" size={20} />
          <div className="text-left">
            <p className="text-productive font-medium text-sm">Your Privacy Matters</p>
            <p className="text-white/50 text-xs mt-1">
              All data is stored locally on your device. We never send your activity
              data to external servers. AI processing (if enabled) uses only
              aggregated statistics.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Platform-specific instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-white/40 text-xs mb-6 max-w-md mx-auto"
      >
        {platform === 'macos' ? (
          <div className="space-y-2">
            <p>
              Click on a permission to open System Settings. After granting access,
              the status will update automatically.
            </p>
            <button
              onClick={checkPermissions}
              className="inline-flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
            >
              <RefreshCw size={12} />
              Refresh permission status
            </button>
          </div>
        ) : platform === 'windows' ? (
          <p>
            Windows manages permissions automatically. Click Continue to proceed.
          </p>
        ) : (
          <p>
            Permissions will be requested when needed.
          </p>
        )}
      </motion.div>

      {/* Continue Button - Glass green 3D button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.02, y: -3 }}
        whileTap={{ scale: 0.98, y: 0 }}
        onClick={onNext}
        className="px-10 py-4 rounded-2xl text-white font-semibold transition-all"
        style={{
          background: 'rgba(16, 185, 129, 0.85)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.35), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        Continue
      </motion.button>
    </div>
  );
}

export default PermissionsStep;
