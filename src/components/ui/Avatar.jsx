const statusColors = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  offline: 'bg-zinc-400 dark:bg-zinc-600',
};

const sizeMap = {
  xs:  { wrap: 'w-7 h-7',   text: 'text-[11px]', ring: 'ring-[1.5px]', dot: 'w-2 h-2 border' },
  sm:  { wrap: 'w-8 h-8',   text: 'text-xs',     ring: 'ring-2',       dot: 'w-2.5 h-2.5 border-[1.5px]' },
  md:  { wrap: 'w-9 h-9',   text: 'text-sm',     ring: 'ring-2',       dot: 'w-3 h-3 border-2' },
  lg:  { wrap: 'w-11 h-11', text: 'text-base',   ring: 'ring-2',       dot: 'w-3.5 h-3.5 border-2' },
  xl:  { wrap: 'w-14 h-14', text: 'text-lg',     ring: 'ring-2',       dot: 'w-4 h-4 border-2' },
  '2xl': { wrap: 'w-20 h-20', text: 'text-2xl',  ring: 'ring-2',       dot: 'w-5 h-5 border-2' },
};

export default function Avatar({ name, initials, src, size = 'md', status, color, className = '' }) {
  const s = sizeMap[size] || sizeMap.md;
  const display = initials || (name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?');

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img src={src} alt={name || 'Avatar'}
          className={`${s.wrap} rounded-full object-cover ${s.ring} ring-[var(--bg-primary)]`} />
      ) : (
        <div
          className={`${s.wrap} rounded-full flex items-center justify-center font-semibold text-white ${s.ring} ring-[var(--bg-primary)] select-none`}
          style={{ backgroundColor: color || '#6366f1' }}
        >
          <span className={s.text}>{display}</span>
        </div>
      )}
      {status && (
        <span className={`absolute bottom-0 right-0 ${s.dot} ${statusColors[status]} rounded-full border-[var(--bg-primary)]`} />
      )}
    </div>
  );
}

export function AvatarGroup({ members, max = 4, size = 'sm' }) {
  const s = sizeMap[size] || sizeMap.sm;
  const visible = members.slice(0, max);
  const remaining = members.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((m) => (
        <Avatar key={m.id} name={m.name} initials={m.initials} color={m.color} size={size} />
      ))}
      {remaining > 0 && (
        <div className={`${s.wrap} rounded-full flex items-center justify-center ${s.text} font-medium ${s.ring} ring-[var(--bg-primary)]`}
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          +{remaining}
        </div>
      )}
    </div>
  );
}
