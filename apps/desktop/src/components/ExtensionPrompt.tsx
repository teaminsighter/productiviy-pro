import { useState, useEffect } from 'react';
import { X, Chrome, Zap, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExtensionPromptProps {
  onDismiss?: () => void;
  variant?: 'banner' | 'card' | 'modal';
}

export function ExtensionPrompt({ onDismiss, variant = 'banner' }: ExtensionPromptProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed or installed
    const dismissed = localStorage.getItem('extensionPromptDismissed');
    const installed = localStorage.getItem('extensionInstalled');

    if (dismissed || installed) {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('extensionPromptDismissed', 'true');
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  const handleLocalInstall = () => {
    // Copy extension path to clipboard
    navigator.clipboard.writeText('/apps/extension');
    alert(
      'Extension path copied!\n\n' +
      'To install:\n' +
      '1. Open Chrome → chrome://extensions/\n' +
      '2. Enable "Developer mode"\n' +
      '3. Click "Load unpacked"\n' +
      '4. Select the extension folder'
    );
  };

  if (!isVisible) return null;

  const features = [
    { icon: Link2, text: 'Track exact URLs' },
    { icon: Zap, text: 'Video progress tracking' },
    { icon: Chrome, text: 'Works across all tabs' },
  ];

  if (variant === 'banner') {
    return (
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 relative"
          >
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-3">
                <Chrome className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Enhance tracking with the Chrome extension — get exact URLs & video progress
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLocalInstall}
                  className="bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1 rounded-md transition-colors"
                >
                  Install Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-white/70 hover:text-white p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (variant === 'card') {
    return (
      <AnimatePresence>
        {!isDismissed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Chrome className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Chrome Extension</h3>
                  <p className="text-sm text-gray-400">Enhance your tracking</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-500 hover:text-gray-400 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                  <feature.icon className="h-4 w-4 text-indigo-400" />
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleLocalInstall}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Chrome className="h-4 w-4" />
                Install Extension
              </button>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-300 text-sm px-3 py-2"
              >
                Later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Modal variant
  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                <Chrome className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Enhance Your Tracking
              </h2>
              <p className="text-gray-400 text-sm">
                Install the Chrome extension for detailed browser tracking
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <feature.icon className="h-4 w-4 text-indigo-400" />
                  </div>
                  <span className="text-sm text-gray-300">{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleLocalInstall}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Chrome className="h-5 w-5" />
                Install Chrome Extension
              </button>
              <button
                onClick={handleDismiss}
                className="w-full text-gray-400 hover:text-gray-300 py-2 text-sm"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to check if extension is installed
export function useExtensionStatus() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Try to communicate with extension
    const checkExtension = async () => {
      try {
        // Check if extension has synced recently
        const response = await fetch('http://localhost:8000/api/activities/extension/stats');
        if (response.ok) {
          const data = await response.json();
          // If we have browser activities, extension is working
          if (data.totals?.browser_activities > 0) {
            setIsInstalled(true);
            localStorage.setItem('extensionInstalled', 'true');
          }
        }
      } catch (error) {
        // Extension not installed or not syncing
      } finally {
        setIsChecking(false);
      }
    };

    checkExtension();
  }, []);

  return { isInstalled, isChecking };
}
