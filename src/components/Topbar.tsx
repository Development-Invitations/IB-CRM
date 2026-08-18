import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings as SettingsIcon, User, Home, MessageCircle } from 'lucide-react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { primaryMonitor, LogicalPosition } from '@tauri-apps/api/window';
import { emit, listen } from '@tauri-apps/api/event';
import { api, type Employee, type Notification } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { getChatNotificationsMuted, getStoredToastPosition, type ToastPosition } from '../lib/chatNotificationPrefs';
import EditRequestReviewModal from './EditRequestReviewModal';
import AbsenceRequestReviewModal from './AbsenceRequestReviewModal';
import type { ToastPayload, ToastKind } from '../pages/ToastWindow';

// Куда ведёт клик по уведомлению — вычисляется один раз и используется как
// для клика в выпадающей панели (в этом же окне), так и для клика по
// собственному окну-баннеру (см. ToastWindow.tsx) — там результат приходит
// назад событием toast-navigate, потому что показывающее баннер окно другое.
type NotificationTarget =
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

export default function Topbar({ employee }: { employee: Employee }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewAbsenceId, setReviewAbsenceId] = useState<string | null>(null);

  // id уведомлений, уже показанных баннером — чтобы не дублировать при
  // каждом опросе, и чтобы НЕ засыпать пользователя пачкой старых
  // уведомлений при первом запуске (уведомляем только про новые после старта).
  const seenIdsRef = useRef<Set<string> | null>(null);

  const resolveNotificationTarget = (n: Notification): NotificationTarget => {
    if (n.type === 'edit_request' && n.relatedEntityId) {
      // Заявка на изменение данных — открываем модалку рассмотрения (только для админа,
      // но такие уведомления и приходят только админам, см. notify_all_admins в db.rs).
      return { kind: 'modal-edit-request', id: n.relatedEntityId };
    }
    if (n.type === 'absence_request' && n.relatedEntityId) {
      // Заявка на отсутствие — приходит либо руководителю сотрудника, либо всем
      // админам, если руководитель не назначен (см. create_absence_request в db.rs).
      return { kind: 'modal-absence', id: n.relatedEntityId };
    }
    if (n.relatedEntityType === 'regulation' && n.relatedEntityId) {
      // Задача/напоминание/добавление в регламент — открываем сам регламент,
      // а не просто кабинет сотрудника (см. openRegId в Regulations.tsx).
      return { kind: 'navigate', path: '/dashboard/regulations', state: { openRegId: n.relatedEntityId } };
    }
    if (n.relatedEntityType === 'project' && n.relatedEntityId) {
      // Назначение сообщения/передача владения проектом — открываем сам проект.
      return { kind: 'navigate', path: '/dashboard/projects', state: { openProjectId: n.relatedEntityId } };
    }
    if (n.type === 'birthday') {
      // День рождения коллеги — ведём в календарь дней рождений, а не в свой кабинет.
      return { kind: 'navigate', path: '/dashboard/birthdays' };
    }
    if (n.type === 'chat_message' && n.relatedEntityId) {
      // Новое сообщение в чате — открываем чат сразу на нужном канале
      // ('general' или id партнёра), см. Chat.tsx (читает location.state.channel).
      return { kind: 'navigate', path: '/dashboard/chat', state: { channel: n.relatedEntityId } };
    }
    // Остальные типы (например, результат рассмотрения своей же заявки) — ведём в кабинет.
    return { kind: 'navigate', path: `/dashboard/employees/${employee.id}` };
  };

  // Отдельно от resolveNotificationTarget (куда ведёт клик) — это про то, ЧТО
  // показать (цвет полоски/иконку баннера), см. ToastWindow.tsx::KIND_ICON.
  // Условия специально зеркалят resolveNotificationTarget, чтобы "куда ведёт"
  // и "как выглядит" не разъезжались для одного и того же уведомления.
  const notificationKind = (n: Notification): ToastKind => {
    if (n.type === 'edit_request') return 'edit_request';
    if (n.type === 'absence_request') return 'absence';
    if (n.relatedEntityType === 'regulation') return 'regulation';
    if (n.relatedEntityType === 'project') return 'project';
    if (n.type === 'birthday') return 'birthday';
    if (n.type === 'chat_message') return 'chat';
    return 'other';
  };

  const applyNotificationTarget = (target: NotificationTarget) => {
    if (target.kind === 'modal-edit-request') setReviewRequestId(target.id);
    else if (target.kind === 'modal-absence') setReviewAbsenceId(target.id);
    else navigate(target.path, target.state ? { state: target.state } : undefined);
  };

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
    const target = resolveNotificationTarget(n);
    const payload: ToastPayload = {
      notificationId: n.id,
      title: n.title,
      body: n.body,
      path: target.kind === 'navigate' ? target.path : `/dashboard/employees/${employee.id}`,
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

  // Клик по баннеру (отдельное окно) сообщает сюда, что открыть — этот же
  // код уже умеет и открывать модалку рассмотрения, и переходить по маршруту.
  useEffect(() => {
    const unlisten = listen<{ notificationId: string; path: string; state?: Record<string, unknown> }>('toast-navigate', (event) => {
      api.markNotificationRead(event.payload.notificationId).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === event.payload.notificationId ? { ...x, isRead: true } : x)));
      const st = event.payload.state as { reviewKind?: 'modal-edit-request' | 'modal-absence'; reviewId?: string } | undefined;
      if (st?.reviewKind === 'modal-edit-request' && st.reviewId) {
        setReviewRequestId(st.reviewId);
      } else if (st?.reviewKind === 'modal-absence' && st.reviewId) {
        setReviewAbsenceId(st.reviewId);
      } else {
        navigate(event.payload.path, event.payload.state ? { state: event.payload.state } : undefined);
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
    applyNotificationTarget(resolveNotificationTarget(n));
  };

  return (
    <header className="topbar">
      <div className="topbar-title">{t('topbar.welcome', { name: employee.fullName || employee.login })}</div>

      <div className="topbar-actions">
        <button className="icon-btn" onClick={() => navigate('/dashboard/chat')} aria-label={t('topbar.chat')}>
          <MessageCircle size={20} />
        </button>

        <button className="icon-btn" onClick={() => navigate('/dashboard')} aria-label={t('sidebar.home')}>
          <Home size={20} />
        </button>

        <button
          className="icon-btn"
          onClick={() => navigate(`/dashboard/employees/${employee.id}`)}
          aria-label={t('topbar.cabinet')}
        >
          <User size={20} />
        </button>

        <div className="topbar-icon-wrap" ref={wrapRef}>
          <button
            className="icon-btn"
            onClick={() => {
              setOpen((o) => {
                if (!o) loadNotifications();
                return !o;
              });
            }}
            aria-label={t('topbar.notifications')}
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="icon-badge">{unreadCount}</span>}
          </button>

          {open && (
            <div className="notifications-panel">
              <div className="notifications-panel-title">{t('topbar.notifications')}</div>
              {unreadNotifications.length === 0 ? (
                <div className="notifications-empty">{t('topbar.noNotifications')}</div>
              ) : (
                unreadNotifications.map((n) => (
                  <div className="notification-item unread" key={n.id}>
                    <div className="notification-item-title">{n.title}</div>
                    {n.body && <div className="notification-item-body">{n.body}</div>}
                    <button className="notification-item-action" onClick={() => handleOpenNotification(n)}>
                      {t('topbar.open')}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button className="icon-btn" onClick={() => navigate('/dashboard/settings')} aria-label={t('topbar.settings')}>
          <SettingsIcon size={20} />
        </button>
      </div>

      {reviewRequestId && (
        <EditRequestReviewModal
          open
          requestId={reviewRequestId}
          adminId={employee.id}
          onClose={() => setReviewRequestId(null)}
          onResolved={loadNotifications}
        />
      )}

      {reviewAbsenceId && (
        <AbsenceRequestReviewModal
          open
          requestId={reviewAbsenceId}
          actorId={employee.id}
          onClose={() => setReviewAbsenceId(null)}
          onResolved={loadNotifications}
        />
      )}
    </header>
  );
}
