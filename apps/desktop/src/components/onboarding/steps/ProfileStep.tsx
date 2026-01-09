/**
 * Profile Step - Select user profile type
 */
import { motion } from 'framer-motion';
import {
  Code,
  Palette,
  PenTool,
  Users,
  GraduationCap,
  Briefcase,
  Settings,
} from 'lucide-react';
import type { UserProfileType } from '@/lib/api/notifications';

interface ProfileStepProps {
  value: UserProfileType;
  onChange: (type: UserProfileType) => void;
  onNext: () => void;
}

const profileOptions: {
  type: UserProfileType;
  icon: typeof Code;
  emoji: string;
  label: string;
  description: string;
}[] = [
  {
    type: 'developer',
    icon: Code,
    emoji: '💻',
    label: 'Developer',
    description: 'Code, build, debug',
  },
  {
    type: 'designer',
    icon: Palette,
    emoji: '🎨',
    label: 'Designer',
    description: 'Create, design, prototype',
  },
  {
    type: 'writer',
    icon: PenTool,
    emoji: '📝',
    label: 'Writer',
    description: 'Write, edit, publish',
  },
  {
    type: 'manager',
    icon: Users,
    emoji: '📊',
    label: 'Manager',
    description: 'Lead, plan, coordinate',
  },
  {
    type: 'student',
    icon: GraduationCap,
    emoji: '🎓',
    label: 'Student',
    description: 'Learn, study, research',
  },
  {
    type: 'freelancer',
    icon: Briefcase,
    emoji: '💼',
    label: 'Freelancer',
    description: 'Multiple roles & projects',
  },
  {
    type: 'other',
    icon: Settings,
    emoji: '🔧',
    label: 'Other',
    description: 'Custom configuration',
  },
];

export function ProfileStep({ value, onChange, onNext }: ProfileStepProps) {
  const handleSelect = (type: UserProfileType) => {
    onChange(type);
  };

  return (
    <div className="text-center">
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-3"
      >
        What do you do?
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-white/60 mb-8 max-w-md mx-auto"
      >
        This helps us intelligently classify your activities and provide
        relevant insights.
      </motion.p>

      {/* Profile Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8"
      >
        {profileOptions.map((option, index) => {
          const isSelected = value === option.type;

          return (
            <motion.button
              key={option.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(option.type)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-accent bg-accent/20 shadow-lg shadow-accent/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <span className="text-2xl mb-2 block">{option.emoji}</span>
              <p
                className={`font-medium ${
                  isSelected ? 'text-white' : 'text-white/80'
                }`}
              >
                {option.label}
              </p>
              <p className="text-white/50 text-xs mt-1">{option.description}</p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Continue Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        disabled={!value}
        className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent to-purple-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </motion.button>
    </div>
  );
}

export default ProfileStep;
