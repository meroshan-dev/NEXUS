import { motion } from 'framer-motion';

export default function LoadingState({ label = 'Loading…', size = 'md' }) {
  const sizes = {
    sm: { ring: 'w-8 h-8', text: 'text-xs' },
    md: { ring: 'w-10 h-10', text: 'text-sm' },
    lg: { ring: 'w-12 h-12', text: 'text-base' },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="min-h-[40vh] flex items-center justify-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-5 glass-card p-10"
      >
        <div className="relative">
          <div
            className={`${s.ring} rounded-full border-2`}
            style={{ borderColor: 'var(--glass-border)' }}
            aria-hidden
          />
          <div
            className={`${s.ring} rounded-full border-2 border-transparent absolute inset-0 animate-spin`}
            style={{ borderTopColor: 'var(--accent)' }}
            aria-hidden
          />
        </div>
        <p className={`${s.text} font-medium tracking-wide`} style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
      </motion.div>
    </div>
  );
}
