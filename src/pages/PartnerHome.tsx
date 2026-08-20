import { useState, FormEvent } from 'react';
import { api, type Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';

export default function PartnerHome({ employee }: { employee: Employee }) {
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
    <div className="settings-page">
      <h1>{t('partnerPanel.title', { name: employee.fullName || employee.login })}</h1>
      <p className="settings-hint">{t('partnerPanel.homeSubtitle')}</p>

      <section className="settings-section">
        <h2>{t('settings.passwordSection')}</h2>
        <form className="password-form" onSubmit={handleChangePassword}>
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

          <button className="primary" type="submit" disabled={busy} style={{ width: 220 }}>
            {busy ? t('settings.changePasswordBusy') : t('settings.changePasswordBtn')}
          </button>
        </form>
      </section>
    </div>
  );
}
