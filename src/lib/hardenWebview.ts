// Продакшен-харденинг окна (v0.2.9) — обычный пользователь не должен иметь
// доступ к перезагрузке страницы (F5/Ctrl+R — сбрасывает состояние SPA,
// выглядит как зависание) и к инструментам разработчика (F12/Ctrl+Shift+I/
// контекстное меню WebView2 "Проверить"). tauri.conf.json уже отключает
// devtools на уровне Tauri (app.windows[0].devtools = false), это здесь —
// подстраховка на уровне самого вебвью (F12 в WebView2 иначе доступен
// независимо от настройки Tauri) и блокировка случайного reload.
// Только в собранном (`vite build`) приложении — в `npm run dev`/`tauri dev`
// нужно и то и другое для собственной отладки.
export function installWebviewHardening() {
  if (!import.meta.env.PROD) return;

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const isReload = key === 'f5' || ((e.ctrlKey || e.metaKey) && key === 'r');
    const isDevtools = key === 'f12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (key === 'i' || key === 'j' || key === 'c'));
    if (isReload || isDevtools) e.preventDefault();
  });

  window.addEventListener('contextmenu', (e) => e.preventDefault());
}
