import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { currentUser } from '../data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncProfile = async (u) => {
      if (!u || !isSupabaseConfigured) return;
      try {
        await supabase.from('profiles').upsert({
          id: u.id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          status: 'online',
          role: 'Member'
        });
      } catch (err) {
        console.error('Failed to sync profile:', err);
      }
    };

    if (isSupabaseConfigured) {
      // Real Supabase auth
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          const userObj = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar: session.user.user_metadata?.avatar_url || null,
            initials: (session.user.user_metadata?.full_name || session.user.email)
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U',
            role: 'Member',
            status: 'online',
          };
          setUser(userObj);
          syncProfile(userObj);
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session?.user) {
          const userObj = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar: session.user.user_metadata?.avatar_url || null,
            initials: (session.user.user_metadata?.full_name || session.user.email)
              ?.split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U',
            role: 'Member',
            status: 'online',
          };
          setUser(userObj);
          syncProfile(userObj);
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Demo mode — check localStorage for mock session
      const stored = localStorage.getItem('nexus_demo_session');
      if (stored) {
        setUser(JSON.parse(stored));
      }
      setLoading(false);
    }
  }, []);

  const signInWithEmail = async (email, password) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } else {
      // Demo mode
      const demoUser = {
        id: 'usr_001',
        email,
        name: email.split('@')[0],
        initials: email.slice(0, 2).toUpperCase(),
        role: 'Product Lead',
        status: 'online'
      };
      setUser(demoUser);
      localStorage.setItem('nexus_demo_session', JSON.stringify(demoUser));
      return { user: demoUser };
    }
  };

  const signUpWithEmail = async (email, password, fullName) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      return data;
    } else {
      const demoUser = {
        id: 'usr_001',
        email,
        name: fullName || email.split('@')[0],
        initials: (fullName || email).slice(0, 2).toUpperCase(),
        role: 'Product Lead',
        status: 'online'
      };
      setUser(demoUser);
      localStorage.setItem('nexus_demo_session', JSON.stringify(demoUser));
      return { user: demoUser };
    }
  };

  const signInWithGoogle = async () => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard' },
      });
      if (error) throw error;
      return data;
    } else {
      const demoUser = {
        id: 'usr_001',
        email: 'demo@google.com',
        name: 'Google User',
        initials: 'GU',
        role: 'Product Lead',
        status: 'online'
      };
      setUser(demoUser);
      localStorage.setItem('nexus_demo_session', JSON.stringify(demoUser));
      return { user: demoUser };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
      } catch (err) {
        console.error('Error signing out status change:', err);
      }
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    localStorage.removeItem('nexus_demo_session');
  };

  const value = {
    user,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    isDemo: !isSupabaseConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
