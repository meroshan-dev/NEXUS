import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={toggleTheme}
      className={`w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center transition-colors cursor-pointer ${className}`}
      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
    >
      <motion.div animate={{ rotate: theme === 'dark' ? 0 : 180 }} transition={{ duration: 0.25 }}>
        {theme === 'dark' ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
      </motion.div>
    </motion.button>
  );
}
