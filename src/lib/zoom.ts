import { getCurrentWebview } from '@tauri-apps/api/webview';

// Масштаб окна (v0.2.9) — раньше единственным способом поменять масштаб
// было системное Ctrl+/- в самом вебвью (никак не сохранялось между
// запусками и не было видно как настройка). Теперь — обычный пункт в
// Настройках, доступный всем сотрудникам (не только админу), сохраняется
// в localStorage и применяется заново при каждом запуске.
const ZOOM_KEY = 'ib-crm-zoom';
export const ZOOM_LEVELS = [80, 90, 100, 110, 125, 150] as const;

export function getStoredZoom(): number {
  const raw = localStorage.getItem(ZOOM_KEY);
  const n = raw ? parseInt(raw, 10) : NaN;
  return (ZOOM_LEVELS as readonly number[]).includes(n) ? n : 100;
}

export async function applyZoom(percent: number): Promise<void> {
  localStorage.setItem(ZOOM_KEY, String(percent));
  await getCurrentWebview().setZoom(percent / 100);
}

export async function initZoom(): Promise<void> {
  const percent = getStoredZoom();
  if (percent === 100) return;
  try {
    await getCurrentWebview().setZoom(percent / 100);
  } catch {
    // Тихо игнорируем — например, если случайно запущено не в Tauri-окне.
  }
}
