import * as XLSX from 'xlsx';
import type { AbsenceRequest } from './api';
import { ABSENCE_TYPE_LABEL_KEYS, resolvedByRoleLabel, parseMakeupSlots, formatDate } from './absenceTypes';

const STATUS_LABEL_KEYS: Record<AbsenceRequest['status'], string> = {
  pending: 'absence.statusPending',
  approved: 'absence.statusApproved',
  rejected: 'absence.statusRejected',
};

// Месяц — строка "YYYY-MM" (как отдаёт <input type="month">). Попадание в месяц
// проверяем по дате начала — простое и понятное правило для отчёта.
export function exportAbsenceRequestsToExcel(requests: AbsenceRequest[], month: string, t: (key: string) => string) {
  const filtered = requests.filter((r) => r.startDate.startsWith(month));

  const rows = filtered.map((r) => {
    const slots = parseMakeupSlots(r.makeupSlots);
    const makeupText = slots.map((s) => `${formatDate(s.date)}${s.start && s.end ? ` ${s.start}-${s.end}` : ''}`).join('; ');
    return {
      [t('absence.colEmployee')]: r.employeeName,
      [t('absence.colType')]: t(ABSENCE_TYPE_LABEL_KEYS[r.type]),
      [t('absence.startDateLabel')]: r.startDate,
      [t('absence.endDateLabel')]: r.endDate,
      [t('absence.colStatus')]: t(STATUS_LABEL_KEYS[r.status]),
      [t('absence.colReason')]: r.reason ?? '',
      [t('absence.makeupDateLabel')]: makeupText,
      [t('absence.resolvedByLabel')]: r.resolvedByName ?? '',
      [t('employees.colRole')]: resolvedByRoleLabel(r, t),
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('absence.allTitle').slice(0, 31));
  XLSX.writeFile(wb, `absence-requests-${month}.xlsx`);
}
