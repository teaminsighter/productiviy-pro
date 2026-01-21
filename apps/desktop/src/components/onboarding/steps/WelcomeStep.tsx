/**
 * Welcome Step - First step of onboarding
 */
import { motion } from 'framer-motion';
import { Sparkles, Target, Brain, TrendingUp, ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const features = [
    {
      icon: Target,
      title: 'Smart Tracking',
      description: 'Automatically tracks your app usage',
    },
    {
      icon: Brain,
      title: 'AI Insights',
      description: 'Get personalized productivity tips',
    },
    {
      icon: TrendingUp,
      title: 'Progress Goals',
      description: 'Set and achieve daily goals',
    },
  ];

  return (
    <div className="text-center">
      {/* Logo Animation (solid color) */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-accent flex items-center justify-center shadow-2xl shadow-accent/30"
      >
        <Sparkles className="text-white" size={48} />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl font-bold text-white mb-3"
      >
        Welcome to Productify Pro
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-white/60 text-lg mb-10 max-w-md mx-auto"
      >
        Your AI-powered productivity companion. Track, analyze, and improve your
        digital habits.
      </motion.p>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-3 gap-4 mb-10"
      >
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <feature.icon className="text-accent mx-auto mb-2" size={28} />
            <p className="text-white font-medium text-sm">{feature.title}</p>
            <p className="text-white/50 text-xs mt-1">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Button - Glass green 3D button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        whileHover={{ scale: 1.02, y: -3 }}
        whileTap={{ scale: 0.98, y: 0 }}
        onClick={onNext}
        className="px-12 py-4 text-lg font-bold text-white rounded-2xl transition-all duration-200 group"
        style={{
          background: 'rgba(16, 185, 129, 0.85)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.35), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <span className="flex items-center gap-3">
          Get Started
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </span>
      </motion.button>

      {/* Setup time */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-white/40 text-sm mt-4"
      >
        Setup takes about 2 minutes
      </motion.p>
    </div>
  );
}

export default WelcomeStep;
