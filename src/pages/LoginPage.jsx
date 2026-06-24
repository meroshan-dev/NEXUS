import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Sparkles, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, isDemo } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) await signUpWithEmail(email, password, fullName);
      else await signInWithEmail(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  return (
    <div className="login-wrapper">
      {/* Deep mesh gradient background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(67,56,202,0.12) 0%, transparent 70%)',
        }} />
      </div>

      {/* Floating Orbs — hidden on mobile via .login-orbs */}
      <div className="login-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* ═══ UNIFIED GLASS CARD — responsive via .login-card class ═══ */}
        <div className="login-card">
          {/* Logo inside card at top */}
          <div className="flex items-center gap-2.5 justify-center login-logo-section">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(129,140,248,0.3))',
                boxShadow: '0 0 24px rgba(99,102,241,0.3)',
                border: '1px solid rgba(129,140,248,0.3)',
              }}
            >
              <Sparkles size={18} className="text-white" strokeWidth={1.5} />
            </div>
            <span className="text-lg font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Nexus
            </span>
          </div>

          {/* Heading */}
          <div className="login-logo-section" style={{ textAlign: 'center' }}>
            <h2 className="login-title">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="login-subtitle">
              {isSignUp ? 'Start collaborating with your team today.' : 'Sign in to your Nexus workspace.'}
            </p>
            
            {isDemo && (
              <div
                className="flex items-center gap-2 text-[11px] font-medium"
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: 'var(--accent-muted)',
                  border: '1px solid rgba(129,140,248,0.25)',
                  color: 'var(--text-brand)',
                }}
              >
                <Sparkles size={11} className="animate-pulse shrink-0" />
                <span>Demo mode — enter any email to explore</span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-medium"
              style={{
                marginBottom: '16px',
                padding: '8px 12px',
                borderRadius: '12px',
                color: '#f87171',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Google Button — Glass Pill, responsive */}
          <button onClick={handleGoogle} className="login-google-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="font-medium text-[13px]">Continue with Google</span>
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
            <div className="flex-1 h-px" style={{ background: 'var(--bg-hover)' }} />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>or email</span>
            <div className="flex-1 h-px" style={{ background: 'var(--bg-hover)' }} />
          </div>

          {/* Form — ALL labels INSIDE the card */}
          <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '16px' }}>
            {isSignUp && (
              <Input
                label="Full name"
                icon={User}
                placeholder="Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <Input
              label="Email address"
              type="email"
              icon={Mail}
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {!isSignUp && (
              <div className="flex justify-end" style={{ marginTop: '-4px' }}>
                <button 
                  type="button" 
                  className="login-link font-medium hover:underline cursor-pointer transition-colors" 
                  style={{ color: 'var(--accent)' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Sign In — Glowing Purple Pill, responsive */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? (
                <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight size={14} strokeWidth={1.5} />
                </>
              )}
            </button>
          </form>

          {/* Toggle Signin/Signup */}
          <p className="text-center login-link" style={{ color: 'var(--text-secondary)', marginTop: '24px' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="login-link font-medium hover:underline cursor-pointer transition-colors"
              style={{ color: 'var(--accent)' }}
            >
              {isSignUp ? 'Sign in' : 'Sign up free'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
