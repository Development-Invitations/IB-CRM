// SQLite datetime('now') отдаёт UTC без таймзоны ("2026-08-01 12:34:56") —
// добавляем 'Z', чтобы JS правильно понял, что это UTC, а не локальное время.
export function parseSqliteUtc(value: string): Date {
  return new Date(value.replace(' ', 'T') + 'Z');
}

// Дата рождения хранится как обычная календарная дата "YYYY-MM-DD" (из
// <input type="date">), без времени и без UTC — в отличие от parseSqliteUtc,
// парсим её как локальную дату, чтобы не съехать на день из-за часового пояса.
export function formatLocalDate(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString();
}
