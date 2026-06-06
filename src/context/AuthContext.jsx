/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem('nexus_demo_session');
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(() => !!isSupabaseConfigured);

  useEffect(() => {
    const syncProfile = async (u) => {
      if (!u || !isSupabaseConfigured) return;
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        let mergedUser = { ...u };

        if (!existing) {
          await supabase.from('profiles').upsert({
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            status: 'online',
            role: 'Member'
          });
        } else {
          mergedUser.name = existing.name || u.name;
          mergedUser.role = existing.role || u.role || 'Member';
          mergedUser.bio = existing.bio || '';
          mergedUser.location = existing.location || '';
          if (existing.avatar) mergedUser.avatar = existing.avatar;
        }

        setUser(mergedUser);
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
      // Demo mode states are initialized in useState
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

  const updateProfile = async (updates) => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            name: updates.name,
            role: updates.role,
            bio: updates.bio,
            location: updates.location
          })
          .eq('id', user.id);

        if (error) throw error;

        setUser(prev => ({
          ...prev,
          ...updates
        }));
        return { success: true };
      } catch (err) {
        console.error('Error updating profile:', err);
        return { success: false, error: err.message };
      }
    } else {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('nexus_demo_session', JSON.stringify(updatedUser));
      return { success: true };
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
    updateProfile,
    isDemo: !isSupabaseConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
