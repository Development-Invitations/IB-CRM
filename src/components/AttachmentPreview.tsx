import { Paperclip, Download, Image as ImageIcon } from 'lucide-react';
import { classifyAttachment } from '../lib/attachment';
import { useLocale } from '../lib/i18n';

export default function AttachmentPreview({ dataUrl, name, onExpand }: { dataUrl: string; name: string | null; onExpand: () => void }) {
  const { t } = useLocale();
  const kind = classifyAttachment(dataUrl);
  if (kind === 'image') {
    // v1.5.0: раньше тут сразу рендерилась превью-картинка на всю ширину
    // сообщения — по прямой просьбе пользователя заменено на компактную
    // ссылку (как у обычного файла-вложения ниже), клик по которой
    // по-прежнему открывает то же самое полноэкранное превью (onExpand,
    // тот же .reg-lightbox, что уже был) — просто не занимает место в
    // ленте, пока не открыта.
    return (
      <div className="reg-attachment-image-row">
        <button type="button" className="reg-entry-attachment reg-attachment-image-link" onClick={onExpand} title={name ?? undefined}>
          <ImageIcon size={13} /> <span>{name || t('common.photoLabel')}</span>
        </button>
        <a className="reg-attachment-download-btn" href={dataUrl} download={name ?? undefined} title={t('common.download')}>
          <Download size={13} />
        </a>
      </div>
    );
  }
  if (kind === 'video') {
    return (
      <div className="reg-attachment-media-wrap">
        <video className="reg-attachment-video" src={dataUrl} controls preload="metadata" />
        <a className="reg-attachment-download-link" href={dataUrl} download={name ?? undefined}>
          <Download size={13} /> {t('common.download')}
        </a>
      </div>
    );
  }
  return (
    <a className="reg-entry-attachment" href={dataUrl} target="_blank" rel="noreferrer" download={name ?? undefined}>
      <Paperclip size={13} /> <span>{name}</span>
    </a>
  );
}
