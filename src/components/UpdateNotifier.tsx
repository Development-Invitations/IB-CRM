import { useEffect, useState } from 'react';
import Modal from './Modal';
import UpdateProgressView from './UpdateProgressView';
import { checkForAppUpdate, restartApp, quitApp, type UpdateCheckResult, type UpdateProgress } from '../lib/updater';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';

export default function UpdateNotifier() {
  const { t } = useLocale();
  const { showToast } = useToast();
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
      if (res.status === 'available' || res.status === 'server-newer') setResult(res);
    });
  }, []);

  if (!result || (result.status !== 'available' && result.status !== 'server-newer') || dismissed) return null;

  const install = result.install;
  const isRestart = result.status === 'available';

  if (result.status === 'server-newer' && !install) {
    return (
      <Modal
        open
        title={t('updates.serverNewerTitle', { version: result.version })}
        onClose={() => setDismissed(true)}
        actions={
          <button className="modal-btn danger" onClick={() => setDismissed(true)}>
            {t('common.close')}
          </button>
        }
      >
        {t('updates.serverNewerBody')}
      </Modal>
    );
  }

  const handleInstall = async () => {
    if (!install) return;
    setInstalling(true);
    setProgress({ downloaded: 0, total: null });
    try {
      await install((p) => setProgress(p));
      // Загрузка и установка завершены — показываем короткое "Готово!" перед
      // перезапуском/выходом, чтобы это не выглядело как будто приложение
      // просто вылетело, а ощущалось как осознанное, аккуратное завершение.
      setDone(true);
      setTimeout(() => {
        (isRestart ? restartApp() : quitApp()).catch(() => {
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

  const percent =
    progress && progress.total ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100)) : null;

  return (
    <Modal
      open
      title={t(isRestart ? 'updates.availableTitle' : 'updates.serverNewerTitle', { version: result.version })}
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
        (result.status === 'available' ? result.notes : undefined) || t(isRestart ? 'updates.availableBody' : 'updates.serverNewerBody')
      ) : (
        <UpdateProgressView
          percent={percent}
          downloaded={progress?.downloaded ?? 0}
          total={progress?.total ?? null}
          done={done}
          isRestart={isRestart}
        />
      )}
    </Modal>
  );
}
