import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings as SettingsIcon, User } from 'lucide-react';
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

  const loadNotifications = () => {
    api.listNotifications(employee.id).then(setNotifications);
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;

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
              {notifications.length === 0 ? (
                <div className="notifications-empty">{t('topbar.noNotifications')}</div>
              ) : (
                notifications.map((n) => (
                  <div className={`notification-item ${n.isRead ? '' : 'unread'}`} key={n.id}>
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
