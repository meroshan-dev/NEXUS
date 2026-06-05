import { motion } from 'framer-motion';

const variants = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm',
  secondary:
    'border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-focus)] hover:bg-[var(--bg-hover)]',
  ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
  danger: 'bg-danger hover:bg-red-600 text-white',
  success: 'bg-success hover:bg-emerald-600 text-white',
};

const sizes = {
  xs: 'h-7 px-3 text-xs rounded-[var(--radius-sm)] gap-1.5',
  sm: 'h-8 px-3.5 text-sm rounded-[var(--radius-sm)] gap-1.5',
  md: 'h-9 px-4 text-sm rounded-[var(--radius-md)] gap-2',
  lg: 'h-11 px-5 text-sm rounded-[var(--radius-md)] gap-2',
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
      whileHover={{ scale: disabled || loading ? 1 : 1.008 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.99 }}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 cursor-pointer select-none
        disabled:opacity-40 disabled:cursor-not-allowed
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
        <Icon size={sz} strokeWidth={1.75} />
      ) : null}
      {children}
      {IconRight && <IconRight size={sz} strokeWidth={1.75} />}
    </motion.button>
  );
}
