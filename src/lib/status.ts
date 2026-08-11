import type { EmployeeStatus } from './api';
import { parseSqliteUtc } from './date';

// "away15" сам "истекает" через 15 минут — этот хелпер решает, актуален ли
// статус ещё, глядя на manual_status_until. Остальные статусы (обед/отпуск/
// отгул) снимаются только вручную, у них until всегда пустой.
export function effectiveManualStatus(status: EmployeeStatus | null, until: string | null): EmployeeStatus | null {
  if (!status) return null;
  if (status === 'away15' && until) {
    if (parseSqliteUtc(until).getTime() <= Date.now()) return null;
  }
  return status;
}
