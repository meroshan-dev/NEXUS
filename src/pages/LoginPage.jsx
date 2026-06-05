import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Sparkles, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';

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
    <div className="min-h-screen flex" style={{ background: 'var(--bg-app)' }}>
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] xl:w-[480px] shrink-0 p-12 xl:p-14 relative overflow-hidden"
        style={{ background: 'var(--gradient-brand)' }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: [0, 40, -20, 0], y: [0, -30, 30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-25 blur-3xl"
            style={{ background: '#a5b4fc' }}
          />
          <motion.div
            animate={{ x: [0, -30, 30, 0], y: [0, 40, -20, 0] }}
            transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-20 blur-3xl"
            style={{ background: '#c4b5fd' }}
          />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <Sparkles size={20} className="text-white" />
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">Nexus</span>
        </div>

        <div className="relative space-y-10">
          <div className="space-y-4">
            <h1 className="text-[2.5rem] font-semibold text-white leading-[1.15] tracking-tight">
              Your team's
              <br />
              command center
            </h1>
            <p className="text-[15px] text-white/70 leading-relaxed max-w-xs">
              Chat, tasks, and files — everything your team needs in one calm workspace.
            </p>
          </div>

          <div
            className="rounded-[var(--radius-lg)] p-6"
            style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <p className="text-sm text-white/80 leading-relaxed mb-4">
              "Nexus replaced three tools for us. Our team collaboration has never been smoother."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold">
                SC
              </div>
              <div>
                <p className="text-sm font-medium text-white">Sarah Chen</p>
                <p className="text-xs text-white/50">Engineering Lead</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative" />
      </div>

      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative"
        style={{ minHeight: '100vh' }}
      >
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="lg:hidden mb-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center"
            style={{ background: 'var(--gradient-brand)' }}
          >
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight gradient-text">Nexus</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px]"
        >
          <div className="mb-8">
            <h2 className="text-h2 mb-2" style={{ color: 'var(--text-primary)' }}>
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>
              {isSignUp ? 'Start collaborating with your team today.' : 'Sign in to continue to Nexus.'}
            </p>
            {isDemo && (
              <div
                className="mt-5 flex items-center gap-2 px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium"
                style={{
                  background: 'var(--bg-active)',
                  border: '1px solid var(--border-focus)',
                  color: 'var(--text-brand)',
                }}
              >
                <Sparkles size={14} />
                Demo mode — enter any email to explore
              </div>
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 rounded-[var(--radius-md)] text-sm"
              style={{
                color: 'var(--color-danger)',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              {error}
            </motion.div>
          )}

          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-[var(--radius-md)] text-sm font-medium transition-all mb-5 cursor-pointer"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-focus)';
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.background = 'var(--bg-elevated)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
            <span className="text-caption">or continue with email</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="you@company.com"
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
              <div className="flex justify-end -mt-1">
                <button type="button" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--text-brand)' }}>
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" iconRight={ArrowRight} className="w-full mt-2">
              {isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-body-sm mt-8" style={{ color: 'var(--text-secondary)' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="font-semibold cursor-pointer"
              style={{ color: 'var(--text-brand)' }}
            >
              {isSignUp ? 'Sign in' : 'Sign up free'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
