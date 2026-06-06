import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      onClick={toggleTheme}
      className={`relative w-15 h-7.5 rounded-full p-0.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between cursor-pointer select-none ${className}`}
      style={{ minWidth: '60px' }}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Sliding indicator */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 450, damping: 30 }}
        className="absolute top-0.5 bottom-0.5 w-6.5 h-6.5 rounded-full z-0 border"
        style={{
          left: theme === 'dark' ? '2px' : '30px',
          background: 'var(--bg-primary)',
          borderColor: 'var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      />
      
      {/* Moon Icon (Left) */}
      <div className="z-10 pl-1.5 flex items-center justify-center">
        <Moon
          size={12}
          strokeWidth={2}
          className={`transition-colors duration-200 ${theme === 'dark' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]/50'}`}
        />
      </div>

      {/* Sun Icon (Right) */}
      <div className="z-10 pr-1.5 flex items-center justify-center">
        <Sun
          size={12}
          strokeWidth={2}
          className={`transition-colors duration-200 ${theme === 'light' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]/50'}`}
        />
      </div>
    </div>
  );
}

