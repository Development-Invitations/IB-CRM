import { useState, useEffect, FormEvent } from 'react';
import { Copy, Check } from 'lucide-react';
import { api, type Employee, type ServerSettings } from '../lib/api';
import { useLocale, LOCALE_LABELS, type Locale } from '../lib/i18n';
import { useTheme, THEME_NAMES } from '../lib/theme';
import { useToast } from '../lib/toast';
import { connection } from '../lib/connection';
import { session } from '../lib/session';
import { ZOOM_LEVELS, getStoredZoom, applyZoom } from '../lib/zoom';
import Select from '../components/Select';

export default function Settings({ employee }: { employee: Employee }) {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [zoom, setZoomState] = useState(getStoredZoom());
  const handleZoomChange = (v: string) => {
    const percent = Number(v);
    setZoomState(percent);
    applyZoom(percent).catch(() => showToast('error', t('settings.errorGeneric')));
  };

  const isClient = connection.isClient();
  const [serverSettings, setServerSettingsState] = useState<ServerSettings | null>(null);
  const [lanAddress, setLanAddress] = useState<string | null>(null);
  const [portInput, setPortInput] = useState('8778');
  const [serverBusy, setServerBusy] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [installerPath, setInstallerPath] = useState<string | null>(null);
  const [copiedInstallerPath, setCopiedInstallerPath] = useState(false);

  useEffect(() => {
    if (!employee.isAdmin || isClient) return;
    api.getServerSettings().then((s) => {
      setServerSettingsState(s);
      setPortInput(String(s.port));
    });
    api.getLanAddress().then(setLanAddress);
    api.getUpdateInstallerPath().then(setInstallerPath).catch(() => {});
  }, [employee.isAdmin, isClient]);

  const handleCopyInstallerPath = () => {
    if (!installerPath) return;
    navigator.clipboard.writeText(installerPath).then(() => {
      setCopiedInstallerPath(true);
      setTimeout(() => setCopiedInstallerPath(false), 2000);
    });
  };

  const handleToggleServer = async () => {
    if (!serverSettings) return;
    const port = Number(portInput) || serverSettings.port;
    setServerBusy(true);
    try {
      const updated = await api.setServerSettings({ adminId: employee.id, enabled: !serverSettings.enabled, port });
      setServerSettingsState(updated);
      showToast('success', t('settings.server.restartHint'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setServerBusy(false);
    }
  };

  const handleSavePort = async () => {
    if (!serverSettings) return;
    const port = Number(portInput);
    if (!port || port < 1024 || port > 65535) {
      showToast('error', t('settings.server.portInvalid'));
      return;
    }
    setServerBusy(true);
    try {
      const updated = await api.setServerSettings({ adminId: employee.id, enabled: serverSettings.enabled, port });
      setServerSettingsState(updated);
      showToast('success', t('settings.server.restartHint'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setServerBusy(false);
    }
  };

  const handleCopyAddress = () => {
    if (!lanAddress || !serverSettings) return;
    navigator.clipboard.writeText(`${lanAddress}:${serverSettings.port}`).then(() => {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    });
  };

  const handleDisconnect = () => {
    connection.useLocal();
    window.location.reload();
  };

  const [connectUrl, setConnectUrl] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);

  const handleConnectToServer = async () => {
    const trimmed = connectUrl.trim();
    if (!trimmed) {
      showToast('error', t('firstRun.serverUrlRequired'));
      return;
    }
    setConnectBusy(true);
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    connection.connectToServer(normalized);
    try {
      await api.hasAdmin();
      // Локальная сессия этого устройства относится к локальной базе — она
      // невалидна для сервера (другой набор сотрудников/токенов), поэтому
      // сбрасываем её, чтобы после перезагрузки честно спросился логин уже
      // от учётной записи на сервере.
      session.clear();
      window.location.reload();
    } catch {
      connection.useLocal();
      showToast('error', t('firstRun.serverUnreachable'));
      setConnectBusy(false);
    }
  };

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

  const languageOptions = (Object.keys(LOCALE_LABELS) as Locale[]).map((value) => ({
    value,
    label: LOCALE_LABELS[value],
  }));

  const themeOptions = THEME_NAMES.map((value) => ({
    value,
    label: t(`settings.theme.${value}`),
  }));

  return (
    <div className="settings-page">
      <h1>{t('settings.title')}</h1>

      <section className="settings-section">
        <h2>{t('settings.appearance')}</h2>
        <Select value={theme} options={themeOptions} onChange={(v) => setTheme(v as typeof theme)} />
        <p className="settings-hint">{t('settings.themeHint')}</p>
      </section>

      <section className="settings-section">
        <h2>{t('settings.display')}</h2>
        <Select
          value={String(zoom)}
          options={ZOOM_LEVELS.map((z) => ({ value: String(z), label: `${z}%` }))}
          onChange={handleZoomChange}
        />
        <p className="settings-hint">{t('settings.displayHint')}</p>
      </section>

      <section className="settings-section">
        <h2>{t('settings.language')}</h2>
        <Select value={locale} options={languageOptions} onChange={(v) => setLocale(v as Locale)} />
        <p className="settings-hint">{t('settings.languageHint')}</p>
      </section>

      <section className="settings-section">
        <h2>{t('settings.account')}</h2>
        <div className="account-row">
          <span className="settings-hint">{t('settings.loginFieldLabel')}</span>
          <span>{employee.login}</span>
        </div>
        <div className="account-row">
          <span className="settings-hint">{t('settings.idFieldLabel')}</span>
          <span>{employee.employeeNumber}</span>
        </div>
      </section>

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
        <p className="settings-hint">{t('settings.changePasswordHint')}</p>
      </section>

      {isClient && (
        <section className="settings-section">
          <h2>{t('settings.server.title')}</h2>
          <div className="account-row">
            <span className="settings-hint">{t('settings.server.connectedTo')}</span>
            <span>{connection.getServerUrl()}</span>
          </div>
          <button className="modal-btn danger" onClick={handleDisconnect} style={{ marginTop: 10 }}>
            {t('settings.server.disconnectBtn')}
          </button>
        </section>
      )}

      {!isClient && (
        <section className="settings-section">
          <h2>{t('settings.server.connectSectionTitle')}</h2>
          <p className="settings-hint">{t('settings.server.connectSectionHint')}</p>
          <div className="field" style={{ maxWidth: 320, marginTop: 8 }}>
            <label>{t('firstRun.serverUrlLabel')}</label>
            <input
              value={connectUrl}
              onChange={(e) => setConnectUrl(e.target.value)}
              placeholder="192.168.1.10:8778"
              disabled={connectBusy}
            />
          </div>
          <button className="modal-btn danger" onClick={handleConnectToServer} disabled={connectBusy} style={{ marginTop: 10 }}>
            {connectBusy ? t('firstRun.connectBusy') : t('firstRun.connectSubmit')}
          </button>
        </section>
      )}

      {employee.isAdmin && !isClient && serverSettings && (
        <section className="settings-section">
          <h2>{t('settings.server.title')}</h2>
          <p className="settings-hint">{t('settings.server.hint')}</p>

          <div className="account-row">
            <span className="settings-hint">{t('settings.server.enableLabel')}</span>
            <button className={`modal-btn${serverSettings.enabled ? ' danger' : ''}`} onClick={handleToggleServer} disabled={serverBusy}>
              {serverSettings.enabled ? t('settings.server.disableBtn') : t('settings.server.enableBtn')}
            </button>
          </div>

          <div className="field" style={{ maxWidth: 160, marginTop: 12 }}>
            <label>{t('settings.server.portLabel')}</label>
            <input value={portInput} onChange={(e) => setPortInput(e.target.value.replace(/\D/g, ''))} />
          </div>
          <button className="modal-btn" onClick={handleSavePort} disabled={serverBusy}>
            {t('settings.server.savePortBtn')}
          </button>

          {serverSettings.enabled && (
            <div className="account-row" style={{ marginTop: 12 }}>
              <span className="settings-hint">{t('settings.server.addressLabel')}</span>
              <span>
                {lanAddress ? `${lanAddress}:${serverSettings.port}` : t('settings.server.addressUnknown')}
                {lanAddress && (
                  <button className="reg-action-btn" style={{ marginLeft: 8 }} onClick={handleCopyAddress} title={t('settings.server.copyAddress')}>
                    {copiedAddress ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                )}
              </span>
            </div>
          )}

          <div className="account-row" style={{ marginTop: 12, alignItems: 'flex-start' }}>
            <span className="settings-hint">{t('updates.serverInstallerHint')}</span>
            <span style={{ wordBreak: 'break-all' }}>
              {installerPath ?? '—'}
              {installerPath && (
                <button className="reg-action-btn" style={{ marginLeft: 8 }} onClick={handleCopyInstallerPath} title={t('settings.server.copyAddress')}>
                  {copiedInstallerPath ? <Check size={13} /> : <Copy size={13} />}
                </button>
              )}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
