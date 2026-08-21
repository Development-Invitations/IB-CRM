import { useEffect, useRef, useState } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { primaryMonitor, LogicalPosition } from '@tauri-apps/api/window';
import { emit, listen } from '@tauri-apps/api/event';
import { api, type Employee, type Notification } from './api';
import { getChatNotificationsMuted, getStoredToastPosition, type ToastPosition } from './chatNotificationPrefs';
import type { ToastPayload, ToastKind } from '../pages/ToastWindow';

// Куда ведёт клик по уведомлению — вычисляется вызывающей стороной
// (resolveTarget), т.к. набор возможных целей разный у сотрудника/админа
// (модалки рассмотрения заявок) и у партнёра (их не бывает). Используется и
// для клика в выпадающей панели (в этом же окне), и для клика по
// собственному окну-баннеру (см. ToastWindow.tsx) — там результат приходит
// назад событием toast-navigate, потому что показывающее баннер окно другое.
export type NotificationTarget =
  | { kind: 'modal-edit-request'; id: string }
  | { kind: 'modal-absence'; id: string }
  | { kind: 'navigate'; path: string; state?: Record<string, unknown> };

const TOAST_WIDTH = 340;
const TOAST_HEIGHT = 110;

// Отступ снизу больше, чем сверху/по бокам — чтобы не перекрывать панель
// задач Windows, когда баннер стоит в одном из нижних углов.
function computeToastPosition(pos: ToastPosition, logicalW: number, logicalH: number): { x: number; y: number } {
  const marginX = 20;
  const marginTop = 20;
  const marginBottom = 60;
  const x = pos.endsWith('right') ? logicalW - TOAST_WIDTH - marginX : marginX;
  const y = pos.startsWith('bottom') ? logicalH - TOAST_HEIGHT - marginBottom : marginTop;
  return { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) };
}

