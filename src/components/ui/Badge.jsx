export default function Badge({ children, variant = 'default', dot, className = '' }) {
  const variants = {
    default: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]',
    brand:   'bg-[var(--accent-muted)] text-[var(--text-brand)] border border-[var(--border-focus)]',
    success: 'bg-[rgba(16,185,129,0.06)] text-[var(--color-success)] border border-[rgba(16,185,129,0.15)]',
    warning: 'bg-[rgba(245,158,11,0.06)] text-[var(--color-warning)] border border-[rgba(245,158,11,0.15)]',
    danger:  'bg-[rgba(239,68,68,0.06)] text-[var(--color-danger)] border border-[rgba(239,68,68,0.15)]',
    info:    'bg-[rgba(59,130,246,0.06)] text-[var(--color-info)] border border-[rgba(59,130,246,0.15)]',
  };
  const dotColors = {
    default: 'bg-surface-400', brand: 'bg-brand-500', success: 'bg-success',
    warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info',
  };

  return (
    <span className={`badge-base ${variants[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    'To Do':      { variant: 'default',  label: 'To Do' },
    'In Progress': { variant: 'warning', label: 'In Progress' },
    'Done':        { variant: 'success', label: 'Done' },
  };
  const { variant, label } = map[status] || map['To Do'];
  return <Badge variant={variant} dot>{label}</Badge>;
}

export function PriorityBadge({ priority }) {
  const map = {
    high:   { variant: 'danger',  label: 'High' },
    medium: { variant: 'warning', label: 'Medium' },
    low:    { variant: 'info',    label: 'Low' },
  };
  const { variant, label } = map[priority] || map.medium;
  return <Badge variant={variant}>{label}</Badge>;
}
