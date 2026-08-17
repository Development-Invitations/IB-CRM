import { getCurrentWindow } from '@tauri-apps/api/window';

// Формат окна (v0.2.9) — отдельно от масштаба (zoom.ts): обычное окно,
// развёрнутое на весь экран (maximize, всё ещё с рамкой/заголовком) или
// настоящий полноэкранный режим (fullscreen, без рамки). Сохраняется в
// localStorage и переприменяется при каждом запуске, как и масштаб.
const KEY = 'ib-crm-window-mode';
export type WindowMode = 'windowed' | 'maximized' | 'fullscreen';

export function getStoredWindowMode(): WindowMode {
  const raw = localStorage.getItem(KEY);
  return raw === 'maximized' || raw === 'fullscreen' ? raw : 'windowed';
}

export async function applyWindowMode(mode: WindowMode): Promise<void> {
  localStorage.setItem(KEY, mode);
  const win = getCurrentWindow();
  if (mode === 'fullscreen') {
    await win.setFullscreen(true);
    return;
  }
  await win.setFullscreen(false);
  if (mode === 'maximized') {
    await win.maximize();
  } else {
    await win.unmaximize();
  }
}

export async function initWindowMode(): Promise<void> {
  const mode = getStoredWindowMode();
  if (mode === 'windowed') return;
  try {
    await applyWindowMode(mode);
  } catch {
    // Тихо игнорируем — например, если случайно запущено не в Tauri-окне.
  }
}
