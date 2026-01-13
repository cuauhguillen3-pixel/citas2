import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  subscription: {
    status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired_trial';
    daysLeft: number;
    isLocked: boolean;
  };
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          phone: phone,
          role: 'staff',
        });

      if (profileError) throw profileError;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const getSubscriptionStatus = () => {
    if (!profile) return { status: 'trial' as const, daysLeft: 0, isLocked: false };

    const now = new Date();
    const trialEnd = profile.trial_ends_at ? new Date(profile.trial_ends_at) : new Date(new Date(profile.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
    const periodEnd = profile.current_period_end ? new Date(profile.current_period_end) : null;
    
    let status = profile.subscription_status || 'trial';
    let daysLeft = 0;
    let isLocked = false;

    if (status === 'trial') {
      const diff = trialEnd.getTime() - now.getTime();
      daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (daysLeft <= 0) {
        status = 'expired_trial';
        isLocked = true;
      }
    } else if (status === 'active') {
      if (periodEnd && periodEnd < now) {
        status = 'past_due';
        isLocked = true;
      } else if (periodEnd) {
         const diff = periodEnd.getTime() - now.getTime();
         daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }
    } else if (status === 'canceled' || status === 'past_due') {
        isLocked = true;
    }

    return { status, daysLeft, isLocked };
  };

  const subscription = getSubscriptionStatus();

  return (
    <AuthContext.Provider value={{ user, profile, loading, subscription: getSubscriptionStatus(), signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
