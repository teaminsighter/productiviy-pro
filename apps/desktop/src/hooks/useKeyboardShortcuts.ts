import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface ShortcutHandlers {
  onToggleTracking?: () => void;
  onTakeScreenshot?: () => void;
  onToggleIncognito?: () => void;
  onQuickSearch?: () => void;
}

export function useKeyboardShortcuts(handlers?: ShortcutHandlers) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent) => {
      // Only handle shortcuts with Cmd (Mac) or Ctrl (Windows)
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;

      // Prevent shortcuts in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Cmd+, for settings even in inputs
        if (!(event.key === ',' && isMod)) {
          return;
        }
      }

      // Cmd+Shift shortcuts
      if (event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 't':
            // Toggle Tracking
            event.preventDefault();
            try {
              const status = await invoke<{ is_tracking: boolean }>('toggle_tracking');
              toast.success(status.is_tracking ? 'Tracking started' : 'Tracking paused');
              handlers?.onToggleTracking?.();
            } catch (error) {
              console.error('Failed to toggle tracking:', error);
            }
            break;

          case 's':
            // Take Screenshot
            event.preventDefault();
            try {
              await invoke('capture_screenshot');
              toast.success('Screenshot captured');
              handlers?.onTakeScreenshot?.();
            } catch (error) {
              console.error('Failed to capture screenshot:', error);
              toast.error('Failed to capture screenshot');
            }
            break;

          case 'i':
            // Toggle Incognito
            event.preventDefault();
            handlers?.onToggleIncognito?.();
            toast.info('Incognito mode toggle - coming soon');
            break;
        }
        return;
      }

      // Cmd shortcuts (without Shift)
      switch (event.key) {
        case 'd':
        case 'D':
          // Open Dashboard
          event.preventDefault();
          if (location.pathname !== '/') {
            navigate('/');
          }
          break;

        case '1':
          // Open Activity
          event.preventDefault();
          if (location.pathname !== '/activity') {
            navigate('/activity');
          }
          break;

        case '2':
          // Open Analytics
          event.preventDefault();
          if (location.pathname !== '/analytics') {
            navigate('/analytics');
          }
          break;

        case '3':
          // Open Screenshots
          event.preventDefault();
          if (location.pathname !== '/screenshots') {
            navigate('/screenshots');
          }
          break;

        case ',':
          // Open Settings
          event.preventDefault();
          if (location.pathname !== '/settings') {
            navigate('/settings');
          }
          break;

        case 'k':
        case 'K':
          // Quick Search
          event.preventDefault();
          handlers?.onQuickSearch?.();
          toast.info('Quick search - coming soon');
          break;

        case 'm':
        case 'M':
          // Minimize to Tray - handled by Tauri window manager
          // This is typically handled at the OS level
          break;
      }
    },
    [navigate, location.pathname, handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
