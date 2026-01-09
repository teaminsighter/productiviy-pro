import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

// Auth Pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// App Pages
import Dashboard from '@/pages/Dashboard';
import Activity from '@/pages/Activity';
import Analytics from '@/pages/Analytics';
import Screenshots from '@/pages/Screenshots';
import Goals from '@/pages/Goals';
import Team from '@/pages/Team';
import Settings from '@/pages/Settings';
import Billing from '@/pages/settings/Billing';

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

// Auth wrapper for protected routes
function AuthWrapper() {
  return (
    <AuthGuard>
      <OnboardingWrapper>
        <TrialBanner />
        <Outlet />
      </OnboardingWrapper>
    </AuthGuard>
  );
}

// Main routes component
function AppRoutes() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<AuthWrapper />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="activity" element={<Activity />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="screenshots" element={<Screenshots />} />
              <Route path="goals" element={<Goals />} />
              <Route path="team" element={<Team />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/billing" element={<Billing />} />
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <NotificationProvider>
          <AppRoutes />
          <ToastWrapper />
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
