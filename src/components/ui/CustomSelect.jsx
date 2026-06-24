import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, disabled = false, placeholder = 'Select option...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.value === '');
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 14px',
          borderRadius: '12px',
          background: 'var(--bg-hover)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          outline: 'none',
          textAlign: 'left'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayText}
        </span>
        <ChevronDown size={16} style={{ opacity: 0.5, flexShrink: 0, marginLeft: '8px' }} />
      </button>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'rgba(20,20,40,0.95)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          padding: '4px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 50
        }}>
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: isSelected ? 'var(--text-brand, #818cf8)' : 'white',
                  background: isSelected ? 'var(--glass-bg-light)' : 'transparent',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 500 : 400,
                  transition: 'background 0.15s ease',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'var(--glass-border-light)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                {option.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
