import { Clock, Coffee, Palmtree, Home } from 'lucide-react';
import type { EmployeeStatus } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { effectiveManualStatus } from '../lib/status';
import { parseSqliteUtc } from '../lib/date';

const ICONS: Record<EmployeeStatus, typeof Clock> = {
  away15: Clock,
  lunch: Coffee,
  vacation: Palmtree,
  dayoff: Home,
};

const LABEL_KEYS: Record<EmployeeStatus, string> = {
  away15: 'employees.manualStatusAway15',
  lunch: 'employees.manualStatusLunch',
  vacation: 'employees.manualStatusVacation',
  dayoff: 'employees.manualStatusDayoff',
};

export default function StatusBadge({
  status,
  until,
  size = 'md',
}: {
  status: EmployeeStatus | null;
  until: string | null;
  size?: 'sm' | 'md';
}) {
  const { t } = useLocale();
  const effective = effectiveManualStatus(status, until);
  if (!effective) return null;

  const Icon = ICONS[effective];

  return (
    <span className={`manual-status-badge manual-status-${effective} manual-status-${size}`}>
      <Icon size={size === 'sm' ? 11 : 13} />
      {t(LABEL_KEYS[effective])}
      {effective === 'away15' && until && (
        <span className="manual-status-until">
          {t('employees.manualStatusUntil', {
            time: parseSqliteUtc(until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })}
        </span>
      )}
    </span>
  );
}
