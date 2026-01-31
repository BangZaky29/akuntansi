
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEnsureProfile } from '../pages/hooks/useEnsureProfile';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

/**
 * ProtectedRoute ensures that only authenticated users can access specific pages.
 * It also triggers the profile synchronization logic unconditionally to satisfy Rules of Hooks.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useAuth();

  // ✅ ALWAYS call hooks at the top level, never conditionally.
  // useEnsureProfile internally handles the "if (!user) return;" logic inside its useEffect,
  // making it safe to call here even if the session is not yet loaded or is null.
  useEnsureProfile();

  // 🕒 Handle initial loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6200EE]"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Memverifikasi Sesi...
          </p>
        </div>
      </div>
    );
  }

  // 🛑 Redirect to login if no session is active
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 🎉 Render protected content if user is authenticated
  return <>{children}</>;
}
