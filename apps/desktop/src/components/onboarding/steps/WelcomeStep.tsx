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
      {/* Logo Animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-2xl shadow-accent/30"
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

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNext}
        className="relative px-10 py-4 text-lg font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl shadow-2xl transform transition-all duration-300 hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] active:scale-95 group"
      >
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></span>
        <span className="flex items-center gap-2">
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
