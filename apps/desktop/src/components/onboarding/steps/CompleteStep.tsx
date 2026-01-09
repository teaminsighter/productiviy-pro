/**
 * Complete Step - Onboarding completion with celebration
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Rocket,
  Target,
  Brain,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { OnboardingData } from '../OnboardingFlow';

interface CompleteStepProps {
  data: OnboardingData;
  onComplete: () => void;
  isLoading: boolean;
}

// Confetti particle component
function ConfettiParticle({ delay }: { delay: number }) {
  const colors = ['#7c3aed', '#a855f7', '#22c55e', '#eab308', '#ef4444', '#3b82f6'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const x = Math.random() * 100;
  const rotation = Math.random() * 360;

  return (
    <motion.div
      initial={{ y: -20, x: `${x}vw`, opacity: 1, rotate: 0 }}
      animate={{
        y: '100vh',
        opacity: 0,
        rotate: rotation,
      }}
      transition={{
        duration: 2 + Math.random() * 2,
        delay,
        ease: 'easeIn',
      }}
      className="fixed top-0 w-2 h-2 rounded-sm z-50"
      style={{ backgroundColor: color, left: `${x}%` }}
    />
  );
}

export function CompleteStep({ data, onComplete, isLoading }: CompleteStepProps) {
  const [showConfetti, setShowConfetti] = useState(true);

  // Hide confetti after animation
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Profile type labels
  const profileLabels: Record<string, string> = {
    developer: 'Developer',
    designer: 'Designer',
    writer: 'Writer',
    manager: 'Manager',
    student: 'Student',
    freelancer: 'Freelancer',
    other: 'Custom Profile',
  };

  const tips = [
    {
      icon: Target,
      tip: 'Use Focus Mode for deep work sessions',
    },
    {
      icon: Clock,
      tip: 'Check your daily summary each evening',
    },
    {
      icon: Brain,
      tip: data.aiEnabled
        ? 'AI insights will appear on your dashboard'
        : 'Enable AI later for personalized tips',
    },
  ];

  return (
    <div className="text-center">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <ConfettiParticle key={i} delay={i * 0.05} />
          ))}
        </div>
      )}

      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          delay: 0.2,
        }}
        className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-productive to-green-400 flex items-center justify-center shadow-2xl shadow-productive/30"
      >
        <CheckCircle2 className="text-white" size={48} />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-3xl font-bold text-white mb-3"
      >
        You're All Set!
      </motion.h2>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-white/60 mb-8 max-w-md mx-auto"
      >
        Your productivity journey starts now. Let's make every minute count!
      </motion.p>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="max-w-md mx-auto mb-8 p-5 rounded-2xl bg-white/5 border border-white/10 text-left"
      >
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Sparkles className="text-accent" size={18} />
          Your Setup Summary
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Profile</span>
            <span className="text-white text-sm font-medium">
              {profileLabels[data.profileType]}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Work Apps</span>
            <span className="text-white text-sm font-medium">
              {data.workApps.length} selected
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Daily Goal</span>
            <span className="text-productive text-sm font-medium">
              {data.dailyProductiveHours}h productive
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Distraction Limit</span>
            <span className="text-distracting text-sm font-medium">
              {data.maxDistractionHours}h max
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">AI Insights</span>
            <span
              className={`text-sm font-medium ${
                data.aiEnabled ? 'text-accent' : 'text-white/50'
              }`}
            >
              {data.aiEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="max-w-md mx-auto mb-8"
      >
        <h3 className="text-white/50 text-sm mb-3">Quick Tips to Get Started</h3>
        <div className="space-y-2">
          {tips.map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
            >
              <tip.icon className="text-accent flex-shrink-0" size={18} />
              <span className="text-white/70 text-sm text-left">{tip.tip}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onComplete}
        disabled={isLoading}
        className="px-8 py-4 rounded-2xl bg-gradient-to-r from-accent to-purple-500 text-white font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto shadow-xl shadow-accent/30"
      >
        {isLoading ? (
          <>
            <Loader2 size={24} className="animate-spin" />
            Setting up...
          </>
        ) : (
          <>
            <Rocket size={24} />
            Start Tracking
          </>
        )}
      </motion.button>
    </div>
  );
}

export default CompleteStep;
