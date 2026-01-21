import { useEffect, useState } from 'react';
import { isTauri } from '@/lib/tauri';

interface UpdateInfo {
  available: boolean;
  version?: string;
  notes?: string;
  date?: string;
}

export function useAutoUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false });
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = async () => {
    if (!isTauri()) return;

    setIsChecking(true);
    setError(null);

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update) {
        setUpdateInfo({
          available: true,
          version: update.version,
          notes: update.body || undefined,
          date: update.date || undefined,
        });
      } else {
        setUpdateInfo({ available: false });
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setIsChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    if (!isTauri()) return;

    setIsDownloading(true);
    setError(null);

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const { relaunch } = await import('@tauri-apps/plugin-process');

      const update = await check();

      if (update) {
        // Download with progress tracking
        await update.downloadAndInstall((progress) => {
          if (progress.event === 'Started' && progress.data.contentLength) {
            setDownloadProgress(0);
          } else if (progress.event === 'Progress' && progress.data.chunkLength) {
            setDownloadProgress((prev) => prev + progress.data.chunkLength);
          } else if (progress.event === 'Finished') {
            setDownloadProgress(100);
          }
        });

        // Relaunch the app
        await relaunch();
      }
    } catch (err) {
      console.error('Failed to download/install update:', err);
      setError(err instanceof Error ? err.message : 'Failed to install update');
    } finally {
      setIsDownloading(false);
    }
  };

  // Check for updates on mount (once per session)
  useEffect(() => {
    if (isTauri()) {
      // Delay initial check by 5 seconds to not slow down app startup
      const timer = setTimeout(() => {
        checkForUpdates();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    updateInfo,
    isChecking,
    isDownloading,
    downloadProgress,
    error,
    checkForUpdates,
    downloadAndInstall,
  };
}
