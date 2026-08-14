import { useEffect, useState, FormEvent } from 'react';
import { api, type Project, type ProjectStatus, type Client } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Modal from './Modal';
import Select from './Select';

const STATUSES: ProjectStatus[] = ['planning', 'active', 'on_hold', 'completed', 'cancelled'];
const STATUS_LABEL_KEYS: Record<ProjectStatus, string> = {
  planning: 'projects.statusPlanning',
  active: 'projects.statusActive',
  on_hold: 'projects.statusOnHold',
  completed: 'projects.statusCompleted',
  cancelled: 'projects.statusCancelled',
};

export default function ProjectFormModal({
  open,
  onClose,
  project,
  clients,
  currentEmployeeId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project;
  clients: Client[];
  currentEmployeeId: string;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('planning');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setClientId(project?.clientId ?? '');
    setStatus(project?.status ?? 'planning');
    setError('');
  }, [open, project]);

  const clientOptions = [
    { value: '', label: t('employees.notSelected') },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];
  const statusOptions = STATUSES.map((s) => ({ value: s, label: t(STATUS_LABEL_KEYS[s]) }));

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!name.trim()) {
      setError(t('projects.errorRequired'));
      return;
    }
    setBusy(true);
    try {
      if (project) {
        await api.updateProject({
          actorId: currentEmployeeId,
          id: project.id,
          name: name.trim(),
          description: description.trim() || null,
          clientId: clientId || null,
          status,
        });
        showToast('success', t('projects.updated'));
      } else {
        await api.createProject({
          actorId: currentEmployeeId,
          name: name.trim(),
          description: description.trim() || null,
          clientId: clientId || null,
          status,
        });
        showToast('success', t('projects.added'));
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={project ? t('projects.editTitle') : t('projects.addTitle')}
      onClose={onClose}
      actions={
        <>
          <button className="modal-btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="modal-btn danger" onClick={() => handleSubmit()} disabled={busy}>
            {busy ? t('employees.savingBusy') : project ? t('employees.saveConfirm') : t('employees.addConfirm')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="error-text">{error}</div>}

        <div className="field">
          <label>{t('projects.nameLabel')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('projects.namePlaceholder')} />
        </div>

        <div className="field">
          <label>{t('projects.descriptionLabel')}</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('projects.descriptionPlaceholder')}
          />
        </div>

        <div className="field">
          <label>{t('projects.clientLabel')}</label>
          <Select value={clientId} options={clientOptions} onChange={setClientId} />
        </div>

        <div className="field">
          <label>{t('projects.statusLabel')}</label>
          <Select value={status} options={statusOptions} onChange={(v) => setStatus(v as ProjectStatus)} />
        </div>
      </form>
    </Modal>
  );
}