// Извлечено из Topbar.tsx (v0.4.0) при появлении второго потребителя —
// PartnerTopbar.tsx (партнёру уведомления нужны с тем же паритетом, что и
// сотруднику/админу — колокольчик, баннер, всё как есть). Окно-баннер уже не
// раз ловило тонкие баги (см. журнал v0.2.6/v0.2.7/v0.2.14 в docs/TZ.md) —
// логика перенесена вербатим, не переписана, чтобы не наступить на те же
// грабли дважды в двух местах.
export function useNotifications({
  employee,
  resolveTarget,
  notificationKind,
  applyTarget,
  fallbackPath,
}: {
  employee: Employee;
  // Может быть асинхронной — например, уведомление о регламенте партнёра
  // требует запроса api.getPartnerRegulation, чтобы узнать partnerId для пути.
  resolveTarget: (n: Notification) => NotificationTarget | Promise<NotificationTarget>;
  notificationKind: (n: Notification) => ToastKind;
  // Что делать с уже вычисленной целью — навигация или открытие модалки;
  // модалки существуют только у сотрудника/админа, поэтому это решает
  // вызывающая сторона, а не сам хук.
  applyTarget: (target: NotificationTarget) => void;
  // Путь в payload баннера для не-navigate целей (модалок) — у партнёра таких
  // целей не бывает, но тип payload'а требует какое-то значение.
  fallbackPath: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // id уведомлений, уже показанных баннером — чтобы не дублировать при
  // каждом опросе, и чтобы НЕ засыпать пользователя пачкой старых
  // уведомлений при первом запуске (уведомляем только про новые после старта).
  const seenIdsRef = useRef<Set<string> | null>(null);

  const loadNotifications = () => {
    api.listNotifications(employee.id)
      .then((rawList) => {
        // Замьюченные чат-уведомления отфильтровываются здесь же, в одном
        // месте — бейдж, дропдаун и баннер разом перестают их показывать,
        // без отдельной логики в каждом. Переоценивается на каждом опросе
        // (10 сек), так что переключение настройки подхватывается быстро.
        const list = getChatNotificationsMuted() ? rawList.filter((n) => n.type !== 'chat_message') : rawList;
        setNotifications(list);
        const unread = list.filter((n) => !n.isRead);
        if (seenIdsRef.current === null) {
          seenIdsRef.current = new Set(unread.map((n) => n.id));
        } else {
          const newOnes = unread.filter((n) => !seenIdsRef.current!.has(n.id));
          newOnes.forEach(showToast);
          seenIdsRef.current = new Set(unread.map((n) => n.id));
        }
      })
      .catch(() => {});
  };

  // Создаёт окно 'toast' с нуля и ждёт двух вещей: что нативное окно вообще
  // появилось (tauri://created) и что его веб-контент домонтировался и
  // подписался на 'toast-show' (хэндшейк 'toast-ready', см. ToastWindow.tsx) —
  // без второго ожидания emit() на первом показе уходил в никуда (см. журнал
  // v0.2.14 в docs/TZ.md).
  const createToastWindow = async (x: number, y: number) => {
    const win = new WebviewWindow('toast', {
      url: 'index.html#/toast',
      width: TOAST_WIDTH,
      height: TOAST_HEIGHT,
      x,
      y,
      decorations: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      shadow: true,
      transparent: true,
      focus: false,
      visible: false,
    });
    await new Promise<void>((resolve) => {
      win.once('tauri://created', () => resolve());
      win.once('tauri://error', () => resolve());
    });
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      const timeoutId = setTimeout(finish, 2000);
      listen('toast-ready', () => {
        clearTimeout(timeoutId);
        finish();
      }).catch(finish);
    });
    return win;
  };

  // Собственное окно-баннер (вместо системного тоста Windows — тот нельзя ни
  // стилизовать под темы приложения, ни заставить висеть до явного закрытия,
  // см. журнал v0.2.6/v0.2.7 в docs/TZ.md). Окно создаётся один раз и
  // переиспользуется — на новое уведомление просто обновляем его содержимое.
  //
  // Раньше повторное использование (ветка else — setPosition/show на уже
  // существующем окне) была одной операцией без собственной обработки ошибок:
  // если старый хэндл окна оказывался нерабочим (например, после серии
  // hide()/show() в WebView2), setPosition/show/emit тихо падали — весь catch
  // был один на всю функцию и просто проглатывал ошибку, так что второе и
  // последующие уведомления после первого успешного могли молча не
  // показываться. Теперь ветка переиспользования обёрнута в свой try — при
  // сбое старое окно закрывается и создаётся заново с нуля (тем же путём,
  // что и самое первое уведомление после запуска), вместо того чтобы просто
  // сдаться.
  const showToastNow = async (n: Notification) => {
    const target = await resolveTarget(n);
    const payload: ToastPayload = {
      notificationId: n.id,
      title: n.title,
      body: n.body,
      path: target.kind === 'navigate' ? target.path : fallbackPath,
      navState: target.kind === 'navigate' ? target.state : { reviewKind: target.kind, reviewId: target.id },
      kind: notificationKind(n),
    };

    // Позиция считается каждый показ (не только при создании окна) — иначе
    // смена угла в Настройках не подействует до перезапуска приложения, ведь
    // окно 'toast' создаётся один раз и живёт всю сессию.
    const monitor = await primaryMonitor();
    const scale = monitor?.scaleFactor ?? 1;
    const logicalW = monitor ? monitor.size.width / scale : 1920;
    const logicalH = monitor ? monitor.size.height / scale : 1080;
    const { x, y } = computeToastPosition(getStoredToastPosition(), logicalW, logicalH);

    let win = await WebviewWindow.getByLabel('toast');

    if (win) {
      try {
        await win.setPosition(new LogicalPosition(x, y));
        await win.show();
      } catch (err) {
        console.error('Toast window stale, recreating', err);
        await win.close().catch(() => {});
        win = null;
      }
    }

    if (!win) {
      win = await createToastWindow(x, y);
      await win.show();
    }

    await emit('toast-show', payload);
  };

  // Последовательный вызов через очередь-промис — без этого два уведомления,
  // пришедшие почти одновременно (например, две записи в регламент одна за
  // другой), могли обе увидеть отсутствие окна 'toast' и попытаться создать
  // ДВА окна с одинаковым label — Tauri такое не разрешает, вторая попытка
  // падает с ошибкой, которая раньше тихо проглатывалась.
  const showToastQueueRef = useRef<Promise<void>>(Promise.resolve());
  const showToast = (n: Notification) => {
    showToastQueueRef.current = showToastQueueRef.current
      .catch(() => {})
      .then(() => showToastNow(n))
      .catch((err) => {
        console.error('showToast failed', err);
      });
    return showToastQueueRef.current;
  };

  // Клик по баннеру (отдельное окно) сообщает сюда, что открыть — payload
  // уже несёт готовый path/state (посчитанные в showToastNow при показе),
  // повторный resolveTarget не нужен.
  useEffect(() => {
    const unlisten = listen<{ notificationId: string; path: string; state?: Record<string, unknown> }>('toast-navigate', (event) => {
      api.markNotificationRead(event.payload.notificationId).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === event.payload.notificationId ? { ...x, isRead: true } : x)));
      const st = event.payload.state as { reviewKind?: 'modal-edit-request' | 'modal-absence'; reviewId?: string } | undefined;
      if (st?.reviewKind === 'modal-edit-request' && st.reviewId) {
        applyTarget({ kind: 'modal-edit-request', id: st.reviewId });
      } else if (st?.reviewKind === 'modal-absence' && st.reviewId) {
        applyTarget({ kind: 'modal-absence', id: st.reviewId });
      } else {
        applyTarget({ kind: 'navigate', path: event.payload.path, state: event.payload.state });
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadNotifications();
    // Опрос раньше держался только на JS `setInterval` (10 сек) — пока окно
    // свёрнуто/неактивно, Chromium/WebView2 сильно замедляет фоновые таймеры,
    // интервал мог реально срабатывать раз в минуту и реже, из-за чего баннер
    // "то приходил, то нет", а в других приложениях не показывался вовсе.
    // Основной триггер теперь — 'notification-tick', который каждые 8 секунд
    // шлёт ОТДЕЛЬНЫЙ ОС-ПОТОК в Rust (см. main.rs::main, тикер заведён в
    // .setup()), не подверженный троттлингу JS-таймеров: доставка события —
    // это входящее IPC-сообщение, а не setTimeout, поэтому долетает и
    // обрабатывается, даже когда окно свёрнуто. setInterval оставлен только
    // подстраховкой на случай, если поток по какой-то причине не поднялся.
    const interval = setInterval(loadNotifications, 10000);
    const unlistenTick = listen('notification-tick', () => loadNotifications());

    // Плюс довызов сразу при возврате в приложение — на случай, если именно
    // между последним тиком и разворачиванием окна пришло что-то новое.
    const onWake = () => loadNotifications();
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);

    return () => {
      clearInterval(interval);
      unlistenTick.then((f) => f());
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const unreadCount = unreadNotifications.length;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleOpenNotification = async (n: Notification) => {
    await api.markNotificationRead(n.id);
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    setOpen(false);
    applyTarget(await resolveTarget(n));
  };

  return { notifications, unreadNotifications, unreadCount, open, setOpen, wrapRef, loadNotifications, handleOpenNotification };
}
