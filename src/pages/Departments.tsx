import { useEffect, useState } from 'react';
import { Plus, Pencil, Users, Trash2, UserPlus, X } from 'lucide-react';
import { api, type Employee, type Department } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import DepartmentFormModal from '../components/DepartmentFormModal';
import SearchableSelect from '../components/SearchableSelect';
import LoadingScreen from '../components/LoadingScreen';

export default function Departments({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Department | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [addMemberId, setAddMemberId] = useState('');
  const [addMemberBusy, setAddMemberBusy] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.listDepartments(), api.listEmployees()]).then(([deps, emps]) => {
      setDepartments(deps);
      setEmployees(emps);
      setLoading(false);
      setSelected((prev) => (prev ? deps.find((d) => d.id === prev.id) ?? null : null));
    });
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingDepartment(undefined);
    setFormOpen(true);
  };

  const openEdit = (dep: Department) => {
    setEditingDepartment(dep);
    setFormOpen(true);
  };

  const membersOf = (depId: string) => employees.filter((e) => e.departmentId === depId);

  const handleDelete = async () => {
    if (!selected) return;
    setDeleteBusy(true);
    try {
      await api.deleteDepartment({ adminId: currentEmployee.id, id: selected.id });
      showToast('success', t('departments.deleted'));
      setDeleteConfirmOpen(false);
      setSelected(null);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('departments.errorGeneric'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleAddMember = async () => {
    if (!selected || !addMemberId) return;
    const emp = employees.find((e) => e.id === addMemberId);
    if (!emp) return;
    setAddMemberBusy(true);
    try {
      await api.updateEmployee({
        adminId: currentEmployee.id,
        employeeId: emp.id,
        fullName: emp.fullName,
        phone: emp.phone,
        positionId: emp.positionId,
        // managerId: null — сотрудник переходит (или впервые попадает) в новое
        // подразделение, руководителем должен стать глава ЭТОГО подразделения
        // (авто-подстановка на Rust-стороне, см. resolve_manager в db.rs).
        // Если передать старого руководителя, авто-подстановка не сработает.
        managerId: null,
        deputyId: emp.deputyId,
        departmentId: selected.id,
        avatarData: emp.avatarData,
      });
      showToast('success', t('departments.memberAdded'));
      setAddMemberId('');
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('departments.errorGeneric'));
    } finally {
      setAddMemberBusy(false);
    }
  };

  const handleRemoveMember = async (emp: Employee) => {
    setRemovingMemberId(emp.id);
    try {
      await api.updateEmployee({
        adminId: currentEmployee.id,
        employeeId: emp.id,
        fullName: emp.fullName,
        phone: emp.phone,
        positionId: emp.positionId,
        // Сотрудник покидает подразделение — руководителя, автоматически
        // подставленного из главы ЭТОГО подразделения, тоже логично снять,
        // иначе он останется "подчинённым" человека, к которому больше не
        // относится (та же логика, что и при переводе — см. handleAddMember).
        managerId: null,
        deputyId: emp.deputyId,
        departmentId: null,
        avatarData: emp.avatarData,
      });
      showToast('success', t('departments.memberRemoved'));
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('departments.errorGeneric'));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const addableEmployees = selected ? employees.filter((e) => e.departmentId !== selected.id) : [];
  const addMemberOptions = [
    { value: '', label: t('employees.notSelected') },
    ...addableEmployees.map((e) => ({
      value: e.id,
      label: e.departmentName
        ? `${e.fullName || e.login} (${e.departmentName} → ${selected?.name ?? ''})`
        : e.fullName || e.login,
    })),
  ];

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('sidebar.departments')}</h1>
        {currentEmployee.isAdmin && (
          <button className="primary employees-add-btn" onClick={openCreate}>
            <Plus size={16} /> {t('departments.addBtn')}
          </button>
        )}
      </div>

      {loading ? (
        <LoadingScreen compact />
      ) : departments.length === 0 ? (
        <p className="settings-hint">{t('departments.empty')}</p>
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('departments.colName')}</th>
              <th>{t('departments.colHead')}</th>
              <th>{t('departments.colMembers')}</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dep) => (
              <tr key={dep.id} className="employees-row" onClick={() => setSelected(dep)}>
                <td>{dep.name}</td>
                <td>{dep.headName || '—'}</td>
                <td>{dep.memberCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={t('departments.cardTitle')}
        footer={
          selected &&
          currentEmployee.isAdmin && (
            <>
              <button className="modal-btn" onClick={() => selected && openEdit(selected)}>
                <Pencil size={14} /> {t('employees.editBtn')}
              </button>
              <button className="modal-btn danger" onClick={() => setDeleteConfirmOpen(true)}>
                <Trash2 size={14} /> {t('departments.deleteBtn')}
              </button>
            </>
          )
        }
      >
        {selected && (
          <div className="employee-card">
            <div className="employee-card-head">
              <div className="department-icon">
                <Users size={24} />
              </div>
              <div>
                <div className="employee-card-name">{selected.name}</div>
                <div className="settings-hint">
                  {t('departments.membersCount', { count: String(selected.memberCount) })}
                </div>
              </div>
            </div>

            <div className="employee-card-row">
              <span className="settings-hint">{t('departments.headLabel')}</span>
              <span>{selected.headName || '—'}</span>
            </div>

            <div className="department-members-title">{t('departments.membersTitle')}</div>
            {membersOf(selected.id).length === 0 ? (
              <p className="settings-hint">{t('departments.noMembers')}</p>
            ) : (
              <ul className="department-members-list">
                {membersOf(selected.id).map((m) => (
                  <li key={m.id} className="department-member-row">
                    <span>
                      {m.fullName || m.login}
                      {m.positionTitle ? ` · ${m.positionTitle}` : ''}
                      {m.id === selected.deputyEmployeeId && (
                        <span className="role-badge role-badge-deputy" style={{ marginLeft: 8 }}>
                          {t('employees.deputyLabel')}
                        </span>
                      )}
                    </span>
                    {currentEmployee.isAdmin && (
                      <button
                        type="button"
                        className="department-member-remove"
                        onClick={() => handleRemoveMember(m)}
                        disabled={removingMemberId === m.id}
                        title={t('departments.removeMemberBtn')}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {currentEmployee.isAdmin && addableEmployees.length > 0 && (
              <div className="department-add-member-row">
                <SearchableSelect
                  value={addMemberId}
                  options={addMemberOptions}
                  onChange={setAddMemberId}
                  searchPlaceholder={t('employees.searchPlaceholder')}
                  emptyLabel={t('employees.searchEmpty')}
                />
                <button
                  type="button"
                  className="modal-btn"
                  onClick={handleAddMember}
                  disabled={!addMemberId || addMemberBusy}
                >
                  <UserPlus size={14} /> {t('departments.addMemberBtn')}
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <DepartmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        department={editingDepartment}
        employees={employees}
        currentEmployeeId={currentEmployee.id}
        onSaved={load}
      />

      <Modal
        open={deleteConfirmOpen}
        title={t('departments.deleteConfirmTitle')}
        onClose={() => setDeleteConfirmOpen(false)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteBusy}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? t('common.loading') : t('departments.deleteBtn')}
            </button>
          </>
        }
      >
        {t('departments.deleteConfirmBody', { name: selected?.name ?? '' })}
      </Modal>
    </div>
  );
}
