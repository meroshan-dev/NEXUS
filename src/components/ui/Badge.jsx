export default function Badge({ children, variant = 'default', dot, className = '' }) {
  const variants = {
    default: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    brand:   'bg-brand-50 text-brand-700 [html[data-theme=dark]_&]:bg-brand-900/30 [html[data-theme=dark]_&]:text-brand-300',
    success: 'bg-emerald-50 text-emerald-700 [html[data-theme=dark]_&]:bg-emerald-900/30 [html[data-theme=dark]_&]:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 [html[data-theme=dark]_&]:bg-amber-900/30 [html[data-theme=dark]_&]:text-amber-400',
    danger:  'bg-red-50 text-red-700 [html[data-theme=dark]_&]:bg-red-900/30 [html[data-theme=dark]_&]:text-red-400',
    info:    'bg-blue-50 text-blue-700 [html[data-theme=dark]_&]:bg-blue-900/30 [html[data-theme=dark]_&]:text-blue-400',
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
