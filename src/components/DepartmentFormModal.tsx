import { useEffect, useState, FormEvent } from 'react';
import { api, type Employee, type Department } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Modal from './Modal';
import Select from './Select';

export default function DepartmentFormModal({
  open,
  onClose,
  department,
  employees,
  currentEmployeeId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  department?: Department;
  employees: Employee[];
  currentEmployeeId: string;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [headId, setHeadId] = useState('');
  const [deputyId, setDeputyId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(department?.name ?? '');
    setHeadId(department?.headEmployeeId ?? '');
    setDeputyId(department?.deputyEmployeeId ?? '');
    setError('');
  }, [open, department]);

  const headOptions = [
    { value: '', label: t('employees.notSelected') },
    ...employees.map((e) => ({ value: e.id, label: e.fullName || e.login })),
  ];

  // Заместителем логично не назначать того же человека, что и руководитель.
  const deputyOptions = [
    { value: '', label: t('employees.notSelected') },
    ...employees.filter((e) => e.id !== headId).map((e) => ({ value: e.id, label: e.fullName || e.login })),
  ];

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!name.trim()) {
      setError(t('departments.errorRequired'));
      return;
    }
    setBusy(true);
    try {
      if (department) {
        await api.updateDepartment({
          adminId: currentEmployeeId,
          id: department.id,
          name: name.trim(),
          headEmployeeId: headId || null,
          deputyEmployeeId: deputyId || null,
        });
        showToast('success', t('departments.updated'));
      } else {
        await api.createDepartment({
          adminId: currentEmployeeId,
          name: name.trim(),
          headEmployeeId: headId || null,
          deputyEmployeeId: deputyId || null,
        });
        showToast('success', t('departments.added'));
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : t('departments.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={department ? t('departments.editTitle') : t('departments.addTitle')}
      onClose={onClose}
      actions={
        <>
          <button className="modal-btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="modal-btn danger" onClick={() => handleSubmit()} disabled={busy}>
            {busy ? t('employees.savingBusy') : department ? t('employees.saveConfirm') : t('employees.addConfirm')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="error-text">{error}</div>}

        <div className="field">
          <label>{t('departments.nameLabel')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('departments.namePlaceholder')} />
        </div>

        <div className="field">
          <label>{t('departments.headLabel')}</label>
          <Select value={headId} options={headOptions} onChange={setHeadId} />
          <p className="settings-hint">{t('departments.headHint')}</p>
        </div>

        <div className="field">
          <label>{t('employees.deputyLabel')}</label>
          <Select value={deputyId} options={deputyOptions} onChange={setDeputyId} />
          <p className="settings-hint">{t('departments.deputyHint')}</p>
        </div>
      </form>
    </Modal>
  );
}
