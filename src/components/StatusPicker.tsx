import { Clock, Coffee, Palmtree, Home, CircleDot } from 'lucide-react';
import type { Employee, EmployeeStatus } from '../lib/api';
import { api } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';

const OPTIONS: { value: EmployeeStatus | null; icon: typeof Clock; labelKey: string }[] = [
  { value: null, icon: CircleDot, labelKey: 'employees.manualStatusNone' },
  { value: 'away15', icon: Clock, labelKey: 'employees.manualStatusAway15' },
  { value: 'lunch', icon: Coffee, labelKey: 'employees.manualStatusLunch' },
  { value: 'vacation', icon: Palmtree, labelKey: 'employees.manualStatusVacation' },
  { value: 'dayoff', icon: Home, labelKey: 'employees.manualStatusDayoff' },
];

export default function StatusPicker({
  employee,
  onChanged,
}: {
  employee: Employee;
  onChanged: (emp: Employee) => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();

  const handlePick = async (status: EmployeeStatus | null) => {
    try {
      const updated = await api.setEmployeeStatus({ employeeId: employee.id, status });
      onChanged(updated);
      showToast('success', t('employees.manualStatusSet'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('employees.errorGeneric'));
    }
  };

  return (
    <div className="status-picker">
      <div className="settings-hint">{t('employees.manualStatusLabel')}</div>
      <div className="status-picker-options">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = (employee.manualStatus ?? null) === opt.value;
          return (
            <button
              type="button"
              key={opt.value ?? 'none'}
              className={`status-picker-option ${active ? 'active' : ''}`}
              onClick={() => handlePick(opt.value)}
            >
              <Icon size={14} />
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
