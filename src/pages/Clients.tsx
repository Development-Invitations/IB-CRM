import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Contact, Trash2, Send, ExternalLink, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type Employee, type Client, type ClientHistoryEntry, type Regulation, type PartnerRegulation, type Partner } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc } from '../lib/date';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import ClientFormModal from '../components/ClientFormModal';
import LoadingScreen from '../components/LoadingScreen';
import Select from '../components/Select';

export default function Clients({
  currentEmployee,
  scopedPartnerId,
  regulationsBasePath = '../regulations',
}: {
  currentEmployee: Employee;
  // undefined — обычная неограниченная страница CRM (видит и создаёт клиентов
  // без ограничения по партнёру); строка — вид одного партнёра (его панель
  // или админский просмотр конкретного партнёра): список клиентов сервер сам
  // ограничивает этим партнёром, колонка/фильтр "Партнёр" не нужны.
  scopedPartnerId?: string;
  regulationsBasePath?: string;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);

  const [selected, setSelected] = useState<Client | null>(null);
  const [history, setHistory] = useState<ClientHistoryEntry[]>([]);
  const [clientRegs, setClientRegs] = useState<Regulation[]>([]);
  const [clientPartnerRegs, setClientPartnerRegs] = useState<PartnerRegulation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);
  const [moveBusy, setMoveBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.listClients({ actorId: currentEmployee.id, partnerId: scopedPartnerId })
      .then((list) => {
        setClients(list);
        setLoading(false);
        setSelected((prev) => (prev ? list.find((c) => c.id === prev.id) ?? null : null));
      })
      .catch(() => {
        setLoading(false);
        showToast('error', t('common.loadError'));
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedPartnerId]);

  useEffect(() => {
    if (scopedPartnerId !== undefined || !currentEmployee.isAdmin) return;
    api.listPartners().then(setPartners).catch(() => {});
  }, [scopedPartnerId, currentEmployee.isAdmin]);

  useEffect(() => {
    if (!selected) {
      setHistory([]);
      setClientRegs([]);
      setClientPartnerRegs([]);
      return;
    }
    setHistoryLoading(true);
    // Партнёр-источник для запроса регламентов — берём либо текущего
    // (partnerId), либо, если клиента уже перенесли в Базу CRM, того, из чьей
    // панели он пришёл (originPartnerId) — иначе "Регламенты с партнёром"
    // молча пропадали бы из карточки клиента сразу после переноса.
    const regPartnerId = selected.partnerId || selected.originPartnerId;
    Promise.all([
      api.listClientHistory({ actorId: currentEmployee.id, clientId: selected.id }),
      api.listRegulations(),
      regPartnerId && (currentEmployee.isAdmin || currentEmployee.isPartner)
        ? api.listPartnerRegulations({ actorId: currentEmployee.id, partnerId: regPartnerId }).catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([entries, allRegs, partnerRegs]) => {
        setHistory(entries);
        setClientRegs(allRegs.filter((r) => r.clientId === selected.id));
        setClientPartnerRegs(partnerRegs.filter((r) => r.clientId === selected.id));
        setHistoryLoading(false);
      })
      .catch(() => {
        setHistoryLoading(false);
        showToast('error', t('common.loadError'));
      });
  }, [selected?.id]);

  const openCreate = () => {
    setEditingClient(undefined);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleteBusy(true);
    try {
      await api.deleteClient({ adminId: currentEmployee.id, id: selected.id });
      showToast('success', t('clients.deleted'));
      setDeleteConfirmOpen(false);
      setSelected(null);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('clients.errorGeneric'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleMoveToCrm = async () => {
    if (!selected) return;
    setMoveBusy(true);
    try {
      await api.moveClientToCrmBase({ adminId: currentEmployee.id, id: selected.id });
      showToast('success', t('clients.moveToCrmSuccess'));
      setMoveConfirmOpen(false);
      // Закрываем карточку осознанно: после переноса клиент выпадает из
      // текущего отфильтрованного списка (особенно если открыт из
      // AdminPartnerWorkspace) — держать её открытой было бы confusing.
      setSelected(null);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('clients.errorGeneric'));
    } finally {
      setMoveBusy(false);
    }
  };

  const handleAddNote = async () => {
    if (!selected || !newNote.trim()) return;
    setNoteBusy(true);
    try {
      await api.addClientHistory({ clientId: selected.id, actorId: currentEmployee.id, description: newNote.trim() });
      setNewNote('');
      const entries = await api.listClientHistory({ actorId: currentEmployee.id, clientId: selected.id });
      setHistory(entries);
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('clients.errorGeneric'));
    } finally {
      setNoteBusy(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (originFilter === 'crm' && c.partnerId) return false;
    if (originFilter && originFilter !== 'crm' && c.partnerId !== originFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      c.clientNumber.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('sidebar.clients')}</h1>
        <button className="primary employees-add-btn" onClick={openCreate}>
          <Plus size={16} /> {t('clients.addBtn')}
        </button>
      </div>

      <div className="clients-search-filter-row">
        <div className="employees-search-row" style={{ marginBottom: 0 }}>
          <Search size={15} className="employees-search-icon" />
          <input className="employees-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('clients.searchPlaceholder')} />
        </div>
        {scopedPartnerId === undefined && currentEmployee.isAdmin && partners.length > 0 && (
          <Select
            value={originFilter}
            options={[
              { value: '', label: t('common.all') },
              { value: 'crm', label: t('clients.originCrm') },
              ...partners.map((p) => ({ value: p.id, label: p.name })),
            ]}
            onChange={setOriginFilter}
          />
        )}
      </div>

      {loading ? (
        <LoadingScreen compact />
      ) : filteredClients.length === 0 ? (
        <p className="settings-hint">{t('clients.empty')}</p>
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('clients.colId')}</th>
              <th>{t('clients.colName')}</th>
              <th>{t('clients.colPhone')}</th>
              <th>{t('clients.colEmail')}</th>
              {scopedPartnerId === undefined && <th>{t('clients.colOrigin')}</th>}
              <th>{t('clients.colCreated')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((c) => (
              <tr key={c.id} className="employees-row" onClick={() => setSelected(c)}>
                <td>{c.clientNumber}</td>
                <td>{c.name}</td>
                <td>{c.phone || '—'}</td>
                <td>{c.email || '—'}</td>
                {scopedPartnerId === undefined && (
                  <td>
                    {c.partnerId ? (
                      <span className="absence-status">{c.partnerName}</span>
                    ) : (
                      <span className="settings-hint">
                        {t('clients.originCrm')}
                        {c.originPartnerId ? ` · ${t('clients.originPartnerNote', { name: c.originPartnerName ?? '' })}` : ''}
                      </span>
                    )}
                  </td>
                )}
                <td>{parseSqliteUtc(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={t('clients.cardTitle')}
        footer={
          selected && (
            <>
              <button className="modal-btn" onClick={() => selected && openEdit(selected)}>
                <Pencil size={14} /> {t('employees.editBtn')}
              </button>
              {currentEmployee.isAdmin && selected.partnerId && (
                <button className="modal-btn" onClick={() => setMoveConfirmOpen(true)}>
                  <ArrowRightLeft size={14} /> {t('clients.moveToCrmBtn')}
                </button>
              )}
              {currentEmployee.isAdmin && (
                <button className="modal-btn danger" onClick={() => setDeleteConfirmOpen(true)}>
                  <Trash2 size={14} /> {t('clients.deleteBtn')}
                </button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="employee-card">
            <div className="employee-card-head">
              <div className="department-icon">
                <Contact size={24} />
              </div>
              <div>
                <div className="employee-card-name">{selected.name}</div>
                <div className="settings-hint">{selected.clientNumber}</div>
              </div>
            </div>

            <div className="employee-card-row">
              <span className="settings-hint">{t('employees.phoneLabel')}</span>
              <span>{selected.phone || '—'}</span>
            </div>
            <div className="employee-card-row">
              <span className="settings-hint">{t('clients.emailLabel')}</span>
              <span>{selected.email || '—'}</span>
            </div>
            {(selected.contactPerson || selected.contactPosition) && (
              <div className="employee-card-row">
                <span className="settings-hint">{t('clients.contactPersonLabel')}</span>
                <span>
                  {selected.contactPerson || ''}
                  {selected.contactPosition ? ` · ${selected.contactPosition}` : ''}
                </span>
              </div>
            )}
            <div className="employee-card-row">
              <span className="settings-hint">{t('clients.addressLabel')}</span>
              <span>{selected.address || '—'}</span>
            </div>
            {selected.notes && (
              <div className="employee-card-row">
                <span className="settings-hint">{t('clients.notesLabel')}</span>
                <span>{selected.notes}</span>
              </div>
            )}
            {selected.serviceId ? (
              <div className="employee-card-row">
                <span className="settings-hint">{t('clients.serviceLabel')}</span>
                <span>
                  {selected.serviceName}
                  {selected.dealValue ? ` · ${selected.dealValue}` : ''}
                </span>
              </div>
            ) : (
              selected.dealValue && (
                <div className="employee-card-row">
                  <span className="settings-hint">{t('clients.dealValueLabel')}</span>
                  <span>{selected.dealValue}</span>
                </div>
              )
            )}
            {scopedPartnerId === undefined && (
              <div className="employee-card-row">
                <span className="settings-hint">{t('clients.originLabel')}</span>
                <span>{selected.partnerId ? selected.partnerName : t('clients.originCrm')}</span>
              </div>
            )}
            {scopedPartnerId === undefined && !selected.partnerId && selected.originPartnerId && (
              <div className="employee-card-row">
                <span className="settings-hint" />
                <span className="settings-hint">{t('clients.originPartnerNote', { name: selected.originPartnerName ?? '' })}</span>
              </div>
            )}
            <div className="employee-card-row">
              <span className="settings-hint">{t('clients.colCreated')}</span>
              <span>
                {parseSqliteUtc(selected.createdAt).toLocaleDateString()}
                {selected.createdByName ? ` · ${selected.createdByName}` : ''}
              </span>
            </div>

            {clientRegs.length > 0 && (
              <>
                <div className="department-members-title">{t('clients.regulationsTitle')}</div>
                <ul className="client-history-list">
                  {clientRegs.map((r) => (
                    <li
                      key={r.id}
                      className="client-reg-item"
                      onClick={() => navigate('../regulations', { state: { openRegId: r.id } })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <div className="client-reg-name">
                          <ExternalLink size={12} style={{ marginRight: 5, opacity: 0.5 }} />
                          {r.title}
                        </div>
                        <div className="settings-hint client-history-meta">{r.regNumber} · {r.ownerName}</div>
                      </div>
                      <span className={`absence-status reg-status-${r.status}`} style={{ flexShrink: 0 }}>
                        {t(r.status === 'active' ? 'regulations.statusActive' : 'regulations.statusClosed')}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {clientPartnerRegs.length > 0 && (
              <>
                <div className="department-members-title">{t('clients.partnerRegulationsTitle')}</div>
                <ul className="client-history-list">
                  {clientPartnerRegs.map((r) => (
                    <li
                      key={r.id}
                      className="client-reg-item"
                      onClick={() => navigate(regulationsBasePath, { state: { openPartnerRegId: r.id } })}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <div className="client-reg-name">
                          <ExternalLink size={12} style={{ marginRight: 5, opacity: 0.5 }} />
                          {r.title}
                        </div>
                        <div className="settings-hint client-history-meta">{r.regNumber}</div>
                      </div>
                      <span className={`absence-status reg-status-${r.status}`} style={{ flexShrink: 0 }}>
                        {t(r.status === 'active' ? 'partnerRegulations.statusActive' : 'partnerRegulations.statusClosed')}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="department-members-title">{t('clients.historyTitle')}</div>

            <div className="client-history-add">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t('clients.historyAddPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <button type="button" className="modal-btn" onClick={handleAddNote} disabled={!newNote.trim() || noteBusy}>
                <Send size={14} />
              </button>
            </div>

            {historyLoading ? (
              <LoadingScreen compact />
            ) : history.length === 0 ? (
              <p className="settings-hint">{t('clients.historyEmpty')}</p>
            ) : (
              <ul className="client-history-list">
                {history.map((h) => (
                  <li key={h.id}>
                    <div>{h.description}</div>
                    <div className="settings-hint client-history-meta">
                      {parseSqliteUtc(h.createdAt).toLocaleString()}
                      {h.createdByName ? ` · ${h.createdByName}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Drawer>

      <ClientFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        client={editingClient}
        currentEmployee={currentEmployee}
        lockedPartnerId={scopedPartnerId}
        onSaved={load}
      />

      <Modal
        open={deleteConfirmOpen}
        title={t('clients.deleteConfirmTitle')}
        onClose={() => setDeleteConfirmOpen(false)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteBusy}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? t('common.loading') : t('clients.deleteBtn')}
            </button>
          </>
        }
      >
        {t('clients.deleteConfirmBody', { name: selected?.name ?? '' })}
      </Modal>

      <Modal
        open={moveConfirmOpen}
        title={t('clients.moveToCrmConfirmTitle')}
        onClose={() => setMoveConfirmOpen(false)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setMoveConfirmOpen(false)} disabled={moveBusy}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleMoveToCrm} disabled={moveBusy}>
              {moveBusy ? t('common.loading') : t('clients.moveToCrmBtn')}
            </button>
          </>
        }
      >
        {t('clients.moveToCrmConfirmBody', { name: selected?.name ?? '' })}
      </Modal>
    </div>
  );
}
