import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from './lib/supabase';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacePage from './pages/WorkspacePage';
import TasksPage from './pages/TasksPage';
import FilesPage from './pages/FilesPage';
import ProfilePage from './pages/ProfilePage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-[var(--radius-md)] border-2 border-[var(--border-color)]" />
            <div
              className="absolute inset-0 rounded-[var(--radius-md)] border-2 border-transparent border-t-[var(--accent)] animate-spin"
            />
          </div>
          <p className="text-sm font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
            Loading Nexus…
          </p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

import { WorkspaceProvider } from './context/WorkspaceContext';

function AppRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let sub;
    const initListener = async () => {
      sub = CapacitorApp.addListener('appUrlOpen', async (event) => {
        const urlStr = event.url;
        if (urlStr.includes('login-callback')) {
          await Browser.close();

          // Try PKCE flow first (default for Supabase v2) — look for ?code=
          const parsedUrl = new URL(urlStr.replace('com.roshan.nexus://', 'https://placeholder.app/'));
          const code = parsedUrl.searchParams.get('code');

          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) {
              navigate('/dashboard', { replace: true });
            } else {
              console.error('Error exchanging code for session:', error);
            }
            return;
          }

          // Fallback: implicit flow (access_token/refresh_token in hash or query)
          let hashOrQuery = '';
          if (urlStr.includes('#')) {
            hashOrQuery = urlStr.split('#')[1];
          } else if (urlStr.includes('?')) {
            hashOrQuery = urlStr.split('?')[1];
          }
          const params = new URLSearchParams(hashOrQuery);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (!error) {
              navigate('/dashboard', { replace: true });
            } else {
              console.error('Error setting session:', error);
            }
          }
        }
      });
    };

    initListener();

    return () => {
      if (sub) {
        sub.then(s => s.remove()).catch(err => console.error('Error removing listener:', err));
      }
    };
  }, [navigate]);

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/workspace/:id" element={<WorkspacePage />} />
        <Route path="/workspace/:id/tasks" element={<TasksPage />} />
        <Route path="/workspace/:id/files" element={<FilesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
