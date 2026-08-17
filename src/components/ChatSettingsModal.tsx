import { useState } from 'react';
import { Check } from 'lucide-react';
import { useLocale } from '../lib/i18n';
import {
  getChatNotificationsMuted,
  setChatNotificationsMuted,
  getStoredToastPosition,
  setStoredToastPosition,
  type ToastPosition,
} from '../lib/chatNotificationPrefs';
import {
  CHAT_WALLPAPER_IDS,
  CHAT_WALLPAPER_CSS,
  getStoredChatWallpaper,
  setStoredChatWallpaper,
  type ChatWallpaperId,
} from '../lib/chatWallpaper';
import Modal from './Modal';
import Select from './Select';

// Раньше эти настройки жили в общих Настройках приложения — по просьбе
// перенесены прямо в IB Чат (кнопка-шестерёнка в шапке), так они под рукой
// именно там, где нужны, а не потеряны среди несвязанных разделов.
export default function ChatSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLocale();

  const [chatMuted, setChatMutedState] = useState(getChatNotificationsMuted());
  const handleToggleChatMute = () => {
    const next = !chatMuted;
    setChatMutedState(next);
    setChatNotificationsMuted(next);
  };

  const [toastPosition, setToastPositionState] = useState<ToastPosition>(getStoredToastPosition());
  const handleToastPositionChange = (v: string) => {
    const pos = v as ToastPosition;
    setToastPositionState(pos);
    setStoredToastPosition(pos);
  };

  const [chatWallpaper, setChatWallpaperState] = useState<ChatWallpaperId>(getStoredChatWallpaper());
  const handleChatWallpaperChange = (id: ChatWallpaperId) => {
    setChatWallpaperState(id);
    setStoredChatWallpaper(id);
  };

  return (
    <Modal
      open={open}
      title={t('chat.settingsTitle')}
      onClose={onClose}
      actions={<button className="modal-btn" onClick={onClose}>{t('common.close')}</button>}
    >
      <div className="account-row">
        <span className="settings-hint">{t('settings.chatMuteLabel')}</span>
        <button className={`modal-btn${chatMuted ? ' danger' : ''}`} onClick={handleToggleChatMute}>
          {chatMuted ? t('settings.chatMuteOffBtn') : t('settings.chatMuteOnBtn')}
        </button>
      </div>
      <p className="settings-hint">{t('settings.chatMuteHint')}</p>

      <div style={{ marginTop: 14 }}>
        <Select
          value={toastPosition}
          options={[
            { value: 'bottom-right', label: t('settings.toastPositionBottomRight') },
            { value: 'bottom-left', label: t('settings.toastPositionBottomLeft') },
            { value: 'top-right', label: t('settings.toastPositionTopRight') },
            { value: 'top-left', label: t('settings.toastPositionTopLeft') },
          ]}
          onChange={handleToastPositionChange}
        />
        <p className="settings-hint">{t('settings.toastPositionHint')}</p>
      </div>

      <div style={{ marginTop: 14 }}>
        <span className="settings-hint">{t('settings.chatWallpaperLabel')}</span>
        <div className="chat-wallpaper-grid">
          {CHAT_WALLPAPER_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`chat-wallpaper-swatch${chatWallpaper === id ? ' active' : ''}`}
              style={{ background: CHAT_WALLPAPER_CSS[id] || 'var(--color-bg)' }}
              title={t(`settings.chatWallpaper.${id}`)}
              onClick={() => handleChatWallpaperChange(id)}
            >
              {chatWallpaper === id && <Check size={16} />}
            </button>
          ))}
        </div>
        <p className="settings-hint">{t('settings.chatWallpaperHint')}</p>
      </div>
    </Modal>
  );
}
