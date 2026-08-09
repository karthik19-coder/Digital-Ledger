import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  // 1. No authenticated session -> Redirect to Login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 2. Session exists but no active profile -> Redirect to Access Denied
  if (!profile || !profile.is_active) {
    return <Navigate to="/access-denied" replace />;
  }

  // 3. Session and active profile exist -> Render the protected route
  return <>{children}</>;
}
