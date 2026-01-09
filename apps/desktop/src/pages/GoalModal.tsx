import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Target,
  Clock,
  Zap,
  Shield,
  Layers,
  Bell,
  Save,
} from 'lucide-react';
import { useCreateGoal, useUpdateGoal } from '@/hooks/useGoals';
import type { Goal, GoalType, GoalFrequency, GoalCreate } from '@/lib/api/goals';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: Goal | null;
}

const goalTypes = [
  {
    type: 'productive_hours' as GoalType,
    label: 'Productive Hours',
    description: 'Track hours of productive work',
    icon: Clock,
    unit: 'hours',
  },
  {
    type: 'focus_sessions' as GoalType,
    label: 'Focus Sessions',
    description: 'Complete focus sessions',
    icon: Target,
    unit: 'sessions',
  },
  {
    type: 'app_specific' as GoalType,
    label: 'App Specific',
    description: 'Time in a specific app',
    icon: Layers,
    unit: 'hours',
  },
  {
    type: 'category_limit' as GoalType,
    label: 'Category Limit',
    description: 'Limit time in a category',
    icon: Shield,
    unit: 'hours max',
  },
  {
    type: 'distraction_limit' as GoalType,
    label: 'Distraction Limit',
    description: 'Limit distracting activities',
    icon: Zap,
    unit: 'hours max',
  },
];

const categories = [
  'Development',
  'Communication',
  'Design',
  'Research',
  'Entertainment',
  'Social Media',
  'Gaming',
  'Productivity',
  'Other',
];

const commonApps = [
  'VS Code',
  'Cursor',
  'Slack',
  'Discord',
  'Chrome',
  'Firefox',
  'Safari',
  'Figma',
  'Notion',
  'Terminal',
];

export function GoalModal({ isOpen, onClose, goal }: GoalModalProps) {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('productive_hours');
  const [targetValue, setTargetValue] = useState(4);
  const [frequency, setFrequency] = useState<GoalFrequency>('daily');
  const [targetApp, setTargetApp] = useState('');
  const [targetCategory, setTargetCategory] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setDescription(goal.description || '');
      setGoalType(goal.goal_type);
      setTargetValue(goal.target_value);
      setFrequency(goal.frequency);
      setTargetApp(goal.target_app || '');
      setTargetCategory(goal.target_category || '');
      setNotifications(goal.notifications_enabled);
    } else {
      // Reset form for new goal
      setName('');
      setDescription('');
      setGoalType('productive_hours');
      setTargetValue(4);
      setFrequency('daily');
      setTargetApp('');
      setTargetCategory('');
      setNotifications(true);
    }
  }, [goal, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);

    try {
      const goalData: GoalCreate = {
        name: name.trim(),
        description: description.trim() || undefined,
        goal_type: goalType,
        target_value: targetValue,
        frequency,
        target_app: goalType === 'app_specific' ? targetApp : undefined,
        target_category: goalType === 'category_limit' ? targetCategory : undefined,
        notifications_enabled: notifications,
      };

      if (goal) {
        await updateGoal.mutateAsync({
          goalId: goal.id,
          goal: {
            name: goalData.name,
            description: goalData.description,
            target_value: goalData.target_value,
            notifications_enabled: goalData.notifications_enabled,
          },
        });
      } else {
        await createGoal.mutateAsync(goalData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save goal:', error);
    }

    setIsSaving(false);
  };

  const selectedType = goalTypes.find((t) => t.type === goalType);

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-white/10 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/20">
                    <Target className="text-accent" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {goal ? 'Edit Goal' : 'Create Goal'}
                    </h2>
                    <p className="text-white/50 text-sm">Set up your productivity target</p>
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
                {/* Goal Name */}
                <div>
                  <label className="block text-white/70 text-sm mb-2">Goal Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Code for 4 hours daily"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-accent/50 focus:outline-none transition-colors"
                  />
                </div>

                {/* Goal Type */}
                {!goal && (
                  <div>
                    <label className="block text-white/70 text-sm mb-3">Goal Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {goalTypes.map((type) => (
                        <motion.button
                          key={type.type}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setGoalType(type.type)}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                            goalType === type.type
                              ? 'border-accent bg-accent/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <type.icon
                            className={goalType === type.type ? 'text-accent' : 'text-white/50'}
                            size={20}
                          />
                          <div>
                            <p className="text-white text-sm font-medium">{type.label}</p>
                            <p className="text-white/40 text-xs">{type.description}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target Value */}
                <div>
                  <label className="block text-white/70 text-sm mb-2">
                    Target ({selectedType?.unit || 'value'})
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValue(Math.max(0.5, parseFloat(e.target.value) || 0))}
                      min={0.5}
                      step={0.5}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent/50 focus:outline-none"
                    />
                    <span className="text-white/50">{selectedType?.unit}</span>
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <label className="block text-white/70 text-sm mb-2">Frequency</label>
                  <div className="flex gap-2">
                    {(['daily', 'weekly'] as GoalFrequency[]).map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setFrequency(freq)}
                        className={`flex-1 py-3 rounded-xl border transition-all ${
                          frequency === freq
                            ? 'border-accent bg-accent/10 text-white'
                            : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                        }`}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* App Selector (for app_specific goals) */}
                {goalType === 'app_specific' && (
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Target App</label>
                    <select
                      value={targetApp}
                      onChange={(e) => setTargetApp(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent/50 focus:outline-none"
                    >
                      <option value="">Select an app...</option>
                      {commonApps.map((app) => (
                        <option key={app} value={app}>
                          {app}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={targetApp}
                      onChange={(e) => setTargetApp(e.target.value)}
                      placeholder="Or type custom app name"
                      className="w-full mt-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-accent/50 focus:outline-none text-sm"
                    />
                  </div>
                )}

                {/* Category Selector (for category_limit goals) */}
                {goalType === 'category_limit' && (
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Target Category</label>
                    <select
                      value={targetCategory}
                      onChange={(e) => setTargetCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent/50 focus:outline-none"
                    >
                      <option value="">Select a category...</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat.toLowerCase()}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-white/70 text-sm mb-2">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add notes about this goal..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-accent/50 focus:outline-none resize-none"
                  />
                </div>

                {/* Notifications Toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell className="text-blue-400" size={20} />
                    <div>
                      <p className="text-white text-sm">Notifications</p>
                      <p className="text-white/40 text-xs">Get alerts about progress</p>
                    </div>
                  </div>
                  <div
                    className={`w-11 h-6 rounded-full p-1 transition-colors ${
                      notifications ? 'bg-accent' : 'bg-white/20'
                    }`}
                    onClick={() => setNotifications(!notifications)}
                  >
                    <motion.div
                      className="w-4 h-4 rounded-full bg-white"
                      animate={{ x: notifications ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </div>
                </label>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 p-5 border-t border-white/10 bg-white/5">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving || !name.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-accent to-purple-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {goal ? 'Update Goal' : 'Create Goal'}
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

export default GoalModal;
