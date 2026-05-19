import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Failed to load auth session:', error);
      }

      if (mounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      const userId = session?.user?.id;
      if (!userId) {
        setProfile(null);
        return;
      }

      setProfileLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Failed to load profile:', error);
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfile(data ?? null);
      setProfileLoading(false);
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      profile,
      profileLoading,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
      },
      async updateDisplayName(displayName) {
        const userId = session?.user?.id;
        if (!userId) return { error: new Error('Not signed in') };

        const { data, error } = await supabase
          .from('profiles')
          .update({ display_name: displayName })
          .eq('id', userId)
          .select('id, email, display_name')
          .maybeSingle();

        if (!error) {
          setProfile(data ?? null);
        }

        return { error };
      },
    }),
    [loading, profile, profileLoading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
