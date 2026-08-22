import { useState, useEffect, FormEvent, ChangeEvent, useRef } from 'react';
import { Copy, Check, Eye, EyeOff, Send, Clock, Camera, RefreshCw, Bot, X } from 'lucide-react';
import { api, type Employee } from '../lib/api';
import { useLocale, LOCALE_LABELS, type Locale } from '../lib/i18n';
import { useTheme, THEME_NAMES } from '../lib/theme';
import { useToast } from '../lib/toast';
import { compressImageFile } from '../lib/photo';
import { formatUzPhone } from '../lib/phone';
import { parseSqliteUtc } from '../lib/date';
import Avatar from '../components/Avatar';
import Checkbox from '../components/Checkbox';
import Select from '../components/Select';

// Настройки партнёра (v0.4.0) — минимальный набор: тема, язык, смена пароля,
// запрос на смену данных, редактирование фото (все — тот же генерический
// механизм, что и у сотрудников, is_partner нигде на бэкенде не гейтит эти
// вызовы) плюс новый блок Radmin — только чтение (get_radmin_settings уже
// без ACL на бэкенде, партнёру нужно лишь посмотреть текущие ID/пароль VPN
// для удалённого подключения и обновить их, если админ поменял на сервере).
export default function PartnerSettings({ employee: initialEmployee }: { employee: Employee }) {
  const { t, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [employee, setEmployee] = useState(initialEmployee);
  const reloadEmployee = () => {
    api.getEmployee(employee.id).then((e) => { if (e) setEmployee(e); });
  };

  // ---- Пароль ----
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 6) { setPwError(t('settings.errorShort')); return; }
    if (newPassword !== confirmPassword) { setPwError(t('settings.errorMismatch')); return; }
    setPwBusy(true);
    try {
      await api.changePassword({ employeeId: employee.id, currentPassword, newPassword });
      showToast('success', t('settings.success'));
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      setPwError(typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setPwBusy(false);
    }
  };

  // ---- Запрос на смену данных ----
  const selfEditActive = !!employee.selfEditUntil && parseSqliteUtc(employee.selfEditUntil) > new Date();
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingSelf, setSavingSelf] = useState(false);

  useEffect(() => {
    if (selfEditActive) {
      setEditFullName(employee.fullName);
      setEditPhone(employee.phone ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfEditActive]);

  const handleSelfSave = async () => {
    setSavingSelf(true);
    try {
      await api.selfUpdateEmployee({ employeeId: employee.id, fullName: editFullName.trim(), phone: editPhone.trim() || null });
      showToast('success', t('editRequest.selfSaved'));
      reloadEmployee();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('employees.errorGeneric'));
    } finally {
      setSavingSelf(false);
    }
  };

  const [requestOpen, setRequestOpen] = useState(false);
  const [wantName, setWantName] = useState(false);
  const [wantPhone, setWantPhone] = useState(false);
  const [reqFullName, setReqFullName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const openRequestForm = () => {
    setWantName(false);
    setWantPhone(false);
    setReqFullName(employee.fullName);
    setReqPhone(employee.phone ?? '');
    setReqNote('');
    setRequestOpen(true);
  };

  const submitRequest = async () => {
    if (!wantName && !wantPhone) {
      showToast('error', t('editRequest.errorNoFields'));
      return;
    }
    setSendingRequest(true);
    try {
      await api.createEditRequest({
        employeeId: employee.id,
        requestedFullName: wantName ? reqFullName.trim() : null,
        requestedPhone: wantPhone ? reqPhone.trim() : null,
        note: reqNote.trim() || null,
      });
      showToast('success', t('editRequest.sent'));
      setRequestOpen(false);
      reloadEmployee();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('employees.errorGeneric'));
    } finally {
      setSendingRequest(false);
    }
  };

  // ---- Фото профиля ----
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    try {
      const compressed = await compressImageFile(file);
      await api.updateOwnAvatar({ employeeId: employee.id, avatarData: compressed });
      reloadEmployee();
    } catch {
      showToast('error', t('employees.avatarError'));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarBusy(true);
    try {
      await api.updateOwnAvatar({ employeeId: employee.id, avatarData: null });
      reloadEmployee();
    } catch {
      showToast('error', t('employees.avatarError'));
    } finally {
      setAvatarBusy(false);
    }
  };

  // ---- Radmin (только чтение) ----
  const [radminNetworkId, setRadminNetworkId] = useState('');
  const [radminNetworkPassword, setRadminNetworkPassword] = useState('');
  const [radminNote, setRadminNote] = useState('');
  const [radminShowPassword, setRadminShowPassword] = useState(false);
  const [radminLoading, setRadminLoading] = useState(false);
  const [copiedRadminId, setCopiedRadminId] = useState(false);
  const [copiedRadminPassword, setCopiedRadminPassword] = useState(false);

  const loadRadmin = () => {
    setRadminLoading(true);
    api.getRadminSettings()
      .then((s) => {
        setRadminNetworkId(s.networkId);
        setRadminNetworkPassword(s.networkPassword);
        setRadminNote(s.note);
        setRadminLoading(false);
      })
      .catch(() => setRadminLoading(false));
  };

  useEffect(() => { loadRadmin(); }, []);

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

  // ---- Telegram (v0.5.3) — та же логика, что у сотрудника в Settings.tsx,
  // просто у партнёра нет отдельной страницы "Мой кабинет" — привязка живёт
  // прямо тут, рядом с Radmin. ----
  const [tgLinked, setTgLinked] = useState(false);
  const [tgLinkInfo, setTgLinkInfo] = useState<{ code: string; deepLink: string | null; botConfigured: boolean } | null>(null);
  const [tgLinkBusy, setTgLinkBusy] = useState(false);

  useEffect(() => {
    api.getTelegramLinkStatus({ actorId: employee.id, employeeId: employee.id }).then(setTgLinked).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  const handleGetTelegramCode = async () => {
    setTgLinkBusy(true);
    try {
      const info = await api.generateTelegramLinkCode({ actorId: employee.id, employeeId: employee.id });
      setTgLinkInfo(info);
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setTgLinkBusy(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    setTgLinkBusy(true);
    try {
      await api.unlinkTelegram({ actorId: employee.id, employeeId: employee.id });
      setTgLinked(false);
      setTgLinkInfo(null);
      showToast('success', t('settings.telegramLink.unlinkSuccess'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('settings.errorGeneric'));
    } finally {
      setTgLinkBusy(false);
    }
  };

  const themeOptions = THEME_NAMES.map((value) => ({ value, label: t(`settings.theme.${value}`) }));
  const languageOptions = (Object.keys(LOCALE_LABELS) as Locale[]).map((value) => ({ value, label: LOCALE_LABELS[value] }));

  return (
    <div className="settings-page">
      <h1>{t('settings.title')}</h1>

      <section className="settings-section">
        <h2>{t('settings.appearance')}</h2>
        <Select value={theme} options={themeOptions} onChange={(v) => setTheme(v as typeof theme)} />
        <p className="settings-hint">{t('settings.themeHint')}</p>
      </section>

      <section className="settings-section">
        <h2>{t('settings.language')}</h2>
        <Select value={locale} options={languageOptions} onChange={(v) => setLocale(v as Locale)} />
        <p className="settings-hint">{t('settings.languageHint')}</p>
      </section>

      <section className="settings-section">
        <h2>{t('settings.passwordSection')}</h2>
        <form className="password-form" onSubmit={handleChangePassword}>
          {pwError && <div className="error-text">{pwError}</div>}
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
          <button className="primary" type="submit" disabled={pwBusy} style={{ width: 220 }}>
            {pwBusy ? t('settings.changePasswordBusy') : t('settings.changePasswordBtn')}
          </button>
        </form>
      </section>

      <section className="settings-section">
        <h2>{t('employees.avatarUploadLabel')}</h2>
        <div className="avatar-upload-row">
          <Avatar name={employee.fullName || employee.login} size={56} src={employee.avatarData} />
          <div className="avatar-upload-actions">
            <button className="modal-btn" onClick={() => avatarInputRef.current?.click()} disabled={avatarBusy}>
              <Camera size={14} /> {t('employees.avatarUploadBtn')}
            </button>
            {employee.avatarData && (
              <button className="modal-btn danger" onClick={handleAvatarRemove} disabled={avatarBusy}>
                {t('employees.avatarRemoveBtn')}
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>{t('editRequest.sectionTitle')}</h2>
        {selfEditActive ? (
          <>
            <div className="profile-edit-request-title">
              <Clock size={14} /> {t('editRequest.selfEditActive', { time: parseSqliteUtc(employee.selfEditUntil!).toLocaleString() })}
            </div>
            <div className="field">
              <label>{t('firstRun.fullNameLabel')}</label>
              <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('employees.phoneLabel')}</label>
              <input value={editPhone} onChange={(e) => setEditPhone(formatUzPhone(e.target.value))} />
            </div>
            <button className="modal-btn danger" onClick={handleSelfSave} disabled={savingSelf}>
              {savingSelf ? t('employees.savingBusy') : t('editRequest.saveOwn')}
            </button>
          </>
        ) : employee.hasPendingEditRequest ? (
          <p className="settings-hint">{t('editRequest.pending')}</p>
        ) : !requestOpen ? (
          <button className="ghost-btn" onClick={openRequestForm}>
            <Send size={14} /> {t('editRequest.openBtn')}
          </button>
        ) : (
          <div className="edit-request-form">
            <Checkbox checked={wantName} onChange={setWantName} label={t('firstRun.fullNameLabel')} />
            {wantName && <input value={reqFullName} onChange={(e) => setReqFullName(e.target.value)} />}

            <Checkbox checked={wantPhone} onChange={setWantPhone} label={t('employees.phoneLabel')} />
            {wantPhone && <input value={reqPhone} onChange={(e) => setReqPhone(formatUzPhone(e.target.value))} />}

            <div className="field">
              <label>{t('editRequest.noteLabel')}</label>
              <textarea rows={2} value={reqNote} onChange={(e) => setReqNote(e.target.value)} />
            </div>

            <div className="edit-request-form-actions">
              <button className="modal-btn" onClick={() => setRequestOpen(false)}>
                {t('common.cancel')}
              </button>
              <button className="modal-btn danger" onClick={submitRequest} disabled={sendingRequest}>
                {sendingRequest ? t('employees.savingBusy') : t('editRequest.submitBtn')}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>{t('settings.radmin.title')}</h2>
        <p className="settings-hint">{t('partnerSettings.radminHint')}</p>

        <div className="telegram-bot-card">
          <div className="field">
            <label>{t('settings.radmin.networkIdLabel')}</label>
            <div className="radmin-copy-row">
              <input value={radminNetworkId} readOnly />
              <button className="reg-action-btn" onClick={handleCopyRadminId} title={t('settings.server.copyAddress')}>
                {copiedRadminId ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div className="field">
            <label>{t('settings.radmin.networkPasswordLabel')}</label>
            <div className="radmin-copy-row">
              <input type={radminShowPassword ? 'text' : 'password'} value={radminNetworkPassword} readOnly />
              <button className="reg-action-btn" onClick={() => setRadminShowPassword((v) => !v)} title={t('settings.radmin.networkPasswordLabel')}>
                {radminShowPassword ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button className="reg-action-btn" onClick={handleCopyRadminPassword} title={t('settings.server.copyAddress')}>
                {copiedRadminPassword ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {radminNote && (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>{t('settings.radmin.noteLabel')}</label>
              <p className="settings-hint">{radminNote}</p>
            </div>
          )}
        </div>

        <button className="modal-btn" onClick={loadRadmin} disabled={radminLoading} style={{ marginTop: 12 }}>
          <RefreshCw size={14} /> {t('partnerSettings.radminRefreshBtn')}
        </button>
      </section>

      <section className="settings-section">
        <h2><Bot size={18} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />{t('settings.telegramLink.title')}</h2>
        <p className="settings-hint">{t('partnerSettings.telegramLinkHint')}</p>

        <div className="telegram-bot-card">
          <div className="account-row">
            <span className="settings-hint">{t('settings.telegramLink.statusLabel')}</span>
            {tgLinked ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="absence-status reg-entry-badge-done">{t('settings.telegramLink.linked')}</span>
                <button className="reg-action-btn" onClick={handleUnlinkTelegram} disabled={tgLinkBusy} title={t('settings.telegramLink.unlinkBtn')}>
                  <X size={13} />
                </button>
              </span>
            ) : (
              <button className="modal-btn" onClick={handleGetTelegramCode} disabled={tgLinkBusy}>
                {tgLinkBusy ? t('common.loading') : t('settings.telegramLink.getCodeBtn')}
              </button>
            )}
          </div>
          {tgLinkInfo && !tgLinked && (
            <>
              {!tgLinkInfo.botConfigured && <p className="settings-hint">{t('settings.telegramLink.noBotConfigured')}</p>}
              <div className="account-row" style={{ marginTop: 8 }}>
                <span className="settings-hint">{t('settings.telegramLink.codeHint', { code: tgLinkInfo.code })}</span>
                {tgLinkInfo.deepLink && (
                  <a className="modal-btn" href={tgLinkInfo.deepLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    {t('settings.telegramLink.openBotBtn')}
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
