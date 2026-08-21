import { useEffect, useState, useRef, useCallback, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { FullscreenContext } from './Dashboard';
import { Plus, Pencil, FileText, Trash2, X, Paperclip, CheckSquare, XSquare, RotateCcw, ChevronDown, ChevronRight, Search, ArrowLeft, CalendarClock, Send } from 'lucide-react';
import { api, type Employee, type PartnerRegulation, type PartnerRegulationEntry, type PartnerRegulationReply, type PartnerRegulationStatus, type RegulationEntryStatus, type Client } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc } from '../lib/date';
import { prepareAttachment } from '../lib/attachment';
import Modal from '../components/Modal';
import Select from '../components/Select';
import LoadingScreen from '../components/LoadingScreen';
import AttachmentPreview from '../components/AttachmentPreview';

const ENTRY_STATUS_KEYS: Record<RegulationEntryStatus, string> = {
  open: 'regulations.entryStatusOpen',
  done: 'regulations.entryStatusDone',
  cancelled: 'regulations.entryStatusCancelled',
};

// Запись регламента партнёра — упрощённая копия EntryRow из Regulations.tsx:
// без участников/переназначения/копирования ссылки (тут плоский тред ровно
// между "любым аккаунтом этого партнёра" и "любым админом", не multi-member
// группа). Статус меняет любой админ или любой аккаунт того же партнёра —
// нет отдельной роли "автор/владелец", т.к. per-member ролей тут нет.
function PartnerEntryRow({
  entry,
  currentEmployee,
  canManage,
  isClosed,
  onStatusChange,
  onAddReply,
  onEntryChanged,
  t,
}: {
  entry: PartnerRegulationEntry;
  currentEmployee: Employee;
  canManage: boolean;
  isClosed: boolean;
  onStatusChange: (entryId: string, status: RegulationEntryStatus) => void;
  onAddReply: (entryId: string, content: string) => Promise<void>;
  onEntryChanged: () => void;
  t: (k: string, vars?: Record<string, string | number>) => string;
}) {
  const { showToast } = useToast();
  const [replies, setReplies] = useState<PartnerRegulationReply[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const [entryEditing, setEntryEditing] = useState(false);
  const [entryEditDraft, setEntryEditDraft] = useState('');
  const [entryEditBusy, setEntryEditBusy] = useState(false);
  const [entryDeleteConfirm, setEntryDeleteConfirm] = useState(false);
  const [entryDeleteBusy, setEntryDeleteBusy] = useState(false);

  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyEditDraft, setReplyEditDraft] = useState('');
  const [replyEditBusy, setReplyEditBusy] = useState(false);
  const [deleteReplyConfirmId, setDeleteReplyConfirmId] = useState<string | null>(null);
  const [deleteReplyBusy, setDeleteReplyBusy] = useState(false);

  const startEditEntry = () => { setEntryEditing(true); setEntryEditDraft(entry.content); };
  const cancelEditEntry = () => { setEntryEditing(false); setEntryEditDraft(''); };
  const saveEditEntry = async () => {
    if (!entryEditDraft.trim()) return;
    setEntryEditBusy(true);
    try {
      await api.editPartnerRegulationEntry({ actorId: currentEmployee.id, entryId: entry.id, content: entryEditDraft.trim() });
      setEntryEditing(false);
      onEntryChanged();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('regulations.errorGeneric'));
    } finally {
      setEntryEditBusy(false);
    }
  };
  const handleDeleteEntry = async () => {
    setEntryDeleteBusy(true);
    try {
      await api.deletePartnerRegulationEntry({ actorId: currentEmployee.id, entryId: entry.id });
      setEntryDeleteConfirm(false);
      onEntryChanged();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('regulations.errorGeneric'));
    } finally {
      setEntryDeleteBusy(false);
    }
  };

  const startEditReply = (r: PartnerRegulationReply) => { setEditingReplyId(r.id); setReplyEditDraft(r.content); };
  const cancelEditReply = () => { setEditingReplyId(null); setReplyEditDraft(''); };
  const saveEditReply = async () => {
    if (!editingReplyId || !replyEditDraft.trim()) return;
    setReplyEditBusy(true);
    try {
      await api.editPartnerRegulationReply({ actorId: currentEmployee.id, replyId: editingReplyId, content: replyEditDraft.trim() });
      setEditingReplyId(null);
      await loadReplies();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('regulations.errorGeneric'));
    } finally {
      setReplyEditBusy(false);
    }
  };
  const handleDeleteReply = async () => {
    if (!deleteReplyConfirmId) return;
    setDeleteReplyBusy(true);
    try {
      await api.deletePartnerRegulationReply({ actorId: currentEmployee.id, replyId: deleteReplyConfirmId });
      setDeleteReplyConfirmId(null);
      await loadReplies();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('regulations.errorGeneric'));
    } finally {
      setDeleteReplyBusy(false);
    }
  };

  const loadReplies = async () => {
    const data = await api.listPartnerRegulationReplies({ actorId: currentEmployee.id, entryId: entry.id });
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
      await onAddReply(entry.id, replyText.trim());
      setReplyText('');
      await loadReplies();
    } finally {
      setReplyBusy(false);
    }
  };

  const isOwn = entry.authorId === currentEmployee.id;
  const initials = entry.authorName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div id={`partner-entry-${entry.id}`} className={`reg-chat-msg${isOwn ? ' own' : ''} reg-entry-${entry.status}`}>
      <div className="reg-chat-avatar">{initials || '?'}</div>
      <div className="reg-chat-bubble">
        <div className="reg-entry-header">
          <div className="reg-entry-meta">
            <strong>{entry.authorName}</strong>
            <span className="settings-hint">{parseSqliteUtc(entry.createdAt).toLocaleString()}</span>
            {!entry.isDeleted && entry.editedAt && <span className="settings-hint">{t('common.editedLabel')}</span>}
          </div>
          {!entry.isDeleted && (
            <div className="reg-entry-actions">
              {isOwn && (
                <>
                  <button className="reg-action-btn" onClick={startEditEntry} title={t('common.editBtn')}>
                    <Pencil size={13} />
                  </button>
                  <button className="reg-action-btn" onClick={() => setEntryDeleteConfirm(true)} title={t('common.deleteBtn')}>
                    <Trash2 size={13} />
                  </button>
                </>
              )}
              {canManage && !isClosed && (
                <>
                  {entry.status !== 'done' && (
                    <button className="reg-action-btn done" onClick={() => onStatusChange(entry.id, 'done')} title={t('regulations.markDoneBtn')}>
                      <CheckSquare size={14} />
                    </button>
                  )}
                  {entry.status === 'open' && (
                    <button className="reg-action-btn cancel" onClick={() => onStatusChange(entry.id, 'cancelled')} title={t('regulations.markCancelBtn')}>
                      <XSquare size={14} />
                    </button>
                  )}
                  {entry.status !== 'open' && (
                    <button className="reg-action-btn reopen" onClick={() => onStatusChange(entry.id, 'open')} title={t('regulations.reopenEntryBtn')}>
                      <RotateCcw size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {entry.isDeleted ? (
          <p className="settings-hint">{t('common.messageDeleted')}</p>
        ) : (
          <>
            {entryEditing ? (
              <div className="reg-inline-edit">
                <textarea value={entryEditDraft} onChange={(e) => setEntryEditDraft(e.target.value)} rows={3} />
                <div className="reg-inline-edit-actions">
                  <button className="modal-btn" onClick={cancelEditEntry}>{t('common.editCancelBtn')}</button>
                  <button className="modal-btn danger" onClick={saveEditEntry} disabled={!entryEditDraft.trim() || entryEditBusy}>
                    {t('common.editSaveBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="reg-entry-content" style={{ whiteSpace: 'pre-wrap' }}>{entry.content}</div>
            )}

            <div className="reg-chat-chips">
              <span className={`absence-status reg-entry-badge-${entry.status}`}>{t(ENTRY_STATUS_KEYS[entry.status])}</span>
              {entry.deadline && <span className="reg-chip-deadline">📅 {entry.deadline}</span>}
            </div>

            {entry.attachmentData && (
              <AttachmentPreview dataUrl={entry.attachmentData} name={entry.attachmentName} onExpand={() => setLightbox(true)} />
            )}

            <button className="link-btn reg-replies-toggle" onClick={toggle}>
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {t('regulations.repliesTitle')} {entry.replyCount > 0 ? `(${entry.replyCount})` : ''}
            </button>

            {expanded && (
              <div className="reg-replies">
                {replies.map((r) => {
                  const isOwnReply = r.authorId === currentEmployee.id;
                  const isEditingReply = editingReplyId === r.id;
                  return (
                    <div key={r.id} className="reg-reply">
                      <div className="reg-reply-meta">
                        <strong>{r.authorName}</strong>
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
                        <div>{r.content}</div>
                      )}
                    </div>
                  );
                })}
                {!isClosed && (
                  <div className="reg-reply-form">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={t('regulations.addReplyPlaceholder')}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
                    />
                    <button className="modal-btn" onClick={handleReply} disabled={!replyText.trim() || replyBusy}>↵</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {lightbox && entry.attachmentData && (
        <div className="reg-lightbox" onClick={() => setLightbox(false)}>
          <img src={entry.attachmentData} alt={entry.attachmentName ?? ''} />
          <button className="reg-lightbox-close" onClick={() => setLightbox(false)}><X size={20} /></button>
        </div>
      )}

      <Modal
        open={entryDeleteConfirm}
        title={t('common.deleteConfirmTitle')}
        onClose={() => setEntryDeleteConfirm(false)}
        actions={<>
          <button className="modal-btn" onClick={() => setEntryDeleteConfirm(false)} disabled={entryDeleteBusy}>{t('common.cancel')}</button>
          <button className="modal-btn danger" onClick={handleDeleteEntry} disabled={entryDeleteBusy}>{entryDeleteBusy ? t('common.loading') : t('common.deleteBtn')}</button>
        </>}
      >
        {t('common.deleteConfirmBody')}
      </Modal>

      <Modal
        open={!!deleteReplyConfirmId}
        title={t('common.deleteConfirmTitle')}
        onClose={() => setDeleteReplyConfirmId(null)}
        actions={<>
          <button className="modal-btn" onClick={() => setDeleteReplyConfirmId(null)} disabled={deleteReplyBusy}>{t('common.cancel')}</button>
          <button className="modal-btn danger" onClick={handleDeleteReply} disabled={deleteReplyBusy}>{deleteReplyBusy ? t('common.loading') : t('common.deleteBtn')}</button>
        </>}
      >
        {t('common.deleteConfirmBody')}
      </Modal>
    </div>
  );
}

export default function PartnerRegulations({
  currentEmployee,
  partnerId,
  basePath = '../regulations',
}: {
  currentEmployee: Employee;
  partnerId: string;
  basePath?: string;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const location = useLocation();
  const { enter: enterFullscreen, exit: exitFullscreen } = useContext(FullscreenContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const entriesRef = useRef<HTMLDivElement>(null);

  const [regulations, setRegulations] = useState<PartnerRegulation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assistantOptions, setAssistantOptions] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<PartnerRegulation | null>(null);
  const [entries, setEntries] = useState<PartnerRegulationEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<PartnerRegulation | undefined>();
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formAssistantId, setFormAssistantId] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [newEntry, setNewEntry] = useState('');
  const [newEntryDeadline, setNewEntryDeadline] = useState('');
  const [attachData, setAttachData] = useState<string | null>(null);
  const [attachName, setAttachName] = useState<string | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const [entryBusy, setEntryBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.listPartnerRegulations({ actorId: currentEmployee.id, partnerId }),
      api.listClients({ actorId: currentEmployee.id, partnerId }),
    ])
      .then(([regs, cls]) => {
        setRegulations(regs);
        setClients(cls);
        setLoading(false);
        setSelected((prev) => (prev ? regs.find((r) => r.id === prev.id) ?? null : null));
      })
      .catch(() => {
        setLoading(false);
        showToast('error', t('common.loadError'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  useEffect(() => { load(); }, [load]);

  // Помощник по регламенту (v0.4.0) — партнёр выбирает конкретного админа,
  // админ (создающий из AdminPartnerWorkspace) — конкретного сотрудника
  // именно этого партнёра.
  useEffect(() => {
    if (currentEmployee.isPartner) {
      api.listAdminEmployees().then(setAssistantOptions).catch(() => setAssistantOptions([]));
    } else {
      api.listPartnerOrgEmployees({ actorId: currentEmployee.id, partnerId }).then(setAssistantOptions).catch(() => setAssistantOptions([]));
    }
  }, [currentEmployee.isPartner, currentEmployee.id, partnerId]);

  useEffect(() => {
    if (selected) enterFullscreen(); else exitFullscreen();
    return () => { exitFullscreen(); };
  }, [!!selected]); // eslint-disable-line

  useEffect(() => {
    const openId = (location.state as any)?.openPartnerRegId;
    if (!openId || regulations.length === 0) return;
    const reg = regulations.find((r) => r.id === openId);
    if (reg) setSelected(reg);
  }, [regulations, location.state]);

  const loadDetail = useCallback(() => {
    if (!selected) return;
    setDetailLoading(true);
    api.listPartnerRegulationEntries({ actorId: currentEmployee.id, partnerRegulationId: selected.id })
      .then((e) => {
        setEntries(e);
        setDetailLoading(false);
      })
      .catch(() => {
        setDetailLoading(false);
        showToast('error', t('common.loadError'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const filtered = search.trim()
    ? regulations.filter((r) => {
        const q = search.trim().toLowerCase();
        return r.regNumber.toLowerCase().includes(q) || r.title.toLowerCase().includes(q);
      })
    : regulations;

  const isClosed = selected?.status === 'closed';
  // Нет per-member ролей — "управляет" любой админ или любой аккаунт этого
  // же партнёра (создать/писать в свою собственную регулировку может и он).
  const canManage = currentEmployee.isAdmin || currentEmployee.partnerId === partnerId;

  const openCreate = () => {
    setEditingReg(undefined);
    setFormTitle(''); setFormDesc(''); setFormClientId(''); setFormDeadline(''); setFormAssistantId(''); setFormError('');
    setFormOpen(true);
  };
  const openEdit = () => {
    if (!selected) return;
    setEditingReg(selected);
    setFormTitle(selected.title); setFormDesc(selected.description ?? '');
    setFormClientId(selected.clientId ?? ''); setFormDeadline(selected.deadline ?? '');
    setFormAssistantId(selected.assistantId ?? '');
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    setFormError('');
    if (!formTitle.trim()) { setFormError(t('partnerRegulations.errorRequired')); return; }
    setFormBusy(true);
    try {
      if (editingReg) {
        await api.updatePartnerRegulation({ actorId: currentEmployee.id, id: editingReg.id, title: formTitle.trim(), description: formDesc.trim() || null, clientId: formClientId || null, deadline: formDeadline || null, status: editingReg.status, assistantId: formAssistantId || null });
        showToast('success', t('partnerRegulations.updated'));
      } else {
        await api.createPartnerRegulation({ actorId: currentEmployee.id, partnerId, title: formTitle.trim(), description: formDesc.trim() || null, clientId: formClientId || null, deadline: formDeadline || null, assistantId: formAssistantId || null });
        showToast('success', t('partnerRegulations.added'));
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      setFormError(typeof err === 'string' ? err : t('partnerRegulations.errorGeneric'));
    } finally {
      setFormBusy(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selected || !canManage) return;
    const newStatus: PartnerRegulationStatus = selected.status === 'active' ? 'closed' : 'active';
    try {
      await api.updatePartnerRegulation({ actorId: currentEmployee.id, id: selected.id, title: selected.title, description: selected.description, clientId: selected.clientId, deadline: selected.deadline, status: newStatus, assistantId: selected.assistantId });
      showToast('success', newStatus === 'closed' ? t('partnerRegulations.closedSuccess') : t('partnerRegulations.reopenedSuccess'));
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('partnerRegulations.errorGeneric'));
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleteBusy(true);
    try {
      await api.deletePartnerRegulation({ adminId: currentEmployee.id, id: selected.id });
      showToast('success', t('partnerRegulations.deleted'));
      setDeleteConfirmOpen(false);
      setSelected(null);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('partnerRegulations.errorGeneric'));
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
      showToast('error', t('regulations.attachmentTooLarge'));
    } finally {
      setAttachBusy(false);
    }
  };

  const handleAddEntry = async () => {
    if (!selected || !newEntry.trim()) return;
    setEntryBusy(true);
    try {
      await api.addPartnerRegulationEntry({ actorId: currentEmployee.id, partnerRegulationId: selected.id, content: newEntry.trim(), attachmentData: attachData, attachmentName: attachName, deadline: newEntryDeadline || null });
      setNewEntry(''); setNewEntryDeadline(''); setAttachData(null); setAttachName(null);
      loadDetail();
      setTimeout(() => entriesRef.current?.scrollTo({ top: entriesRef.current.scrollHeight, behavior: 'smooth' }), 200);
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('partnerRegulations.errorGeneric'));
    } finally {
      setEntryBusy(false);
    }
  };

  const handleStatusChange = async (entryId: string, status: RegulationEntryStatus) => {
    try {
      await api.updatePartnerRegulationEntryStatus({ actorId: currentEmployee.id, entryId, status });
      loadDetail();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('partnerRegulations.errorGeneric'));
    }
  };

  const handleAddReply = async (entryId: string, content: string) => {
    await api.addPartnerRegulationReply({ actorId: currentEmployee.id, entryId, content });
    loadDetail();
  };

  const clientOptions = [{ value: '', label: t('employees.notSelected') }, ...clients.map((c) => ({ value: c.id, label: c.name }))];
  const assistantSelectOptions = [{ value: '', label: t('employees.notSelected') }, ...assistantOptions.map((e) => ({ value: e.id, label: e.fullName || e.login }))];

  if (selected) {
    return (
      <div className="reg-fullscreen">
        <div className="reg-fullscreen-header">
          <button className="reg-back-btn" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} /> {t('partnerRegulations.backToList')}
          </button>
          <div className="reg-fullscreen-title">
            <h2>{selected.title}</h2>
            <span className="settings-hint">{selected.regNumber}</span>
            <span className={`absence-status reg-status-${selected.status}`}>
              {t(selected.status === 'active' ? 'partnerRegulations.statusActive' : 'partnerRegulations.statusClosed')}
            </span>
          </div>
          <div className="reg-fullscreen-actions">
            {canManage && <button className="modal-btn" onClick={openEdit}><Pencil size={14} /></button>}
            {canManage && (
              <button className="modal-btn" onClick={handleToggleStatus}>
                {isClosed ? t('partnerRegulations.reopenBtn') : t('partnerRegulations.closeBtn')}
              </button>
            )}
            {currentEmployee.isAdmin && (
              <button className="modal-btn danger" onClick={() => setDeleteConfirmOpen(true)}><Trash2 size={14} /></button>
            )}
          </div>
        </div>

        {isClosed && <div className="reg-closed-banner">{t('regulations.closedHint')}</div>}

        <div className="reg-fullscreen-body">
          <aside className="reg-sidebar">
            {selected.description && (
              <div className="reg-sidebar-section">
                <div className="department-members-title">{t('regulations.descriptionLabel')}</div>
                <p className="settings-hint">{selected.description}</p>
              </div>
            )}
            {(selected.clientName || selected.deadline) && (
              <div className="reg-sidebar-section">
                {selected.clientName && (
                  <div className="employee-card-row">
                    <span className="settings-hint">{t('regulations.clientLabel')}</span>
                    <span>{selected.clientName}</span>
                  </div>
                )}
                {selected.deadline && (
                  <div className="employee-card-row">
                    <span className="settings-hint">{t('regulations.deadlineLabel')}</span>
                    <span>{selected.deadline}</span>
                  </div>
                )}
                {selected.assistantName && (
                  <div className="employee-card-row">
                    <span className="settings-hint">{t('partnerRegulations.assistantLabel')}</span>
                    <span>{selected.assistantName}</span>
                  </div>
                )}
              </div>
            )}
          </aside>

          <div className="reg-entries-col">
            <div className="reg-thread-header">
              <span>{t('partnerRegulations.entriesTitle')}</span>
            </div>
            <div className="reg-entries-list" ref={entriesRef}>
              {detailLoading ? (
                <LoadingScreen compact />
              ) : entries.length === 0 ? (
                <p className="settings-hint">{t('partnerRegulations.empty')}</p>
              ) : (
                entries.map((entry) => (
                  <PartnerEntryRow
                    key={entry.id}
                    entry={entry}
                    currentEmployee={currentEmployee}
                    canManage={canManage}
                    isClosed={isClosed}
                    onStatusChange={handleStatusChange}
                    onAddReply={handleAddReply}
                    onEntryChanged={loadDetail}
                    t={t}
                  />
                ))
              )}
            </div>

            {!isClosed ? (
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
                  <span>{t('regulations.addEntryDeadlineLabel')}</span>
                  <input type="date" value={newEntryDeadline} onChange={(e) => setNewEntryDeadline(e.target.value)} />
                </label>
                <div className="chat-composer-bar">
                  <button type="button" className="chat-composer-icon-btn" onClick={() => fileInputRef.current?.click()} title={t('regulations.attachBtn')} disabled={attachBusy}>
                    <Paperclip size={18} />
                  </button>
                  <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileAttach} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx" />
                  <textarea
                    rows={1}
                    className="chat-composer-input"
                    value={newEntry}
                    onChange={(e) => setNewEntry(e.target.value)}
                    placeholder={t('regulations.addEntryPlaceholder')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddEntry();
                      }
                    }}
                  />
                  <button type="button" className="chat-composer-send-btn" onClick={handleAddEntry} disabled={!newEntry.trim() || entryBusy}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <Modal open={formOpen} title={editingReg ? t('partnerRegulations.editTitle') : t('partnerRegulations.addTitle')} onClose={() => setFormOpen(false)}
          actions={<>
            <button className="modal-btn" onClick={() => setFormOpen(false)}>{t('common.cancel')}</button>
            <button className="modal-btn danger" onClick={handleFormSubmit} disabled={formBusy}>{formBusy ? t('employees.savingBusy') : editingReg ? t('employees.saveConfirm') : t('employees.addConfirm')}</button>
          </>}
        >
          {formError && <div className="error-text">{formError}</div>}
          <div className="field"><label>{t('partnerRegulations.nameLabel')}</label><input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} /></div>
          <div className="field"><label>{t('partnerRegulations.descriptionLabel')}</label><textarea rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} /></div>
          <div className="field"><label>{t('partnerRegulations.clientLabel')}</label><Select value={formClientId} options={clientOptions} onChange={setFormClientId} /></div>
          <div className="field"><label>{t('partnerRegulations.deadlineLabel')}</label><input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} /></div>
          <div className="field"><label>{t('partnerRegulations.assistantLabel')}</label><Select value={formAssistantId} options={assistantSelectOptions} onChange={setFormAssistantId} /></div>
        </Modal>

        <Modal open={deleteConfirmOpen} title={t('partnerRegulations.deleteConfirmTitle')} onClose={() => setDeleteConfirmOpen(false)}
          actions={<>
            <button className="modal-btn" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteBusy}>{t('common.cancel')}</button>
            <button className="modal-btn danger" onClick={handleDelete} disabled={deleteBusy}>{deleteBusy ? t('common.loading') : t('partnerRegulations.deleteBtn')}</button>
          </>}
        >
          {t('partnerRegulations.deleteConfirmBody', { name: selected?.title ?? '' })}
        </Modal>
      </div>
    );
  }

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('partnerPanel.navRegulations')}</h1>
        <button className="primary employees-add-btn" onClick={openCreate}>
          <Plus size={16} /> {t('partnerRegulations.addBtn')}
        </button>
      </div>

      <div className="employees-search-row">
        <Search size={15} className="employees-search-icon" />
        <input className="employees-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('partnerRegulations.searchPlaceholder')} />
      </div>

      {loading ? <LoadingScreen compact /> : filtered.length === 0 ? (
        <p className="settings-hint">{t('partnerRegulations.empty')}</p>
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('partnerRegulations.colId')}</th>
              <th>{t('partnerRegulations.colName')}</th>
              <th>{t('partnerRegulations.colClient')}</th>
              <th>{t('partnerRegulations.colAssistant')}</th>
              <th>{t('partnerRegulations.colStatus')}</th>
              <th>{t('partnerRegulations.colEntries')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="employees-row" onClick={() => setSelected(r)}>
                <td>{r.regNumber}</td>
                <td><FileText size={13} style={{ marginRight: 6, opacity: 0.5 }} />{r.title}</td>
                <td>{r.clientName || '—'}</td>
                <td>{r.assistantName || '—'}</td>
                <td><span className={`absence-status reg-status-${r.status}`}>{t(r.status === 'active' ? 'partnerRegulations.statusActive' : 'partnerRegulations.statusClosed')}</span></td>
                <td>{r.entryCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={formOpen} title={t('partnerRegulations.addTitle')} onClose={() => setFormOpen(false)}
        actions={<>
          <button className="modal-btn" onClick={() => setFormOpen(false)}>{t('common.cancel')}</button>
          <button className="modal-btn danger" onClick={handleFormSubmit} disabled={formBusy}>{formBusy ? t('employees.savingBusy') : t('employees.addConfirm')}</button>
        </>}
      >
        {formError && <div className="error-text">{formError}</div>}
        <div className="field"><label>{t('partnerRegulations.nameLabel')}</label><input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} /></div>
        <div className="field"><label>{t('partnerRegulations.descriptionLabel')}</label><textarea rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} /></div>
        <div className="field"><label>{t('partnerRegulations.clientLabel')}</label><Select value={formClientId} options={clientOptions} onChange={setFormClientId} /></div>
        <div className="field"><label>{t('partnerRegulations.deadlineLabel')}</label><input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} /></div>
        <div className="field"><label>{t('partnerRegulations.assistantLabel')}</label><Select value={formAssistantId} options={assistantSelectOptions} onChange={setFormAssistantId} /></div>
      </Modal>
    </div>
  );
}
