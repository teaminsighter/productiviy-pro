import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Timer,
  Target,
  Zap,
  Coffee,
  Shield,
  Bell,
  Play,
  Sparkles,
} from 'lucide-react';
import { useFocusTimer } from '@/hooks/useFocus';

interface FocusSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DurationOption {
  label: string;
  value: number;
  description: string;
  icon: React.ElementType;
  recommended?: boolean;
}

const durationOptions: DurationOption[] = [
  {
    label: '25 min',
    value: 25 * 60,
    description: 'Pomodoro technique',
    icon: Timer,
  },
  {
    label: '45 min',
    value: 45 * 60,
    description: 'Deep work session',
    icon: Target,
    recommended: true,
  },
  {
    label: '60 min',
    value: 60 * 60,
    description: 'Extended focus',
    icon: Zap,
  },
  {
    label: '90 min',
    value: 90 * 60,
    description: 'Full flow state',
    icon: Sparkles,
  },
];

export function FocusSetupModal({ isOpen, onClose }: FocusSetupModalProps) {
  const { start } = useFocusTimer();
  const [selectedDuration, setSelectedDuration] = useState<number>(45 * 60);
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [useCustom, setUseCustom] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [blockDistractions, setBlockDistractions] = useState(true);
  const [breakReminder, setBreakReminder] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const duration = useCustom ? customDuration * 60 : selectedDuration;
      await start(duration, sessionName || undefined, blockDistractions);
      onClose();
    } catch (error) {
      console.error('Failed to start focus session:', error);
    }
    setIsStarting(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
    }
    return `${mins}m`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/20">
                    <Target className="text-accent" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Start Focus Session</h2>
                    <p className="text-white/50 text-sm">Configure your focus time</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5">
                {/* Session Name */}
                <div>
                  <label className="block text-white/70 text-sm mb-2">
                    Session Name (optional)
                  </label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="e.g., Work on project..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-accent/50 focus:outline-none transition-colors"
                  />
                </div>

                {/* Duration Selection */}
                <div>
                  <label className="block text-white/70 text-sm mb-3">Duration</label>
                  <div className="grid grid-cols-2 gap-2">
                    {durationOptions.map((option) => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedDuration(option.value);
                          setUseCustom(false);
                        }}
                        className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          !useCustom && selectedDuration === option.value
                            ? 'border-accent bg-accent/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <option.icon
                          className={
                            !useCustom && selectedDuration === option.value
                              ? 'text-accent'
                              : 'text-white/50'
                          }
                          size={20}
                        />
                        <div className="text-left">
                          <p className="text-white font-medium">{option.label}</p>
                          <p className="text-white/40 text-xs">{option.description}</p>
                        </div>
                        {option.recommended && (
                          <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px]">
                            Best
                          </span>
                        )}
                      </motion.button>
                    ))}
                  </div>

                  {/* Custom Duration */}
                  <div className="mt-3">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setUseCustom(true)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        useCustom
                          ? 'border-accent bg-accent/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <Coffee className={useCustom ? 'text-accent' : 'text-white/50'} size={20} />
                      <span className="text-white">Custom Duration</span>
                    </motion.button>

                    {useCustom && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 flex items-center gap-3"
                      >
                        <input
                          type="number"
                          value={customDuration}
                          onChange={(e) => setCustomDuration(Math.max(1, parseInt(e.target.value) || 0))}
                          min={1}
                          max={180}
                          className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-center focus:border-accent/50 focus:outline-none"
                        />
                        <span className="text-white/50">minutes</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {/* Block Distractions */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Shield className="text-yellow-400" size={20} />
                      <div>
                        <p className="text-white text-sm">Block Distractions</p>
                        <p className="text-white/40 text-xs">Alert when opening distracting apps</p>
                      </div>
                    </div>
                    <div
                      className={`w-11 h-6 rounded-full p-1 transition-colors ${
                        blockDistractions ? 'bg-accent' : 'bg-white/20'
                      }`}
                      onClick={() => setBlockDistractions(!blockDistractions)}
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full bg-white"
                        animate={{ x: blockDistractions ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </label>

                  {/* Break Reminder */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <Bell className="text-blue-400" size={20} />
                      <div>
                        <p className="text-white text-sm">Break Reminder</p>
                        <p className="text-white/40 text-xs">Notify when session completes</p>
                      </div>
                    </div>
                    <div
                      className={`w-11 h-6 rounded-full p-1 transition-colors ${
                        breakReminder ? 'bg-accent' : 'bg-white/20'
                      }`}
                      onClick={() => setBreakReminder(!breakReminder)}
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full bg-white"
                        animate={{ x: breakReminder ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-white/10 bg-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/50 text-sm">Duration:</span>
                  <span className="text-white font-medium">
                    {formatDuration(useCustom ? customDuration * 60 : selectedDuration)}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStart}
                  disabled={isStarting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-purple-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isStarting ? (
                    <>
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Start Focus Session
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default FocusSetupModal;
