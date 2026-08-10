import { useState } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import Modal from './Modal';
import { changelog } from '../lib/changelog';
import { useLocale } from '../lib/i18n';
import { checkForAppUpdate, type UpdateCheckResult } from '../lib/updater';

export default function UpdatesButton() {
  const { t, locale } = useLocale();
  const entries = changelog[locale];
  const [open, setOpen] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(entries[0]?.version ?? null);
  const [onlineCheck, setOnlineCheck] = useState<'idle' | 'checking' | UpdateCheckResult>('idle');

  const handleCheckOnline = async () => {
    setOnlineCheck('checking');
    const res = await checkForAppUpdate();
    setOnlineCheck(res);
  };

  return (
    <>
      <button className="ghost-btn" onClick={() => setOpen(true)}>
        <RefreshCw size={14} /> {t('updates.checkBtn')}
      </button>

      <Modal
        open={open}
        title={t('updates.modalTitle')}
        onClose={() => setOpen(false)}
        actions={
          <button className="modal-btn" onClick={() => setOpen(false)}>
            {t('common.close')}
          </button>
        }
      >
        <div className="updates-online-check">
          <button className="modal-btn" onClick={handleCheckOnline} disabled={onlineCheck === 'checking'}>
            {onlineCheck === 'checking' ? t('updates.checking') : t('updates.checkOnline')}
          </button>
          {onlineCheck !== 'idle' && onlineCheck !== 'checking' && (
            <p className="settings-hint updates-online-status">
              {onlineCheck.status === 'up-to-date' && t('updates.upToDate')}
              {onlineCheck.status === 'available' && t('updates.availableTitle', { version: onlineCheck.version })}
              {onlineCheck.status === 'error' && t('updates.checkError')}
            </p>
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
      </Modal>
    </>
  );
}
