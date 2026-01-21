import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';

export function UpdateBanner() {
  const {
    updateInfo,
    isChecking,
    isDownloading,
    error,
    checkForUpdates,
    downloadAndInstall,
  } = useAutoUpdate();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if no update or dismissed
  if (!updateInfo.available || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-b border-indigo-500/30"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300">
              New version {updateInfo.version} is available!
              {updateInfo.notes && (
                <span className="text-indigo-400/70 ml-2">
                  - {updateInfo.notes.slice(0, 50)}
                  {updateInfo.notes.length > 50 ? '...' : ''}
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {error && (
              <span className="text-xs text-red-400">{error}</span>
            )}

            <button
              onClick={downloadAndInstall}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Update Now
                </>
              )}
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-indigo-400 hover:text-indigo-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Manual update check button for Settings page
export function UpdateCheckButton() {
  const { isChecking, checkForUpdates, updateInfo, error } = useAutoUpdate();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={checkForUpdates}
        disabled={isChecking}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
      >
        {isChecking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Check for Updates
          </>
        )}
      </button>

      {updateInfo.available ? (
        <span className="text-sm text-green-400">
          Version {updateInfo.version} available
        </span>
      ) : !isChecking && !error ? (
        <span className="text-sm text-white/40">
          You're on the latest version
        </span>
      ) : null}

      {error && (
        <span className="text-sm text-red-400">{error}</span>
      )}
    </div>
  );
}
