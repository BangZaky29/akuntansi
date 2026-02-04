
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Define Session and User as any to avoid "no exported member" errors when SDK types are inconsistent
type Session = any;
type User = any;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Casting to any to avoid "Property does not exist on type 'SupabaseAuthClient'" errors
    // which can occur due to environment-specific dependency version mismatches.
    const auth = supabase.auth as any;

    if (auth.getSession) {
      auth.getSession().then(({ data }: any) => {
        const session = data?.session;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (auth.session) {
      // Fallback for v1 SDK
      const session = auth.session();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    } else {
      setLoading(false);
    }

    // Listen for changes
    if (auth.onAuthStateChange) {
      const result = auth.onAuthStateChange((_event: string, session: any) => {
        setSession((prev: any) => {
          if (prev?.access_token === session?.access_token) return prev;
          return session;
        });

        const newUser = session?.user ?? null;
        setUser((prev: any) => {
          if (prev?.id === newUser?.id && prev?.email === newUser?.email) return prev;
          return newUser;
        });

        setLoading(false);
      });

      const subscription = result?.data?.subscription || result?.subscription || result;

      return () => {
        if (subscription?.unsubscribe) {
          subscription.unsubscribe();
        }
      };
    }
  }, []);

  const signOut = async () => {
    const auth = supabase.auth as any;
    if (auth.signOut) {
      await auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
