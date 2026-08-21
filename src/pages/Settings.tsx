import { useState, useEffect, FormEvent } from 'react';
import { Copy, Check, FolderOpen, Upload, Eye, EyeOff, Download, Database, Image as ImageIcon, X, Bot } from 'lucide-react';
import { open as openFileDialog, save as saveFileDialog } from '@tauri-apps/plugin-dialog';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { relaunch } from '@tauri-apps/plugin-process';
import { api, type Employee, type ServerSettings } from '../lib/api';
import Modal from '../components/Modal';
import { useLocale, LOCALE_LABELS, type Locale } from '../lib/i18n';
import { useTheme, THEME_NAMES } from '../lib/theme';
import { useToast } from '../lib/toast';
import { connection } from '../lib/connection';
import { session } from '../lib/session';
import { ZOOM_LEVELS, getStoredZoom, applyZoom } from '../lib/zoom';
import { getStoredWindowMode, applyWindowMode, type WindowMode } from '../lib/windowMode';
import { compressLogoFile } from '../lib/photo';
import { useAppLogo, setCachedAppLogo, applyRuntimeIcon, DEFAULT_LOGO } from '../lib/appLogo';
import Select from '../components/Select';
import Checkbox from '../components/Checkbox';

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

  const [windowMode, setWindowModeState] = useState<WindowMode>(getStoredWindowMode());
  const handleWindowModeChange = (v: string) => {
    const mode = v as WindowMode;
    setWindowModeState(mode);
    applyWindowMode(mode).catch(() => showToast('error', t('settings.errorGeneric')));
  };

  const isClient = connection.isClient();
  const [serverSettings, setServerSettingsState] = useState<ServerSettings | null>(null);
  const [lanAddress, setLanAddress] = useState<string | null>(null);
  const [portInput, setPortInput] = useState('8778');
  const [serverBusy, setServerBusy] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [installerPath, setInstallerPath] = useState<string | null>(null);
  const [copiedInstallerPath, setCopiedInstallerPath] = useState(false);
  const [installerAvailable, setInstallerAvailable] = useState<boolean | null>(null);
  const [installerBusy, setInstallerBusy] = useState(false);

  // Резервные копии базы (только локально/сервер — см. docs/TZ.md v0.2.26:
  // восстановление подменяет файл базы этого процесса, с клиента такое не
  // проксируется, симметрично set_update_installer выше).
  const [exportPassword, setExportPassword] = useState('');
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState('');
  const [exportBusy, setExportBusy] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restorePendingPath, setRestorePendingPath] = useState<string | null>(null);

  // Radmin — справочные данные для удалённого доступа (не функциональная
  // интеграция, у Radmin нет доступного нам API — просто хранилище, чтобы
  // не диктовать ID/пароль сети по памяти). Видно админу всегда, включая
  // клиент-режим — это обычные app_meta-данные, идут через тот же invoke.
  const [radminNetworkId, setRadminNetworkId] = useState('');
  const [radminNetworkPassword, setRadminNetworkPassword] = useState('');
  const [radminNote, setRadminNote] = useState('');
  const [radminShowPassword, setRadminShowPassword] = useState(false);
  const [radminBusy, setRadminBusy] = useState(false);
  const [copiedRadminId, setCopiedRadminId] = useState(false);
  const [copiedRadminPassword, setCopiedRadminPassword] = useState(false);

  // Telegram-боты (v0.4.1) — три независимых бота, каждый со своим токеном
  // (решение пользователя, не один общий бот). Реализовано пока только
  // подключение/хранение токена в этой версии — сама отправка/приём
  // сообщений через Telegram Bot API не реализована, это следующий шаг.
  const [tgAdminTaskEnabled, setTgAdminTaskEnabled] = useState(false);
  const [tgAdminTaskToken, setTgAdminTaskToken] = useState('');
  const [tgTaskCloseEnabled, setTgTaskCloseEnabled] = useState(false);
  const [tgTaskCloseToken, setTgTaskCloseToken] = useState('');
  const [tgAdminPartnerEnabled, setTgAdminPartnerEnabled] = useState(false);
  const [tgAdminPartnerToken, setTgAdminPartnerToken] = useState('');
  const [tgBusy, setTgBusy] = useState(false);

  useEffect(() => {
    if (!employee.isAdmin) return;
    api.getTelegramBotSettings({ actorId: employee.id }).then((s) => {
      setTgAdminTaskEnabled(s.adminTaskEnabled);
      setTgAdminTaskToken(s.adminTaskToken ?? '');
      setTgTaskCloseEnabled(s.taskCloseEnabled);
      setTgTaskCloseToken(s.taskCloseToken ?? '');
      setTgAdminPartnerEnabled(s.adminPartnerEnabled);
      setTgAdminPartnerToken(s.adminPartnerToken ?? '');
    }).catch(() => {});
  }, [employee.isAdmin, employee.id]);

  const handleSaveTelegramBots = async () => {
    setTgBusy(true);
    try {
      await api.setTelegramBotSettings({
        adminId: employee.id,
        adminTaskEnabled: tgAdminTaskEnabled,
        adminTaskToken: tgAdminTaskToken.trim() || null,
        taskCloseEnabled: tgTaskCloseEnabled,
        taskCloseToken: tgTaskCloseToken.trim() || null,
        adminPartnerEnabled: tgAdminPartnerEnabled,
        adminPartnerToken: tgAdminPartnerToken.trim() || null,
      });
      showToast('success', t('settings.telegramBots.saveSuccess'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setTgBusy(false);
    }
  };

  // Логотип приложения — виден и редактируем любым админом (в т.ч. другой
  // компанией, ставящей это же приложение под своим брендом), применяется
  // сразу для всех пользователей этой установки (app_meta, см. db.rs).
  const currentLogo = useAppLogo();
  const [logoBusy, setLogoBusy] = useState(false);

  useEffect(() => {
    if (!employee.isAdmin || isClient) return;
    api.getServerSettings().then((s) => {
      setServerSettingsState(s);
      setPortInput(String(s.port));
    });
    api.getLanAddress().then(setLanAddress);
    api.getUpdateInstallerPath().then(setInstallerPath).catch(() => {});
    api.getUpdateInstallerInfo().then((info) => setInstallerAvailable(info.available)).catch(() => {});
  }, [employee.isAdmin, isClient]);

  useEffect(() => {
    if (!employee.isAdmin) return;
    api.getRadminSettings().then((s) => {
      setRadminNetworkId(s.networkId);
      setRadminNetworkPassword(s.networkPassword);
      setRadminNote(s.note);
    }).catch(() => {});
  }, [employee.isAdmin]);

  // Диалог выбора файла + прямое копирование на бэкенде — без этого админ
  // должен вручную найти/создать папку в AppData и переименовать файл, что
  // на практике оказалось запутанным (см. журнал v0.2.12 в docs/TZ.md).
  const handlePickInstaller = async () => {
    try {
      const selected = await openFileDialog({ multiple: false, filters: [{ name: 'Installer', extensions: ['exe'] }] });
      if (!selected || typeof selected !== 'string') return;
      setInstallerBusy(true);
      await api.setUpdateInstaller({ adminId: employee.id, sourcePath: selected });
      setInstallerAvailable(true);
      showToast('success', t('settings.server.installerSetSuccess'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setInstallerBusy(false);
    }
  };

  const handleCopyInstallerPath = () => {
    if (!installerPath) return;
    navigator.clipboard.writeText(installerPath).then(() => {
      setCopiedInstallerPath(true);
      setTimeout(() => setCopiedInstallerPath(false), 2000);
    });
  };

  // Открывает саму папку в проводнике — без этого админ должен вручную
  // набрать/создать путь в AppData, что на практике оказалось запутанным
  // (см. журнал v0.2.12 в docs/TZ.md). Открываем родительскую папку, а не
  // сам файл — файла может ещё не быть, это нормально, папка уже создаётся
  // заранее при старте приложения.
  const handleOpenInstallerFolder = () => {
    if (!installerPath) return;
    const folder = installerPath.replace(/[\\/][^\\/]*$/, '');
    shellOpen(folder).catch(() => showToast('error', t('settings.errorGeneric')));
  };

  const handleSaveRadmin = async () => {
    setRadminBusy(true);
    try {
      const updated = await api.setRadminSettings({
        adminId: employee.id,
        networkId: radminNetworkId.trim(),
        networkPassword: radminNetworkPassword.trim(),
        note: radminNote.trim(),
      });
      setRadminNetworkId(updated.networkId);
      setRadminNetworkPassword(updated.networkPassword);
      setRadminNote(updated.note);
      showToast('success', t('settings.radmin.saveSuccess'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setRadminBusy(false);
    }
  };

  const handleCopyRadminId = () => {
    if (!radminNetworkId) return;
    navigator.clipboard.writeText(radminNetworkId).then(() => {
      setCopiedRadminId(true);
      setTimeout(() => setCopiedRadminId(false), 2000);
    });
  };

  const handleCopyRadminPassword = () => {
    if (!radminNetworkPassword) return;
    navigator.clipboard.writeText(radminNetworkPassword).then(() => {
      setCopiedRadminPassword(true);
      setTimeout(() => setCopiedRadminPassword(false), 2000);
    });
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoBusy(true);
    try {
      const compressed = await compressLogoFile(file);
      const saved = await api.setAppLogo({ adminId: employee.id, logoData: compressed });
      setCachedAppLogo(saved);
      if (saved) applyRuntimeIcon(saved).catch(() => {});
      showToast('success', t('settings.logo.saveSuccess'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setLogoBusy(false);
    }
  };

  const handleResetLogo = async () => {
    setLogoBusy(true);
    try {
      await api.setAppLogo({ adminId: employee.id, logoData: null });
      setCachedAppLogo(null);
      showToast('success', t('settings.logo.resetSuccess'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setLogoBusy(false);
    }
  };

  const handleExportBackup = async () => {
    if (exportPassword.length < 6) {
      showToast('error', t('settings.backup.exportErrorShortPassword'));
      return;
    }
    if (exportPassword !== exportPasswordConfirm) {
      showToast('error', t('settings.backup.exportErrorMismatch'));
      return;
    }
    try {
      const destPath = await saveFileDialog({
        defaultPath: 'ib-crm-backup.ibcbak',
        filters: [{ name: 'IB CRM Backup', extensions: ['ibcbak'] }],
      });
      if (!destPath || typeof destPath !== 'string') return;
      setExportBusy(true);
      await api.exportBackup({ adminId: employee.id, password: exportPassword, destPath });
      setExportPassword('');
      setExportPasswordConfirm('');
      showToast('success', t('settings.backup.exportSuccess'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setExportBusy(false);
    }
  };

  const handlePickRestoreFile = async () => {
    if (restorePassword.length === 0) {
      showToast('error', t('settings.backup.restorePasswordRequired'));
      return;
    }
    const selected = await openFileDialog({ multiple: false, filters: [{ name: 'IB CRM Backup', extensions: ['ibcbak'] }] });
    if (!selected || typeof selected !== 'string') return;
    setRestorePendingPath(selected);
  };

  const handleConfirmRestore = async () => {
    if (!restorePendingPath) return;
    setRestoreBusy(true);
    try {
      await api.restoreBackup({ adminId: employee.id, password: restorePassword, sourcePath: restorePendingPath });
      setRestorePendingPath(null);
      showToast('success', t('settings.backup.restoreSuccess'));
      await relaunch();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.backup.restoreErrorWrongPassword'));
      setRestoreBusy(false);
    }
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

        <div style={{ marginTop: 14 }}>
          <Select
            value={windowMode}
            options={[
              { value: 'windowed', label: t('settings.windowModeWindowed') },
              { value: 'maximized', label: t('settings.windowModeMaximized') },
              { value: 'fullscreen', label: t('settings.windowModeFullscreen') },
            ]}
            onChange={handleWindowModeChange}
          />
          <p className="settings-hint">{t('settings.windowModeHint')}</p>
        </div>
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
                <>
                  <button className="reg-action-btn" style={{ marginLeft: 8 }} onClick={handleCopyInstallerPath} title={t('settings.server.copyAddress')}>
                    {copiedInstallerPath ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  <button className="reg-action-btn" style={{ marginLeft: 4 }} onClick={handleOpenInstallerFolder} title={t('settings.server.openInstallerFolder')}>
                    <FolderOpen size={13} />
                  </button>
                </>
              )}
            </span>
          </div>

          <div className="account-row" style={{ marginTop: 10 }}>
            <span className="settings-hint">
              {installerAvailable ? t('settings.server.installerReady') : t('settings.server.installerMissing')}
            </span>
            <button className="modal-btn" onClick={handlePickInstaller} disabled={installerBusy}>
              <Upload size={14} /> {installerBusy ? t('settings.server.installerSetBusy') : t('settings.server.installerSetBtn')}
            </button>
          </div>
        </section>
      )}

      {employee.isAdmin && !isClient && (
        <section className="settings-section">
          <h2>{t('settings.backup.title')}</h2>
          <p className="settings-hint">{t('settings.backup.hint')}</p>

          <h3 className="settings-subheading">{t('settings.backup.exportTitle')}</h3>
          <div className="field" style={{ maxWidth: 320, marginTop: 8 }}>
            <label>{t('settings.backup.exportPasswordLabel')}</label>
            <input type="password" value={exportPassword} onChange={(e) => setExportPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="field" style={{ maxWidth: 320 }}>
            <label>{t('settings.backup.exportConfirmLabel')}</label>
            <input type="password" value={exportPasswordConfirm} onChange={(e) => setExportPasswordConfirm(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="modal-btn" onClick={handleExportBackup} disabled={exportBusy}>
            <Download size={14} /> {exportBusy ? t('settings.backup.exportBusy') : t('settings.backup.exportBtn')}
          </button>

          <h3 className="settings-subheading" style={{ marginTop: 20 }}>{t('settings.backup.restoreTitle')}</h3>
          <div className="field" style={{ maxWidth: 320, marginTop: 8 }}>
            <label>{t('settings.backup.restorePasswordLabel')}</label>
            <input type="password" value={restorePassword} onChange={(e) => setRestorePassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="modal-btn danger" onClick={handlePickRestoreFile} disabled={restoreBusy}>
            <Database size={14} /> {restoreBusy ? t('settings.backup.restoreBusy') : t('settings.backup.restoreBtn')}
          </button>
        </section>
      )}

      {employee.isAdmin && (
        <section className="settings-section">
          <h2>{t('settings.radmin.title')}</h2>
          <p className="settings-hint">{t('settings.radmin.hint')}</p>

          <div className="field" style={{ maxWidth: 320, marginTop: 8 }}>
            <label>{t('settings.radmin.networkIdLabel')}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={radminNetworkId} onChange={(e) => setRadminNetworkId(e.target.value)} />
              <button className="reg-action-btn" onClick={handleCopyRadminId} title={t('settings.server.copyAddress')}>
                {copiedRadminId ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div className="field" style={{ maxWidth: 320 }}>
            <label>{t('settings.radmin.networkPasswordLabel')}</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type={radminShowPassword ? 'text' : 'password'}
                value={radminNetworkPassword}
                onChange={(e) => setRadminNetworkPassword(e.target.value)}
              />
              <button className="reg-action-btn" onClick={() => setRadminShowPassword((v) => !v)} title={t('settings.radmin.networkPasswordLabel')}>
                {radminShowPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button className="reg-action-btn" onClick={handleCopyRadminPassword} title={t('settings.server.copyAddress')}>
                {copiedRadminPassword ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div className="field" style={{ maxWidth: 320 }}>
            <label>{t('settings.radmin.noteLabel')}</label>
            <textarea value={radminNote} onChange={(e) => setRadminNote(e.target.value)} rows={3} />
          </div>

          <button className="modal-btn" onClick={handleSaveRadmin} disabled={radminBusy}>
            {radminBusy ? t('common.loading') : t('settings.radmin.saveBtn')}
          </button>
        </section>
      )}

      {employee.isAdmin && (
        <section className="settings-section">
          <h2>{t('settings.logo.title')}</h2>
          <p className="settings-hint">{t('settings.logo.hint')}</p>

          <div className="avatar-upload-row" style={{ marginTop: 10 }}>
            <img src={currentLogo} alt="" style={{ width: 64, height: 64, objectFit: 'contain' }} />
            <div className="avatar-upload-actions">
              <input id="logo-file-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
              <button type="button" className="modal-btn" onClick={() => document.getElementById('logo-file-input')?.click()} disabled={logoBusy}>
                <ImageIcon size={14} /> {logoBusy ? t('settings.logo.uploadBusy') : t('settings.logo.uploadBtn')}
              </button>
              {currentLogo !== DEFAULT_LOGO && (
                <button type="button" className="link-btn" onClick={handleResetLogo} disabled={logoBusy}>
                  <X size={13} /> {t('settings.logo.resetBtn')}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {employee.isAdmin && (
        <section className="settings-section">
          <h2><Bot size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />{t('settings.telegramBots.title')}</h2>
          <p className="settings-hint">{t('settings.telegramBots.hint')}</p>

          <div className="telegram-bot-card">
            <div className="telegram-bot-card-head">
              <Checkbox checked={tgAdminTaskEnabled} onChange={setTgAdminTaskEnabled} label={t('settings.telegramBots.adminTaskTitle')} />
            </div>
            <p className="settings-hint">{t('settings.telegramBots.adminTaskDesc')}</p>
            {tgAdminTaskEnabled && (
              <div className="field" style={{ maxWidth: 420 }}>
                <label>{t('settings.telegramBots.tokenLabel')}</label>
                <input value={tgAdminTaskToken} onChange={(e) => setTgAdminTaskToken(e.target.value)} placeholder={t('settings.telegramBots.tokenPlaceholder')} />
              </div>
            )}
          </div>

          <div className="telegram-bot-card">
            <div className="telegram-bot-card-head">
              <Checkbox checked={tgTaskCloseEnabled} onChange={setTgTaskCloseEnabled} label={t('settings.telegramBots.taskCloseTitle')} />
            </div>
            <p className="settings-hint">{t('settings.telegramBots.taskCloseDesc')}</p>
            {tgTaskCloseEnabled && (
              <div className="field" style={{ maxWidth: 420 }}>
                <label>{t('settings.telegramBots.tokenLabel')}</label>
                <input value={tgTaskCloseToken} onChange={(e) => setTgTaskCloseToken(e.target.value)} placeholder={t('settings.telegramBots.tokenPlaceholder')} />
              </div>
            )}
          </div>

          <div className="telegram-bot-card">
            <div className="telegram-bot-card-head">
              <Checkbox checked={tgAdminPartnerEnabled} onChange={setTgAdminPartnerEnabled} label={t('settings.telegramBots.adminPartnerTitle')} />
            </div>
            <p className="settings-hint">{t('settings.telegramBots.adminPartnerDesc')}</p>
            {tgAdminPartnerEnabled && (
              <div className="field" style={{ maxWidth: 420 }}>
                <label>{t('settings.telegramBots.tokenLabel')}</label>
                <input value={tgAdminPartnerToken} onChange={(e) => setTgAdminPartnerToken(e.target.value)} placeholder={t('settings.telegramBots.tokenPlaceholder')} />
              </div>
            )}
          </div>

          <p className="settings-hint">{t('settings.telegramBots.linkingHint')}</p>

          <button className="modal-btn" onClick={handleSaveTelegramBots} disabled={tgBusy}>
            {tgBusy ? t('common.loading') : t('settings.telegramBots.saveBtn')}
          </button>
        </section>
      )}

      <Modal
        open={!!restorePendingPath}
        title={t('settings.backup.restoreConfirmTitle')}
        onClose={() => setRestorePendingPath(null)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setRestorePendingPath(null)} disabled={restoreBusy}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleConfirmRestore} disabled={restoreBusy}>
              {restoreBusy ? t('common.loading') : t('settings.backup.restoreBtn')}
            </button>
          </>
        }
      >
        {t('settings.backup.restoreConfirmBody')}
      </Modal>
    </div>
  );
}
