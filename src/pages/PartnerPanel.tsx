import { useState, FormEvent } from 'react';
import { LogOut } from 'lucide-react';
import { api, type Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';

// Панель партнёра — пока заглушка (см. docs/TZ.md, раздел "Партнёры"): что
// именно партнёр должен видеть/делать здесь ещё не определено, кроме одной
// явно попрошенной вещи — смены собственного пароля (админ выдаёт стандартный
// при создании аккаунта, дальше партнёр меняет его сам себе, как обычный
// сотрудник в Настройках — через смену со знанием текущего пароля).
export default function PartnerPanel({ employee, onLogout }: { employee: Employee; onLogout: () => void }) {
  const { t } = useLocale();
  const { showToast } = useToast();

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

  return (
    <div className="partner-panel">
      <div className="partner-panel-card">
        <h1>{t('partnerPanel.title', { name: employee.fullName || employee.login })}</h1>
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
