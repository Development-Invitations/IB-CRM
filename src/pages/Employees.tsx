import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, ArrowRight } from 'lucide-react';
import { api, type Employee, type Position, type Department, type AbsenceRequest } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { parseSqliteUtc } from '../lib/date';
import { formatWorkDays } from '../lib/schedule';
import { ABSENCE_TYPE_LABEL_KEYS, formatDate } from '../lib/absenceTypes';
import Drawer from '../components/Drawer';
import EmployeeFormModal from '../components/EmployeeFormModal';
import Avatar from '../components/Avatar';
import StatusBadge from '../components/StatusBadge';
import LoadingScreen from '../components/LoadingScreen';

export default function Employees({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Employee | null>(null);
  const [selectedAbsences, setSelectedAbsences] = useState<AbsenceRequest[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  useEffect(() => {
    if (selected) {
      api.listAbsenceRequestsForEmployee(selected.id).then(setSelectedAbsences);
    } else {
      setSelectedAbsences([]);
    }
  }, [selected?.id]);

  const load = () => {
    setLoading(true);
    Promise.all([api.listEmployees(), api.listPositions(), api.listDepartments()]).then(([emps, pos, deps]) => {
      setEmployees(emps);
      setPositions(pos);
      setDepartments(deps);
      setLoading(false);
      // Держим открытую панель в актуальном состоянии, если сотрудника только что отредактировали
      setSelected((prev) => (prev ? emps.find((e) => e.id === prev.id) ?? null : null));
    });
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setFormMode('create');
    setFormOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setSelected(emp);
    setFormMode('edit');
    setFormOpen(true);
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
            {employees.map((emp) => (
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
                <div className="employee-card-name">{selected.fullName || selected.login}</div>
                <div className="settings-hint">{selected.employeeNumber}</div>
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
            </div>

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
