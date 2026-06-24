import { motion } from 'framer-motion';

const variants = {
  primary:
    'glass-pill-btn-primary',
  secondary:
    'glass-pill-btn',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
  danger:
    'bg-[rgba(239,68,68,0.2)] backdrop-blur-lg border border-[rgba(239,68,68,0.3)] text-red-400 hover:bg-[rgba(239,68,68,0.3)]',
  success:
    'bg-[rgba(16,185,129,0.2)] backdrop-blur-lg border border-[rgba(16,185,129,0.3)] text-emerald-400 hover:bg-[rgba(16,185,129,0.3)]',
};

const sizes = {
  xs: 'h-7.5 px-3 text-xs rounded-[var(--radius-sm)] gap-1.5',
  sm: 'h-8.5 px-4 text-xs rounded-[var(--radius-md)] gap-1.5',
  md: 'h-9.5 px-5 text-sm rounded-[var(--radius-md)] gap-2',
  lg: 'h-11 px-6 text-sm rounded-[var(--radius-md)] gap-2',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  disabled = false,
  ...props
}) {
  const iconSizes = { xs: 12, sm: 14, md: 15, lg: 16 };
  const sz = iconSizes[size] || 15;

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.015 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.985 }}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-200 cursor-pointer select-none
        disabled:opacity-30 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin" width={sz} height={sz} viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? (
        <Icon size={sz} strokeWidth={1.5} />
      ) : null}
      {children}
      {IconRight && <IconRight size={sz} strokeWidth={1.5} />}
    </motion.button>
  );
}
