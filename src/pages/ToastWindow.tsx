import { useEffect, useState } from 'react';
import { emit, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { X, Bell } from 'lucide-react';

export type ToastPayload = {
  notificationId: string;
  title: string;
  body: string | null;
  path: string;
  navState?: unknown;
};

// Отдельное лёгкое OS-окно поверх остальных — своё, а не системный тост
// Windows, потому что системный (см. Topbar.tsx, было в v0.2.5) нельзя ни
// стилизовать под темы приложения, ни заставить висеть до явного закрытия —
// это ограничение самой Windows, не плагина. Здесь то же самое приложение
// (тот же index.html/бандл), просто открытое в отдельном окне с маршрутом
// /toast (см. App.tsx) — тема/язык подхватываются автоматически, т.к.
// ThemeProvider/LocaleProvider читают те же localStorage-ключи.
export default function ToastWindow() {
  const [data, setData] = useState<ToastPayload | null>(null);

  useEffect(() => {
    // Окно создаётся прозрачным (см. Topbar.tsx), чтобы карточка была со
    // скруглёнными углами без видимого прямоугольника фона вокруг —
    // но общий `html, body, #root { background: var(--color-bg) }` в
    // theme.css как раз рисует именно такой прямоугольник. Отключаем его
    // только для этого окна через класс на <html>.
    document.documentElement.classList.add('toast-window-root');
    return () => document.documentElement.classList.remove('toast-window-root');
  }, []);

  useEffect(() => {
    const unlisten = listen<ToastPayload>('toast-show', (event) => {
      setData(event.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const dismiss = () => {
    getCurrentWindow().hide().catch(() => {});
  };

  const open = async () => {
    if (!data) return;
    try {
      const main = await WebviewWindow.getByLabel('main');
      if (main) {
        await main.show();
        await main.unminimize();
        await main.setFocus();
        await emit('toast-navigate', { notificationId: data.notificationId, path: data.path, state: data.navState });
      }
    } catch {
      // Тихо игнорируем — окно уведомления не должно падать из-за навигации.
    } finally {
      dismiss();
    }
  };

  if (!data) return null;

  return (
    <div className="toast-window" onClick={open}>
      <div className="toast-window-header">
        <span className="toast-window-brand">
          <Bell size={13} /> IB CRM
        </span>
        <button
          type="button"
          className="toast-window-close"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
        >
          <X size={13} />
        </button>
      </div>
      <div className="toast-window-title">{data.title}</div>
      {data.body && <div className="toast-window-body">{data.body}</div>}
    </div>
  );
}
