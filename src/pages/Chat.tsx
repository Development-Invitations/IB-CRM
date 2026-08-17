import { useEffect, useRef, useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, X, Reply, Download, Search } from 'lucide-react';
import { api, type Employee, type Partner, type ChatMessage, type DmChannelSummary } from '../lib/api';
import { dmChannelId, dmOtherParticipant } from '../lib/chat';
import { FullscreenContext } from './Dashboard';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc } from '../lib/date';
import { prepareAttachment, classifyAttachment } from '../lib/attachment';
import Avatar from '../components/Avatar';
import LoadingScreen from '../components/LoadingScreen';

const POLL_INTERVAL_MS = 4000;

type Channel = { id: string; label: string };
type DmPeer = { id: string; name: string; avatarData: string | null };
type ChatLocationState = { channel?: string; dmWith?: DmPeer };

function AttachmentPreview({ dataUrl, name, onExpand }: { dataUrl: string; name: string | null; onExpand: () => void }) {
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

export default function Chat({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { enter: enterFullscreen, exit: exitFullscreen } = useContext(FullscreenContext);

  const initialState = location.state as ChatLocationState | null;

  const [partners, setPartners] = useState<Partner[]>([]);
  const [channel, setChannel] = useState<string | null>(initialState?.channel ?? null);
  const [activeDmPeer, setActiveDmPeer] = useState<DmPeer | null>(initialState?.dmWith ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [dmSummaries, setDmSummaries] = useState<DmChannelSummary[]>([]);
  const [search, setSearch] = useState('');

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [attachData, setAttachData] = useState<string | null>(null);
  const [attachName, setAttachName] = useState<string | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    enterFullscreen();
    return () => exitFullscreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentEmployee.isAdmin) {
      api.listPartners().then(setPartners).catch(() => {});
    }
  }, [currentEmployee.isAdmin]);

  // Личка недоступна партнёрам (см. can_access_chat_channel в db.rs) — ни
  // список сотрудников для поиска, ни список уже начатых переписок им не нужны.
  useEffect(() => {
    if (currentEmployee.isPartner) return;
    api.listEmployees().then(setAllEmployees).catch(() => {});
    const loadDmSummaries = () => {
      api.listMyDmChannels(currentEmployee.id).then(setDmSummaries).catch(() => {});
    };
    loadDmSummaries();
    const interval = setInterval(loadDmSummaries, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployee.isPartner]);

  const channels: Channel[] = currentEmployee.isPartner
    ? [{ id: currentEmployee.partnerId ?? '', label: currentEmployee.partnerName ?? t('chat.partnerChannelLabel') }]
    : [
        { id: 'general', label: t('chat.generalChannelLabel') },
        ...partners.map((p) => ({ id: p.id, label: p.name })),
      ];

  useEffect(() => {
    if (channel !== null) return;
    if (channels.length > 0) setChannel(channels[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels.length]);

  // Открыли ЛС-канал не через поиск/список (клик по уведомлению, например) —
  // имени/аватара собеседника ещё нет, достаём: сперва из уже загруженного
  // списка "Мои чаты", иначе отдельным запросом.
  useEffect(() => {
    if (!channel || activeDmPeer) return;
    const otherId = dmOtherParticipant(channel, currentEmployee.id);
    if (!otherId) return;
    const fromList = dmSummaries.find((s) => s.channel === channel);
    if (fromList) {
      setActiveDmPeer({ id: fromList.otherEmployeeId, name: fromList.otherEmployeeName, avatarData: fromList.otherEmployeeAvatar });
      return;
    }
    api.getEmployee(otherId).then((emp) => {
      if (emp) setActiveDmPeer({ id: emp.id, name: emp.fullName || emp.login, avatarData: emp.avatarData });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, dmSummaries]);

  const loadMessages = (silent = false) => {
    if (!channel) return;
    if (!silent) setLoading(true);
    api
      .listChatMessages(currentEmployee.id, channel)
      .then((list) => {
        setMessages(list);
        setLoading(false);
        api.markChatChannelRead({ employeeId: currentEmployee.id, channel }).catch(() => {});
      })
      .catch(() => {
        setLoading(false);
        if (!silent) showToast('error', t('common.loadError'));
      });
  };

  useEffect(() => {
    setMessages([]);
    setReplyTo(null);
    loadMessages();
    if (!channel) return;
    const interval = setInterval(() => loadMessages(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  const openChannel = (id: string) => {
    setChannel(id);
    setActiveDmPeer(null);
  };

  const openDm = (emp: Employee) => {
    setActiveDmPeer({ id: emp.id, name: emp.fullName || emp.login, avatarData: emp.avatarData });
    setChannel(dmChannelId(currentEmployee.id, emp.id));
    setSearch('');
  };

  const openDmSummary = (s: DmChannelSummary) => {
    setActiveDmPeer({ id: s.otherEmployeeId, name: s.otherEmployeeName, avatarData: s.otherEmployeeAvatar });
    setChannel(s.channel);
  };

  const searchResults = search.trim()
    ? allEmployees.filter(
        (e) =>
          !e.isPartner &&
          e.id !== currentEmployee.id &&
          (e.fullName || e.login).toLowerCase().includes(search.trim().toLowerCase())
      )
    : [];

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttachBusy(true);
    try {
      const { data, name } = await prepareAttachment(file);
      setAttachData(data);
      setAttachName(name);
    } catch {
      showToast('error', t('chat.attachmentTooBig'));
    } finally {
      setAttachBusy(false);
    }
  };

  const handleSend = async () => {
    if (!channel || !text.trim()) return;
    setSendBusy(true);
    try {
      await api.sendChatMessage({
        actorId: currentEmployee.id,
        channel,
        content: text.trim(),
        attachmentData: attachData,
        attachmentName: attachName,
        replyToId: replyTo?.id ?? null,
      });
      setText('');
      setAttachData(null);
      setAttachName(null);
      setReplyTo(null);
      loadMessages(true);
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('chat.loadError'));
    } finally {
      setSendBusy(false);
    }
  };

  const isDmChannel = !!channel && channel.startsWith('dm:');
  const activeChannelLabel = channels.find((c) => c.id === channel)?.label ?? '';

  return (
    <div className="reg-fullscreen">
      <div className="reg-fullscreen-header">
        <button className="reg-back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> {t('common.close')}
        </button>
        <div className="reg-fullscreen-title">
          <h2>{t('chat.pageTitle')}</h2>
        </div>
      </div>

      <div className="reg-fullscreen-body">
        {!currentEmployee.isPartner && (
          <aside className="reg-sidebar">
            <div className="reg-sidebar-section">
              <div className="employees-search-row" style={{ marginBottom: 10, maxWidth: 'none' }}>
                <Search size={14} className="employees-search-icon" />
                <input
                  className="employees-search-input"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('chat.searchPlaceholder')}
                />
              </div>
              {search.trim() && (
                <ul className="chat-dm-list">
                  {searchResults.length === 0 ? (
                    <p className="settings-hint">{t('chat.searchEmpty')}</p>
                  ) : (
                    searchResults.map((emp) => (
                      <li key={emp.id} className="chat-dm-item" onClick={() => openDm(emp)}>
                        <Avatar name={emp.fullName || emp.login} size={28} src={emp.avatarData} />
                        <div className="chat-dm-item-text">
                          <span className="chat-dm-item-name">{emp.fullName || emp.login}</span>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className="reg-sidebar-section">
              <div className="department-members-title">{t('chat.myChatsTitle')}</div>
              {dmSummaries.length === 0 ? (
                <p className="settings-hint">{t('chat.myChatsEmpty')}</p>
              ) : (
                <ul className="chat-dm-list">
                  {dmSummaries.map((s) => (
                    <li
                      key={s.channel}
                      className={`chat-dm-item${channel === s.channel ? ' active' : ''}`}
                      onClick={() => openDmSummary(s)}
                    >
                      <Avatar name={s.otherEmployeeName} size={28} src={s.otherEmployeeAvatar} />
                      <div className="chat-dm-item-text">
                        <span className="chat-dm-item-name">{s.otherEmployeeName}</span>
                        {s.lastMessage && <span className="chat-dm-item-preview">{s.lastMessage}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="reg-sidebar-section">
              <div className="department-members-title">{t('chat.channelsTitle')}</div>
              <ul className="chat-channel-list">
                {channels.map((c) => (
                  <li
                    key={c.id}
                    className={`chat-channel-item${channel === c.id ? ' active' : ''}`}
                    onClick={() => openChannel(c.id)}
                  >
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

        <div className="reg-entries-col">
          <div className="reg-thread-header">
            {isDmChannel && activeDmPeer ? (
              <div className="chat-thread-peer">
                <Avatar name={activeDmPeer.name} size={32} src={activeDmPeer.avatarData} />
                <span className="department-members-title">{activeDmPeer.name}</span>
              </div>
            ) : (
              <div className="department-members-title">{activeChannelLabel}</div>
            )}
          </div>

          <div className="reg-entries-list">
            {loading ? (
              <LoadingScreen compact />
            ) : messages.length === 0 ? (
              <p className="settings-hint">{t('chat.empty')}</p>
            ) : (
              messages.map((m) => {
                const parent = m.replyToId ? messages.find((p) => p.id === m.replyToId) : null;
                const isOwn = m.senderId === currentEmployee.id;
                const initials = m.senderName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
                return (
                  <div key={m.id} className={`reg-chat-msg${isOwn ? ' own' : ''}`}>
                    <div className="reg-chat-avatar">{initials || '?'}</div>
                    <div className="reg-chat-bubble">
                      <div className="reg-entry-header">
                        <div className="reg-entry-meta">
                          <strong>{m.senderName}</strong>
                          <span className="settings-hint">{parseSqliteUtc(m.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="reg-entry-actions">
                          <button className="reg-action-btn" onClick={() => setReplyTo(m)} title={t('chat.replyBtn')}>
                            <Reply size={13} />
                          </button>
                        </div>
                      </div>
                      {parent && <div className="blog-reply-to">↪ {t('chat.replyingTo', { name: parent.senderName })}</div>}
                      <div className="reg-entry-content" style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                      {m.attachmentData && (
                        <AttachmentPreview dataUrl={m.attachmentData} name={m.attachmentName} onExpand={() => setLightboxUrl(m.attachmentData)} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="reg-add-entry">
            {replyTo && (
              <div className="blog-reply-banner">
                {t('chat.replyingTo', { name: replyTo.senderName })}
                <button className="reg-action-btn" onClick={() => setReplyTo(null)}>
                  <X size={12} />
                </button>
              </div>
            )}
            <textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('chat.composerPlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="reg-add-entry-row">
              <button className="modal-btn" onClick={() => fileInputRef.current?.click()} title={t('chat.attachBtn')} disabled={attachBusy}>
                <Paperclip size={14} />
                {attachName && <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachName}</span>}
              </button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileAttach} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />
              {attachName && (
                <button className="regulation-remove-attach" onClick={() => { setAttachData(null); setAttachName(null); }}>
                  <X size={12} />
                </button>
              )}
              <button className="modal-btn" onClick={handleSend} disabled={!text.trim() || sendBusy}>
                <Send size={14} /> {t('chat.sendBtn')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {lightboxUrl && (
        <div className="reg-lightbox" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" />
          <button className="reg-lightbox-close" onClick={() => setLightboxUrl(null)}>
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
