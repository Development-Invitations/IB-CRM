import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, ArrowRight, MessageCircle, Lock, Unlock } from 'lucide-react';
import { api, type Employee, type Position, type Department, type AbsenceRequest, type Regulation } from '../lib/api';
import { dmChannelId } from '../lib/chat';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc, formatLocalDate } from '../lib/date';
import { formatWorkDays } from '../lib/schedule';
import { ABSENCE_TYPE_LABEL_KEYS, formatDate } from '../lib/absenceTypes';
import Drawer from '../components/Drawer';
import EmployeeFormModal from '../components/EmployeeFormModal';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';

export default function Employees({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<Employee | null>(null);
  const [selectedAbsences, setSelectedAbsences] = useState<AbsenceRequest[]>([]);
  const [empRegs, setEmpRegs] = useState<Regulation[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [blockBusy, setBlockBusy] = useState(false);

  useEffect(() => {
    if (selected) {
      Promise.all([
        api.listAbsenceRequestsForEmployee(selected.id),
        api.listRegulations(),
      ])
        .then(([absences, allRegs]) => {
          setSelectedAbsences(absences);
          // Показываем регламенты где сотрудник — ответственный
          setEmpRegs(allRegs.filter((r) => r.ownerId === selected.id));
        })
        .catch(() => showToast('error', t('common.loadError')));
    } else {
      setSelectedAbsences([]);
      setEmpRegs([]);
    }
  }, [selected?.id]);

  const load = () => {
    setLoading(true);
    Promise.all([api.listEmployees(), api.listPositions(), api.listDepartments()])
      .then(([emps, pos, deps]) => {
        setEmployees(emps);
        setPositions(pos);
        setDepartments(deps);
        setLoading(false);
        setSelected((prev) => (prev ? emps.find((e) => e.id === prev.id) ?? null : null));
      })
      .catch(() => {
        setLoading(false);
        showToast('error', t('common.loadError'));
      });
  };

  useEffect(() => {
    load();
  }, []);

  // Аккаунты партнёров показываются только на вкладке "Партнёры", не в общем
  // списке сотрудников.
  const staffEmployees = employees.filter((e) => !e.isPartner);
  const filteredEmployees = search.trim()
    ? staffEmployees.filter((e) => {
        const q = search.trim().toLowerCase();
        return (
          e.employeeNumber.toLowerCase().includes(q) ||
          (e.fullName || '').toLowerCase().includes(q) ||
          e.login.toLowerCase().includes(q)
        );
      })
    : staffEmployees;

  const openCreate = () => {
    setFormMode('create');
    setFormOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setSelected(emp);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleToggleBlock = async () => {
    if (!selected) return;
    setBlockBusy(true);
    try {
      const updated = await api.setEmployeeBlocked({ adminId: currentEmployee.id, employeeId: selected.id, blocked: !selected.isBlocked });
      setSelected(updated);
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast('success', updated.isBlocked ? t('employees.blockedSuccess') : t('employees.unblockedSuccess'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('employees.errorGeneric'));
    } finally {
      setBlockBusy(false);
    }
  };

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('sidebar.employees')}</h1>
        {currentEmployee.isAdmin && (
          <button className="primary employees-add-btn" onClick={openCreate}>
            <Plus size={16} /> {t('employees.addBtn')}
          </button>
        )}
      </div>

      <div className="employees-search-row">
        <Search size={15} className="employees-search-icon" />
        <input
          className="employees-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('employees.searchByNameOrId')}
        />
      </div>

      {loading ? (
        <LoadingScreen compact />
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('employees.colId')}</th>
              <th>{t('employees.colName')}</th>
              <th>{t('employees.colLogin')}</th>
              <th>{t('employees.colPosition')}</th>
              <th>{t('employees.colDepartment')}</th>
              <th>{t('employees.colRole')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="employees-row" onClick={() => setSelected(emp)}>
                <td>{emp.employeeNumber}</td>
                <td>
                  <div className="employees-name-cell">
                    <span className="avatar-with-status">
                      <Avatar name={emp.fullName || emp.login} size={28} src={emp.avatarData} />
                      {emp.isOnline && <span className="avatar-online-dot" title={t('employees.onlineNow')} />}
                    </span>
                    <span>{emp.fullName || '—'}</span>
                    <StatusBadge status={emp.manualStatus} until={emp.manualStatusUntil} size="sm" />
                  </div>
                </td>
                <td>{emp.login}</td>
                <td>{emp.positionTitle || '—'}</td>
                <td>{emp.departmentName || '—'}</td>
                <td>{emp.isAdmin ? t('sidebar.admin') : t('employees.roleEmployee')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={t('employees.cardTitle')}
        footer={
          selected && (
            <>
              {currentEmployee.isAdmin && (
                <button className="modal-btn" onClick={() => selected && openEdit(selected)}>
                  <Pencil size={14} /> {t('employees.editBtn')}
                </button>
              )}
              {currentEmployee.isAdmin && selected.id !== currentEmployee.id && (
                <button className="modal-btn danger" onClick={handleToggleBlock} disabled={blockBusy}>
                  {selected.isBlocked ? <Unlock size={14} /> : <Lock size={14} />}
                  {blockBusy ? t('common.loading') : selected.isBlocked ? t('employees.unblockBtn') : t('employees.blockBtn')}
                </button>
              )}
              <button
                className="modal-btn danger"
                onClick={() => {
                  if (selected) navigate(`/dashboard/employees/${selected.id}`);
                }}
              >
                {t('employees.cabinetBtn')} <ArrowRight size={14} />
              </button>
            </>
          )
        }
      >
        {selected && (
          <div className="employee-card">
            <div className="employee-card-head">
              <Avatar name={selected.fullName || selected.login} size={56} src={selected.avatarData} />
              <div>
                <div className="employee-card-name">
                  {selected.fullName || selected.login}
                  {selected.isBlocked && <span className="absence-status absence-status-rejected" style={{ marginLeft: 8 }}>{t('employees.blockedLabel')}</span>}
                </div>
                <div className="settings-hint">{selected.employeeNumber}</div>
                {!selected.isPartner && selected.birthDate && <div className="settings-hint">{formatLocalDate(selected.birthDate)}</div>}
                {(selected.headOfDepartmentName || selected.deputyOfDepartmentName) && (
                  <div className="role-badges">
                    {selected.headOfDepartmentName && (
                      <span className="role-badge role-badge-head">
                        {t('employees.headOfDepartmentLabel')}: {selected.headOfDepartmentName}
                      </span>
                    )}
                    {selected.deputyOfDepartmentName && (
                      <span className="role-badge role-badge-deputy">
                        {t('employees.deputyOfDepartmentLabel')}: {selected.deputyOfDepartmentName}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {!currentEmployee.isPartner && !selected.isPartner && selected.id !== currentEmployee.id && (
                <button
                  type="button"
                  className="icon-btn"
                  title={t('topbar.chat')}
                  onClick={() =>
                    navigate('/dashboard/chat', {
                      state: {
                        channel: dmChannelId(currentEmployee.id, selected.id),
                        dmWith: { id: selected.id, name: selected.fullName || selected.login, avatarData: selected.avatarData },
                      },
                    })
                  }
                >
                  <MessageCircle size={18} />
                </button>
              )}
            </div>

            {!selected.isPartner && (
              <>
                <div className="employee-card-row">
                  <span className="settings-hint">{t('employees.positionLabel')}</span>
                  <span>{selected.positionTitle || '—'}</span>
                </div>
                <div className="employee-card-row">
                  <span className="settings-hint">{t('employees.departmentLabel')}</span>
                  <span>{selected.departmentName || '—'}</span>
                </div>
                <div className="employee-card-row">
                  <span className="settings-hint">{t('employees.managerLabel')}</span>
                  <span>{selected.managerName || '—'}</span>
                </div>
                <div className="employee-card-row">
                  <span className="settings-hint">{t('employees.deputyLabel')}</span>
                  <span>{selected.deputyName || '—'}</span>
                </div>
              </>
            )}
            <div className="employee-card-row">
              <span className="settings-hint">{t('employees.phoneLabel')}</span>
              <span>{selected.phone || '—'}</span>
            </div>
            <div className="employee-card-row">
              <span className="settings-hint">{t('schedule.title')}</span>
              <span>
                {selected.workDays
                  ? `${formatWorkDays(selected.workDays, t)}, ${selected.workStart ?? ''}–${selected.workEnd ?? ''}`
                  : t('schedule.notSet')}
              </span>
            </div>
            <div className="employee-card-row">
              <span className="settings-hint">{t('employees.statusLabel')}</span>
              <span className={`status-value ${selected.isOnline ? 'online' : 'offline'}`}>
                <span className="status-dot" />
                {selected.isOnline
                  ? t('employees.onlineNow')
                  : selected.lastSeenAt
                    ? t('employees.lastSeenLabel', { time: parseSqliteUtc(selected.lastSeenAt).toLocaleString() })
                    : t('employees.neverLoggedIn')}
              </span>
              <StatusBadge status={selected.manualStatus} until={selected.manualStatusUntil} size="sm" />
            </div>

            {!selected.isPartner && (
              <>
                <div className="department-members-title">{t('absence.myTitle')}</div>
                {selectedAbsences.length === 0 ? (
                  <p className="settings-hint">{t('absence.empty')}</p>
                ) : (
                  <ul className="department-members-list">
                    {selectedAbsences.map((r) => (
                      <li key={r.id}>
                        {t(ABSENCE_TYPE_LABEL_KEYS[r.type])} · {formatDate(r.startDate)} – {formatDate(r.endDate)}{' '}
                        <span className={`absence-status absence-status-${r.status}`}>
                          {t(r.status === 'pending' ? 'absence.statusPending' : r.status === 'approved' ? 'absence.statusApproved' : 'absence.statusRejected')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {empRegs.length > 0 && (
              <>
                <div className="department-members-title" style={{ marginTop: 16 }}>
                  {t('clients.regulationsTitle')}
                </div>
                <ul className="client-history-list">
                  {empRegs.map((r) => (
                    <li
                      key={r.id}
                      className="client-reg-item"
                      onClick={() => navigate('../regulations', { state: { openRegId: r.id } })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <div className="client-reg-name">
                          <span style={{ marginRight: 5, opacity: 0.5, fontSize: 11 }}>↗</span>
                          {r.title}
                        </div>
                        <div className="settings-hint client-history-meta">{r.regNumber}</div>
                      </div>
                      <span className={`absence-status reg-status-${r.status}`} style={{ flexShrink: 0 }}>
                        {r.status === 'active' ? t('regulations.statusActive') : t('regulations.statusClosed')}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </Drawer>

      <EmployeeFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={formMode}
        employee={formMode === 'edit' ? selected ?? undefined : undefined}
        employees={employees}
        positions={positions}
        departments={departments}
        onPositionCreated={(p) => setPositions((prev) => [...prev, p].sort((a, b) => a.title.localeCompare(b.title)))}
        currentEmployeeId={currentEmployee.id}
        onSaved={load}
      />
    </div>
  );
}
