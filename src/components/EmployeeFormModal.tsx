import { useEffect, useState, FormEvent, ChangeEvent, useRef } from 'react';
import { Plus, Camera, X } from 'lucide-react';
import { api, type Employee, type Position, type Department, type Partner } from '../lib/api';
import Checkbox from './Checkbox';
import { formatUzPhone } from '../lib/phone';
import { compressImageFile } from '../lib/photo';
import { WEEK_DAYS, WEEK_DAY_KEYS } from '../lib/schedule';
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
  // Открыть сразу с отмеченным чекбоксом "Партнёр" и выбранной организацией —
  // используется кнопкой "Добавить аккаунт" на вкладке "Партнёры".
  initialPartner?: Partner;
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
  initialPartner,
}: Props) {
  const { t } = useLocale();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [positionId, setPositionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [deputyId, setDeputyId] = useState('');
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [workDays, setWorkDays] = useState<number[]>([]);
  const [workStart, setWorkStart] = useState('');
  const [workEnd, setWorkEnd] = useState('');

  // Аккаунт партнёра — только при создании (см. db.rs::create_employee).
  // Партнёр — организация, аккаунт привязывается к уже созданной (список тут
  // же, "+ создать" не нужен — заводится в отдельной вкладке "Партнёры").
  const [isPartner, setIsPartner] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerPositionTitle, setPartnerPositionTitle] = useState('');

  // Аккаунту партнёра не нужны подразделение/руководитель/заместитель (он вне
  // внутренней иерархии компании) и должность — не общий выпадающий список,
  // а простое текстовое поле (см. журнал v0.2.16 в docs/TZ.md).
  const isPartnerAccount = mode === 'create' ? isPartner : !!employee?.isPartner;

  useEffect(() => {
    if (open && mode === 'create') {
      api.listPartners().then(setPartners).catch(() => {});
    }
  }, [open, mode]);

  const toggleWorkDay = (day: number) => {
    setWorkDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  };

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
      setBirthDate(employee.birthDate ?? '');
      setPositionId(employee.positionId ?? '');
      setDepartmentId(employee.departmentId ?? '');
      setManagerId(employee.managerId ?? '');
      setDeputyId(employee.deputyId ?? '');
      setAvatarData(employee.avatarData ?? null);
      setWorkDays(employee.workDays ? employee.workDays.split(',').map(Number).filter((n) => n >= 1 && n <= 7) : []);
      setWorkStart(employee.workStart ?? '');
      setWorkEnd(employee.workEnd ?? '');
      setPartnerPositionTitle(employee.positionTitle ?? '');
    } else {
      setFullName('');
      setLogin('');
      setPassword('');
      setPhone('');
      setBirthDate('');
      setPositionId('');
      setDepartmentId('');
      setManagerId('');
      setDeputyId('');
      setAvatarData(null);
      setWorkDays([]);
      setWorkStart('');
      setWorkEnd('');
      setIsPartner(!!initialPartner);
      setPartnerId(initialPartner?.id ?? '');
      setPartnerPositionTitle('');
    }
    setAddingPosition(false);
    setNewPositionTitle('');
    setError('');
  }, [open, mode, employee, initialPartner]);

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
    if (mode === 'create' && isPartner && !partnerId) {
      setError(t('employees.partnerRequired'));
      return;
    }

    setBusy(true);
    let resolvedPositionId = positionId || null;
    if (isPartnerAccount) {
      const title = partnerPositionTitle.trim();
      if (title) {
        const existing = positions.find((p) => p.title.toLowerCase() === title.toLowerCase());
        if (existing) {
          resolvedPositionId = existing.id;
        } else {
          try {
            const created = await api.createPosition(title);
            onPositionCreated(created);
            resolvedPositionId = created.id;
          } catch (err: any) {
            setError(typeof err === 'string' ? err : t('employees.errorGeneric'));
            setBusy(false);
            return;
          }
        }
      } else {
        resolvedPositionId = null;
      }
    }

    const shared = {
      fullName: fullName.trim(),
      phone: phone.trim() || null,
      birthDate: birthDate || null,
      positionId: resolvedPositionId,
      departmentId: departmentId || null,
      managerId: managerId || null,
      deputyId: deputyId || null,
      avatarData: avatarData || null,
    };

    try {
      let savedEmployee: Employee;
      if (mode === 'create') {
        savedEmployee = await api.createEmployee({
          adminId: currentEmployeeId,
          login: login.trim(),
          password,
          isPartner,
          partnerId: isPartner ? partnerId : null,
          ...shared,
        });
        showToast('success', t('employees.added'));
      } else if (employee) {
        savedEmployee = await api.updateEmployee({ adminId: currentEmployeeId, employeeId: employee.id, ...shared });
        showToast('success', t('employees.updated'));
      } else {
        setBusy(false);
        return;
      }

      await api.setEmployeeSchedule({
        adminId: currentEmployeeId,
        employeeId: savedEmployee.id,
        workDays: workDays.length ? workDays.join(',') : null,
        workStart: workStart || null,
        workEnd: workEnd || null,
      });

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

            <div className="field">
              <div className="partner-checkbox-row">
                <Checkbox checked={isPartner} onChange={setIsPartner} label={t('employees.partnerCheckboxLabel')} />
                {isPartner && (
                  <Select
                    value={partnerId}
                    options={[
                      { value: '', label: t('employees.notSelected') },
                      ...partners.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                    onChange={setPartnerId}
                  />
                )}
              </div>
              {isPartner && partners.length === 0 && <p className="settings-hint">{t('employees.partnerListEmptyHint')}</p>}
            </div>
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

        {!isPartnerAccount && (
          <div className="field">
            <label>{t('employees.birthDateLabel')}</label>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
        )}

        <div className="field">
          <label>{t('employees.positionLabel')}</label>
          {isPartnerAccount ? (
            <input
              value={partnerPositionTitle}
              onChange={(e) => setPartnerPositionTitle(e.target.value)}
              placeholder={t('employees.newPositionPlaceholder')}
            />
          ) : (
            <>
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
            </>
          )}
        </div>

        {!isPartnerAccount && (
          <div className="field">
            <label>{t('employees.departmentLabel')}</label>
            <Select
              value={departmentId}
              options={[{ value: '', label: t('employees.notSelected') }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
              onChange={setDepartmentId}
            />
            <p className="settings-hint">{t('employees.departmentAutoManagerHint')}</p>
          </div>
        )}

        {!isPartnerAccount && (
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
        )}

        {!isPartnerAccount && (
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
        )}

        <div className="field">
          <label>{t('schedule.daysLabel')}</label>
          <div className="week-day-picker">
            {WEEK_DAYS.map((day, i) => (
              <button
                type="button"
                key={day}
                className={`week-day-btn ${workDays.includes(day) ? 'active' : ''}`}
                onClick={() => toggleWorkDay(day)}
              >
                {t(`schedule.${WEEK_DAY_KEYS[i]}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="absence-form-dates">
          <div className="field">
            <label>{t('schedule.startLabel')}</label>
            <input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('schedule.endLabel')}</label>
            <input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
