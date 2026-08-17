import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, ArrowRight, Trash2, UserPlus, ChevronDown, Check, X } from 'lucide-react';
import { api, type Employee, type Position, type Department, type AbsenceRequest, type Regulation, type Partner } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc, formatLocalDate } from '../lib/date';
import { formatWorkDays } from '../lib/schedule';
import { ABSENCE_TYPE_LABEL_KEYS, formatDate } from '../lib/absenceTypes';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
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
  const [formInitialPartner, setFormInitialPartner] = useState<Partner | undefined>(undefined);

  // Вкладка "Партнёры" — видна только админу (см. docs/TZ.md, раздел "Партнёры").
  const [tab, setTab] = useState<'employees' | 'partners'>('employees');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [expandedPartnerIds, setExpandedPartnerIds] = useState<Set<string>>(new Set());
  const [newPartnerName, setNewPartnerName] = useState('');
  const [partnerBusy, setPartnerBusy] = useState(false);
  const [deletePartnerTarget, setDeletePartnerTarget] = useState<Partner | null>(null);
  const [renamingPartnerId, setRenamingPartnerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const loadPartners = () => {
    api.listPartners().then(setPartners).catch(() => showToast('error', t('common.loadError')));
  };

  useEffect(() => {
    if (currentEmployee.isAdmin) loadPartners();
  }, [currentEmployee.isAdmin]);

  const handleCreatePartner = async () => {
    if (!newPartnerName.trim()) return;
    setPartnerBusy(true);
    try {
      await api.createPartner({ adminId: currentEmployee.id, name: newPartnerName.trim() });
      showToast('success', t('partners.created'));
      setNewPartnerName('');
      loadPartners();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('partners.errorGeneric'));
    } finally {
      setPartnerBusy(false);
    }
  };

  const handleDeletePartner = async () => {
    if (!deletePartnerTarget) return;
    setPartnerBusy(true);
    try {
      await api.deletePartner({ adminId: currentEmployee.id, id: deletePartnerTarget.id });
      showToast('success', t('partners.deleted'));
      setDeletePartnerTarget(null);
      loadPartners();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('partners.errorGeneric'));
    } finally {
      setPartnerBusy(false);
    }
  };

  const startRenamePartner = (partner: Partner) => {
    setRenamingPartnerId(partner.id);
    setRenameValue(partner.name);
  };

  const handleSaveRename = async (partner: Partner) => {
    if (!renameValue.trim() || renameValue.trim() === partner.name) {
      setRenamingPartnerId(null);
      return;
    }
    setPartnerBusy(true);
    try {
      await api.renamePartner({ adminId: currentEmployee.id, id: partner.id, name: renameValue.trim() });
      showToast('success', t('partners.renamed'));
      setRenamingPartnerId(null);
      loadPartners();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('partners.errorGeneric'));
    } finally {
      setPartnerBusy(false);
    }
  };

  const togglePartnerExpanded = (id: string) => {
    setExpandedPartnerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddPartnerAccount = (partner: Partner) => {
    setSelected(null);
    setFormMode('create');
    setFormInitialPartner(partner);
    setFormOpen(true);
  };

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
    setFormInitialPartner(undefined);
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
        {tab === 'employees' && currentEmployee.isAdmin && (
          <button className="primary employees-add-btn" onClick={openCreate}>
            <Plus size={16} /> {t('employees.addBtn')}
          </button>
        )}
      </div>

      {currentEmployee.isAdmin && (
        <div className="employees-tabs">
          <button type="button" className={`employees-tab-btn${tab === 'employees' ? ' active' : ''}`} onClick={() => setTab('employees')}>
            {t('partners.employeesTabLabel')}
          </button>
          <button type="button" className={`employees-tab-btn${tab === 'partners' ? ' active' : ''}`} onClick={() => setTab('partners')}>
            {t('partners.tabLabel')}
          </button>
        </div>
      )}

      {tab === 'partners' ? (
        <div className="partners-tab">
          <div className="department-add-member-row" style={{ marginTop: 0 }}>
            <input
              value={newPartnerName}
              onChange={(e) => setNewPartnerName(e.target.value)}
              placeholder={t('partners.namePlaceholder')}
            />
            <button className="modal-btn" onClick={handleCreatePartner} disabled={!newPartnerName.trim() || partnerBusy}>
              <Plus size={14} /> {partnerBusy ? t('partners.addBusy') : t('partners.addBtn')}
            </button>
          </div>

          {partners.length === 0 ? (
            <p className="settings-hint">{t('partners.empty')}</p>
          ) : (
            <div className="sessions-accordion" style={{ marginTop: 16 }}>
              {partners.map((partner) => {
                const accounts = employees.filter((e) => e.partnerId === partner.id);
                const isExpanded = expandedPartnerIds.has(partner.id);
                return (
                  <div className="sessions-day-group" key={partner.id}>
                    <div className="sessions-day-header partners-tab-header">
                      <button
                        type="button"
                        className="partners-tab-toggle"
                        onClick={() => togglePartnerExpanded(partner.id)}
                      >
                        {renamingPartnerId === partner.id ? (
                          <input
                            className="partner-rename-input"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        ) : (
                          <span>{partner.name}</span>
                        )}
                        <span className="settings-hint">{t('partners.accountsCount', { count: partner.accountCount })}</span>
                        <ChevronDown size={14} className={`sessions-day-chevron${isExpanded ? ' open' : ''}`} />
                      </button>
                      <div className="partners-tab-header-actions">
                        {renamingPartnerId === partner.id ? (
                          <>
                            <button type="button" disabled={partnerBusy} title={t('common.save')} onClick={(e) => { e.stopPropagation(); handleSaveRename(partner); }}>
                              <Check size={14} />
                            </button>
                            <button type="button" title={t('common.cancel')} onClick={(e) => { e.stopPropagation(); setRenamingPartnerId(null); }}>
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" title={t('partners.renameBtn')} onClick={(e) => { e.stopPropagation(); startRenamePartner(partner); }}>
                              <Pencil size={13} />
                            </button>
                            <button type="button" className="danger" title={t('partners.deleteBtn')} onClick={(e) => { e.stopPropagation(); setDeletePartnerTarget(partner); }}>
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="modal-btn" onClick={() => openAddPartnerAccount(partner)}>
                            <UserPlus size={13} /> {t('partners.addAccountBtn')}
                          </button>
                        </div>
                        {accounts.length === 0 ? (
                          <p className="settings-hint">{t('partners.noAccounts')}</p>
                        ) : (
                          <ul className="sessions-list">
                            {accounts.map((acc) => (
                              <li key={acc.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(acc)}>
                                <span>{acc.fullName || acc.login}</span>
                                <span className="settings-hint">{acc.login}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
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
        </>
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
                {selected.birthDate && <div className="settings-hint">{formatLocalDate(selected.birthDate)}</div>}
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
        onSaved={() => {
          load();
          if (currentEmployee.isAdmin) loadPartners();
        }}
        initialPartner={formInitialPartner}
      />

      <Modal
        open={!!deletePartnerTarget}
        title={t('partners.deleteConfirmTitle')}
        onClose={() => setDeletePartnerTarget(null)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setDeletePartnerTarget(null)} disabled={partnerBusy}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleDeletePartner} disabled={partnerBusy}>
              {partnerBusy ? t('common.loading') : t('partners.deleteBtn')}
            </button>
          </>
        }
      >
        {t('partners.deleteConfirmBody', { name: deletePartnerTarget?.name ?? '' })}
      </Modal>
    </div>
  );
}
