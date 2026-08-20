import { Paperclip, Download } from 'lucide-react';
import { classifyAttachment } from '../lib/attachment';
import { useLocale } from '../lib/i18n';

export default function AttachmentPreview({ dataUrl, name, onExpand }: { dataUrl: string; name: string | null; onExpand: () => void }) {
  const { t } = useLocale();
  const kind = classifyAttachment(dataUrl);
  if (kind === 'image') {
    return (
      <div className="reg-attachment-media-wrap">
        <button type="button" className="reg-attachment-image-btn" onClick={onExpand} title={name ?? undefined}>
          <img className="reg-attachment-image" src={dataUrl} alt={name ?? ''} />
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
