// Фон чата (v0.2.15) — по-устройственная настройка, как масштаб/формат окна/
// позиция баннера (localStorage, не серверная). Готовые CSS-градиенты вместо
// картинок-ассетов — не нужно тянуть файлы, работает сразу на любом экране.
export type ChatWallpaperId = 'default' | 'midnight' | 'sunset' | 'forest' | 'ocean' | 'candy' | 'graphite';

export const CHAT_WALLPAPER_IDS: ChatWallpaperId[] = ['default', 'midnight', 'sunset', 'forest', 'ocean', 'candy', 'graphite'];

// '' у 'default' — намеренно: не переопределяем background, .reg-entries-list
// просто наследует var(--color-bg) от .reg-fullscreen, как было всегда.
export const CHAT_WALLPAPER_CSS: Record<ChatWallpaperId, string> = {
  default: '',
  midnight: 'linear-gradient(160deg, #0F1B3D 0%, #1E3A8A 100%)',
  sunset: 'linear-gradient(160deg, #7C2D12 0%, #F5C518 100%)',
  forest: 'linear-gradient(160deg, #14532D 0%, #16A34A 100%)',
  ocean: 'linear-gradient(160deg, #0C4A6E 0%, #0EA5E9 100%)',
  candy: 'linear-gradient(160deg, #831843 0%, #DB2777 100%)',
  graphite: 'linear-gradient(160deg, #1A1B1E 0%, #3A3B40 100%)',
};

const KEY = 'ib-crm-chat-wallpaper';

export function getStoredChatWallpaper(): ChatWallpaperId {
  const raw = localStorage.getItem(KEY);
  return (CHAT_WALLPAPER_IDS as string[]).includes(raw ?? '') ? (raw as ChatWallpaperId) : 'default';
}

export function setStoredChatWallpaper(id: ChatWallpaperId): void {
  localStorage.setItem(KEY, id);
}
