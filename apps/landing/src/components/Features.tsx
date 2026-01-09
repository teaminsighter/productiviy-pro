'use client';

import { motion } from 'framer-motion';
import {
  BarChart3, Brain, Camera, Clock, Target, Shield,
  Users, Bell, Laptop, Chrome
} from 'lucide-react';

const features = [
  {
    icon: Clock,
    title: 'Automatic Time Tracking',
    description: 'Tracks your apps and websites automatically. No manual input needed.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Get personalized recommendations to improve your productivity.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: BarChart3,
    title: 'Beautiful Analytics',
    description: 'Visualize your productivity with stunning charts and reports.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: Target,
    title: 'Goals & Streaks',
    description: 'Set daily goals and maintain streaks to stay motivated.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Camera,
    title: 'Smart Screenshots',
    description: 'Automatic screenshots to review your work and stay accountable.',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Bell,
    title: 'Focus Alerts',
    description: 'Get notified when you spend too much time on distractions.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: Users,
    title: 'Team Dashboard',
    description: 'Track team productivity with privacy controls.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your data is encrypted and never shared. You control everything.',
    color: 'from-teal-500 to-green-500',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything you need to{' '}
            <span className="gradient-text">stay focused</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Powerful features to help you understand and improve your digital habits.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative glass rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Platform Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <p className="text-gray-500 mb-6">Available on your favorite platforms</p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-gray-400">
              <Laptop className="w-6 h-6" />
              <span>Windows</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Laptop className="w-6 h-6" />
              <span>macOS</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Chrome className="w-6 h-6" />
              <span>Chrome Extension</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
