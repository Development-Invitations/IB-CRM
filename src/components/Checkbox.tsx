import { Check } from 'lucide-react';

export default function Checkbox({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  id?: string;
}) {
  return (
    <label className="checkbox-row" htmlFor={id}>
      <button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        className={`checkbox-box ${checked ? 'checked' : ''}`}
        onClick={() => onChange(!checked)}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </button>
      {label && <span>{label}</span>}
    </label>
  );
}
