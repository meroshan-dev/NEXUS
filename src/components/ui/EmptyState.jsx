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
      className={`flex flex-col items-center justify-center text-center rounded-[var(--radius-lg)] border border-dashed w-full min-w-0 ${
        compact ? 'p-8 sm:p-10' : 'p-10 sm:p-14'
      }`}
      style={{
        borderColor: 'var(--border-color)',
        background: 'var(--bg-subtle)',
      }}
    >
      {Icon && (
        <div
          className={`${compact ? 'w-12 h-12 mb-4' : 'w-14 h-14 mb-6'} rounded-[var(--radius-md)] flex items-center justify-center`}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-tertiary)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <Icon size={compact ? 22 : 26} strokeWidth={1.5} />
        </div>
      )}
      <h3
        className={`font-semibold tracking-tight overflow-safe max-w-md px-2 ${compact ? 'text-base mb-2' : 'text-lg mb-2'}`}
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`max-w-md leading-relaxed px-4 overflow-safe ${compact ? 'text-xs' : 'text-sm'}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className={compact ? 'mt-5' : 'mt-8'}>
          <Button icon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
