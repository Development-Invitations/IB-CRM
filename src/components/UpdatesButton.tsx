import { useState } from 'react';
import { RefreshCw, ChevronDown, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import LoadingScreen from './LoadingScreen';
import { changelog } from '../lib/changelog';
import { useLocale } from '../lib/i18n';
import { checkForAppUpdate, restartApp, type UpdateCheckResult, type UpdateProgress } from '../lib/updater';

export default function UpdatesButton() {
  const { t, locale } = useLocale();
  const entries = changelog[locale];
  const [open, setOpen] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(entries[0]?.version ?? null);
  const [onlineCheck, setOnlineCheck] = useState<'idle' | 'checking' | UpdateCheckResult>('idle');
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [done, setDone] = useState(false);

  const handleCheckOnline = async () => {
    setOnlineCheck('checking');
    const res = await checkForAppUpdate();
    setOnlineCheck(res);
  };

  const handleInstall = async () => {
    if (onlineCheck === 'idle' || onlineCheck === 'checking' || onlineCheck.status !== 'available') return;
    setInstalling(true);
    setProgress({ downloaded: 0, total: null });
    try {
      await onlineCheck.install((p) => setProgress(p));
      setDone(true);
      setTimeout(() => {
        restartApp().catch(() => {
          setInstalling(false);
          setDone(false);
        });
      }, 1800);
    } catch {
      setInstalling(false);
      setProgress(null);
    }
  };

  const percent = progress && progress.total ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100)) : null;

  return (
    <>
      <button className="ghost-btn" onClick={() => setOpen(true)}>
        <RefreshCw size={14} /> {t('updates.checkBtn')}
      </button>

      <Modal
        open={open}
        title={t('updates.modalTitle')}
        onClose={() => !installing && setOpen(false)}
        actions={
          !installing ? (
            <button className="modal-btn" onClick={() => setOpen(false)}>
              {t('common.close')}
            </button>
          ) : undefined
        }
      >
        {installing ? (
          done ? (
            <div className="update-progress update-progress-done">
              <CheckCircle2 size={32} className="update-done-icon" />
              <div className="update-progress-label">{t('updates.installedRestarting')}</div>
            </div>
          ) : (
            <div className="update-progress">
              <div className="update-progress-label">
                {percent !== null
                  ? t('updates.downloading', { percent: String(percent) })
                  : t('updates.downloadingIndeterminate')}
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${percent === null ? 'indeterminate' : ''}`}
                  style={percent !== null ? { width: `${percent}%` } : undefined}
                />
              </div>
            </div>
          )
        ) : (
          <>
            <div className="updates-online-check">
              <button className="modal-btn" onClick={handleCheckOnline} disabled={onlineCheck === 'checking'}>
                <RefreshCw size={14} className={onlineCheck === 'checking' ? 'spin' : ''} />
                {onlineCheck === 'checking' ? t('updates.checking') : t('updates.checkOnline')}
              </button>
              {onlineCheck === 'checking' && <LoadingScreen compact />}
              {onlineCheck !== 'idle' && onlineCheck !== 'checking' && (
                <>
                  <p className="settings-hint updates-online-status">
                    {onlineCheck.status === 'up-to-date' && t('updates.upToDate')}
                    {onlineCheck.status === 'available' && t('updates.availableTitle', { version: onlineCheck.version })}
                    {onlineCheck.status === 'server-newer' && t('updates.serverNewer', { version: onlineCheck.version })}
                    {onlineCheck.status === 'error' && t('updates.checkError')}
                  </p>
                  {onlineCheck.status === 'available' && (
                    <button className="modal-btn danger" style={{ width: '100%', marginTop: 8 }} onClick={handleInstall}>
                      {t('updates.installNow')}
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="changelog-accordion">
              {entries.map((entry) => {
                const isOpen = expandedVersion === entry.version;
                return (
                  <div className="changelog-item" key={entry.version}>
                    <button
                      type="button"
                      className="changelog-item-header"
                      onClick={() => setExpandedVersion(isOpen ? null : entry.version)}
                    >
                      <span>{t('updates.versionLabel', { version: entry.version })}</span>
                      <ChevronDown size={16} className={`changelog-chevron ${isOpen ? 'open' : ''}`} />
                    </button>
                    {isOpen && (
                      <ul className="changelog-list">
                        {entry.items.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
