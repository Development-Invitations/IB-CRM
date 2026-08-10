import { useEffect, useState } from 'react';
import Modal from './Modal';
import { checkForAppUpdate, type UpdateCheckResult } from '../lib/updater';
import { useLocale } from '../lib/i18n';

export default function UpdateNotifier() {
  const { t } = useLocale();
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [installing, setInstalling] = useState(false);
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
    try {
      await result.install();
      // После успешного relaunch() приложение перезапустится само.
    } catch {
      setInstalling(false);
    }
  };

  return (
    <Modal
      open
      title={t('updates.availableTitle', { version: result.version })}
      onClose={() => setDismissed(true)}
      actions={
        <>
          <button className="modal-btn" onClick={() => setDismissed(true)} disabled={installing}>
            {t('updates.later')}
          </button>
          <button className="modal-btn danger" onClick={handleInstall} disabled={installing}>
            {installing ? t('updates.installing') : t('updates.installNow')}
          </button>
        </>
      }
    >
      {result.notes || t('updates.availableBody')}
    </Modal>
  );
}
