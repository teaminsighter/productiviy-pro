import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ErrorBoundary, QuickActions } from '@/components/common';
import { UpdateBanner } from '@/components/common/UpdateBanner';
import { FocusAutoStartModal, DistractionBlockedModal } from '@/components/focus';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFocusAutoStart } from '@/hooks/useFocusAutoStart';
import { useFocusNotifications } from '@/hooks/useFocusNotifications';
import { useDistractionBlocking } from '@/hooks/useDistractionBlocking';

const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
};

export function Layout() {
  const location = useLocation();

  // Enable global keyboard shortcuts
  useKeyboardShortcuts();

  // Focus mode auto-start
  const {
    pendingAutoStart,
    showAutoStartPrompt,
    isStarting,
    confirmAutoStart,
    dismissAutoStart,
    snoozeAutoStart,
  } = useFocusAutoStart({ enabled: true });

  // Focus mode notifications (runs in background)
  useFocusNotifications({ enabled: true });

  // Distraction blocking
  const {
    showBlockedModal,
    blockedItem,
    blockingMode,
    sessionEndTime,
    dismissModal,
    handleBypass,
    handleStayFocused,
  } = useDistractionBlocking({ enabled: true });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Background gradient - applied to whole app */}
      <div className="fixed inset-0 bg-gradient-dark -z-10" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Update Banner (shows when update available) */}
        <UpdateBanner />

        {/* Page Content with transition */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={pageTransition.initial}
              animate={pageTransition.animate}
              exit={pageTransition.exit}
              transition={pageTransition.transition}
              className="h-full"
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Quick Actions Floating Button */}
      <QuickActions />

      {/* Focus Auto-Start Modal */}
      <FocusAutoStartModal
        isVisible={showAutoStartPrompt}
        eventTitle={pendingAutoStart?.title || 'Focus Time'}
        eventTime={pendingAutoStart?.startTime || new Date().toISOString()}
        duration={pendingAutoStart?.duration || 50}
        isStarting={isStarting}
        onConfirm={confirmAutoStart}
        onDismiss={dismissAutoStart}
        onSnooze={snoozeAutoStart}
      />

      {/* Distraction Blocking Modal */}
      <DistractionBlockedModal
        isVisible={showBlockedModal}
        blockedItem={blockedItem?.item || ''}
        itemType={blockedItem?.type || 'app'}
        blockingMode={blockingMode}
        sessionEndTime={sessionEndTime || undefined}
        onBypass={handleBypass}
        onDismiss={dismissModal}
        onStayFocused={handleStayFocused}
      />
    </div>
  );
}
