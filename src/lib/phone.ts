// Приводим ввод к формату +998 XX XXX XX XX. Работает "мягко" — не мешает
// стирать/редактировать, просто форматирует то, что уже введено цифрами.
export function formatUzPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');

  // Если человек начал вводить с "998" или "8" — считаем это кодом страны/старым форматом
  // и убираем, дальше добавляем свой "+998" сами.
  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('8') && digits.length > 9) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 9); // XX XXX XX XX — 9 цифр после кода страны

  if (digits.length === 0) return '';

  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 7),
    digits.slice(7, 9),
  ].filter(Boolean);

  return `+998 ${parts.join(' ')}`.trimEnd();
}

// Для валидации/сравнения — просто цифры без форматирования и кода страны.
export function isCompleteUzPhone(formatted: string): boolean {
  const digits = formatted.replace(/\D/g, '');
  return digits.replace(/^998/, '').length === 9;
}
