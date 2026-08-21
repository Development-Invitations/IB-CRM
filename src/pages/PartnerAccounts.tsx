import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, UserPlus, ChevronDown, Check, X } from 'lucide-react';
import { api, type Employee, type Partner } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Modal from '../components/Modal';
import EmployeeFormModal from '../components/EmployeeFormModal';
import LoadingScreen from '../components/LoadingScreen';

// Партнёры — отдельная страница сайдбара (v0.4.2), раньше была вкладкой
// внутри Employees.tsx. Просмотр карточки аккаунта партнёра — переход в его
// полный кабинет (/dashboard/employees/:id, EmployeeProfile.tsx уже
// адаптирован под is_partner), а не отдельный Drawer — не дублируем
// объёмную JSX-карточку сотрудника, которая и так уже умеет показывать
// партнёрские аккаунты корректно.
export default function PartnerAccounts({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPartnerIds, setExpandedPartnerIds] = useState<Set<string>>(new Set());
  const [newPartnerName, setNewPartnerName] = useState('');
  const [partnerBusy, setPartnerBusy] = useState(false);
  const [deletePartnerTarget, setDeletePartnerTarget] = useState<Partner | null>(null);
  const [renamingPartnerId, setRenamingPartnerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formInitialPartner, setFormInitialPartner] = useState<Partner | undefined>(undefined);

  const load = () => {
    setLoading(true);
    Promise.all([api.listEmployees(), api.listPartners()])
      .then(([emps, parts]) => {
        setEmployees(emps);
        setPartners(parts);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        showToast('error', t('common.loadError'));
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreatePartner = async () => {
    if (!newPartnerName.trim()) return;
    setPartnerBusy(true);
    try {
      await api.createPartner({ adminId: currentEmployee.id, name: newPartnerName.trim() });
      showToast('success', t('partners.created'));
      setNewPartnerName('');
      load();
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
      load();
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
      load();
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
    setFormInitialPartner(partner);
    setFormOpen(true);
  };

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('partners.tabLabel')}</h1>
      </div>

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

      {loading ? (
        <LoadingScreen compact />
      ) : partners.length === 0 ? (
        <p className="settings-hint">{t('partners.empty')}</p>
      ) : (
        <div className="sessions-accordion" style={{ marginTop: 16 }}>
          {partners.map((partner) => {
            const accounts = employees.filter((e) => e.partnerId === partner.id);
            const isExpanded = expandedPartnerIds.has(partner.id);
            return (
              <div className="sessions-day-group" key={partner.id}>
                <div className="sessions-day-header partners-tab-header">
                  <button type="button" className="partners-tab-toggle" onClick={() => togglePartnerExpanded(partner.id)}>
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
                          <li key={acc.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/employees/${acc.id}`)}>
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

      <EmployeeFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode="create"
        employees={employees}
        positions={[]}
        departments={[]}
        onPositionCreated={() => {}}
        currentEmployeeId={currentEmployee.id}
        onSaved={load}
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
