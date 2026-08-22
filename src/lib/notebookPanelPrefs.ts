// Настройки плавающей панели Записной книжки (v0.6.0) — по-устройственные,
// как позиция баннера уведомлений (chatNotificationPrefs.ts): позиция/
// размер/закреплённость это предпочтение конкретного устройства/окна, а не
// данные аккаунта — не синхронизируются через сервер, не хранятся в БД.
const PINNED_KEY = 'ib-crm-notebook-pinned';
const POS_KEY = 'ib-crm-notebook-pos';
const SIZE_KEY = 'ib-crm-notebook-size';

export type NotebookPos = { x: number; y: number };
export type NotebookSize = { width: number; height: number };

export function getStoredNotebookPinned(): boolean {
  return localStorage.getItem(PINNED_KEY) === '1';
}

export function setStoredNotebookPinned(pinned: boolean): void {
  localStorage.setItem(PINNED_KEY, pinned ? '1' : '0');
}

export function getStoredNotebookPos(): NotebookPos | null {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setStoredNotebookPos(pos: NotebookPos): void {
  localStorage.setItem(POS_KEY, JSON.stringify(pos));
}

export function getStoredNotebookSize(): NotebookSize | null {
  try {
    return JSON.parse(localStorage.getItem(SIZE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setStoredNotebookSize(size: NotebookSize): void {
  localStorage.setItem(SIZE_KEY, JSON.stringify(size));
}
