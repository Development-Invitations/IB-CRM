// Мягкое форматирование числовых полей — как formatUzPhone, не мешает
// редактированию, просто группирует/чистит уже введённые символы.

export function formatThousands(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatPercentInput(raw: string): string {
  const cleaned = raw.replace(',', '.').replace(/[^\d.]/g, '');
  const [intRaw, ...rest] = cleaned.split('.');
  let intPart = intRaw.slice(0, 3);
  if (intPart && Number(intPart) > 100) intPart = '100';
  if (rest.length === 0) return intPart;
  return `${intPart}.${rest.join('').slice(0, 2)}`;
}
