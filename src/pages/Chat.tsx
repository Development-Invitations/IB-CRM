import { useEffect, useRef, useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, X, Reply, Download, Search, Plus, Users, LogOut, Copy, Check, UserPlus, Settings as SettingsIcon, Smile, Pencil, Trash2 } from 'lucide-react';
import { api, type Employee, type Partner, type Department, type ChatMessage, type DmChannelSummary, type PartnerChatSummary, type ChatGroupSummary } from '../lib/api';
import { dmChannelId, dmOtherParticipant } from '../lib/chat';
import { FullscreenContext } from './Dashboard';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc } from '../lib/date';
import { prepareAttachment, classifyAttachment } from '../lib/attachment';
import Avatar from '../components/Avatar';
import LoadingScreen from '../components/LoadingScreen';
import Modal from '../components/Modal';
import ChatGroupFormModal from '../components/ChatGroupFormModal';
import ChatSettingsModal from '../components/ChatSettingsModal';
import { getStoredChatWallpaper, CHAT_WALLPAPER_CSS } from '../lib/chatWallpaper';

const POLL_INTERVAL_MS = 4000;

// Небольшой готовый набор смайликов вместо полноценного поиска/категорий —
// для композера чата этого достаточно, не нужна отдельная библиотека.
const CHAT_EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😉', '😍', '😘', '😎', '🤔',
  '😐', '😢', '😭', '😡', '😱', '🥳', '😴', '🤝', '🙏', '👍',
  '👎', '👏', '🙌', '💪', '❤️', '🔥', '⭐', '✅', '❌', '🎉',
  '😅', '🙂', '☺️', '😇', '🤗', '🤫', '🤨', '😏', '😬', '🥺',
];

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

  const [partnerChatSummaries, setPartnerChatSummaries] = useState<PartnerChatSummary[]>([]);
  const [partnerSearch, setPartnerSearch] = useState('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<ChatGroupSummary[]>([]);
  const [activeGroup, setActiveGroup] = useState<ChatGroupSummary | null>(null);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Employee[]>([]);
  const [membersBusy, setMembersBusy] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [attachData, setAttachData] = useState<string | null>(null);
  const [attachName, setAttachName] = useState<string | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // id последнего сообщения в уже отрисованном списке — сравнивается на
  // каждое обновление messages (и при первом открытии канала, и при новом
  // сообщении с фонового опроса POLL_INTERVAL_MS, и при собственной
  // отправке): как только последнее сообщение меняется, скроллим к нему.
  // Так продолжает работать сценарий "открыл переписку — сразу видно
  // последнее" и добавляется "написали новое — сразу видно его", без
  // отдельного стейта на каждый случай.
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    enterFullscreen();
    return () => exitFullscreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Полный список партнёров нужен только как справочник для поиска "начать
  // переписку с партнёром" — сам сайдбар показывает только уже начатые чаты
  // (см. loadPartnerChats ниже), а не всех партнёров компании сразу.
  useEffect(() => {
    if (currentEmployee.isAdmin) {
      api.listPartners().then(setPartners).catch(() => {});
    }
  }, [currentEmployee.isAdmin]);

  useEffect(() => {
    if (!currentEmployee.isAdmin) return;
    const loadPartnerChats = () => {
      api.listMyPartnerChats(currentEmployee.id).then(setPartnerChatSummaries).catch(() => {});
    };
    loadPartnerChats();
    const interval = setInterval(loadPartnerChats, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Группы — тоже недоступны партнёрам. Список отделов нужен только для формы
  // создания (переключатель "по подразделению" виден лишь главам отделов/админу).
  useEffect(() => {
    if (currentEmployee.isPartner) return;
    api.listDepartments().then(setDepartments).catch(() => {});
    const loadGroups = () => {
      api.listMyChatGroups(currentEmployee.id).then(setGroups).catch(() => {});
    };
    loadGroups();
    const interval = setInterval(loadGroups, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployee.isPartner]);

  // Открыли групповой канал не через сайдбар (клик по уведомлению) — данных
  // группы для шапки ещё нет, достаём: сперва из уже загруженного списка
  // групп, иначе отдельным запросом (например, только что вступили по коду).
  useEffect(() => {
    if (!channel || !channel.startsWith('group:') || activeGroup) return;
    const groupId = channel.slice('group:'.length);
    const fromList = groups.find((g) => g.id === groupId);
    if (fromList) {
      setActiveGroup(fromList);
      return;
    }
    api.getChatGroup(groupId).then((g) => {
      if (g) setActiveGroup({ id: g.id, name: g.name, photoData: g.photoData, memberCount: g.memberCount, lastMessage: null, lastMessageAt: null });
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, groups]);

  const channels: Channel[] = currentEmployee.isPartner
    ? [{ id: currentEmployee.partnerId ?? '', label: currentEmployee.partnerName ?? t('chat.partnerChannelLabel') }]
    : [{ id: 'general', label: t('chat.generalChannelLabel') }];

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
        // ВАЖНО: помечаем прочитанным только на осознанном открытии канала
        // (!silent), а не на каждом тихом фоновом опросе (silent, каждые
        // POLL_INTERVAL_MS). Раньше это вызывалось безусловно на любом
        // опросе — гонка с Topbar.tsx: пока переписка открыта, канал
        // помечался прочитанным быстрее (4 сек), чем Topbar.tsx успевал
        // опросить уведомления (8-10 сек) и показать баннер, из-за чего
        // после первого сообщения баннер переставал появляться для всех
        // следующих в ЭТОМ ЖЕ канале — см. журнал v0.2.24 в docs/TZ.md.
        if (!silent) {
          api.markChatChannelRead({ employeeId: currentEmployee.id, channel }).catch(() => {});
        }
      })
      .catch(() => {
        setLoading(false);
        if (!silent) showToast('error', t('common.loadError'));
      });
  };

  useEffect(() => {
    setMessages([]);
    setReplyTo(null);
    setEmojiOpen(false);
    lastMessageIdRef.current = null;
    loadMessages();
    if (!channel) return;
    const interval = setInterval(() => loadMessages(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  // Проскроллить к последнему сообщению сразу после открытия переписки —
  // без behavior: 'auto' (не 'smooth') это происходит мгновенно, ещё до
  // первого кадра отрисовки с прокруткой сверху, так что пользователь не
  // видит "прыжок".
  useEffect(() => {
    if (messages.length === 0) return;
    const lastId = messages[messages.length - 1].id;
    if (lastId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastId;
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  const openChannel = (id: string) => {
    setChannel(id);
    setActiveDmPeer(null);
    setActiveGroup(null);
  };

  const openDm = (emp: Employee) => {
    setActiveDmPeer({ id: emp.id, name: emp.fullName || emp.login, avatarData: emp.avatarData });
    setActiveGroup(null);
    setChannel(dmChannelId(currentEmployee.id, emp.id));
    setSearch('');
  };

  const openDmSummary = (s: DmChannelSummary) => {
    setActiveDmPeer({ id: s.otherEmployeeId, name: s.otherEmployeeName, avatarData: s.otherEmployeeAvatar });
    setActiveGroup(null);
    setChannel(s.channel);
  };

  const openGroup = (g: ChatGroupSummary) => {
    setActiveGroup(g);
    setActiveDmPeer(null);
    setChannel(`group:${g.id}`);
  };

  // Полные данные группы (invite_code/createdBy) — не в ChatGroupSummary,
  // подтягиваются отдельно при открытии группового канала (для проверки
  // "может ли текущий пользователь управлять группой" и показа кода
  // приглашения в шапке).
  const [activeGroupFull, setActiveGroupFull] = useState<Awaited<ReturnType<typeof api.getChatGroup>>>(null);
  useEffect(() => {
    if (!channel || !channel.startsWith('group:')) {
      setActiveGroupFull(null);
      return;
    }
    const groupId = channel.slice('group:'.length);
    api.getChatGroup(groupId).then(setActiveGroupFull).catch(() => {});
  }, [channel]);

  const isGroupManager = !!activeGroupFull && (currentEmployee.isAdmin || activeGroupFull.createdBy === currentEmployee.id);

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    setJoinBusy(true);
    try {
      const group = await api.joinChatGroupByInvite({ actorId: currentEmployee.id, inviteCode: joinCode.trim() });
      showToast('success', t('chat.groupJoined'));
      setJoinCode('');
      const summary: ChatGroupSummary = { id: group.id, name: group.name, photoData: group.photoData, memberCount: group.memberCount, lastMessage: null, lastMessageAt: null };
      setGroups((prev) => [summary, ...prev.filter((g) => g.id !== group.id)]);
      openGroup(summary);
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('chat.groupJoinError'));
    } finally {
      setJoinBusy(false);
    }
  };

  const handleCreatedGroup = (g: ChatGroupSummary) => {
    setGroups((prev) => [g, ...prev]);
    openGroup(g);
  };

  const loadGroupMembers = () => {
    if (!activeGroup) return;
    setMembersBusy(true);
    api
      .listChatGroupMembers(currentEmployee.id, activeGroup.id)
      .then(setGroupMembers)
      .catch(() => showToast('error', t('chat.loadError')))
      .finally(() => setMembersBusy(false));
  };

  const openMembersPanel = () => {
    setMembersOpen(true);
    loadGroupMembers();
  };

  const handleRemoveMember = async (employeeId: string) => {
    if (!activeGroup) return;
    try {
      await api.removeChatGroupMember({ actorId: currentEmployee.id, groupId: activeGroup.id, employeeId });
      if (employeeId === currentEmployee.id) {
        setMembersOpen(false);
        setGroups((prev) => prev.filter((g) => g.id !== activeGroup.id));
        setActiveGroup(null);
        openChannel(channels[0]?.id ?? 'general');
      } else {
        setGroupMembers((prev) => prev.filter((m) => m.id !== employeeId));
      }
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('chat.loadError'));
    }
  };

  const [memberSearch, setMemberSearch] = useState('');
  const handleAddMemberToGroup = async (empId: string) => {
    if (!activeGroup) return;
    try {
      await api.addChatGroupMember({ actorId: currentEmployee.id, groupId: activeGroup.id, employeeId: empId });
      setMemberSearch('');
      loadGroupMembers();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('chat.loadError'));
    }
  };

  const memberCandidates = memberSearch.trim()
    ? allEmployees.filter(
        (e) =>
          !e.isPartner &&
          !groupMembers.some((m) => m.id === e.id) &&
          (e.fullName || e.login).toLowerCase().includes(memberSearch.trim().toLowerCase())
      )
    : [];

  const handleCopyInviteCode = () => {
    if (!activeGroupFull) return;
    navigator.clipboard.writeText(activeGroupFull.inviteCode).then(() => {
      setCopiedInviteCode(true);
      setTimeout(() => setCopiedInviteCode(false), 2000);
    });
  };

  const searchResults = search.trim()
    ? allEmployees.filter(
        (e) =>
          !e.isPartner &&
          e.id !== currentEmployee.id &&
          (e.fullName || e.login).toLowerCase().includes(search.trim().toLowerCase())
      )
    : [];

  const startEditMessage = (m: ChatMessage) => {
    setEditingId(m.id);
    setEditDraft(m.content);
  };

  const cancelEditMessage = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEditMessage = async () => {
    if (!editingId || !editDraft.trim()) return;
    setEditBusy(true);
    try {
      const updated = await api.editChatMessage({ actorId: currentEmployee.id, messageId: editingId, content: editDraft.trim() });
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditingId(null);
      setEditDraft('');
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('chat.loadError'));
    } finally {
      setEditBusy(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteBusy(true);
    try {
      await api.deleteChatMessage({ actorId: currentEmployee.id, messageId: id });
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, isDeleted: true, content: '', attachmentData: null, attachmentName: null } : m)));
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('chat.loadError'));
    } finally {
      setDeleteBusy(false);
    }
  };

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
      setEmojiOpen(false);
      loadMessages(true);
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('chat.loadError'));
    } finally {
      setSendBusy(false);
    }
  };

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const scrollToMessage = (id: string) => {
    const el = document.getElementById(`chat-msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(id);
    setTimeout(() => setHighlightedId((cur) => (cur === id ? null : cur)), 1500);
  };

  const wallpaperCss = CHAT_WALLPAPER_CSS[getStoredChatWallpaper()];

  const isDmChannel = !!channel && channel.startsWith('dm:');
  const activePartnerName =
    partners.find((p) => p.id === channel)?.name ?? partnerChatSummaries.find((s) => s.partnerId === channel)?.partnerName;
  const activeChannelLabel = channels.find((c) => c.id === channel)?.label ?? activePartnerName ?? '';

  const partnerSearchResults = partnerSearch.trim()
    ? partners.filter((p) => p.name.toLowerCase().includes(partnerSearch.trim().toLowerCase()))
    : [];

  return (
    <div className="reg-fullscreen">
      <div className="reg-fullscreen-header">
        <button className="reg-back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> {t('common.close')}
        </button>
        <div className="reg-fullscreen-title">
          <h2>{t('chat.pageTitle')}</h2>
        </div>
        <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setSettingsOpen(true)} title={t('chat.settingsTitle')}>
          <SettingsIcon size={18} />
        </button>
      </div>

      <div className="reg-fullscreen-body">
        {currentEmployee.isPartner && (
          // Партнёр видит ту же боковую панель, что и сотрудник (v0.4.2),
          // просто с единственным пунктом — общим чатом с админом (канал уже
          // один на всю организацию партнёра, см. channels выше).
          <aside className="reg-sidebar">
            <div className="reg-sidebar-section">
              <div className="department-members-title">{t('chat.myChatsTitle')}</div>
              <ul className="chat-dm-list">
                {channels.map((c) => (
                  <li key={c.id} className={`chat-dm-item${channel === c.id ? ' active' : ''}`} onClick={() => openChannel(c.id)}>
                    <Avatar name={c.label} size={28} />
                    <div className="chat-dm-item-text">
                      <span className="chat-dm-item-name">{c.label}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}

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

            {currentEmployee.isAdmin && (
              <div className="reg-sidebar-section">
                <div className="department-members-title">{t('chat.partnersTitle')}</div>
                <div className="employees-search-row" style={{ marginBottom: 10, maxWidth: 'none' }}>
                  <Search size={14} className="employees-search-icon" />
                  <input
                    className="employees-search-input"
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    placeholder={t('chat.partnerSearchPlaceholder')}
                  />
                </div>
                {partnerSearch.trim() && (
                  <ul className="chat-dm-list" style={{ marginBottom: 10 }}>
                    {partnerSearchResults.length === 0 ? (
                      <p className="settings-hint">{t('chat.searchEmpty')}</p>
                    ) : (
                      partnerSearchResults.map((p) => (
                        <li key={p.id} className="chat-dm-item" onClick={() => { openChannel(p.id); setPartnerSearch(''); }}>
                          <Avatar name={p.name} size={28} />
                          <div className="chat-dm-item-text">
                            <span className="chat-dm-item-name">{p.name}</span>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                )}
                {partnerChatSummaries.length === 0 ? (
                  <p className="settings-hint">{t('chat.partnersEmpty')}</p>
                ) : (
                  <ul className="chat-dm-list">
                    {partnerChatSummaries.map((s) => (
                      <li
                        key={s.partnerId}
                        className={`chat-dm-item${channel === s.partnerId ? ' active' : ''}`}
                        onClick={() => openChannel(s.partnerId)}
                      >
                        <Avatar name={s.partnerName} size={28} />
                        <div className="chat-dm-item-text">
                          <span className="chat-dm-item-name">{s.partnerName}</span>
                          {s.lastMessage && <span className="chat-dm-item-preview">{s.lastMessage}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="reg-sidebar-section">
              <div className="chat-groups-title-row">
                <div className="department-members-title">{t('chat.groupsTitle')}</div>
                <button type="button" className="reg-action-btn" onClick={() => setGroupFormOpen(true)} title={t('chat.createGroupBtn')}>
                  <Plus size={14} />
                </button>
              </div>
              {groups.length === 0 ? (
                <p className="settings-hint">{t('chat.groupsEmpty')}</p>
              ) : (
                <ul className="chat-dm-list">
                  {groups.map((g) => (
                    <li
                      key={g.id}
                      className={`chat-dm-item${channel === `group:${g.id}` ? ' active' : ''}`}
                      onClick={() => openGroup(g)}
                    >
                      <Avatar name={g.name} size={28} src={g.photoData} />
                      <div className="chat-dm-item-text">
                        <span className="chat-dm-item-name">{g.name}</span>
                        {g.lastMessage && <span className="chat-dm-item-preview">{g.lastMessage}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="chat-join-row">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder={t('chat.joinCodePlaceholder')}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                />
                <button type="button" className="modal-btn" onClick={handleJoinByCode} disabled={!joinCode.trim() || joinBusy}>
                  <UserPlus size={13} />
                </button>
              </div>
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
            ) : activeGroup ? (
              <div className="chat-thread-peer">
                <Avatar name={activeGroup.name} size={32} src={activeGroup.photoData} />
                <span className="department-members-title">{activeGroup.name}</span>
                <span className="settings-hint">{t('chat.groupMemberCount', { count: activeGroup.memberCount })}</span>
                <button type="button" className="reg-action-btn" style={{ marginLeft: 'auto' }} onClick={openMembersPanel} title={t('chat.groupMembersBtn')}>
                  <Users size={14} />
                </button>
              </div>
            ) : (
              <div className="department-members-title">{activeChannelLabel}</div>
            )}
          </div>

          <div className="reg-entries-list chat-entries-list" style={wallpaperCss ? { background: wallpaperCss } : undefined}>
            {loading ? (
              <LoadingScreen compact />
            ) : messages.length === 0 ? (
              <p className="settings-hint">{t('chat.empty')}</p>
            ) : (
              messages.map((m) => {
                const parent = m.replyToId ? messages.find((p) => p.id === m.replyToId) : null;
                const isOwn = m.senderId === currentEmployee.id;
                const isEditing = editingId === m.id;
                return (
                  <div
                    key={m.id}
                    id={`chat-msg-${m.id}`}
                    className={`reg-chat-msg${isOwn ? ' own' : ''}${highlightedId === m.id ? ' chat-msg-highlight' : ''}`}
                  >
                    <Avatar name={m.senderName} size={30} src={m.senderAvatar} />
                    <div className="reg-chat-bubble">
                      <div className="reg-entry-header">
                        <div className="reg-entry-meta">
                          <strong>{m.senderName}</strong>
                          <span className="settings-hint">{parseSqliteUtc(m.createdAt).toLocaleString()}</span>
                          {!m.isDeleted && m.editedAt && <span className="settings-hint">{t('common.editedLabel')}</span>}
                        </div>
                        {!m.isDeleted && (
                          <div className="reg-entry-actions">
                            <button
                              className="reg-action-btn"
                              onClick={() => { setReplyTo(m); composerInputRef.current?.focus(); }}
                              title={t('chat.replyBtn')}
                            >
                              <Reply size={13} />
                            </button>
                            {isOwn && (
                              <>
                                <button className="reg-action-btn" onClick={() => startEditMessage(m)} title={t('common.editBtn')}>
                                  <Pencil size={13} />
                                </button>
                                <button className="reg-action-btn" onClick={() => setDeleteConfirmId(m.id)} title={t('common.deleteBtn')}>
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {m.isDeleted ? (
                        <p className="settings-hint">{t('common.messageDeleted')}</p>
                      ) : isEditing ? (
                        <div className="reg-inline-edit">
                          <textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={2} />
                          <div className="reg-inline-edit-actions">
                            <button className="modal-btn" onClick={cancelEditMessage}>{t('common.editCancelBtn')}</button>
                            <button className="modal-btn danger" onClick={saveEditMessage} disabled={!editDraft.trim() || editBusy}>
                              {t('common.editSaveBtn')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {parent && (
                            <button type="button" className="blog-reply-to chat-reply-jump" onClick={() => scrollToMessage(parent.id)}>
                              ↪ {t('chat.replyingTo', { name: parent.senderName })}
                            </button>
                          )}
                          <div className="reg-entry-content" style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                          {m.attachmentData && (
                            <AttachmentPreview dataUrl={m.attachmentData} name={m.attachmentName} onExpand={() => setLightboxUrl(m.attachmentData)} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
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
            {attachName && (
              <div className="chat-composer-attach-chip">
                <Paperclip size={12} />
                <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachName}</span>
                <button onClick={() => { setAttachData(null); setAttachName(null); }}>
                  <X size={12} />
                </button>
              </div>
            )}
            {emojiOpen && (
              <div className="chat-emoji-picker">
                {CHAT_EMOJIS.map((em) => (
                  <button key={em} type="button" onClick={() => setText((t2) => t2 + em)}>{em}</button>
                ))}
              </div>
            )}
            <div className="chat-composer-bar">
              <button type="button" className="chat-composer-icon-btn" onClick={() => setEmojiOpen((o) => !o)} title={t('chat.emojiBtn')}>
                <Smile size={18} />
              </button>
              <button type="button" className="chat-composer-icon-btn" onClick={() => fileInputRef.current?.click()} title={t('chat.attachBtn')} disabled={attachBusy}>
                <Paperclip size={18} />
              </button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileAttach} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />
              <textarea
                ref={composerInputRef}
                rows={1}
                className="chat-composer-input"
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
              <button type="button" className="chat-composer-send-btn" onClick={handleSend} disabled={!text.trim() || sendBusy} title={t('chat.sendBtn')}>
                <Send size={16} />
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

      <ChatSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Modal
        open={!!deleteConfirmId}
        title={t('common.deleteConfirmTitle')}
        onClose={() => setDeleteConfirmId(null)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setDeleteConfirmId(null)} disabled={deleteBusy}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleDeleteMessage} disabled={deleteBusy}>
              {deleteBusy ? t('common.loading') : t('common.deleteBtn')}
            </button>
          </>
        }
      >
        {t('common.deleteConfirmBody')}
      </Modal>

      {!currentEmployee.isPartner && (
        <ChatGroupFormModal
          open={groupFormOpen}
          onClose={() => setGroupFormOpen(false)}
          currentEmployee={currentEmployee}
          departments={departments}
          employees={allEmployees}
          onCreated={handleCreatedGroup}
        />
      )}

      <Modal
        open={membersOpen}
        title={t('chat.groupMembersBtn')}
        onClose={() => setMembersOpen(false)}
        actions={
          <button className="modal-btn" onClick={() => setMembersOpen(false)}>{t('common.close')}</button>
        }
      >
        {activeGroupFull && (
          <div className="account-row" style={{ marginBottom: 14 }}>
            <span className="settings-hint">{t('chat.groupInviteCodeLabel')}</span>
            <span>
              {activeGroupFull.inviteCode}
              <button className="reg-action-btn" style={{ marginLeft: 8 }} onClick={handleCopyInviteCode} title={t('settings.server.copyAddress')}>
                {copiedInviteCode ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </span>
          </div>
        )}

        {membersBusy ? (
          <LoadingScreen compact />
        ) : (
          <ul className="department-members-list">
            {groupMembers.map((m) => (
              <li key={m.id}>
                <span>{m.fullName || m.login}</span>
                {(isGroupManager || m.id === currentEmployee.id) && (
                  <button type="button" className="department-member-remove" title={m.id === currentEmployee.id ? t('chat.groupLeaveBtn') : t('common.close')} onClick={() => handleRemoveMember(m.id)}>
                    {m.id === currentEmployee.id ? <LogOut size={13} /> : <X size={13} />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isGroupManager && (
          <div className="field" style={{ marginTop: 14 }}>
            <label>{t('chat.groupAddMemberLabel')}</label>
            <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder={t('chat.searchPlaceholder')} />
            {memberSearch.trim() && (
              <ul className="chat-dm-list" style={{ marginTop: 8, maxHeight: 160, overflowY: 'auto' }}>
                {memberCandidates.length === 0 ? (
                  <p className="settings-hint">{t('chat.searchEmpty')}</p>
                ) : (
                  memberCandidates.map((e) => (
                    <li key={e.id} className="chat-dm-item" onClick={() => handleAddMemberToGroup(e.id)}>
                      <Avatar name={e.fullName || e.login} size={26} src={e.avatarData} />
                      <div className="chat-dm-item-text">
                        <span className="chat-dm-item-name">{e.fullName || e.login}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
