import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Bug, Zap, Shield, Bell, Wrench } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Changelog - Productify Pro',
  description: 'See what\'s new in Productify Pro. Latest updates, features, and improvements.',
};

type ChangeType = 'feature' | 'improvement' | 'fix' | 'security';

interface Change {
  type: ChangeType;
  description: string;
}

interface Release {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: Change[];
}

const releases: Release[] = [
  {
    version: '1.0.0',
    date: 'January 15, 2026',
    title: 'Initial Release',
    description: 'We\'re excited to launch Productify Pro! This release includes all the core features to help you track and improve your productivity.',
    changes: [
      { type: 'feature', description: 'Desktop app for Windows and macOS with native activity tracking' },
      { type: 'feature', description: 'Chrome extension for browser activity monitoring' },
      { type: 'feature', description: 'AI-powered insights and productivity recommendations' },
      { type: 'feature', description: 'Focus mode with customizable timers and distraction blocking' },
      { type: 'feature', description: 'Goal setting and progress tracking' },
      { type: 'feature', description: 'Team collaboration features with shared dashboards' },
      { type: 'feature', description: 'Detailed analytics and productivity reports' },
      { type: 'feature', description: 'Screenshot capture with privacy blur options' },
      { type: 'security', description: 'End-to-end encryption for all sensitive data' },
      { type: 'security', description: 'GDPR and CCPA compliant data handling' },
    ],
  },
  {
    version: '0.9.0',
    date: 'December 20, 2025',
    title: 'Beta Release',
    description: 'Public beta release with all core features for early adopter testing.',
    changes: [
      { type: 'feature', description: 'Complete dashboard redesign with dark mode' },
      { type: 'feature', description: 'Weekly and monthly productivity reports' },
      { type: 'improvement', description: 'Improved activity classification accuracy by 40%' },
      { type: 'improvement', description: 'Reduced CPU usage during idle tracking' },
      { type: 'fix', description: 'Fixed timezone handling for international users' },
      { type: 'fix', description: 'Resolved sync issues between desktop and extension' },
    ],
  },
  {
    version: '0.8.0',
    date: 'November 15, 2025',
    title: 'Alpha Release',
    description: 'Initial alpha release for internal testing and early feedback.',
    changes: [
      { type: 'feature', description: 'Basic activity tracking for applications and websites' },
      { type: 'feature', description: 'User authentication and account management' },
      { type: 'feature', description: 'Simple productivity dashboard' },
      { type: 'feature', description: 'Basic goal creation and tracking' },
    ],
  },
];

const changeTypeConfig = {
  feature: {
    icon: Sparkles,
    label: 'New Feature',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-400/10',
  },
  improvement: {
    icon: Zap,
    label: 'Improvement',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  fix: {
    icon: Bug,
    label: 'Bug Fix',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
  },
  security: {
    icon: Shield,
    label: 'Security',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
};

function ChangeItem({ change }: { change: Change }) {
  const config = changeTypeConfig[change.type];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`w-6 h-6 rounded ${config.bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
      </div>
      <span className="text-gray-300">{change.description}</span>
    </div>
  );
}

function VersionBadge({ version }: { version: string }) {
  const isLatest = version === releases[0].version;

  return (
    <div className="flex items-center gap-2">
      <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-sm font-medium">
        v{version}
      </span>
      {isLatest && (
        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
          Latest
        </span>
      )}
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Changelog</h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            Stay up to date with the latest features, improvements, and fixes in Productify Pro.
          </p>

          {/* Subscribe to updates */}
          <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-800 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-indigo-400" />
              <span className="text-gray-300">Get notified about new releases</span>
            </div>
            <a
              href="https://github.com/productifypro/productify-pro/releases.atom"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Subscribe to RSS
            </a>
          </div>
        </div>
      </section>

      {/* Legend */}
      <section className="py-8 border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-wrap gap-4">
            {Object.entries(changeTypeConfig).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <div key={type} className="flex items-center gap-2 text-sm text-gray-400">
                  <div className={`w-6 h-6 rounded ${config.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                  <span>{config.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Releases */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="space-y-12">
            {releases.map((release, index) => (
              <article
                key={release.version}
                className={`relative ${index !== releases.length - 1 ? 'pb-12 border-b border-gray-800' : ''}`}
              >
                {/* Release Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <VersionBadge version={release.version} />
                  <span className="text-gray-500 text-sm">{release.date}</span>
                </div>

                <h2 className="text-2xl font-bold mb-2">{release.title}</h2>
                <p className="text-gray-400 mb-6">{release.description}</p>

                {/* Changes */}
                <div className="space-y-1">
                  {release.changes.map((change, changeIndex) => (
                    <ChangeItem key={changeIndex} change={change} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="py-16 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Wrench className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            We&apos;re constantly working on new features and improvements. Check out our roadmap to see what&apos;s next.
          </p>
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors"
          >
            View Roadmap
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Productify Pro. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-300 transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-gray-300 transition-colors">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
