import type { AbsenceRequestType, AbsenceRequest } from './api';

export type MakeupSlot = { date: string; start: string; end: string };

export function serializeMakeupSlots(slots: MakeupSlot[]): string | null {
  const filled = slots.filter((s) => s.date);
  return filled.length > 0 ? JSON.stringify(filled) : null;
}

export function parseMakeupSlots(raw: string | null): MakeupSlot[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function resolvedByRoleLabel(r: AbsenceRequest, t: (key: string) => string): string {
  if (!r.resolvedByName) return '';
  return r.resolvedByIsAdmin ? t('absence.resolvedByAdmin') : t('absence.resolvedByManager');
}

export const ABSENCE_TYPE_LABEL_KEYS: Record<AbsenceRequestType, string> = {
  dayoff_worked: 'absence.typeDayoffWorked',
  dayoff_unpaid: 'absence.typeDayoffUnpaid',
  vacation: 'absence.typeVacation',
  business_trip: 'absence.typeBusinessTrip',
  remote_work: 'absence.typeRemoteWork',
};

export const ABSENCE_TYPES: AbsenceRequestType[] = [
  'dayoff_worked',
  'dayoff_unpaid',
  'vacation',
  'business_trip',
  'remote_work',
];

export function formatDate(isoDate: string): string {
  // Даты храним как "YYYY-MM-DD" (без времени) — парсим руками, чтобы не словить
  // сдвиг на часовой пояс, как бывает с new Date("YYYY-MM-DD") в некоторых браузерах.
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString();
}

// Сегодняшняя дата в формате YYYY-MM-DD по локальному времени (для <input type="date"> min/value).
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
