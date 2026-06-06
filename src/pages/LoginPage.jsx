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
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      {/* Subtle Background Radial Gradients */}
      <div className="absolute top-[-30%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-30%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none -z-10" />
      
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] flex flex-col"
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-secondary)]"
          >
            <Sparkles size={16} className="text-[var(--accent)]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Nexus
          </span>
        </div>

        {/* Login Card Container */}
        <div 
          className="p-8 sm:p-9 rounded-[var(--radius-xl)] border"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-normal">
              {isSignUp ? 'Start collaborating with your team today.' : 'Sign in to your Nexus workspace.'}
            </p>
            
            {isDemo && (
              <div
                className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border"
                style={{
                  background: 'var(--accent-muted)',
                  borderColor: 'var(--border-focus)',
                  color: 'var(--text-brand)',
                }}
              >
                <Sparkles size={11} className="animate-pulse shrink-0" />
                <span>Demo mode — enter any email to explore</span>
              </div>
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-3.5 py-2.5 rounded-lg text-xs font-medium border"
              style={{
                color: 'var(--color-danger)',
                background: 'rgba(239,68,68,0.05)',
                borderColor: 'rgba(239,68,68,0.15)',
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Google Button */}
          <Button
            variant="secondary"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 h-10 cursor-pointer mb-5"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="font-medium text-xs">Continue with Google</span>
          </Button>

          {/* Separator */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
            <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">or email</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-color)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
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
              <div className="flex justify-end">
                <button 
                  type="button" 
                  className="text-xs font-medium hover:underline cursor-pointer" 
                  style={{ color: 'var(--accent)' }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full flex items-center justify-center gap-2 h-10 text-xs font-semibold tracking-wide text-white hover:opacity-95 shadow-md cursor-pointer transition-all"
            >
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight size={14} />
            </Button>
          </form>

          {/* Toggle Signin/Signup */}
          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-secondary)' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="font-semibold hover:underline cursor-pointer"
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
