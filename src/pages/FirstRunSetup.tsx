import { useState, FormEvent } from 'react';
import { HardDrive, Server, Wifi } from 'lucide-react';
import { api } from '../lib/api';
import { rememberedLogin } from '../lib/session';
import { connection } from '../lib/connection';
import { useLocale, LOCALE_LABELS, type Locale } from '../lib/i18n';
import { useAppLogo } from '../lib/appLogo';

type Step = 'choice' | 'connect' | 'admin';

// Переключатель языка на экране первого запуска — до входа/создания
// сотрудника локаль хранится независимо от сессии (localStorage, тот же
// ключ, что и переключатель в Настройках), поэтому доступен уже здесь.
function FirstRunLangSwitch() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="firstrun-lang-switch">
      {(Object.keys(LOCALE_LABELS) as Locale[]).map((value) => (
        <button
          key={value}
          type="button"
          className={`firstrun-lang-btn${locale === value ? ' active' : ''}`}
          onClick={() => setLocale(value)}
        >
          {LOCALE_LABELS[value]}
        </button>
      ))}
    </div>
  );
}

// Оформление первого запуска — тот же приём, что и у полноэкранного
// LoadingScreen (свечение вокруг логотипа + ворд-марк), но как отдельная
// шапка над карточкой, а не замена самой карточки — общие .auth-card/
// .auth-screen (которыми пользуется и Login.tsx) не трогаем.
function FirstRunBrand() {
  const logo = useAppLogo();
  return (
    <div className="firstrun-brand">
      <div className="firstrun-glow">
        <img src={logo} alt="" className="firstrun-logo" />
      </div>
      <div className="firstrun-wordmark">IB CRM</div>
    </div>
  );
}

export default function FirstRunSetup({
  onCreated,
  onConnected,
}: {
  onCreated: (emp: any) => void;
  // true — на подключённом сервере уже есть админ (переходим сразу к логину),
  // false — сервер свежий, без админа (остаёмся на этом же экране, но уже
  // отправляем создание админа туда же, по сети).
  onConnected: (hasAdminAlready: boolean) => void;
}) {
  const { t } = useLocale();
  // v0.1.x всегда работал локально — по умолчанию сразу открываем прежнюю
  // форму создания админа. Экран выбора режима — только для тех, кто явно
  // хочет присоединиться к уже поднятому серверу (см. Настройки → Сервер).
  const [step, setStep] = useState<Step>('choice');
  // Технически LAN и Radmin-адрес подключаются абсолютно одинаково (просто
  // HTTP-URL, см. connection.ts) — connectMode влияет только на подсказку,
  // которая показывается над полем ввода адреса на шаге 'connect'.
  const [connectMode, setConnectMode] = useState<'lan' | 'radmin'>('lan');

  const [serverUrl, setServerUrl] = useState('');
  const [connectError, setConnectError] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);

  const [fullName, setFullName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleConnect = async (e: FormEvent) => {
    e.preventDefault();
    setConnectError('');
    if (!serverUrl.trim()) {
      setConnectError(t('firstRun.serverUrlRequired'));
      return;
    }
    setConnectBusy(true);
    const normalized = /^https?:\/\//i.test(serverUrl.trim()) ? serverUrl.trim() : `http://${serverUrl.trim()}`;
    connection.connectToServer(normalized);
    try {
      const hasAdminAlready = await api.hasAdmin();
      if (hasAdminAlready) {
        onConnected(true);
      } else {
        onConnected(false);
        setStep('admin');
      }
    } catch {
      connection.useLocal();
      setConnectError(t('firstRun.serverUnreachable'));
    } finally {
      setConnectBusy(false);
    }
  };

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

  if (step === 'choice') {
    return (
      <div className="auth-screen firstrun-screen">
        <FirstRunLangSwitch />
        <FirstRunBrand />
        <div className="auth-card firstrun-card">
          <h1>{t('firstRun.title')}</h1>
          <p className="subtitle">{t('firstRun.modeSubtitle')}</p>

          <button type="button" className="firstrun-mode-btn primary" onClick={() => setStep('admin')}>
            <span className="firstrun-mode-icon"><HardDrive size={22} /></span>
            <span>
              <strong>{t('firstRun.modeLocalTitle')}</strong>
              <span className="settings-hint">{t('firstRun.modeLocalHint')}</span>
            </span>
          </button>

          <button type="button" className="firstrun-mode-btn" onClick={() => { setConnectMode('lan'); setStep('connect'); }}>
            <span className="firstrun-mode-icon"><Server size={22} /></span>
            <span>
              <strong>{t('firstRun.modeClientTitle')}</strong>
              <span className="settings-hint">{t('firstRun.modeClientHint')}</span>
            </span>
          </button>

          <button type="button" className="firstrun-mode-btn" onClick={() => { setConnectMode('radmin'); setStep('connect'); }}>
            <span className="firstrun-mode-icon"><Wifi size={22} /></span>
            <span>
              <strong>{t('firstRun.modeRadminTitle')}</strong>
              <span className="settings-hint">{t('firstRun.modeRadminHint')}</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (step === 'connect') {
    return (
      <div className="auth-screen firstrun-screen">
        <FirstRunLangSwitch />
        <FirstRunBrand />
        <form className="auth-card firstrun-card" onSubmit={handleConnect}>
          <h1>{t('firstRun.connectTitle')}</h1>
          <p className="subtitle">{t('firstRun.connectSubtitle')}</p>

          {connectMode === 'radmin' && (
            <div className="firstrun-radmin-hint">
              <p>{t('firstRun.radminStep1')}</p>
              <p>{t('firstRun.radminStep2')}</p>
              <p>{t('firstRun.radminStep3')}</p>
            </div>
          )}

          {connectError && <div className="error-text">{connectError}</div>}

          <div className="field">
            <label>{t('firstRun.serverUrlLabel')}</label>
            <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} placeholder="192.168.1.10:8778" />
          </div>

          <button className="primary" type="submit" disabled={connectBusy}>
            {connectBusy ? t('firstRun.connectBusy') : t('firstRun.connectSubmit')}
          </button>
          <button type="button" className="link-btn" onClick={() => setStep('choice')}>
            {t('employees.backBtn')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-screen firstrun-screen">
      <FirstRunBrand />
      <form className="auth-card firstrun-card" onSubmit={handleSubmit}>
        <h1>{t('firstRun.title')}</h1>
        <p className="subtitle">{connection.isClient() ? t('firstRun.subtitleRemote') : t('firstRun.subtitle')}</p>

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
        {!connection.isClient() && (
          <button type="button" className="link-btn" onClick={() => setStep('choice')}>
            {t('employees.backBtn')}
          </button>
        )}
      </form>
    </div>
  );
}
