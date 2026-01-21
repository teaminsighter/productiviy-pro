import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

// Skeleton loading UI that mimics the dashboard layout
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar skeleton */}
      <div className="w-64 bg-gray-900/50 border-r border-gray-800 p-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gray-800 animate-pulse" />
          <div className="h-6 w-24 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-800/50 rounded-lg animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-6">
        {/* Header skeleton */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="h-8 w-32 bg-gray-800 rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-800/50 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-lg animate-pulse" />
            <div className="w-10 h-10 bg-gray-800 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800/30 rounded-xl border border-gray-800 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>

        {/* Main content grid skeleton */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 bg-gray-800/30 rounded-xl border border-gray-800 animate-pulse" />
          <div className="h-64 bg-gray-800/30 rounded-xl border border-gray-800 animate-pulse" style={{ animationDelay: '200ms' }} />
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: AuthGuardProps) {
  const location = useLocation();
  const { isAuthenticated, token, setAuth, logout, setLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const user = await authApi.getMe();
          setAuth(user as any, token);
        } catch (error) {
          console.error('Auth verification failed:', error);
          logout();
        }
      }
      setIsChecking(false);
      setLoading(false);
    };

    verifyAuth();
  }, [token, setAuth, logout, setLoading]);

  if (isChecking) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
