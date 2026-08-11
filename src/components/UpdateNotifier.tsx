import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { checkForAppUpdate, restartApp, type UpdateCheckResult, type UpdateProgress } from '../lib/updater';
import { useLocale } from '../lib/i18n';

export default function UpdateNotifier() {
  const { t } = useLocale();
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Проверяем один раз при входе в кабинет. 'up-to-date' и 'error' молча
    // игнорируем — не дёргаем сотрудника, если обновлений нет или сервер
    // обновлений ещё не настроен (см. src/lib/updater.ts).
    checkForAppUpdate().then((res) => {
      if (res.status === 'available') setResult(res);
    });
  }, []);

  if (!result || result.status !== 'available' || dismissed) return null;

  const handleInstall = async () => {
    setInstalling(true);
    setProgress({ downloaded: 0, total: null });
    try {
      await result.install((p) => setProgress(p));
      // Загрузка и установка завершены — показываем короткое "Готово!" перед
      // перезапуском, чтобы это не выглядело как будто приложение просто
      // вылетело, а ощущалось как осознанное, аккуратное завершение.
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

  const percent =
    progress && progress.total ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100)) : null;

  return (
    <Modal
      open
      title={t('updates.availableTitle', { version: result.version })}
      onClose={() => !installing && setDismissed(true)}
      actions={
        !installing ? (
          <>
            <button className="modal-btn" onClick={() => setDismissed(true)}>
              {t('updates.later')}
            </button>
            <button className="modal-btn danger" onClick={handleInstall}>
              {t('updates.installNow')}
            </button>
          </>
        ) : undefined
      }
    >
      {!installing ? (
        result.notes || t('updates.availableBody')
      ) : done ? (
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
      )}
    </Modal>
  );
}
