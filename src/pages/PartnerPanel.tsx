import { useState, FormEvent } from 'react';
import { LogOut, MessageCircle, ArrowLeft } from 'lucide-react';
import { api, type Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Chat from './Chat';

// Панель партнёра — пока заглушка (см. docs/TZ.md, раздел "Партнёры") с двумя
// вещами: сменой собственного пароля (админ выдаёт стандартный при создании
// аккаунта, дальше партнёр меняет его сам себе, как обычный сотрудник в
// Настройках — через смену со знанием текущего пароля) и доступом к своему
// чату с CRM (v0.2.9). Переключение вида — локальный стейт, а не роут: у
// партнёрской стороны в этой версии сознательно нет своего колокольчика/
// баннера уведомлений (см. docs/TZ.md), значит кликабельная ссылка на URL
// чата никому не нужна — простого переключателя достаточно. Свой минимальный
// хедер (НЕ импортируем Topbar.tsx — он завязан на Dashboard-специфичные
// вещи: кабинет-ссылку, колокольчик с модалками рассмотрения заявок,
// Настройки — партнёру ничего из этого не нужно).
export default function PartnerPanel({ employee, onLogout }: { employee: Employee; onLogout: () => void }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [view, setView] = useState<'home' | 'chat'>('home');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError(t('settings.errorShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.errorMismatch'));
      return;
    }

    setBusy(true);
    try {
      await api.changePassword({ employeeId: employee.id, currentPassword, newPassword });
      showToast('success', t('settings.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  if (view === 'chat') {
    return (
      <div className="partner-panel-chat">
        <header className="topbar">
          <div className="topbar-title">{t('partnerPanel.title', { name: employee.fullName || employee.login })}</div>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setView('home')} aria-label={t('common.close')}>
              <ArrowLeft size={20} />
            </button>
          </div>
        </header>
        <Chat currentEmployee={employee} />
      </div>
    );
  }

  return (
    <div className="partner-panel">
      <div className="partner-panel-card">
        <div className="partner-panel-header">
          <h1>{t('partnerPanel.title', { name: employee.fullName || employee.login })}</h1>
          <button className="icon-btn" onClick={() => setView('chat')} aria-label={t('topbar.chat')}>
            <MessageCircle size={20} />
          </button>
        </div>
        <p className="settings-hint">{t('partnerPanel.body')}</p>

        <form className="password-form" onSubmit={handleChangePassword} style={{ textAlign: 'left', marginTop: 16 }}>
          <div className="profile-edit-request-title">{t('settings.passwordSection')}</div>
          {error && <div className="error-text">{error}</div>}

          <div className="field">
            <label>{t('settings.currentPassword')}</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('settings.newPassword')}</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('settings.confirmPassword')}</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>

          <button className="primary" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? t('settings.changePasswordBusy') : t('settings.changePasswordBtn')}
          </button>
        </form>

        <button className="modal-btn" onClick={onLogout} style={{ marginTop: 16 }}>
          <LogOut size={14} /> {t('sidebar.logout')}
        </button>
      </div>
    </div>
  );
}
