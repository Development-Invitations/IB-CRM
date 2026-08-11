// SQLite datetime('now') отдаёт UTC без таймзоны ("2026-08-01 12:34:56") —
// добавляем 'Z', чтобы JS правильно понял, что это UTC, а не локальное время.
export function parseSqliteUtc(value: string): Date {
  return new Date(value.replace(' ', 'T') + 'Z');
}
