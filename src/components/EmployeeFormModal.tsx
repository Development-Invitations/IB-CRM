import { useEffect, useState, FormEvent, ChangeEvent, useRef } from 'react';
import { Plus, Camera, X } from 'lucide-react';
import { api, type Employee, type Position, type Department } from '../lib/api';
import { formatUzPhone } from '../lib/phone';
import { compressImageFile } from '../lib/photo';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Modal from './Modal';
import Select from './Select';
import SearchableSelect from './SearchableSelect';
import Avatar from './Avatar';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  employee?: Employee;
  employees: Employee[];
  positions: Position[];
  departments: Department[];
  onPositionCreated: (position: Position) => void;
  currentEmployeeId: string;
  onSaved: () => void;
};

export default function EmployeeFormModal({
  open,
  onClose,
  mode,
  employee,
  employees,
  positions,
  departments,
  onPositionCreated,
  currentEmployeeId,
  onSaved,
}: Props) {
  const { t } = useLocale();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [positionId, setPositionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [deputyId, setDeputyId] = useState('');
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addingPosition, setAddingPosition] = useState(false);
  const [newPositionTitle, setNewPositionTitle] = useState('');
  const [positionBusy, setPositionBusy] = useState(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && employee) {
      setFullName(employee.fullName);
      setLogin(employee.login);
      setPhone(employee.phone ?? '');
      setPositionId(employee.positionId ?? '');
      setDepartmentId(employee.departmentId ?? '');
      setManagerId(employee.managerId ?? '');
      setDeputyId(employee.deputyId ?? '');
      setAvatarData(employee.avatarData ?? null);
    } else {
      setFullName('');
      setLogin('');
      setPassword('');
      setPhone('');
      setPositionId('');
      setDepartmentId('');
      setManagerId('');
      setDeputyId('');
      setAvatarData(null);
    }
    setAddingPosition(false);
    setNewPositionTitle('');
    setError('');
  }, [open, mode, employee]);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    try {
      const compressed = await compressImageFile(file);
      setAvatarData(compressed);
    } catch {
      showToast('error', t('employees.avatarError'));
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAddPosition = async () => {
    if (!newPositionTitle.trim()) return;
    setPositionBusy(true);
    try {
      const created = await api.createPosition(newPositionTitle.trim());
      onPositionCreated(created);
      setPositionId(created.id);
      setAddingPosition(false);
      setNewPositionTitle('');
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('employees.errorGeneric'));
    } finally {
      setPositionBusy(false);
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');

    if (!fullName.trim() || (mode === 'create' && (!login.trim() || !password.trim()))) {
      setError(t('employees.errorRequired'));
      return;
    }
    if (mode === 'create' && password.length < 6) {
      setError(t('firstRun.errorShortPassword'));
      return;
    }

    const shared = {
      fullName: fullName.trim(),
      phone: phone.trim() || null,
      positionId: positionId || null,
      departmentId: departmentId || null,
      managerId: managerId || null,
      deputyId: deputyId || null,
      avatarData: avatarData || null,
    };

    setBusy(true);
    try {
      if (mode === 'create') {
        await api.createEmployee({ adminId: currentEmployeeId, login: login.trim(), password, ...shared });
        showToast('success', t('employees.added'));
      } else if (employee) {
        await api.updateEmployee({ adminId: currentEmployeeId, employeeId: employee.id, ...shared });
        showToast('success', t('employees.updated'));
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : t('employees.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const peopleOptions = [
    { value: '', label: t('employees.notSelected') },
    ...employees.filter((e) => e.id !== employee?.id).map((e) => ({ value: e.id, label: `${e.fullName || e.login}` })),
  ];

  // Руководителем логично назначать только тех, кто реально кем-то руководит —
  // то есть глав подразделений. Если руководителей ещё нет (подразделения без
  // назначенных глав), список будет пустым, кроме "Не выбран" — это ожидаемо.
  const headIds = new Set(departments.map((d) => d.headEmployeeId).filter((id): id is string => !!id));
  const managerOptions = [
    { value: '', label: t('employees.notSelected') },
    ...employees
      .filter((e) => e.id !== employee?.id && headIds.has(e.id))
      .map((e) => ({ value: e.id, label: `${e.fullName || e.login}` })),
  ];

  const positionOptions = [
    { value: '', label: t('employees.notSelected') },
    ...positions.map((p) => ({ value: p.id, label: p.title })),
  ];

  return (
    <Modal
      open={open}
      title={mode === 'create' ? t('employees.addTitle') : t('employees.editTitle')}
      onClose={onClose}
      actions={
        <>
          <button className="modal-btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="modal-btn danger" onClick={() => handleSubmit()} disabled={busy}>
            {busy ? t('employees.savingBusy') : mode === 'create' ? t('employees.addConfirm') : t('employees.saveConfirm')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="error-text">{error}</div>}

        <div className="avatar-upload-row">
          <Avatar name={fullName || login || '?'} size={64} src={avatarData} />
          <div className="avatar-upload-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              className="modal-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
            >
              <Camera size={14} /> {avatarBusy ? t('employees.avatarUploading') : t('employees.avatarUploadBtn')}
            </button>
            {avatarData && (
              <button type="button" className="link-btn" onClick={() => setAvatarData(null)}>
                <X size={13} /> {t('employees.avatarRemoveBtn')}
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <label>{t('firstRun.fullNameLabel')}</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('firstRun.fullNamePlaceholder')} />
        </div>

        {mode === 'create' && (
          <>
            <div className="field">
              <label>{t('firstRun.loginLabel')}</label>
              <input value={login} onChange={(e) => setLogin(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('employees.tempPasswordLabel')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <p className="settings-hint">{t('employees.tempPasswordHint')}</p>
          </>
        )}

        <div className="field">
          <label>{t('employees.phoneLabel')}</label>
          <input
            value={phone}
            onChange={(e) => setPhone(formatUzPhone(e.target.value))}
            placeholder="+998 90 123 45 67"
            inputMode="numeric"
          />
        </div>

        <div className="field">
          <label>{t('employees.positionLabel')}</label>
          <Select value={positionId} options={positionOptions} onChange={setPositionId} />
          {!addingPosition ? (
            <button type="button" className="link-btn" onClick={() => setAddingPosition(true)}>
              <Plus size={13} /> {t('employees.addPositionToggle')}
            </button>
          ) : (
            <div className="inline-add-row">
              <input
                value={newPositionTitle}
                onChange={(e) => setNewPositionTitle(e.target.value)}
                placeholder={t('employees.newPositionPlaceholder')}
              />
              <button type="button" className="modal-btn" onClick={handleAddPosition} disabled={positionBusy}>
                {t('employees.addPositionConfirm')}
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <label>{t('employees.departmentLabel')}</label>
          <Select
            value={departmentId}
            options={[{ value: '', label: t('employees.notSelected') }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
            onChange={setDepartmentId}
          />
          <p className="settings-hint">{t('employees.departmentAutoManagerHint')}</p>
        </div>

        <div className="field">
          <label>{t('employees.managerLabel')}</label>
          <SearchableSelect
            value={managerId}
            options={managerOptions}
            onChange={setManagerId}
            searchPlaceholder={t('employees.searchPlaceholder')}
            emptyLabel={t('employees.searchEmpty')}
          />
          <p className="settings-hint">{t('employees.managerFilterHint')}</p>
        </div>

        <div className="field">
          <label>{t('employees.deputyLabel')}</label>
          <SearchableSelect
            value={deputyId}
            options={peopleOptions}
            onChange={setDeputyId}
            searchPlaceholder={t('employees.searchPlaceholder')}
            emptyLabel={t('employees.searchEmpty')}
          />
        </div>
      </form>
    </Modal>
  );
}
