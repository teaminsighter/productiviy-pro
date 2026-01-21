/**
 * useDistractionBlocking Hook
 *
 * Manages distraction blocking state during focus sessions.
 * Listens for blocked app/website access attempts and shows
 * the blocking modal based on the configured blocking mode.
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveSession, getFocusSettings, recordDistractionBlocked } from '@/lib/api/focus';
import type { BlockingMode } from '@/components/focus';

interface BlockedItemInfo {
  item: string;
  type: 'app' | 'website';
  timestamp: Date;
}

interface UseDistractionBlockingOptions {
  enabled?: boolean;
  onDistractionBlocked?: (item: string, type: 'app' | 'website') => void;
  onBypass?: (item: string) => void;
}

interface UseDistractionBlockingReturn {
  isBlocking: boolean;
  showBlockedModal: boolean;
  blockedItem: BlockedItemInfo | null;
  blockingMode: BlockingMode;
  sessionEndTime: string | null;
  dismissModal: () => void;
  handleBypass: () => void;
  handleStayFocused: () => void;
  checkIfBlocked: (item: string, type: 'app' | 'website') => boolean;
  triggerBlock: (item: string, type: 'app' | 'website') => void;
}

export function useDistractionBlocking(
  options: UseDistractionBlockingOptions = {}
): UseDistractionBlockingReturn {
  const { enabled = true, onDistractionBlocked, onBypass } = options;

  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedItem, setBlockedItem] = useState<BlockedItemInfo | null>(null);

  // Fetch active session
  const { data: activeSession } = useQuery({
    queryKey: ['active-session'],
    queryFn: getActiveSession,
    enabled,
    refetchInterval: 5000, // Check every 5 seconds
  });

  // Fetch focus settings
  const { data: settings } = useQuery({
    queryKey: ['focus-settings'],
    queryFn: getFocusSettings,
    enabled,
    staleTime: 60000, // Cache for 1 minute
  });

  const isBlocking = Boolean(activeSession && activeSession.status === 'active');
  const blockingMode: BlockingMode = settings?.blockingMode || 'soft';
  const sessionEndTime = activeSession?.endTime || null;

  // Check if an app/website is in the blocked list
  const checkIfBlocked = useCallback(
    (item: string, type: 'app' | 'website'): boolean => {
      if (!isBlocking || !settings) return false;

      const lowerItem = item.toLowerCase();

      if (type === 'app') {
        // Check against blocked apps
        return settings.defaultBlockedApps.some(
          (app) => lowerItem.includes(app.toLowerCase()) || app.toLowerCase().includes(lowerItem)
        );
      } else {
        // Check against blocked websites
        return settings.defaultBlockedWebsites.some(
          (site) => lowerItem.includes(site.toLowerCase()) || site.toLowerCase().includes(lowerItem)
        );
      }
    },
    [isBlocking, settings]
  );

  // Trigger blocking modal for an item
  const triggerBlock = useCallback(
    (item: string, type: 'app' | 'website') => {
      if (!isBlocking) return;

      const blockInfo: BlockedItemInfo = {
        item,
        type,
        timestamp: new Date(),
      };

      setBlockedItem(blockInfo);
      setShowBlockedModal(true);

      // Record the distraction blocked event
      if (activeSession?.id) {
        recordDistractionBlocked(activeSession.id, item).catch(console.error);
      }

      onDistractionBlocked?.(item, type);
    },
    [isBlocking, activeSession, onDistractionBlocked]
  );

  // Handle dismissing the modal
  const dismissModal = useCallback(() => {
    setShowBlockedModal(false);
    setBlockedItem(null);
  }, []);

  // Handle bypass (allowed in soft/hard modes)
  const handleBypass = useCallback(() => {
    if (blockingMode === 'strict') return;

    if (blockedItem) {
      onBypass?.(blockedItem.item);
    }

    dismissModal();
  }, [blockingMode, blockedItem, onBypass, dismissModal]);

  // Handle staying focused
  const handleStayFocused = useCallback(() => {
    dismissModal();
  }, [dismissModal]);

  // Listen for distraction events from Tauri backend
  useEffect(() => {
    if (!enabled || !isBlocking) return;

    // Listen for custom distraction events
    const handleDistractionEvent = (event: CustomEvent<{ item: string; type: 'app' | 'website' }>) => {
      const { item, type } = event.detail;
      if (checkIfBlocked(item, type)) {
        triggerBlock(item, type);
      }
    };

    window.addEventListener('distraction-detected' as any, handleDistractionEvent);

    return () => {
      window.removeEventListener('distraction-detected' as any, handleDistractionEvent);
    };
  }, [enabled, isBlocking, checkIfBlocked, triggerBlock]);

  // Simulate checking current activity periodically (in real app, this would be from the Rust backend)
  useEffect(() => {
    if (!enabled || !isBlocking || !settings) return;

    // In production, this would be handled by the Tauri Rust backend
    // which monitors active window and sends events when blocked apps are detected
    // For now, we just set up the infrastructure

    return () => {};
  }, [enabled, isBlocking, settings]);

  return {
    isBlocking,
    showBlockedModal,
    blockedItem,
    blockingMode,
    sessionEndTime,
    dismissModal,
    handleBypass,
    handleStayFocused,
    checkIfBlocked,
    triggerBlock,
  };
}

export default useDistractionBlocking;
