import { useState, useEffect, FormEvent } from 'react';
import { api, type Employee } from '../lib/api';
import { rememberedLogin } from '../lib/session';
import { useLocale } from '../lib/i18n';
import Checkbox from '../components/Checkbox';

export default function Login({ onLogin }: { onLogin: (emp: Employee) => void }) {
  const { t } = useLocale();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = rememberedLogin.get();
    if (saved) setLogin(saved);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.login({ login, password });
      if (res.success) {
        if (remember) {
          rememberedLogin.set(login);
        } else {
          rememberedLogin.clear();
        }
        onLogin(res.employee);
      } else {
        setError(res.message);
      }
    } catch (err: unknown) {
      setError(t('login.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>{t('login.title')}</h1>
        <p className="subtitle">{t('login.subtitle')}</p>

        {error && <div className="error-text">{error}</div>}

        <div className="field">
          <label>{t('login.loginLabel')}</label>
          <input value={login} onChange={(e) => setLogin(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label>{t('login.passwordLabel')}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <Checkbox id="remember" checked={remember} onChange={setRemember} label={t('login.remember')} />

        <button className="primary" type="submit" disabled={busy} style={{ marginTop: 16 }}>
          {busy ? t('login.submitBusy') : t('login.submit')}
        </button>
      </form>
    </div>
  );
}

