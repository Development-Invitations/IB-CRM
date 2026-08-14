import { useState, FormEvent } from 'react';
import { api } from '../lib/api';
import { rememberedLogin } from '../lib/session';
import { useLocale } from '../lib/i18n';

export default function FirstRunSetup({ onCreated }: { onCreated: (emp: any) => void }) {
  const { t } = useLocale();
  const [fullName, setFullName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!login.trim() || !password.trim()) {
      setError(t('firstRun.errorRequired'));
      return;
    }
    if (password.length < 6) {
      setError(t('firstRun.errorShortPassword'));
      return;
    }
    setBusy(true);
    try {
      const emp = await api.createAdmin({ login, password, fullName });
      rememberedLogin.set(login);
      onCreated(emp);
    } catch (err: any) {
      setError(err.message || t('firstRun.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>{t('firstRun.title')}</h1>
        <p className="subtitle">{t('firstRun.subtitle')}</p>

        {error && <div className="error-text">{error}</div>}

        <div className="field">
          <label>{t('firstRun.fullNameLabel')}</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('firstRun.fullNamePlaceholder')} />
        </div>
        <div className="field">
          <label>{t('firstRun.loginLabel')}</label>
          <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder={t('firstRun.loginPlaceholder')} />
        </div>
        <div className="field">
          <label>{t('firstRun.passwordLabel')}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <button className="primary" type="submit" disabled={busy}>
          {busy ? t('firstRun.submitBusy') : t('firstRun.submit')}
        </button>
      </form>
    </div>
  );
}
