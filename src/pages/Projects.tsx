import { useEffect, useState, useRef, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listen } from '@tauri-apps/api/event';
import { Plus, Search, Pencil, Trash2, Send, UserPlus, X, Repeat, CheckSquare, XSquare, RotateCcw, ChevronDown, ChevronRight, ArrowLeft, Link2, Check, Paperclip, Forward, CalendarClock } from 'lucide-react';
import { api, type Employee, type Project, type ProjectMember, type ProjectChatMessage, type ProjectChatReply, type Client, type ProjectMemberRole, type RegulationEntryStatus } from '../lib/api';
import { FullscreenContext } from './Dashboard';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc } from '../lib/date';
import { prepareAttachment, classifyAttachment } from '../lib/attachment';
import { buildProjectMessageLink, linkifyEntryContent } from '../lib/entryLink';
import { employeeDisplayName } from '../lib/employeeDisplay';
import Modal from '../components/Modal';
import Select from '../components/Select';
import SearchableSelect from '../components/SearchableSelect';
import ProjectFormModal from '../components/ProjectFormModal';
import LoadingScreen from '../components/LoadingScreen';
import AttachmentPreview from '../components/AttachmentPreview';

const MSG_STATUS_KEYS: Record<RegulationEntryStatus, string> = {
  open: 'projects.entryStatusOpen',
  done: 'projects.entryStatusDone',
  cancelled: 'projects.entryStatusCancelled',
};

