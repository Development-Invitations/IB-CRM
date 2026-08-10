import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export type SelectOption = { value: string; label: string };

export default function Select({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`custom-select ${disabled ? 'disabled' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span>{selected?.label ?? '—'}</span>
        <ChevronDown size={16} />
      </button>

      {open && !disabled && (
        <div className="custom-select-menu">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              className={`custom-select-option ${o.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
