import { motion } from 'framer-motion';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  compact = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center text-center w-full min-w-0 glass-card ${
        compact ? 'p-8 sm:p-10' : 'p-10 sm:p-14'
      }`}
      style={{
        border: '1px dashed var(--glass-border)',
      }}
    >
      {Icon && (
        <div
          className={`${compact ? 'w-10 h-10 mb-4' : 'w-12 h-12 mb-5'} rounded-[var(--radius-lg)] flex items-center justify-center transition-transform duration-300 hover:scale-105`}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--glass-border-light)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Icon size={compact ? 18 : 22} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
        </div>
      )}
      <h3
        className={`font-medium tracking-tight max-w-md px-2 ${compact ? 'text-sm mb-1.5' : 'text-base mb-2'}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`max-w-md leading-relaxed px-4 ${compact ? 'text-[11px]' : 'text-xs'}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className={compact ? 'mt-4' : 'mt-6'}>
          <Button icon={actionIcon} onClick={onAction} size={compact ? 'sm' : 'md'}>
            {actionLabel}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
