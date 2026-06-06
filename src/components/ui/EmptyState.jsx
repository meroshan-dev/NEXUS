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
      className={`flex flex-col items-center justify-center text-center rounded-[var(--radius-lg)] border border-dashed w-full min-w-0 transition-all hover:border-[var(--accent)] hover:shadow-sm ${
        compact ? 'p-8 sm:p-10' : 'p-10 sm:p-14'
      }`}
      style={{
        borderColor: 'var(--border-color)',
        background: 'var(--bg-secondary)',
      }}
    >
      {Icon && (
        <div
          className={`${compact ? 'w-10 h-10 mb-4' : 'w-12 h-12 mb-5'} rounded-xl flex items-center justify-center transition-transform duration-300 hover:scale-105`}
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Icon size={compact ? 18 : 22} strokeWidth={1.5} className="text-[var(--text-brand)]" />
        </div>
      )}
      <h3
        className={`font-semibold tracking-tight overflow-safe max-w-md px-2 ${compact ? 'text-sm mb-1.5' : 'text-base mb-2'}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`max-w-md leading-relaxed px-4 overflow-safe ${compact ? 'text-[11px]' : 'text-xs'}`}
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
