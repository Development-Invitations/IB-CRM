import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, FileText, Trash2, UserPlus, X, Paperclip, CheckSquare, XSquare, RotateCcw, ChevronDown, ChevronRight, Search, Copy, Check } from 'lucide-react';
import { api, type Employee, type Regulation, type RegulationMember, type RegulationEntry, type RegulationReply, type RegulationStatus, type RegulationEntryStatus, type Client } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc } from '../lib/date';
import Modal from '../components/Modal';
import Select from '../components/Select';
import SearchableSelect from '../components/SearchableSelect';
import LoadingScreen from '../components/LoadingScreen';

const ENTRY_STATUS_KEYS: Record<RegulationEntryStatus, string> = {
  open: 'regulations.entryStatusOpen',
  done: 'regulations.entryStatusDone',
  cancelled: 'regulations.entryStatusCancelled',
};

// Компонент одной записи с раскрывающимися ответами
function EntryRow({
  entry,
  currentEmployee,
  regulationOwnerId,
  regulationStatus,
  onStatusChange,
  onAddReply,
  t,
}: {
  entry: RegulationEntry;
  currentEmployee: Employee;
  regulationOwnerId: string;
  regulationStatus: string;
  onStatusChange: (entryId: string, status: RegulationEntryStatus) => void;
  onAddReply: (entryId: string, content: string) => Promise<void>;
  t: (k: string) => string;
}) {
  const [replies, setReplies] = useState<RegulationReply[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);

  const loadReplies = async () => {
    const data = await api.listRegulationReplies(entry.id);
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

  const canManage = currentEmployee.isAdmin || regulationOwnerId === currentEmployee.id || entry.authorId === currentEmployee.id;
  const isClosed = regulationStatus === 'closed';

  return (
    <div className={`reg-entry reg-entry-${entry.status}`}>
      <div className="reg-entry-header">
        <div className="reg-entry-meta">
          <strong>{entry.authorName}</strong>
          <span className="settings-hint">{parseSqliteUtc(entry.createdAt).toLocaleString()}</span>
          <span className={`absence-status reg-entry-badge-${entry.status}`}>{t(ENTRY_STATUS_KEYS[entry.status])}</span>
          {entry.deadline && (
            <span className="settings-hint">📅 {entry.deadline}</span>
          )}
        </div>
        {canManage && !isClosed && (
          <div className="reg-entry-actions">
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
          </div>
        )}
      </div>

      <div className="reg-entry-content">{entry.content}</div>

      {entry.attachmentName && (
        <div className="reg-entry-attachment">
          <Paperclip size={13} />
          <span>{entry.attachmentName}</span>
        </div>
      )}

      <button className="link-btn reg-replies-toggle" onClick={toggle}>
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {t('regulations.repliesTitle')} {entry.replyCount > 0 ? `(${entry.replyCount})` : ''}
      </button>

      {expanded && (
        <div className="reg-replies">
          {replies.map((r) => (
            <div key={r.id} className="reg-reply">
              <div className="reg-reply-meta">
                <strong>{r.authorName}</strong>
                <span className="settings-hint">{parseSqliteUtc(r.createdAt).toLocaleString()}</span>
              </div>
              <div>{r.content}</div>
            </div>
          ))}
          {!isClosed && (
            <div className="reg-reply-form">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('regulations.addReplyPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
              />
              <button className="modal-btn" onClick={handleReply} disabled={!replyText.trim() || replyBusy}>
                ↵
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Regulations({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<Regulation | null>(null);
  const [members, setMembers] = useState<RegulationMember[]>([]);
  const [entries, setEntries] = useState<RegulationEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<Regulation | undefined>();
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [addMemberId, setAddMemberId] = useState('');
  const [addMemberBusy, setAddMemberBusy] = useState(false);

  const [newEntry, setNewEntry] = useState('');
  const [newEntryDeadline, setNewEntryDeadline] = useState('');
  const [attachData, setAttachData] = useState<string | null>(null);
  const [attachName, setAttachName] = useState<string | null>(null);
  const [entryBusy, setEntryBusy] = useState(false);

  const [copiedSlug, setCopiedSlug] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.listRegulations(), api.listClients(), api.listEmployees()]).then(([regs, cls, emps]) => {
      setRegulations(regs);
      setClients(cls);
      setEmployees(emps);
      setLoading(false);
      setSelected((prev) => (prev ? regs.find((r) => r.id === prev.id) ?? null : null));
    });
  };

  useEffect(() => { load(); }, []);

  const loadDetail = () => {
    if (!selected) return;
    setDetailLoading(true);
    Promise.all([api.listRegulationMembers(selected.id), api.listRegulationEntries(selected.id)]).then(([m, e]) => {
      setMembers(m);
      setEntries(e);
      setDetailLoading(false);
    });
  };

  useEffect(() => { loadDetail(); }, [selected?.id]); // eslint-disable-line

  const filtered = search.trim()
    ? regulations.filter((r) => {
        const q = search.toLowerCase();
        return r.regNumber.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || r.title.toLowerCase().includes(q);
      })
    : regulations;

  const isManager = !!selected && (currentEmployee.isAdmin || selected.ownerId === currentEmployee.id);
  const isParticipant = !!selected && (currentEmployee.isAdmin || selected.ownerId === currentEmployee.id || members.some((m) => m.employeeId === currentEmployee.id));
  const isClosed = selected?.status === 'closed';

  const openCreate = () => {
    setEditingReg(undefined);
    setFormTitle(''); setFormDesc(''); setFormClientId(''); setFormDeadline(''); setFormError('');
    setFormOpen(true);
  };
  const openEdit = () => {
    if (!selected) return;
    setEditingReg(selected);
    setFormTitle(selected.title); setFormDesc(selected.description ?? '');
    setFormClientId(selected.clientId ?? ''); setFormDeadline(selected.deadline ?? '');
    setFormError('');
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    setFormError('');
    if (!formTitle.trim()) { setFormError(t('regulations.errorRequired')); return; }
    setFormBusy(true);
    try {
      if (editingReg) {
        await api.updateRegulation({ actorId: currentEmployee.id, id: editingReg.id, title: formTitle.trim(), description: formDesc.trim() || null, clientId: formClientId || null, deadline: formDeadline || null, status: editingReg.status });
        showToast('success', t('regulations.updated'));
      } else {
        await api.createRegulation({ actorId: currentEmployee.id, title: formTitle.trim(), description: formDesc.trim() || null, clientId: formClientId || null, deadline: formDeadline || null });
        showToast('success', t('regulations.added'));
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      setFormError(typeof err === 'string' ? err : t('regulations.errorGeneric'));
    } finally {
      setFormBusy(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selected || !isManager) return;
    const newStatus: RegulationStatus = selected.status === 'active' ? 'closed' : 'active';
    try {
      await api.updateRegulation({ actorId: currentEmployee.id, id: selected.id, title: selected.title, description: selected.description, clientId: selected.clientId, deadline: selected.deadline, status: newStatus });
      showToast('success', newStatus === 'closed' ? t('regulations.closedSuccess') : t('regulations.reopenedSuccess'));
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('regulations.errorGeneric'));
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleteBusy(true);
    try {
      await api.deleteRegulation({ adminId: currentEmployee.id, id: selected.id });
      showToast('success', t('regulations.deleted'));
      setDeleteConfirmOpen(false);
      setSelected(null);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('regulations.errorGeneric'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const memberOptions = selected
    ? [{ value: '', label: t('employees.notSelected') }, ...employees.filter((e) => !members.some((m) => m.employeeId === e.id)).map((e) => ({ value: e.id, label: e.fullName || e.login }))]
    : [];

  const handleAddMember = async () => {
    if (!selected || !addMemberId) return;
    setAddMemberBusy(true);
    try {
      await api.addRegulationMember({ actorId: currentEmployee.id, regulationId: selected.id, employeeId: addMemberId, role: 'member' });
      showToast('success', t('regulations.memberAdded'));
      setAddMemberId('');
      loadDetail(); load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('regulations.errorGeneric'));
    } finally {
      setAddMemberBusy(false);
    }
  };

  const handleRemoveMember = async (m: RegulationMember) => {
    if (!selected) return;
    try {
      await api.removeRegulationMember({ actorId: currentEmployee.id, regulationId: selected.id, employeeId: m.employeeId });
      showToast('success', t('regulations.memberRemoved'));
      loadDetail(); load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('regulations.errorGeneric'));
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachData(reader.result as string);
      setAttachName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleAddEntry = async () => {
    if (!selected || !newEntry.trim()) return;
    setEntryBusy(true);
    try {
      await api.addRegulationEntry({ actorId: currentEmployee.id, regulationId: selected.id, content: newEntry.trim(), attachmentData: attachData, attachmentName: attachName, deadline: newEntryDeadline || null });
      setNewEntry(''); setNewEntryDeadline(''); setAttachData(null); setAttachName(null);
      loadDetail();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('regulations.errorGeneric'));
    } finally {
      setEntryBusy(false);
    }
  };

  const handleStatusChange = async (entryId: string, status: RegulationEntryStatus) => {
    if (!selected) return;
    try {
      await api.updateEntryStatus({ actorId: currentEmployee.id, entryId, status });
      loadDetail();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('regulations.errorGeneric'));
    }
  };

  const handleAddReply = async (entryId: string, content: string) => {
    if (!selected) return;
    await api.addRegulationReply({ actorId: currentEmployee.id, entryId, content });
    loadDetail();
  };

  const handleCopySlug = () => {
    if (!selected) return;
    navigator.clipboard.writeText(selected.slug).then(() => {
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    });
  };

  const clientOptions = [{ value: '', label: t('employees.notSelected') }, ...clients.map((c) => ({ value: c.id, label: c.name }))];

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('sidebar.regulations')}</h1>
        <button className="primary employees-add-btn" onClick={openCreate}>
          <Plus size={16} /> {t('regulations.addBtn')}
        </button>
      </div>

      <div className="employees-search-row">
        <Search size={15} className="employees-search-icon" />
        <input className="employees-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('regulations.searchPlaceholder')} />
      </div>

      {loading ? <LoadingScreen compact /> : filtered.length === 0 ? (
        <p className="settings-hint">{t('regulations.empty')}</p>
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('regulations.colId')}</th>
              <th>{t('regulations.colName')}</th>
              <th>{t('regulations.colClient')}</th>
              <th>{t('regulations.colOwner')}</th>
              <th>{t('regulations.colStatus')}</th>
              <th>{t('regulations.colEntries')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="employees-row" onClick={() => setSelected(r)}>
                <td>{r.regNumber}</td>
                <td>{r.title}</td>
                <td>{r.clientName || '—'}</td>
                <td>{r.ownerName}</td>
                <td>
                  <span className={`absence-status reg-status-${r.status}`}>{t(r.status === 'active' ? 'regulations.statusActive' : 'regulations.statusClosed')}</span>
                </td>
                <td>{r.entryCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="regulation-detail-overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="regulation-detail">
            <div className="regulation-detail-header">
              <div>
                <h2>{selected.title}</h2>
                <div className="settings-hint">{selected.regNumber}</div>
              </div>
              <div className="regulation-detail-header-actions">
                {isManager && <button className="modal-btn" onClick={openEdit}><Pencil size={14} /></button>}
                {isManager && (
                  <button className="modal-btn" onClick={handleToggleStatus}>
                    {isClosed ? t('regulations.reopenBtn') : t('regulations.closeBtn')}
                  </button>
                )}
                {currentEmployee.isAdmin && (
                  <button className="modal-btn danger" onClick={() => setDeleteConfirmOpen(true)}><Trash2 size={14} /></button>
                )}
                <button className="modal-btn" onClick={() => setSelected(null)}><X size={14} /></button>
              </div>
            </div>

            {isClosed && <div className="reg-closed-banner">{t('regulations.closedHint')}</div>}

            <div className="regulation-detail-meta">
              {selected.description && <p>{selected.description}</p>}
              <div className="employee-card-row">
                <span className="settings-hint">{t('regulations.slugLabel')}</span>
                <span className="reg-slug-row">
                  <code>{selected.slug}</code>
                  <button className="reg-copy-btn" onClick={handleCopySlug} title={t('regulations.slugHint')}>
                    {copiedSlug ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </span>
              </div>
              {selected.deadline && (
                <div className="employee-card-row">
                  <span className="settings-hint">{t('regulations.deadlineLabel')}</span>
                  <span>{selected.deadline}</span>
                </div>
              )}
              {selected.clientName && (
                <div className="employee-card-row">
                  <span className="settings-hint">{t('regulations.clientLabel')}</span>
                  <span>{selected.clientName}</span>
                </div>
              )}
            </div>

            <div className="regulation-detail-cols">
              <div className="regulation-members-panel">
                <div className="department-members-title">{t('regulations.membersTitle')}</div>
                {isManager && (
                  <div className="regulation-add-member">
                    <SearchableSelect value={addMemberId} options={memberOptions} onChange={setAddMemberId} searchPlaceholder={t('employees.searchPlaceholder')} emptyLabel={t('employees.searchEmpty')} />
                    <button className="modal-btn" onClick={handleAddMember} disabled={!addMemberId || addMemberBusy}><UserPlus size={14} /></button>
                  </div>
                )}
                {detailLoading ? <LoadingScreen compact /> : (
                  <ul className="department-members-list">
                    {members.map((m) => (
                      <li key={m.employeeId} className="department-member-row">
                        <span>
                          {m.employeeName}
                          {m.roleInReg === 'owner' && <span className="role-badge role-badge-head" style={{ marginLeft: 8 }}>{t('regulations.roleOwner')}</span>}
                        </span>
                        {isManager && m.roleInReg !== 'owner' && (
                          <button type="button" className="department-member-remove" onClick={() => handleRemoveMember(m)}><X size={13} /></button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="regulation-entries-panel">
                <div className="department-members-title">{t('regulations.entriesTitle')}</div>

                {!isClosed && isParticipant && (
                  <div className="reg-add-entry">
                    <textarea rows={3} value={newEntry} onChange={(e) => setNewEntry(e.target.value)} placeholder={t('regulations.addEntryPlaceholder')} />
                    <div className="reg-add-entry-row">
                      <input type="date" value={newEntryDeadline} onChange={(e) => setNewEntryDeadline(e.target.value)} title={t('regulations.addEntryDeadlineLabel')} />
                      <button className="modal-btn" onClick={() => fileInputRef.current?.click()} title={t('regulations.attachBtn')}>
                        <Paperclip size={14} />
                        {attachName && <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachName}</span>}
                      </button>
                      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileAttach} />
                      {attachName && <button className="regulation-remove-attach" onClick={() => { setAttachData(null); setAttachName(null); }}><X size={12} /></button>}
                      <button className="modal-btn danger" onClick={handleAddEntry} disabled={!newEntry.trim() || entryBusy}><Plus size={14} /></button>
                    </div>
                  </div>
                )}

                {!isParticipant && !isClosed && <p className="settings-hint">{t('regulations.notAMemberHint')}</p>}

                {detailLoading ? <LoadingScreen compact /> : entries.length === 0 ? null : (
                  <div className="reg-entries-list">
                    {entries.map((e) => (
                      <EntryRow
                        key={e.id}
                        entry={e}
                        currentEmployee={currentEmployee}
                        regulationOwnerId={selected.ownerId}
                        regulationStatus={selected.status}
                        onStatusChange={handleStatusChange}
                        onAddReply={handleAddReply}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal open={formOpen} title={editingReg ? t('regulations.editTitle') : t('regulations.addTitle')} onClose={() => setFormOpen(false)}
        actions={<>
          <button className="modal-btn" onClick={() => setFormOpen(false)}>{t('common.cancel')}</button>
          <button className="modal-btn danger" onClick={handleFormSubmit} disabled={formBusy}>{formBusy ? t('employees.savingBusy') : editingReg ? t('employees.saveConfirm') : t('employees.addConfirm')}</button>
        </>}
      >
        {formError && <div className="error-text">{formError}</div>}
        <div className="field"><label>{t('regulations.nameLabel')}</label><input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} /></div>
        <div className="field"><label>{t('regulations.descriptionLabel')}</label><textarea rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} /></div>
        <div className="field"><label>{t('regulations.clientLabel')}</label><Select value={formClientId} options={clientOptions} onChange={setFormClientId} /></div>
        <div className="field"><label>{t('regulations.deadlineLabel')}</label><input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} /></div>
      </Modal>

      <Modal open={deleteConfirmOpen} title={t('regulations.deleteConfirmTitle')} onClose={() => setDeleteConfirmOpen(false)}
        actions={<>
          <button className="modal-btn" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteBusy}>{t('common.cancel')}</button>
          <button className="modal-btn danger" onClick={handleDelete} disabled={deleteBusy}>{deleteBusy ? t('common.loading') : t('regulations.deleteBtn')}</button>
        </>}
      >
        {t('regulations.deleteConfirmBody', { name: selected?.title ?? '' })}
      </Modal>
    </div>
  );
}
