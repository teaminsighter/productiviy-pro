'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download as DownloadIcon, Apple, Monitor, Chrome, ArrowRight, ExternalLink } from 'lucide-react';

// GitHub releases base URL - Update this to your actual repo
const GITHUB_RELEASES_URL = 'https://github.com/teaminsighter/productiviy-pro/releases';
const CHROME_WEBSTORE_URL = 'https://chrome.google.com/webstore/detail/productify-pro';

type Platform = 'windows' | 'macos' | 'chrome' | 'unknown';

const platforms = [
  {
    id: 'windows' as Platform,
    name: 'Windows',
    icon: Monitor,
    version: 'v1.0.0',
    size: '45 MB',
    requirements: 'Windows 10 or later',
    downloadUrl: `${GITHUB_RELEASES_URL}/latest/download/Productify-Pro-Setup-1.0.0.exe`,
    color: 'from-blue-500 to-cyan-500',
    steps: [
      'Download the installer',
      'Run ProductifyPro-Setup.exe',
      'Follow installation wizard',
      'Sign in and start tracking',
    ],
  },
  {
    id: 'macos' as Platform,
    name: 'macOS',
    icon: Apple,
    version: 'v1.0.0',
    size: '52 MB',
    requirements: 'macOS 11 Big Sur or later',
    downloadUrl: `${GITHUB_RELEASES_URL}/latest/download/Productify-Pro-1.0.0.dmg`,
    color: 'from-gray-500 to-gray-700',
    steps: [
      'Download the DMG file',
      'Open and drag to Applications',
      'Grant accessibility permissions',
      'Sign in and start tracking',
    ],
  },
  {
    id: 'chrome' as Platform,
    name: 'Chrome Extension',
    icon: Chrome,
    version: 'v1.0.0',
    size: '2 MB',
    requirements: 'Chrome 90 or later',
    downloadUrl: CHROME_WEBSTORE_URL,
    color: 'from-yellow-500 to-orange-500',
    steps: [
      'Visit Chrome Web Store',
      'Click "Add to Chrome"',
      'Confirm installation',
      'Pin extension and sign in',
    ],
  },
];

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() || '';

  if (platform.includes('win') || userAgent.includes('windows')) {
    return 'windows';
  }
  if (platform.includes('mac') || userAgent.includes('macintosh') || userAgent.includes('mac os')) {
    return 'macos';
  }

  return 'unknown';
}

export default function Download() {
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    setDetectedPlatform(detectPlatform());
  }, []);

  // Sort platforms to show detected platform first
  const sortedPlatforms = [...platforms].sort((a, b) => {
    if (a.id === detectedPlatform) return -1;
    if (b.id === detectedPlatform) return 1;
    return 0;
  });

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
          {detectedPlatform !== 'unknown' && (
            <p className="text-sm text-indigo-400 mt-2">
              We detected you&apos;re using {detectedPlatform === 'macos' ? 'macOS' : 'Windows'} -
              we&apos;ve highlighted the best option for you.
            </p>
          )}
        </motion.div>

        {/* Platform Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {sortedPlatforms.map((platform, index) => {
            const isRecommended = platform.id === detectedPlatform;

            return (
              <motion.div
                key={platform.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`glass rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 relative ${
                  isRecommended ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                {/* Recommended Badge */}
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-indigo-500 text-white text-xs font-medium rounded-full">
                      Recommended for you
                    </span>
                  </div>
                )}

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
                  target={platform.id === 'chrome' ? '_blank' : undefined}
                  rel={platform.id === 'chrome' ? 'noopener noreferrer' : undefined}
                  className={`group flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium bg-gradient-to-r ${platform.color} hover:opacity-90 transition-opacity`}
                >
                  {platform.id === 'chrome' ? (
                    <ExternalLink className="w-5 h-5" />
                  ) : (
                    <DownloadIcon className="w-5 h-5" />
                  )}
                  {platform.id === 'chrome' ? 'Get from Chrome Store' : `Download for ${platform.name}`}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* All Releases Link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-8"
        >
          <a
            href={GITHUB_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <span>View all releases on GitHub</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

        {/* System Requirements Link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-4"
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
