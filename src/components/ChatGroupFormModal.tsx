import { useEffect, useRef, useState } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { api, type Employee, type Department, type ChatGroupSummary } from '../lib/api';
import { compressImageFile } from '../lib/photo';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Modal from './Modal';
import Select from './Select';
import Avatar from './Avatar';

type Props = {
  open: boolean;
  onClose: () => void;
  currentEmployee: Employee;
  departments: Department[];
  employees: Employee[];
  onCreated: (group: ChatGroupSummary) => void;
};

export default function ChatGroupFormModal({ open, onClose, currentEmployee, departments, employees, onCreated }: Props) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const headDepartments = departments.filter((d) => currentEmployee.isAdmin || d.headEmployeeId === currentEmployee.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [mode, setMode] = useState<'department' | 'manual'>('manual');
  const [departmentId, setDepartmentId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setPhotoData(null);
    setMode('manual');
    setDepartmentId('');
    setSearch('');
    setSelectedIds(new Set());
    setError('');
  }, [open]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      setPhotoData(await compressImageFile(file));
    } catch {
      showToast('error', t('chat.groupPhotoError'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const candidates = employees.filter(
    (e) => !e.isPartner && e.id !== currentEmployee.id && (e.fullName || e.login).toLowerCase().includes(search.trim().toLowerCase())
  );
  const selectedEmployees = employees.filter((e) => selectedIds.has(e.id));

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) {
      setError(t('chat.groupNameRequired'));
      return;
    }
    if (mode === 'department' && !departmentId) {
      setError(t('chat.groupDepartmentRequired'));
      return;
    }
    if (mode === 'manual' && selectedIds.size === 0) {
      setError(t('chat.groupMembersRequired'));
      return;
    }
    setBusy(true);
    try {
      const group = await api.createChatGroup({
        actorId: currentEmployee.id,
        name: name.trim(),
        description: description.trim() || null,
        photoData,
        departmentId: mode === 'department' ? departmentId : null,
        memberIds: mode === 'manual' ? Array.from(selectedIds) : null,
      });
      showToast('success', t('chat.groupCreated'));
      onCreated({ id: group.id, name: group.name, photoData: group.photoData, memberCount: group.memberCount, lastMessage: null, lastMessageAt: null });
      onClose();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : t('chat.loadError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('chat.createGroupTitle')}
      onClose={onClose}
      actions={
        <>
          <button className="modal-btn" onClick={onClose}>{t('common.cancel')}</button>
          <button className="modal-btn danger" onClick={handleSubmit} disabled={busy}>
            {busy ? t('employees.savingBusy') : t('chat.createGroupBtn')}
          </button>
        </>
      }
    >
      {error && <div className="error-text">{error}</div>}

      <div className="avatar-upload-row">
        <Avatar name={name || '?'} size={64} src={photoData} />
        <div className="avatar-upload-actions">
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          <button type="button" className="modal-btn" onClick={() => fileInputRef.current?.click()} disabled={photoBusy}>
            <Camera size={14} /> {photoBusy ? t('employees.avatarUploading') : t('chat.groupPhotoBtn')}
          </button>
          {photoData && (
            <button type="button" className="link-btn" onClick={() => setPhotoData(null)}>
              <X size={13} /> {t('employees.avatarRemoveBtn')}
            </button>
          )}
        </div>
      </div>

      <div className="field">
        <label>{t('chat.groupNameLabel')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('chat.groupNamePlaceholder')} />
      </div>

      <div className="field">
        <label>{t('chat.groupDescriptionLabel')}</label>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('chat.groupDescriptionPlaceholder')} />
      </div>

      {headDepartments.length > 0 && (
        <div className="employees-tabs" style={{ marginBottom: 14 }}>
          <button type="button" className={`employees-tab-btn${mode === 'manual' ? ' active' : ''}`} onClick={() => setMode('manual')}>
            {t('chat.groupModeManual')}
          </button>
          <button type="button" className={`employees-tab-btn${mode === 'department' ? ' active' : ''}`} onClick={() => setMode('department')}>
            {t('chat.groupModeDepartment')}
          </button>
        </div>
      )}

      {mode === 'department' ? (
        <div className="field">
          <label>{t('employees.departmentLabel')}</label>
          <Select
            value={departmentId}
            options={[{ value: '', label: t('employees.notSelected') }, ...headDepartments.map((d) => ({ value: d.id, label: d.name }))]}
            onChange={setDepartmentId}
          />
          <p className="settings-hint">{t('chat.groupDepartmentHint')}</p>
        </div>
      ) : (
        <div className="field">
          <label>{t('chat.groupMembersLabel')}</label>
          {selectedEmployees.length > 0 && (
            <div className="role-badges" style={{ marginBottom: 8 }}>
              {selectedEmployees.map((e) => (
                <span key={e.id} className="role-badge role-badge-deputy" style={{ cursor: 'pointer' }} onClick={() => toggleMember(e.id)}>
                  {e.fullName || e.login} <X size={11} />
                </span>
              ))}
            </div>
          )}
          <input value={search} onChange={(ev) => setSearch(ev.target.value)} placeholder={t('chat.searchPlaceholder')} />
          <ul className="chat-dm-list" style={{ marginTop: 8, maxHeight: 180, overflowY: 'auto' }}>
            {candidates.map((e) => (
              <li key={e.id} className="chat-dm-item" onClick={() => toggleMember(e.id)}>
                <Avatar name={e.fullName || e.login} size={26} src={e.avatarData} />
                <div className="chat-dm-item-text">
                  <span className="chat-dm-item-name">{e.fullName || e.login}</span>
                </div>
                {selectedIds.has(e.id) && <Check size={14} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}
