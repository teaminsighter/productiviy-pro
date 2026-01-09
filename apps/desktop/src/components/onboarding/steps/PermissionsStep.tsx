/**
 * Permissions Step - Request system permissions
 */
import { motion } from 'framer-motion';
import { Shield, Camera, Rocket, Check, AlertCircle } from 'lucide-react';

interface PermissionsStepProps {
  accessibility: boolean;
  screenRecording: boolean;
  launchOnStartup: boolean;
  onChangeAccessibility: (granted: boolean) => void;
  onChangeScreenRecording: (granted: boolean) => void;
  onChangeLaunchOnStartup: (enabled: boolean) => void;
  onNext: () => void;
}

interface PermissionItemProps {
  icon: typeof Shield;
  title: string;
  description: string;
  whyNeeded: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
}

function PermissionItem({
  icon: Icon,
  title,
  description,
  whyNeeded,
  checked,
  onChange,
  required,
}: PermissionItemProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        checked
          ? 'border-accent bg-accent/10'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
      onClick={() => onChange(!checked)}
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
              : 'border-white/30 bg-transparent'
          }`}
        >
          {checked && <Check size={14} className="text-white" />}
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
  const handleRequestAccessibility = () => {
    // In a real app, this would trigger the native permission request
    // For now, we just toggle the state
    onChangeAccessibility(!accessibility);
  };

  const handleRequestScreenRecording = () => {
    // In a real app, this would trigger the native permission request
    onChangeScreenRecording(!screenRecording);
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
        />

        <PermissionItem
          icon={Camera}
          title="Screen Recording"
          description="Optional: Capture screenshots for visual timeline"
          whyNeeded="Screenshots help you remember what you were working on. Stored locally only."
          checked={screenRecording}
          onChange={handleRequestScreenRecording}
        />

        <PermissionItem
          icon={Rocket}
          title="Launch on Startup"
          description="Start tracking automatically when you log in"
          whyNeeded="Ensures you never miss tracking your work sessions."
          checked={launchOnStartup}
          onChange={onChangeLaunchOnStartup}
          required
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
        <p>
          On macOS, you may be prompted to grant permissions in System Settings.
          Follow the on-screen instructions.
        </p>
      </motion.div>

      {/* Continue Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
      >
        Continue
      </motion.button>
    </div>
  );
}

export default PermissionsStep;
