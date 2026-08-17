// Настройки чат-уведомлений (v0.2.9) — по-устройственные, как масштаб/формат
// окна (zoom.ts/windowMode.ts), не серверные: можно полностью замьютить
// чат-уведомления (бейдж/дропдаун/баннер разом, см. Topbar.tsx) или
// переставить баннер-окно в другой угол экрана. Ничего не нужно применять
// при старте приложения — оба геттера читаются "по требованию" в Topbar.tsx.
const MUTE_KEY = 'ib-crm-chat-notify-muted';
const POSITION_KEY = 'ib-crm-toast-position';

export type ToastPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export function getChatNotificationsMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setChatNotificationsMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

export function getStoredToastPosition(): ToastPosition {
  const raw = localStorage.getItem(POSITION_KEY);
  return raw === 'bottom-left' || raw === 'top-right' || raw === 'top-left' ? raw : 'bottom-right';
}

export function setStoredToastPosition(pos: ToastPosition): void {
  localStorage.setItem(POSITION_KEY, pos);
}
