import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, User, Home, MessageCircle, Handshake } from 'lucide-react';
import { api, type Employee, type Notification } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useNotifications, type NotificationTarget } from '../lib/useNotifications';
import NotificationsBell from './NotificationsBell';
import EditRequestReviewModal from './EditRequestReviewModal';
import AbsenceRequestReviewModal from './AbsenceRequestReviewModal';
import type { ToastKind } from '../pages/ToastWindow';

export default function Topbar({ employee }: { employee: Employee }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewAbsenceId, setReviewAbsenceId] = useState<string | null>(null);

  const resolveNotificationTarget = async (n: Notification): Promise<NotificationTarget> => {
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
    if (n.relatedEntityType === 'partner_regulation' && n.relatedEntityId) {
      // Запись/ответ в регламенте партнёра (v0.4.0) — у админа путь другой
      // (внутри рабочего пространства конкретного партнёра), поэтому сначала
      // узнаём partnerId самого регламента.
      const reg = await api.getPartnerRegulation(n.relatedEntityId);
      if (reg) {
        return { kind: 'navigate', path: `/dashboard/partners/${reg.partnerId}/regulations`, state: { openPartnerRegId: n.relatedEntityId } };
      }
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
    if (n.relatedEntityType === 'partner_regulation') return 'regulation';
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

  const { unreadNotifications, unreadCount, open, setOpen, wrapRef, loadNotifications, handleOpenNotification } = useNotifications({
    employee,
    resolveTarget: resolveNotificationTarget,
    notificationKind,
    applyTarget: applyNotificationTarget,
    fallbackPath: `/dashboard/employees/${employee.id}`,
  });

  return (
    <header className="topbar">
      <div className="topbar-title">{t('topbar.welcome', { name: employee.fullName || employee.login })}</div>

      <div className="topbar-actions">
        {employee.isAdmin && (
          <button className="icon-btn" onClick={() => navigate('/dashboard/partners')} aria-label={t('topbar.partners')}>
            <Handshake size={20} />
          </button>
        )}

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
