import { RefObject } from 'react';
import { Bell } from 'lucide-react';
import type { Notification } from '../lib/api';
import { useLocale } from '../lib/i18n';

// Извлечено из Topbar.tsx (v0.4.0) вместе с useNotifications — презентационная
// часть (кнопка + бейдж + выпадающая панель), сама логика в хуке.
export default function NotificationsBell({
  unreadNotifications,
  unreadCount,
  open,
  setOpen,
  wrapRef,
  onOpenNotification,
  loadNotifications,
}: {
  unreadNotifications: Notification[];
  unreadCount: number;
  open: boolean;
  setOpen: (updater: boolean | ((o: boolean) => boolean)) => void;
  wrapRef: RefObject<HTMLDivElement>;
  onOpenNotification: (n: Notification) => void;
  loadNotifications: () => void;
}) {
  const { t } = useLocale();

  return (
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
                <button className="notification-item-action" onClick={() => onOpenNotification(n)}>
                  {t('topbar.open')}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
