import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Apple, Monitor, Chrome, Download, Shield, Terminal, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Installation Guide - Productify Pro',
  description: 'Step-by-step installation guide for Productify Pro on Windows, macOS, and Chrome.',
};

const platforms = [
  {
    id: 'windows',
    name: 'Windows',
    icon: Monitor,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    requirements: [
      'Windows 10 (version 1903 or later) or Windows 11',
      '4 GB RAM minimum (8 GB recommended)',
      '200 MB free disk space',
      'Administrator privileges for installation',
    ],
    steps: [
      {
        title: 'Download the Installer',
        description: 'Download the latest Windows installer (.exe) from our releases page.',
        code: null,
      },
      {
        title: 'Run the Installer',
        description: 'Double-click the downloaded file (ProductifyPro-Setup-x.x.x.exe) and follow the installation wizard.',
        code: null,
      },
      {
        title: 'Grant Permissions',
        description: 'When prompted by Windows Defender SmartScreen, click "More info" then "Run anyway". The app is signed and safe.',
        code: null,
      },
      {
        title: 'Complete Setup',
        description: 'Choose your installation directory, decide if you want the app to start with Windows, and click Install.',
        code: null,
      },
      {
        title: 'Sign In',
        description: 'Launch Productify Pro from the Start menu or desktop shortcut and sign in with your account.',
        code: null,
      },
    ],
    troubleshooting: [
      {
        issue: 'App won\'t start after installation',
        solution: 'Try running as administrator. Right-click the app icon and select "Run as administrator".',
      },
      {
        issue: 'Activity tracking not working',
        solution: 'Ensure the app has accessibility permissions. Go to Windows Settings > Privacy > Activity history.',
      },
    ],
  },
  {
    id: 'macos',
    name: 'macOS',
    icon: Apple,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    requirements: [
      'macOS 11 Big Sur or later',
      'Apple Silicon (M1/M2) or Intel processor',
      '4 GB RAM minimum',
      '200 MB free disk space',
    ],
    steps: [
      {
        title: 'Download the DMG',
        description: 'Download the latest macOS installer (.dmg) from our releases page.',
        code: null,
      },
      {
        title: 'Open the DMG',
        description: 'Double-click the downloaded file to mount it.',
        code: null,
      },
      {
        title: 'Drag to Applications',
        description: 'Drag the Productify Pro icon to the Applications folder.',
        code: null,
      },
      {
        title: 'First Launch',
        description: 'Open Productify Pro from Applications. You may need to right-click and select "Open" the first time due to Gatekeeper.',
        code: null,
      },
      {
        title: 'Grant Accessibility Permissions',
        description: 'Go to System Settings > Privacy & Security > Accessibility and enable Productify Pro. This is required for activity tracking.',
        code: 'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"',
      },
      {
        title: 'Grant Screen Recording Permission (Optional)',
        description: 'For screenshot capture, enable Screen Recording in System Settings > Privacy & Security > Screen Recording.',
        code: null,
      },
      {
        title: 'Sign In',
        description: 'Sign in with your account to start tracking.',
        code: null,
      },
    ],
    troubleshooting: [
      {
        issue: '"Productify Pro is damaged" error',
        solution: 'Open Terminal and run: xattr -cr /Applications/Productify\\ Pro.app',
      },
      {
        issue: 'App not appearing in Accessibility list',
        solution: 'Try removing and re-adding the app, or restart your Mac.',
      },
      {
        issue: 'Activity tracking not working',
        solution: 'Ensure Accessibility permission is granted. The app icon should have a checkmark in System Settings.',
      },
    ],
  },
  {
    id: 'chrome',
    name: 'Chrome Extension',
    icon: Chrome,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    requirements: [
      'Google Chrome version 90 or later',
      'Chrome Web Store access',
      'Signed in to Chrome (recommended for sync)',
    ],
    steps: [
      {
        title: 'Visit Chrome Web Store',
        description: 'Go to the Productify Pro extension page on the Chrome Web Store.',
        code: null,
      },
      {
        title: 'Add to Chrome',
        description: 'Click "Add to Chrome" and confirm by clicking "Add extension" in the popup.',
        code: null,
      },
      {
        title: 'Pin the Extension',
        description: 'Click the puzzle piece icon in Chrome\'s toolbar, then click the pin icon next to Productify Pro.',
        code: null,
      },
      {
        title: 'Sign In',
        description: 'Click the extension icon and sign in with your Productify Pro account.',
        code: null,
      },
    ],
    troubleshooting: [
      {
        issue: 'Extension not syncing with desktop app',
        solution: 'Ensure you\'re signed in with the same account on both. Check the sync status in the extension popup.',
      },
      {
        issue: 'Extension icon is grayed out',
        solution: 'The extension doesn\'t work on chrome:// pages or the Chrome Web Store. Navigate to a regular website.',
      },
    ],
  },
];

export default function InstallationPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Installation Guide</h1>
          <p className="text-xl text-gray-400 max-w-2xl">
            Get Productify Pro up and running on your device. Choose your platform below for detailed instructions.
          </p>
        </div>
      </section>

      {/* Platform Navigation */}
      <section className="py-8 border-b border-gray-800 sticky top-0 bg-gray-950/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-4 overflow-x-auto">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <a
                  key={platform.id}
                  href={`#${platform.id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Icon className={`w-5 h-5 ${platform.color}`} />
                  <span>{platform.name}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Platform Guides */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 space-y-20">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <article key={platform.id} id={platform.id} className="scroll-mt-32">
                {/* Platform Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-xl ${platform.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-7 h-7 ${platform.color}`} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{platform.name}</h2>
                    <p className="text-gray-400">Installation instructions</p>
                  </div>
                </div>

                {/* Requirements */}
                <div className="mb-8 p-4 bg-gray-900 rounded-lg border border-gray-800">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-400" />
                    System Requirements
                  </h3>
                  <ul className="space-y-2">
                    {platform.requirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-300">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Steps */}
                <div className="mb-8">
                  <h3 className="font-semibold mb-4">Installation Steps</h3>
                  <ol className="space-y-6">
                    {platform.steps.map((step, index) => (
                      <li key={index} className="relative pl-10">
                        <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <h4 className="font-medium mb-1">{step.title}</h4>
                        <p className="text-gray-400">{step.description}</p>
                        {step.code && (
                          <div className="mt-2 p-3 bg-gray-900 rounded-lg font-mono text-sm flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-gray-500" />
                            <code className="text-green-400">{step.code}</code>
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Troubleshooting */}
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Troubleshooting
                  </h3>
                  <div className="space-y-4">
                    {platform.troubleshooting.map((item, index) => (
                      <div key={index}>
                        <p className="text-yellow-200 font-medium">{item.issue}</p>
                        <p className="text-gray-400 mt-1">{item.solution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Download CTA */}
      <section className="py-16 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Download className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ready to Download?</h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Get started with Productify Pro today and take control of your productivity.
          </p>
          <Link
            href="/#download"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Download Now
          </Link>
        </div>
      </section>

      {/* Help */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold mb-2">Need Help?</h2>
          <p className="text-gray-400 mb-4">
            Can&apos;t find what you&apos;re looking for? We&apos;re here to help.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/contact"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Contact Support
            </Link>
            <Link
              href="/docs"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              View All Docs
            </Link>
          </div>
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
