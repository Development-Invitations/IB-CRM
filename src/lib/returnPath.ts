// Куда вернуть пользователя после повторного входа, если его выбросило
// из-за перезапуска сервера (см. sessionExpiry.ts) — одноразовое значение:
// consumeReturnPath() сразу же его стирает, чтобы обычный последующий
// логин (не после сброса сессии) не утаскивал на случайно оставшийся путь.
const KEY = 'ib-crm-return-path';

export function saveReturnPath(path: string) {
  if (path && path.startsWith('/dashboard')) {
    localStorage.setItem(KEY, path);
  }
}

export function consumeReturnPath(): string | null {
  const v = localStorage.getItem(KEY);
  localStorage.removeItem(KEY);
  return v;
}
