// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEnsureProfile } from '../pages/hooks/useEnsureProfile';

export default function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { session, loading } = useAuth();

  // 🔐 Pastikan profil hanya dicek saat user sudah login
  if (session) {
    useEnsureProfile();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#6200EE]" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
