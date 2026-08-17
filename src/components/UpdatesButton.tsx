import { useState } from 'react';
import { RefreshCw, ChevronDown, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import LoadingScreen from './LoadingScreen';
import { changelog } from '../lib/changelog';
import { useLocale } from '../lib/i18n';
import { checkForAppUpdate, restartApp, quitApp, type UpdateCheckResult, type UpdateProgress } from '../lib/updater';
import { useToast } from '../lib/toast';

export default function UpdatesButton() {
  const { t, locale } = useLocale();
  const { showToast } = useToast();
  const entries = changelog[locale];
  const [open, setOpen] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(entries[0]?.version ?? null);
  const [onlineCheck, setOnlineCheck] = useState<'idle' | 'checking' | UpdateCheckResult>('idle');
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [done, setDone] = useState(false);
  const [finishKind, setFinishKind] = useState<'restart' | 'quit'>('restart');

  const handleCheckOnline = async () => {
    setOnlineCheck('checking');
    const res = await checkForAppUpdate();
    setOnlineCheck(res);
  };

  const handleInstall = async () => {
    if (onlineCheck === 'idle' || onlineCheck === 'checking') return;
    if (onlineCheck.status !== 'available' && !(onlineCheck.status === 'server-newer' && onlineCheck.install)) return;
    const install = onlineCheck.install;
    if (!install) return;
    // Официальный подписанный автообновитель перезапускает тот же бинарник
    // (relaunch), скачанный с сервера установщик — полностью новый .exe,
    // текущий процесс должен сначала выйти (quitApp), а не перезапуститься.
    const isRestart = onlineCheck.status === 'available';
    const finish = isRestart ? restartApp : quitApp;
    setFinishKind(isRestart ? 'restart' : 'quit');
    setInstalling(true);
    setProgress({ downloaded: 0, total: null });
    try {
      await install((p) => setProgress(p));
      setDone(true);
      setTimeout(() => {
        finish().catch(() => {
          setInstalling(false);
          setDone(false);
        });
      }, 1800);
    } catch (err: any) {
      setInstalling(false);
      setProgress(null);
      showToast('error', `${t('updates.installError')} ${typeof err === 'string' ? err : (err?.message ?? '')}`.trim());
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
              <div className="update-progress-label">
                {finishKind === 'restart' ? t('updates.installedRestarting') : t('updates.installedQuitting')}
              </div>
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
                  {(onlineCheck.status === 'available' || (onlineCheck.status === 'server-newer' && onlineCheck.install)) && (
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
