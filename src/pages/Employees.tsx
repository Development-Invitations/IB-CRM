import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, ArrowRight } from 'lucide-react';
import { api, type Employee, type Position, type Department } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { parseSqliteUtc } from '../lib/date';
import Drawer from '../components/Drawer';
import EmployeeFormModal from '../components/EmployeeFormModal';
import Avatar from '../components/Avatar';

export default function Employees({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Employee | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

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
        <p className="settings-hint">{t('common.loading')}</p>
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
              <span className="settings-hint">{t('employees.statusLabel')}</span>
              <span className={`status-value ${selected.isOnline ? 'online' : 'offline'}`}>
                <span className="status-dot" />
                {selected.isOnline
                  ? t('employees.onlineNow')
                  : selected.lastSeenAt
                    ? t('employees.lastSeenLabel', { time: parseSqliteUtc(selected.lastSeenAt).toLocaleString() })
                    : t('employees.neverLoggedIn')}
              </span>
            </div>
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
