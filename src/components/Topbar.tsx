import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings as SettingsIcon, User } from 'lucide-react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { api, type Employee, type Notification } from '../lib/api';
import { useLocale } from '../lib/i18n';
import EditRequestReviewModal from './EditRequestReviewModal';
import AbsenceRequestReviewModal from './AbsenceRequestReviewModal';

export default function Topbar({ employee }: { employee: Employee }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewAbsenceId, setReviewAbsenceId] = useState<string | null>(null);

  // Разрешение на нативные уведомления Windows запрашиваем один раз при
  // монтировании, не на каждый опрос. `null` — ещё не знаем, `true`/`false` —
  // результат (или тихий отказ, если плагин недоступен вне Tauri-контекста).
  const osPermissionRef = useRef<boolean | null>(null);
  // id уведомлений, уже показанных как нативный тост — чтобы не дублировать
  // при каждом опросе, и чтобы НЕ засыпать пользователя пачкой старых
  // уведомлений при первом запуске (уведомляем только про новые после старта).
  const seenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const perm = await requestPermission();
          granted = perm === 'granted';
        }
        osPermissionRef.current = granted;
      } catch {
        osPermissionRef.current = false;
      }
    })();
  }, []);

  const loadNotifications = () => {
    api.listNotifications(employee.id)
      .then((list) => {
        setNotifications(list);
        const unreadIds = list.filter((n) => !n.isRead);
        if (seenIdsRef.current === null) {
          seenIdsRef.current = new Set(unreadIds.map((n) => n.id));
        } else {
          const newOnes = unreadIds.filter((n) => !seenIdsRef.current!.has(n.id));
          if (newOnes.length > 0 && osPermissionRef.current) {
            for (const n of newOnes) {
              sendNotification({ title: n.title, body: n.body ?? undefined });
            }
          }
          seenIdsRef.current = new Set(unreadIds.map((n) => n.id));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    // Опрашиваем сервер каждые 10 секунд — без этого новые уведомления
    // (например, заявка от подчинённого) появлялись только после перезахода
    // на страницу/перезапуска, что слишком медленно для рабочего процесса.
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
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

    if (n.type === 'edit_request' && n.relatedEntityId) {
      // Заявка на изменение данных — открываем модалку рассмотрения (только для админа,
      // но такие уведомления и приходят только админам, см. notify_all_admins в db.rs).
      setReviewRequestId(n.relatedEntityId);
    } else if (n.type === 'absence_request' && n.relatedEntityId) {
      // Заявка на отсутствие — приходит либо руководителю сотрудника, либо всем
      // админам, если руководитель не назначен (см. create_absence_request в db.rs).
      setReviewAbsenceId(n.relatedEntityId);
    } else if (n.relatedEntityType === 'regulation' && n.relatedEntityId) {
      // Задача/напоминание/добавление в регламент — открываем сам регламент,
      // а не просто кабинет сотрудника (см. openRegId в Regulations.tsx).
      navigate('/dashboard/regulations', { state: { openRegId: n.relatedEntityId } });
    } else if (n.relatedEntityType === 'project' && n.relatedEntityId) {
      // Назначение сообщения/передача владения проектом — открываем сам проект.
      navigate('/dashboard/projects', { state: { openProjectId: n.relatedEntityId } });
    } else if (n.type === 'birthday') {
      // День рождения коллеги — ведём в календарь дней рождений, а не в свой кабинет.
      navigate('/dashboard/birthdays');
    } else {
      // Остальные типы (например, результат рассмотрения своей же заявки) — ведём в кабинет.
      navigate(`/dashboard/employees/${employee.id}`);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-title">{t('topbar.welcome', { name: employee.fullName || employee.login })}</div>

      <div className="topbar-actions">
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
