import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({
  label,
  type = 'text',
  icon: Icon,
  error,
  hint,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label
          className="block text-xs font-medium tracking-wide"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            strokeWidth={1.5}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-tertiary)' }}
          />
        )}
        <input
          type={isPassword && showPassword ? 'text' : type}
          className={`input-base ${Icon ? 'pl-10' : ''} ${isPassword ? 'pr-10' : ''} ${error ? 'border-[var(--color-danger)]' : ''}`}
          style={{
            paddingLeft: Icon ? '2.5rem' : undefined,
            paddingRight: isPassword ? '2.5rem' : undefined,
          }}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer icon-glow"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      {hint && !error && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>}
    </div>
  );
}
