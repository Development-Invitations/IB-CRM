import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export type SelectOption = { value: string; label: string };

export default function SearchableSelect({
  value,
  options,
  onChange,
  disabled,
  searchPlaceholder,
  emptyLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

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
        <div className="custom-select-menu custom-select-menu-searchable">
          <div className="custom-select-search">
            <Search size={14} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
          <div className="custom-select-options-scroll">
            {filtered.length === 0 ? (
              <div className="custom-select-empty">{emptyLabel}</div>
            ) : (
              filtered.map((o) => (
                <button
                  type="button"
                  key={o.value}
                  className={`custom-select-option ${o.value === value ? 'active' : ''}`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span>{o.label}</span>
                  {o.value === value && <Check size={14} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
