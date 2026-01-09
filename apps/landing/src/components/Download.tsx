'use client';

import { motion } from 'framer-motion';
import { Download as DownloadIcon, Apple, Monitor, Chrome, CheckCircle, ArrowRight } from 'lucide-react';

const platforms = [
  {
    name: 'Windows',
    icon: Monitor,
    version: 'v1.0.0',
    size: '45 MB',
    requirements: 'Windows 10 or later',
    downloadUrl: '/downloads/productify-pro-win.exe',
    color: 'from-blue-500 to-cyan-500',
    steps: [
      'Download the installer',
      'Run ProductifyPro-Setup.exe',
      'Follow installation wizard',
      'Sign in and start tracking',
    ],
  },
  {
    name: 'macOS',
    icon: Apple,
    version: 'v1.0.0',
    size: '52 MB',
    requirements: 'macOS 11 Big Sur or later',
    downloadUrl: '/downloads/productify-pro-mac.dmg',
    color: 'from-gray-500 to-gray-700',
    steps: [
      'Download the DMG file',
      'Open and drag to Applications',
      'Grant accessibility permissions',
      'Sign in and start tracking',
    ],
  },
  {
    name: 'Chrome Extension',
    icon: Chrome,
    version: 'v1.0.0',
    size: '2 MB',
    requirements: 'Chrome 90 or later',
    downloadUrl: 'https://chrome.google.com/webstore',
    color: 'from-yellow-500 to-orange-500',
    steps: [
      'Visit Chrome Web Store',
      'Click "Add to Chrome"',
      'Confirm installation',
      'Pin extension and sign in',
    ],
  },
];

export default function Download() {
  return (
    <section id="download" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Download{' '}
            <span className="gradient-text">Productify Pro</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Get started in minutes. Available for all major platforms.
          </p>
        </motion.div>

        {/* Platform Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
            >
              {/* Platform Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${platform.color} flex items-center justify-center`}>
                  <platform.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{platform.name}</h3>
                  <p className="text-sm text-gray-500">
                    {platform.version} • {platform.size}
                  </p>
                </div>
              </div>

              {/* Requirements */}
              <p className="text-sm text-gray-400 mb-4">
                Requires: {platform.requirements}
              </p>

              {/* Setup Steps */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-300 mb-3">Quick Setup:</p>
                <ol className="space-y-2">
                  {platform.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs flex-shrink-0">
                        {stepIndex + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Download Button */}
              <a
                href={platform.downloadUrl}
                className={`group flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium bg-gradient-to-r ${platform.color} hover:opacity-90 transition-opacity`}
              >
                <DownloadIcon className="w-5 h-5" />
                Download for {platform.name}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          ))}
        </div>

        {/* System Requirements Link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-gray-500">
            Need help?{' '}
            <a href="/docs/installation" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              View detailed installation guide
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
