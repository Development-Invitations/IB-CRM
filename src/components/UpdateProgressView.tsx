import { Download, PackageCheck, CheckCircle2 } from 'lucide-react';
import { useLocale } from '../lib/i18n';

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
  if (n >= 1024) return `${Math.round(n / 1024)} КБ`;
  return `${n} Б`;
}

// Единый вид прогресса обновления — переиспользуется и в автоматическом
// поп-апе (UpdateNotifier.tsx), и в ручной проверке из "Истории обновлений"
// (UpdatesButton.tsx), чтобы не держать два места с одной и той же разметкой.
// Раньше это была одна строка текста + плоская полоска — по просьбе сделано
// заметно наряднее и информативнее: крупный процент, реальные байты,
// индикатор шагов "Загрузка → Установка → Готово".
export default function UpdateProgressView({
  percent,
  downloaded,
  total,
  done,
  isRestart,
}: {
  percent: number | null;
  downloaded: number;
  total: number | null;
  done: boolean;
  isRestart: boolean;
}) {
  const { t } = useLocale();
  const installing = !done && percent !== null && percent >= 100;

  return (
    <div className="update-progress-rich">
      <div className={`update-progress-icon-wrap${done ? ' done' : ''}`}>
        {done ? <CheckCircle2 size={30} /> : installing ? <PackageCheck size={28} /> : <Download size={28} />}
      </div>

      {done ? (
        <div className="update-progress-label big">
          {isRestart ? t('updates.installedRestarting') : t('updates.installedQuitting')}
        </div>
      ) : (
        <>
          <div className="update-progress-percent">{percent !== null ? `${percent}%` : '…'}</div>
          <div className="progress-track rich">
            <div
              className={`progress-fill ${percent === null ? 'indeterminate' : ''}`}
              style={percent !== null ? { width: `${percent}%` } : undefined}
            />
          </div>
          <div className="update-progress-label">
            {installing
              ? t('updates.installingNow')
              : percent !== null
                ? t('updates.downloading', { percent: String(percent) })
                : t('updates.downloadingIndeterminate')}
          </div>
          {total !== null && total > 0 && (
            <div className="update-progress-bytes">{formatBytes(downloaded)} / {formatBytes(total)}</div>
          )}
        </>
      )}

      <div className="update-progress-steps">
        <div className={`update-step${!done ? ' active' : ' complete'}`}>
          <span className="update-step-dot" />
          {t('updates.stepDownload')}
        </div>
        <div className="update-step-line" />
        <div className={`update-step${installing ? ' active' : done ? ' complete' : ''}`}>
          <span className="update-step-dot" />
          {t('updates.stepInstall')}
        </div>
        <div className="update-step-line" />
        <div className={`update-step${done ? ' active' : ''}`}>
          <span className="update-step-dot" />
          {t('updates.stepDone')}
        </div>
      </div>
    </div>
  );
}
