import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, Home, MessageCircle } from 'lucide-react';
import { type Employee, type Notification } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useNotifications, type NotificationTarget } from '../lib/useNotifications';
import NotificationsBell from './NotificationsBell';
import type { ToastKind } from '../pages/ToastWindow';

// Топбар партнёрской панели (v0.4.0) — облегчённая версия основного Topbar.tsx:
// Чат/Главная/Уведомления/Настройки, без кнопки "Партнёры" (админ-только),
// без отдельной иконки "Профиль" (самообслуживание — в Настройках партнёра)
// и без модалок рассмотрения заявок (эти уведомления партнёру не приходят).
// Уведомления переиспользуют тот же хук/компонент, что и у сотрудников —
// полный паритет с колокольчиком и баннером, как и просил пользователь.
export default function PartnerTopbar({ employee }: { employee: Employee }) {
  const { t } = useLocale();
  const navigate = useNavigate();

  const resolveNotificationTarget = (n: Notification): NotificationTarget => {
    if (n.relatedEntityType === 'partner_regulation' && n.relatedEntityId) {
      // У партнёра свой единственный регламент-раздел — без промежуточного
      // запроса partnerId, как приходится делать на стороне админа.
      return { kind: 'navigate', path: '/dashboard/regulations', state: { openPartnerRegId: n.relatedEntityId } };
    }
    if (n.type === 'chat_message' && n.relatedEntityId) {
      return { kind: 'navigate', path: '/dashboard/chat', state: { channel: n.relatedEntityId } };
    }
    return { kind: 'navigate', path: '/dashboard' };
  };

  const notificationKind = (n: Notification): ToastKind => {
    if (n.relatedEntityType === 'partner_regulation') return 'regulation';
    if (n.type === 'chat_message') return 'chat';
    return 'other';
  };

  const applyNotificationTarget = (target: NotificationTarget) => {
    if (target.kind === 'navigate') navigate(target.path, target.state ? { state: target.state } : undefined);
  };

  const { unreadNotifications, unreadCount, open, setOpen, wrapRef, loadNotifications, handleOpenNotification } = useNotifications({
    employee,
    resolveTarget: resolveNotificationTarget,
    notificationKind,
    applyTarget: applyNotificationTarget,
    fallbackPath: '/dashboard',
  });

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

        <NotificationsBell
          unreadNotifications={unreadNotifications}
          unreadCount={unreadCount}
          open={open}
          setOpen={setOpen}
          wrapRef={wrapRef}
          onOpenNotification={handleOpenNotification}
          loadNotifications={loadNotifications}
        />

        <button className="icon-btn" onClick={() => navigate('/dashboard/settings')} aria-label={t('topbar.settings')}>
          <SettingsIcon size={20} />
        </button>
      </div>
    </header>
  );
}
