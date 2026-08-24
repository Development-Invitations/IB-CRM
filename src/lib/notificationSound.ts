// Звук уведомлений (v0.5.2) — по-устройственная настройка, как позиция/мьют
// баннера чата (chatNotificationPrefs.ts), хранится в localStorage. Играет
// на ЛЮБОЕ уведомление (не только чат), в отличие от chatNotificationPrefs,
// который относится только к чат-уведомлениям — поэтому отдельный модуль, а
// не расширение того же файла. Сами звуки — оригинальный синтез синусоидами
// (public/sounds/*.wav, см. docs/TZ.md v0.5.2), не сэмплы сторонних
// производителей.
const ENABLED_KEY = 'ib-crm-notification-sound-enabled';
const SOUND_KEY = 'ib-crm-notification-sound';

export type NotificationSoundId = 'chime' | 'pop' | 'marimba' | 'bell' | 'double-beep' | 'modern' | 'classic' | 'soft' | 'pulse';

export const NOTIFICATION_SOUND_IDS: NotificationSoundId[] = ['chime', 'pop', 'marimba', 'bell', 'double-beep', 'modern', 'classic', 'soft', 'pulse'];

const SOUND_FILES: Record<NotificationSoundId, string> = {
  chime: '/sounds/chime.wav',
  pop: '/sounds/pop.wav',
  marimba: '/sounds/marimba.wav',
  bell: '/sounds/bell.wav',
  'double-beep': '/sounds/double-beep.wav',
  // "modern"/"classic" (v0.6.0), "soft"/"pulse" (v1.4.0) — тоже оригинальный
  // синтез (см. header), НЕ копии и намеренно НЕ названы "iPhone"/"Samsung"/
  // "Redmi"/"Nokia" — пользователь просил именно такие, но брендировать звук
  // под чужую торговую марку нельзя, даже если сама запись своя (см. docs/TZ.md).
  modern: '/sounds/modern.wav',
  classic: '/sounds/classic.wav',
  soft: '/sounds/soft.wav',
  pulse: '/sounds/pulse.wav',
};

export function getNotificationSoundEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) !== '0'; // по умолчанию включено
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
}

export function getStoredNotificationSound(): NotificationSoundId {
  const raw = localStorage.getItem(SOUND_KEY);
  return (NOTIFICATION_SOUND_IDS as string[]).includes(raw ?? '') ? (raw as NotificationSoundId) : 'chime';
}

export function setStoredNotificationSound(id: NotificationSoundId): void {
  localStorage.setItem(SOUND_KEY, id);
}

// Новый Audio на каждый вызов (не переиспользуем один и тот же элемент) —
// иначе два уведомления, пришедшие почти одновременно, обрывали бы друг
// друга через сброс currentTime. Файл маленький и статичный, повторная
// загрузка не заметна и кэшируется самим WebView.
export function playNotificationSound(id?: NotificationSoundId): void {
  if (!getNotificationSoundEnabled()) return;
  try {
    const audio = new Audio(SOUND_FILES[id ?? getStoredNotificationSound()]);
    audio.play().catch(() => {});
  } catch {
    // Звук не критичен для работы приложения — сбой воспроизведения не
    // должен ронять сам показ уведомления.
  }
}
