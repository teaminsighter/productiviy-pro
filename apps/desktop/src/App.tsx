import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Suspense, lazy } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Layout } from '@/components/layout/Layout';
import { OnboardingWrapper } from '@/components/onboarding';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { TrialBanner } from '@/components/common/TrialBanner';
import {
  NotificationProvider,
  useNotificationContext,
  ToastContainer,
} from '@/components/notifications';
import { useNativeTracking } from '@/hooks/useNativeTracking';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Page skeleton for lazy loaded components - shows content structure while loading
const PageLoader = () => (
  <div className="p-6 animate-in fade-in duration-200">
    {/* Header skeleton */}
    <div className="flex justify-between items-center mb-6">
      <div>
        <div className="h-8 w-40 bg-gray-800/50 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-24 bg-gray-800/30 rounded animate-pulse" />
      </div>
    </div>
    {/* Content skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-32 bg-gray-800/20 rounded-xl border border-gray-800/50 animate-pulse"
          style={{ animationDelay: `${i * 75}ms` }}
        />
      ))}
    </div>
  </div>
);

// Auth Pages - loaded immediately (small, needed first)
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// Lazy loaded pages - split into separate chunks
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Meetings = lazy(() => import('@/pages/Meetings'));
const Activity = lazy(() => import('@/pages/Activity'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Screenshots = lazy(() => import('@/pages/Screenshots'));
const Goals = lazy(() => import('@/pages/Goals'));
const Team = lazy(() => import('@/pages/Team'));
const Settings = lazy(() => import('@/pages/Settings'));
const Billing = lazy(() => import('@/pages/settings/Billing'));
const Integrations = lazy(() => import('@/pages/settings/Integrations'));
const InviteAccept = lazy(() => import('@/pages/InviteAccept'));
const TeamMember = lazy(() => import('@/pages/TeamMember'));
const TeamSettings = lazy(() => import('@/pages/TeamSettings'));
const Reports = lazy(() => import('@/pages/Reports'));
const Focus = lazy(() => import('@/pages/Focus'));
const TeamDeepWork = lazy(() => import('@/pages/TeamDeepWork'));
const WorkSessions = lazy(() => import('@/pages/WorkSessions'));

// Admin Pages - lazy loaded
const AdminDashboard = lazy(() => import('@/pages/admin').then(m => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import('@/pages/admin').then(m => ({ default: m.AdminUsers })));
const AdminTeams = lazy(() => import('@/pages/admin').then(m => ({ default: m.AdminTeams })));
const AdminActivity = lazy(() => import('@/pages/admin').then(m => ({ default: m.AdminActivity })));

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      gcTime: 300000, // 5 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Toast container wrapper component
function ToastWrapper() {
  const { toasts, removeToast } = useNotificationContext();
  return <ToastContainer toasts={toasts} onDismiss={removeToast} />;
}

// Native tracking initializer component
function NativeTrackingInitializer() {
  // This hook automatically starts native activity tracking when authenticated
  const { isPolling, isNativeAvailable } = useNativeTracking();

  // Log status in development
  if (import.meta.env.DEV && isNativeAvailable) {
    console.log('Native tracking status:', { isPolling, isNativeAvailable });
  }

  return null;
}

// Auth wrapper for protected routes
function AuthWrapper() {
  return (
    <AuthGuard>
      <NativeTrackingInitializer />
      <OnboardingWrapper>
        <TrialBanner />
        <Outlet />
      </OnboardingWrapper>
    </AuthGuard>
  );
}

// Main routes component with Suspense for lazy loading
function AppRoutes() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/invite/:token" element={<InviteAccept />} />

            {/* Protected Routes */}
            <Route element={<AuthWrapper />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="meetings" element={<Meetings />} />
                <Route path="activity" element={<Activity />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="screenshots" element={<Screenshots />} />
                <Route path="goals" element={<Goals />} />
                <Route path="focus" element={<Focus />} />
                <Route path="work-sessions" element={<WorkSessions />} />
                <Route path="team" element={<Team />} />
                <Route path="team/deepwork" element={<TeamDeepWork />} />
                <Route path="team/member/:userId" element={<TeamMember />} />
                <Route path="team/settings" element={<TeamSettings />} />
                <Route path="settings" element={<Settings />} />
                <Route path="settings/billing" element={<Billing />} />
                <Route path="settings/integrations" element={<Integrations />} />
                <Route path="reports" element={<Reports />} />

                {/* Admin Routes */}
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="admin/users" element={<AdminUsers />} />
                <Route path="admin/teams" element={<AdminTeams />} />
                <Route path="admin/activity" element={<AdminActivity />} />
              </Route>
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </BrowserRouter>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <NotificationProvider>
            <AppRoutes />
            <ToastWrapper />
            <Toaster
              position="bottom-right"
              theme="dark"
              richColors
              toastOptions={{
                className: 'glass-card',
              }}
            />
          </NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
