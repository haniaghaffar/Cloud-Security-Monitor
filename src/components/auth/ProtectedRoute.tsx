import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard that redirects to login if user is not authenticated
 * Compatible with Microsoft Entra ID authentication state
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isConfigured } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 text-xs">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span>Verifying Microsoft Entra ID session...</span>
      </div>
    );
  }

  // If Entra ID is configured and user is not authenticated, redirect to login
  if (isConfigured && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