// Компонент одного сообщения чата — отдельно, чтобы useState работал корректно
function ChatMessage({
  m,
  currentEmployee,
  projectOwnerId,
  members,
  onStatusChange,
  onAddReply,
  onAssign,
  onMessageChanged,
  t,
}: {
  m: ProjectChatMessage;
  currentEmployee: Employee;
  projectOwnerId: string;
  members: ProjectMember[];
  onStatusChange: (messageId: string, status: RegulationEntryStatus) => void;
  onAddReply: (messageId: string, content: string) => Promise<void>;
  onAssign: (messageId: string, targetEmployeeId: string, deadline: string) => Promise<void>;
  onMessageChanged: () => void;
  t: (k: string, vars?: Record<string, string | number>) => string;
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [replies, setReplies] = useState<ProjectChatReply[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTo, setAssignTo] = useState('');
  const [assignDeadline, setAssignDeadline] = useState(m.deadline ?? '');
  const [assignBusy, setAssignBusy] = useState(false);

  const [msgEditing, setMsgEditing] = useState(false);
  const [msgEditDraft, setMsgEditDraft] = useState('');
  const [msgEditBusy, setMsgEditBusy] = useState(false);
  const [msgDeleteConfirm, setMsgDeleteConfirm] = useState(false);
  const [msgDeleteBusy, setMsgDeleteBusy] = useState(false);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyEditDraft, setReplyEditDraft] = useState('');
  const [replyEditBusy, setReplyEditBusy] = useState(false);
  const [deleteReplyConfirmId, setDeleteReplyConfirmId] = useState<string | null>(null);
  const [deleteReplyBusy, setDeleteReplyBusy] = useState(false);

  const startEditMsg = () => {
    setMsgEditing(true);
    setMsgEditDraft(m.content);
  };
  const cancelEditMsg = () => {
    setMsgEditing(false);
    setMsgEditDraft('');
  };
  const saveEditMsg = async () => {
    if (!msgEditDraft.trim()) return;
    setMsgEditBusy(true);
    try {
      await api.editProjectChatMessage({ actorId: currentEmployee.id, messageId: m.id, content: msgEditDraft.trim() });
      setMsgEditing(false);
      onMessageChanged();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setMsgEditBusy(false);
    }
  };
  const handleDeleteMsg = async () => {
    setMsgDeleteBusy(true);
    try {
      await api.deleteProjectChatMessage({ actorId: currentEmployee.id, messageId: m.id });
      setMsgDeleteConfirm(false);
      onMessageChanged();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setMsgDeleteBusy(false);
    }
  };

  const startEditReply = (r: ProjectChatReply) => {
    setEditingReplyId(r.id);
    setReplyEditDraft(r.content);
  };
  const cancelEditReply = () => {
    setEditingReplyId(null);
    setReplyEditDraft('');
  };
  const saveEditReply = async () => {
    if (!editingReplyId || !replyEditDraft.trim()) return;
    setReplyEditBusy(true);
    try {
      await api.editProjectChatReply({ actorId: currentEmployee.id, replyId: editingReplyId, content: replyEditDraft.trim() });
      setEditingReplyId(null);
      await loadReplies();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setReplyEditBusy(false);
    }
  };
  const handleDeleteReply = async () => {
    if (!deleteReplyConfirmId) return;
    setDeleteReplyBusy(true);
    try {
      await api.deleteProjectChatReply({ actorId: currentEmployee.id, replyId: deleteReplyConfirmId });
      setDeleteReplyConfirmId(null);
      await loadReplies();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setDeleteReplyBusy(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(buildProjectMessageLink(m.projectId, m.id)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const loadReplies = async () => {
    const data = await api.listProjectChatReplies(m.id);
    setReplies(data);
  };

  const toggle = () => {
    if (!expanded) loadReplies();
    setExpanded((v) => !v);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplyBusy(true);
    try {
      await onAddReply(m.id, replyText.trim());
      setReplyText('');
      await loadReplies();
    } finally {
      setReplyBusy(false);
    }
  };

  const handleAssignSubmit = async () => {
    if (!assignTo) return;
    setAssignBusy(true);
    try {
      await onAssign(m.id, assignTo, assignDeadline);
      setAssignOpen(false);
    } finally {
      setAssignBusy(false);
    }
  };

  const canManage = currentEmployee.isAdmin || projectOwnerId === currentEmployee.id || m.senderId === currentEmployee.id;
  const isOwn = m.senderId === currentEmployee.id;
  const initials = m.senderName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const assigneeOptions = members.filter((mm) => mm.employeeId !== m.targetEmployeeId).map((mm) => ({ value: mm.employeeId, label: mm.employeeName }));

  return (
    <div id={`msg-${m.id}`} className={`reg-chat-msg${isOwn ? ' own' : ''}`}>
      <div className="reg-chat-avatar">{initials || '?'}</div>
      <div className="reg-chat-bubble">
        <div className="reg-entry-header">
          <div className="reg-entry-meta">
            <strong>{employeeDisplayName(m.senderName, m.senderIsBlocked, currentEmployee.isAdmin, t('employees.blockedLabel'))}</strong>
            <span className="settings-hint">{parseSqliteUtc(m.createdAt).toLocaleString()}</span>
            {!m.isDeleted && m.editedAt && <span className="settings-hint">{t('common.editedLabel')}</span>}
          </div>
          {!m.isDeleted && (
            <div className="reg-entry-actions">
              <button className="reg-action-btn" onClick={copyLink} title={t('projects.copyMsgLink')}>
                {copied ? <Check size={13} /> : <Link2 size={13} />}
              </button>
              {isOwn && (
                <>
                  <button className="reg-action-btn" onClick={startEditMsg} title={t('common.editBtn')}>
                    <Pencil size={13} />
                  </button>
                  <button className="reg-action-btn" onClick={() => setMsgDeleteConfirm(true)} title={t('common.deleteBtn')}>
                    <Trash2 size={13} />
                  </button>
                </>
              )}
              {canManage && (
                <>
                  {m.status !== 'done' && (
                    <button className="reg-action-btn done" onClick={() => onStatusChange(m.id, 'done')} title={t('projects.markDoneBtn')}>
                      <CheckSquare size={14} />
                    </button>
                  )}
                  {m.status === 'open' && (
                    <button className="reg-action-btn cancel" onClick={() => onStatusChange(m.id, 'cancelled')} title={t('projects.markCancelBtn')}>
                      <XSquare size={14} />
                    </button>
                  )}
                  {m.status !== 'open' && (
                    <button className="reg-action-btn reopen" onClick={() => onStatusChange(m.id, 'open')} title={t('projects.reopenEntryBtn')}>
                      <RotateCcw size={14} />
                    </button>
                  )}
                  <button className="reg-action-btn" onClick={() => { setAssignOpen((v) => !v); setAssignTo(''); }} title={t('projects.assignBtn')}>
                    <Forward size={14} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {m.isDeleted ? (
          <p className="settings-hint">{t('common.messageDeleted')}</p>
        ) : (
          <>
            {msgEditing ? (
              <div className="reg-inline-edit">
                <textarea value={msgEditDraft} onChange={(e) => setMsgEditDraft(e.target.value)} rows={3} />
                <div className="reg-inline-edit-actions">
                  <button className="modal-btn" onClick={cancelEditMsg}>{t('common.editCancelBtn')}</button>
                  <button className="modal-btn danger" onClick={saveEditMsg} disabled={!msgEditDraft.trim() || msgEditBusy}>
                    {t('common.editSaveBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="reg-entry-content">{linkifyEntryContent(m.content, navigate)}</div>
            )}

            <div className="reg-chat-chips">
              <span className={`absence-status reg-entry-badge-${m.status}`}>{t(MSG_STATUS_KEYS[m.status])}</span>
              {m.deadline && <span className="reg-chip-deadline">📅 {m.deadline}</span>}
            </div>

            {m.attachmentData && (
              <AttachmentPreview dataUrl={m.attachmentData} name={m.attachmentName} onExpand={() => setLightbox(true)} />
            )}

            {assignOpen && (
              <div className="reg-assign-form">
                <SearchableSelect
                  value={assignTo}
                  options={assigneeOptions}
                  onChange={setAssignTo}
                  searchPlaceholder={t('employees.searchPlaceholder')}
                  emptyLabel={t('employees.searchEmpty')}
                />
                <input type="date" value={assignDeadline} onChange={(e) => setAssignDeadline(e.target.value)} />
                <button className="modal-btn" onClick={handleAssignSubmit} disabled={!assignTo || assignBusy}>
                  <Forward size={12} /> {t('projects.assignConfirmBtn')}
                </button>
                <button className="modal-btn" onClick={() => setAssignOpen(false)}><X size={12} /></button>
              </div>
            )}

            <button className="link-btn reg-replies-toggle" onClick={toggle}>
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {t('projects.repliesTitle')} {m.replyCount > 0 ? `(${m.replyCount})` : ''}
            </button>

            {expanded && (
              <div className="reg-replies">
                {replies.map((r) => {
                  const isOwnReply = r.authorId === currentEmployee.id;
                  const isEditingReply = editingReplyId === r.id;
                  return (
                    <div key={r.id} className="reg-reply">
                      <div className="reg-reply-meta">
                        <strong>{employeeDisplayName(r.authorName, r.authorIsBlocked, currentEmployee.isAdmin, t('employees.blockedLabel'))}</strong>
                        <span className="settings-hint">{parseSqliteUtc(r.createdAt).toLocaleString()}</span>
                        {!r.isDeleted && r.editedAt && <span className="settings-hint">{t('common.editedLabel')}</span>}
                        {isOwnReply && !r.isDeleted && (
                          <div className="reg-entry-actions" style={{ marginLeft: 'auto' }}>
                            <button className="reg-action-btn" onClick={() => startEditReply(r)} title={t('common.editBtn')}>
                              <Pencil size={12} />
                            </button>
                            <button className="reg-action-btn" onClick={() => setDeleteReplyConfirmId(r.id)} title={t('common.deleteBtn')}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                      {r.isDeleted ? (
                        <p className="settings-hint">{t('common.messageDeleted')}</p>
                      ) : isEditingReply ? (
                        <div className="reg-inline-edit">
                          <textarea value={replyEditDraft} onChange={(e) => setReplyEditDraft(e.target.value)} rows={2} />
                          <div className="reg-inline-edit-actions">
                            <button className="modal-btn" onClick={cancelEditReply}>{t('common.editCancelBtn')}</button>
                            <button className="modal-btn danger" onClick={saveEditReply} disabled={!replyEditDraft.trim() || replyEditBusy}>
                              {t('common.editSaveBtn')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>{linkifyEntryContent(r.content, navigate)}</div>
                      )}
                    </div>
                  );
                })}
                <div className="reg-reply-form">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t('projects.addReplyPlaceholder')}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
                  />
                  <button className="modal-btn" onClick={handleReply} disabled={!replyText.trim() || replyBusy}>↵</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && m.attachmentData && classifyAttachment(m.attachmentData) === 'image' && (
        <div className="reg-lightbox" onClick={() => setLightbox(false)}>
          <img src={m.attachmentData} alt={m.attachmentName ?? ''} />
          <button className="reg-lightbox-close" onClick={() => setLightbox(false)}><X size={20} /></button>
        </div>
      )}

      <Modal
        open={msgDeleteConfirm}
        title={t('common.deleteConfirmTitle')}
        onClose={() => setMsgDeleteConfirm(false)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setMsgDeleteConfirm(false)} disabled={msgDeleteBusy}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleDeleteMsg} disabled={msgDeleteBusy}>
              {msgDeleteBusy ? t('common.loading') : t('common.deleteBtn')}
            </button>
          </>
        }
      >
        {t('common.deleteConfirmBody')}
      </Modal>

      <Modal
        open={!!deleteReplyConfirmId}
        title={t('common.deleteConfirmTitle')}
        onClose={() => setDeleteReplyConfirmId(null)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setDeleteReplyConfirmId(null)} disabled={deleteReplyBusy}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleDeleteReply} disabled={deleteReplyBusy}>
              {deleteReplyBusy ? t('common.loading') : t('common.deleteBtn')}
            </button>
          </>
        }
      >
        {t('common.deleteConfirmBody')}
      </Modal>
    </div>
  );
}

const STATUS_LABEL_KEYS: Record<Project['status'], string> = {
  planning: 'projects.statusPlanning',
  active: 'projects.statusActive',
  on_hold: 'projects.statusOnHold',
  completed: 'projects.statusCompleted',
  cancelled: 'projects.statusCancelled',
};

export default function Projects({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const location = useLocation();
  const { enter: enterFullscreen, exit: exitFullscreen } = useContext(FullscreenContext);

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [chat, setChat] = useState<ProjectChatMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [addMemberId, setAddMemberId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<ProjectMemberRole>('member');
  const [addMemberBusy, setAddMemberBusy] = useState(false);

  const [transferTarget, setTransferTarget] = useState<ProjectMember | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);

  const [chatText, setChatText] = useState('');
  const [chatDeadline, setChatDeadline] = useState('');
  const [attachData, setAttachData] = useState<string | null>(null);
  const [attachName, setAttachName] = useState<string | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastChatMsgIdRef = useRef<string | null>(null);

  // Чей тред сейчас открыт справа — по умолчанию свой
  const [activeThreadId, setActiveThreadId] = useState<string>(currentEmployee.id);

  // Первая задача при добавлении участника
  const [firstTaskFor, setFirstTaskFor] = useState<ProjectMember | null>(null);
  const [firstTaskDesc, setFirstTaskDesc] = useState('');
  const [firstTaskDeadline, setFirstTaskDeadline] = useState('');
  const [firstTaskBusy, setFirstTaskBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.listProjects(), api.listClients({ actorId: currentEmployee.id }), api.listEmployees()])
      .then(([p, c, e]) => {
        setProjects(p);
        setClients(c);
        setEmployees(e);
        setLoading(false);
        setSelected((prev) => (prev ? p.find((x) => x.id === prev.id) ?? null : null));
      })
      .catch(() => {
        setLoading(false);
        showToast('error', t('common.loadError'));
      });
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selected) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
    return () => { exitFullscreen(); };
  }, [!!selected]); // eslint-disable-line

  useEffect(() => {
    const openProjectId = (location.state as any)?.openProjectId;
    if (!openProjectId || projects.length === 0) return;
    const proj = projects.find((p) => p.id === openProjectId);
    if (proj) setSelected(proj);
  }, [projects, location.state]);

  // silent — при фоновом обновлении (тикер уведомлений каждые ~8 сек) не
  // показываем спиннер поверх уже открытого чата/участников: раньше
  // detailLoading включался на каждый тик, содержимое на секунду
  // схлопывалось в LoadingScreen и обратно — заметные "скачки" интерфейса,
  // даже когда на самом деле ничего не изменилось. Спиннер нужен только на
  // настоящей первой загрузке/переключении проекта.
  const loadDetail = (silent = false) => {
    if (!selected) return;
    if (!silent) setDetailLoading(true);
    Promise.all([api.listProjectMembers(selected.id), api.listProjectChat(selected.id)])
      .then(([m, c]) => {
        setMembers(m);
        setChat(c);
        setDetailLoading(false);
      })
      .catch(() => {
        setDetailLoading(false);
        showToast('error', t('common.loadError'));
      });
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Живое обновление открытого проекта (v0.6.3) — см. тот же фикс в
  // Regulations.tsx: тикер уведомлений теперь дополнительно шлётся при
  // закрытии задачи через Telegram-кнопку "Готово".
  useEffect(() => {
    const unlisten = listen('notification-tick', () => loadDetail(true));
    return () => { unlisten.then((f) => f()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // При открытии проекта (или переключении на другой) — сбрасываем на свой тред
  useEffect(() => { setActiveThreadId(currentEmployee.id); }, [selected?.id]); // eslint-disable-line

  // Переход по ссылке на конкретное сообщение (см. lib/entryLink.tsx) — как
  // только чат загрузился, переключаемся на тред нужного участника и
  // прокручиваем к самому сообщению.
  useEffect(() => {
    const openMessageId = (location.state as any)?.openMessageId;
    if (!openMessageId || chat.length === 0) return;
    const msg = chat.find((m) => m.id === openMessageId);
    if (!msg) return;
    setActiveThreadId(msg.targetEmployeeId);
    setTimeout(() => {
      document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }, [chat, location.state]);

  // Прокрутка к последнему сообщению треда при открытии/переключении — этого
  // не было вовсе (в отличие от Chat.tsx/Regulations.tsx), поэтому открытие
  // проекта или переключение на чужой тред показывало верх списка. Пропускаем,
  // если это переход по ссылке на конкретное сообщение — эффект выше уже сам
  // скроллит куда нужно.
  useEffect(() => {
    if ((location.state as any)?.openMessageId) return;
    const threadMessages = chat.filter((m) => m.targetEmployeeId === activeThreadId);
    if (threadMessages.length === 0) return;
    const lastId = threadMessages[threadMessages.length - 1].id;
    if (lastId !== lastChatMsgIdRef.current) {
      lastChatMsgIdRef.current = lastId;
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: 'auto' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat, activeThreadId]);

  const isManager = !!selected && (currentEmployee.isAdmin || selected.ownerId === currentEmployee.id);
  const isParticipant =
    !!selected &&
    (currentEmployee.isAdmin || selected.ownerId === currentEmployee.id || members.some((m) => m.employeeId === currentEmployee.id));
  // Добавлять участников может владелец/админ (isManager) или тот, кому
  // владелец назначил роль "Помощник" — по прямому запросу пользователя.
  const myProjectRole = members.find((m) => m.employeeId === currentEmployee.id)?.roleInProject;
  const canAddMembers = isManager || myProjectRole === 'assistant';

  const openCreate = () => {
    setEditingProject(undefined);
    setFormOpen(true);
  };
  const openEdit = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleteBusy(true);
    try {
      await api.deleteProject({ adminId: currentEmployee.id, id: selected.id });
      showToast('success', t('projects.deleted'));
      setDeleteConfirmOpen(false);
      setSelected(null);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const memberOptions = selected
    ? [
        { value: '', label: t('employees.notSelected') },
        ...employees
          .filter((e) => !e.isPartner && !members.some((m) => m.employeeId === e.id))
          .map((e) => ({ value: e.id, label: e.fullName || e.login })),
      ]
    : [];

  const handleAddMember = async () => {
    if (!selected || !addMemberId) return;
    setAddMemberBusy(true);
    try {
      const addedId = addMemberId;
      const addedOption = memberOptions.find((o) => o.value === addedId);
      await api.addProjectMember({ actorId: currentEmployee.id, projectId: selected.id, employeeId: addedId, role: addMemberRole });
      showToast('success', t('projects.memberAdded'));
      setAddMemberId('');
      setAddMemberRole('member');
      loadDetail();
      load();
      if (addedOption) {
        setFirstTaskFor({ employeeId: addedId, employeeName: addedOption.label, roleInProject: addMemberRole, isOwner: false, addedAt: '' });
        setFirstTaskDesc('');
        setFirstTaskDeadline('');
      }
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setAddMemberBusy(false);
    }
  };

  const handleRemoveMember = async (m: ProjectMember) => {
    if (!selected) return;
    try {
      await api.removeProjectMember({ actorId: currentEmployee.id, projectId: selected.id, employeeId: m.employeeId });
      showToast('success', t('projects.memberRemoved'));
      if (activeThreadId === m.employeeId) setActiveThreadId(currentEmployee.id);
      loadDetail();
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    }
  };

  const handleTransfer = async () => {
    if (!selected || !transferTarget) return;
    setTransferBusy(true);
    try {
      await api.transferProjectOwnership({ actorId: currentEmployee.id, projectId: selected.id, newOwnerId: transferTarget.employeeId });
      showToast('success', t('projects.transferred'));
      setTransferTarget(null);
      loadDetail();
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setTransferBusy(false);
    }
  };

  const handleFirstTaskSkip = () => setFirstTaskFor(null);

  const handleFirstTaskSubmit = async () => {
    if (!selected || !firstTaskFor || !firstTaskDesc.trim()) return;
    setFirstTaskBusy(true);
    try {
      await api.sendProjectChatMessage({
        actorId: currentEmployee.id,
        projectId: selected.id,
        targetEmployeeId: firstTaskFor.employeeId,
        content: firstTaskDesc.trim(),
        deadline: firstTaskDeadline || null,
      });
      showToast('success', t('projects.firstTaskCreated'));
      setFirstTaskFor(null);
      loadDetail();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setFirstTaskBusy(false);
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
      showToast('error', t('projects.attachmentTooLarge'));
    } finally {
      setAttachBusy(false);
    }
  };

  const handleAssignMessage = async (messageId: string, targetEmployeeId: string, deadline: string) => {
    try {
      await api.assignProjectChatMessage({ actorId: currentEmployee.id, messageId, targetEmployeeId, deadline: deadline || null });
      showToast('success', t('projects.assigned'));
      loadDetail();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    }
  };

  const handleStatusChange = async (messageId: string, status: RegulationEntryStatus) => {
    try {
      await api.updateProjectChatMessageStatus({ actorId: currentEmployee.id, messageId, status });
      loadDetail();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    }
  };

  const handleAddReply = async (messageId: string, content: string) => {
    await api.addProjectChatReply({ actorId: currentEmployee.id, messageId, content });
    loadDetail();
  };

  const handleSendChat = async () => {
    if (!selected || !chatText.trim()) return;
    setChatBusy(true);
    try {
      await api.sendProjectChatMessage({
        actorId: currentEmployee.id,
        projectId: selected.id,
        targetEmployeeId: activeThreadId,
        content: chatText.trim(),
        attachmentData: attachData,
        attachmentName: attachName,
        deadline: chatDeadline || null,
      });
      setChatText('');
      setChatDeadline('');
      setAttachData(null);
      setAttachName(null);
      loadDetail();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setChatBusy(false);
    }
  };

  const filteredProjects = search.trim()
    ? projects.filter((p) => {
        const q = search.trim().toLowerCase();
        return (
          p.projectNumber.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.clientName || '').toLowerCase().includes(q) ||
          p.ownerName.toLowerCase().includes(q)
        );
      })
    : projects;

  return (
    <>
    {/* ---- Полноэкранный вид открытого проекта ---- */}
    {selected ? (
      <div className="reg-fullscreen">
        <div className="reg-fullscreen-header">
          <button className="reg-back-btn" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} /> {t('projects.backToList')}
          </button>
          <div className="reg-fullscreen-title">
            <h2>{selected.name}</h2>
            <span className="settings-hint">{selected.projectNumber}</span>
            <span className={`absence-status project-status-${selected.status}`}>{t(STATUS_LABEL_KEYS[selected.status])}</span>
          </div>
          <div className="reg-fullscreen-actions">
            {isManager && (
              <button className="modal-btn" onClick={() => openEdit(selected)}>
                <Pencil size={14} /> {t('employees.editBtn')}
              </button>
            )}
            {currentEmployee.isAdmin && (
              <button className="modal-btn danger" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="reg-fullscreen-body">
          {/* Левая колонка — инфо + участники */}
          <aside className="reg-sidebar">
            {selected.description && (
              <div className="reg-sidebar-section">
                <div className="department-members-title">{t('projects.descriptionLabel')}</div>
                <p className="settings-hint">{selected.description}</p>
              </div>
            )}
            <div className="reg-sidebar-section">
              {selected.clientName && (
                <div className="employee-card-row">
                  <span className="settings-hint">{t('projects.clientLabel')}</span>
                  <span>{selected.clientName}</span>
                </div>
              )}
              <div className="employee-card-row">
                <span className="settings-hint">{t('projects.ownerLabel')}</span>
                <span>{selected.ownerName}</span>
              </div>
              <div className="employee-card-row">
                <span className="settings-hint">{t('projects.createdLabel')}</span>
                <span>{parseSqliteUtc(selected.createdAt).toLocaleDateString()}{selected.createdByName ? ` · ${selected.createdByName}` : ''}</span>
              </div>
            </div>

            <div className="reg-sidebar-section">
              <div className="department-members-title">{t('projects.membersTitle')}</div>
              {canAddMembers && (
                <div className="department-add-member-row">
                  <SearchableSelect value={addMemberId} options={memberOptions} onChange={setAddMemberId} searchPlaceholder={t('employees.searchPlaceholder')} emptyLabel={t('employees.searchEmpty')} />
                  <Select value={addMemberRole} options={[{ value: 'member', label: t('projects.roleMember') }, { value: 'assistant', label: t('projects.roleAssistant') }]} onChange={(v) => setAddMemberRole(v as ProjectMemberRole)} />
                  <button className="modal-btn" onClick={handleAddMember} disabled={!addMemberId || addMemberBusy}><UserPlus size={14} /></button>
                </div>
              )}
              {detailLoading ? <LoadingScreen compact /> : members.length === 0 ? (
                <p className="settings-hint">{t('departments.noMembers')}</p>
              ) : (
                <ul className="department-members-list">
                  {members.map((m) => {
                    // Любой участник может переключиться в тред любого другого
                    // участника — смотреть его задачи, отвечать, назначать
                    // новые. По прямому запросу пользователя открыто всем
                    // участникам проекта (раньше — только владельцу/себе).
                    const canSwitch = isParticipant;
                    const isActive = activeThreadId === m.employeeId;
                    return (
                      <li
                        key={m.employeeId}
                        className={`department-member-row reg-thread-row${isActive ? ' active' : ''}`}
                        onClick={() => canSwitch && setActiveThreadId(m.employeeId)}
                      >
                        <span>
                          {m.employeeName}
                          {m.isOwner ? (
                            <span className="role-badge role-badge-head" style={{ marginLeft: 8 }}>{t('projects.ownerLabel')}</span>
                          ) : m.roleInProject === 'assistant' ? (
                            <span className="role-badge role-badge-deputy" style={{ marginLeft: 8 }}>{t('projects.roleAssistant')}</span>
                          ) : null}
                        </span>
                        {isManager && (
                          <span className="project-member-actions">
                            {!m.isOwner && (
                              <button type="button" className="department-member-remove" title={t('projects.transferBtn')} onClick={(ev) => { ev.stopPropagation(); setTransferTarget(m); }}><Repeat size={13} /></button>
                            )}
                            {!m.isOwner && (
                              <button type="button" className="department-member-remove" title={t('projects.removeMemberBtn')} onClick={(ev) => { ev.stopPropagation(); handleRemoveMember(m); }}><X size={13} /></button>
                            )}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Правая колонка — тред выбранного участника */}
          <div className="reg-entries-col">
            {(() => {
              const threadMessages = chat.filter((m) => m.targetEmployeeId === activeThreadId);
              const activeMember = members.find((m) => m.employeeId === activeThreadId);
              const isOwnThread = activeThreadId === currentEmployee.id;
              const openCount = threadMessages.filter((m) => m.status === 'open').length;
              const doneCount = threadMessages.filter((m) => m.status === 'done').length;
              // Раньше писать/отвечать/назначать задачи можно было только в
              // своём треде или если ты владелец/админ — теперь любой участник
              // может писать в тред любого другого участника.
              const canPost = isParticipant;

              return (
                <>
                  <div className="reg-thread-header">
                    <div className="department-members-title">
                      {isOwnThread ? t('projects.myThreadLabel') : t('projects.chatWithLabel', { name: activeMember?.employeeName ?? '' })}
                    </div>
                    <div className="reg-thread-stats">
                      <span>{t('projects.entryStatusOpen')}: <strong>{openCount}</strong></span>
                      <span>{t('projects.entryStatusDone')}: <strong>{doneCount}</strong></span>
                    </div>
                  </div>

                  <div className="reg-entries-list">
                    {detailLoading ? <LoadingScreen compact /> : threadMessages.length === 0 ? (
                      <p className="settings-hint">{t('projects.chatEmpty')}</p>
                    ) : (
                      threadMessages.map((m) => (
                        <ChatMessage
                          key={m.id}
                          m={m}
                          currentEmployee={currentEmployee}
                          projectOwnerId={selected.ownerId}
                          members={members}
                          onStatusChange={handleStatusChange}
                          onAddReply={handleAddReply}
                          onAssign={handleAssignMessage}
                          onMessageChanged={loadDetail}
                          t={t}
                        />
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {canPost ? (
                    <div className="reg-add-entry">
                      {attachName && (
                        <div className="chat-composer-attach-chip">
                          <Paperclip size={12} />
                          <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachName}</span>
                          <button onClick={() => { setAttachData(null); setAttachName(null); }}><X size={12} /></button>
                        </div>
                      )}
                      <label className="reg-deadline-field">
                        <CalendarClock size={14} />
                        <span>{t('projects.deadlineLabel')}</span>
                        <input type="date" value={chatDeadline} onChange={(e) => setChatDeadline(e.target.value)} />
                      </label>
                      <div className="chat-composer-bar">
                        <button type="button" className="chat-composer-icon-btn" onClick={() => fileInputRef.current?.click()} title={t('projects.attachBtn')} disabled={attachBusy}>
                          <Paperclip size={18} />
                        </button>
                        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileAttach} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />
                        <textarea
                          rows={1}
                          className="chat-composer-input"
                          value={chatText}
                          onChange={(e) => setChatText(e.target.value)}
                          placeholder={t('projects.chatPlaceholder')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendChat();
                            }
                          }}
                        />
                        <button type="button" className="chat-composer-send-btn" onClick={handleSendChat} disabled={!chatText.trim() || chatBusy}>
                          <Send size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="settings-hint">{t('projects.notAMemberHint')}</p>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <ProjectFormModal open={formOpen} onClose={() => setFormOpen(false)} project={editingProject} clients={clients} currentEmployeeId={currentEmployee.id} onSaved={load} />

        <Modal open={deleteConfirmOpen} title={t('projects.deleteConfirmTitle')} onClose={() => setDeleteConfirmOpen(false)}
          actions={<>
            <button className="modal-btn" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteBusy}>{t('common.cancel')}</button>
            <button className="modal-btn danger" onClick={handleDelete} disabled={deleteBusy}>{deleteBusy ? t('common.loading') : t('projects.deleteBtn')}</button>
          </>}
        >
          {t('projects.deleteConfirmBody', { name: selected?.name ?? '' })}
        </Modal>

        <Modal open={!!transferTarget} title={t('projects.transferConfirmTitle')} onClose={() => setTransferTarget(null)}
          actions={<>
            <button className="modal-btn" onClick={() => setTransferTarget(null)} disabled={transferBusy}>{t('common.cancel')}</button>
            <button className="modal-btn danger" onClick={handleTransfer} disabled={transferBusy}>{transferBusy ? t('common.loading') : t('projects.transferBtn')}</button>
          </>}
        >
          {t('projects.transferConfirmBody', { name: transferTarget?.employeeName ?? '' })}
        </Modal>

        <Modal
          open={!!firstTaskFor}
          title={t('projects.firstTaskModalTitle', { name: firstTaskFor?.employeeName ?? '' })}
          onClose={handleFirstTaskSkip}
          actions={<>
            <button className="modal-btn" onClick={handleFirstTaskSkip} disabled={firstTaskBusy}>{t('projects.firstTaskSkipBtn')}</button>
            <button className="modal-btn danger" onClick={handleFirstTaskSubmit} disabled={!firstTaskDesc.trim() || firstTaskBusy}>
              {firstTaskBusy ? t('common.loading') : t('projects.firstTaskCreateBtn')}
            </button>
          </>}
        >
          <div className="field">
            <label>{t('projects.chatTitle')}</label>
            <textarea rows={3} value={firstTaskDesc} onChange={(e) => setFirstTaskDesc(e.target.value)} placeholder={t('projects.firstTaskDescPlaceholder')} />
          </div>
          <div className="field">
            <label>{t('projects.deadlineLabel')}</label>
            <input type="date" value={firstTaskDeadline} onChange={(e) => setFirstTaskDeadline(e.target.value)} />
          </div>
        </Modal>
      </div>
    ) : (
      /* ---- Список проектов ---- */
      <div className="employees-page">
        <div className="employees-header">
          <h1>{t('sidebar.projects')}</h1>
          <button className="primary employees-add-btn" onClick={openCreate}>
            <Plus size={16} /> {t('projects.addBtn')}
          </button>
        </div>

        <div className="employees-search-row">
          <Search size={15} className="employees-search-icon" />
          <input className="employees-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('projects.searchPlaceholder')} />
        </div>

        {loading ? (
          <LoadingScreen compact />
        ) : filteredProjects.length === 0 ? (
          <p className="settings-hint">{t('projects.empty')}</p>
        ) : (
          <table className="employees-table">
            <thead>
              <tr>
                <th>{t('projects.colId')}</th>
                <th>{t('projects.colName')}</th>
                <th>{t('projects.colClient')}</th>
                <th>{t('projects.colOwner')}</th>
                <th>{t('projects.colStatus')}</th>
                <th>{t('projects.colMembers')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((p) => (
                <tr key={p.id} className="employees-row" onClick={() => setSelected(p)}>
                  <td>{p.projectNumber}</td>
                  <td>{p.name}</td>
                  <td>{p.clientName || '—'}</td>
                  <td>{p.ownerName}</td>
                  <td>
                    <span className={`absence-status project-status-${p.status}`}>{t(STATUS_LABEL_KEYS[p.status])}</span>
                  </td>
                  <td>{p.memberCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <ProjectFormModal open={formOpen} onClose={() => setFormOpen(false)} project={editingProject} clients={clients} currentEmployeeId={currentEmployee.id} onSaved={load} />
      </div>
    )}
    </>
  );
}
