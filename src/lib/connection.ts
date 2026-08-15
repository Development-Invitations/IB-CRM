// Режим подключения (v0.2.0) — выбирается один раз на первом запуске (см.
// FirstRunSetup.tsx): 'local' работает как раньше, полностью офлайн, со
// своим Tauri-бэкендом и локальной SQLite. 'client' отправляет все команды
// по HTTP на чужой ПК, у которого включён режим сервера (Настройки → Сервер,
// см. src-tauri/src/server.rs). Храним в localStorage — нужно ещё до логина,
// до первого запроса к бэкенду вообще.
const MODE_KEY = 'ib-crm-connection-mode';
const SERVER_URL_KEY = 'ib-crm-server-url';
const TOKEN_KEY = 'ib-crm-session-token';

export type ConnectionMode = 'local' | 'client';

export const connection = {
  getMode: (): ConnectionMode => (localStorage.getItem(MODE_KEY) === 'client' ? 'client' : 'local'),
  isClient: (): boolean => connection.getMode() === 'client',

  getServerUrl: (): string => localStorage.getItem(SERVER_URL_KEY) ?? '',

  // Сохраняет режим "клиент" + адрес сервера разом — не должно быть состояния
  // "клиент, но без адреса".
  connectToServer: (url: string) => {
    localStorage.setItem(MODE_KEY, 'client');
    localStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
  },

  // Возврат к обычному локальному режиму (например, "Отключиться от сервера"
  // в Настройках) — сбрасывает и токен, старая сессия для другого бэкенда
  // не должна пережить переключение.
  useLocal: () => {
    localStorage.removeItem(MODE_KEY);
    localStorage.removeItem(SERVER_URL_KEY);
    sessionToken.clear();
  },
};

// Токен сессии, выданный сервером при логине. Как и сама сессия сотрудника
// (см. session.ts) — не переживает закрытие приложения: каждый новый запуск
// клиента заново логинится и получает новый токен.
export const sessionToken = {
  get: (): string | null => sessionStorage.getItem(TOKEN_KEY),
  set: (token: string) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};
