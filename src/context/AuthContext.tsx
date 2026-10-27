import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { authService } from '../services/auth.service';
import { Profile } from '../repositories/auth.repository';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: 'owner' | 'viewer' | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to log loading state changes
  const setAndLogLoading = (val: boolean) => {
    setLoading(val);
  };

  useEffect(() => {
    let mounted = true;
    let sessionResolved = false;
    let authEventFired = false;
    let isTransitioning = false;
    let lastUserId: string | null = null;

    function resolveLoading() {
      if (mounted && sessionResolved && authEventFired && !isTransitioning) {
        setAndLogLoading(false);
      }
    }

    async function initializeAuth() {
      try {
        const currentSession = await authService.getSession();
        
        if (mounted) {
          setSession(currentSession);
          
          if (currentSession?.user) {
            if (lastUserId !== currentSession.user.id) {
              isTransitioning = true;
              lastUserId = currentSession.user.id;
              setUser(currentSession.user);
              const currentProfile = await authService.getCurrentProfile();
              if (mounted) {
                setProfile(currentProfile);
              }
              isTransitioning = false;
            } else {
              setUser(currentSession.user);
            }
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        // Suppress session restore errors in UI, handled internally
      } finally {
        sessionResolved = true;
        resolveLoading();
      }
    }

    // Start initialization
    initializeAuth();

    // Subscribe to ongoing auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      const newUser = newSession?.user || null;
      
      if (newUser?.id !== lastUserId) {
        // Transition state: lock the UI immediately before updating session
        isTransitioning = true;
        setAndLogLoading(true);
        lastUserId = newUser?.id || null;
        
        // Safe to update session now that UI is locked
        setSession(newSession);
        setUser(newUser);
        
        if (newUser) {
          try {
            const p = await authService.getCurrentProfile();
            if (mounted) {
              setProfile(p);
            }
          } catch {
            if (mounted) {
              setProfile(null);
            }
          }
        } else {
          setProfile(null);
        }
        isTransitioning = false;
      } else {
        // Identity didn't change (e.g. token refresh)
        setSession(newSession);
        setUser(newUser);
      }
      
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        lastUserId = null;
      }

      authEventFired = true;
      resolveLoading();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    profile,
    role: profile?.role || null,
    loading,
    signIn: authService.signIn,
    signInWithGoogle: authService.signInWithGoogle,
    signOut: async () => {
      await authService.signOut();
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
