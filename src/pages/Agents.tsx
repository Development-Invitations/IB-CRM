import { useEffect, useState } from 'react';
import { save as saveFileDialog } from '@tauri-apps/plugin-dialog';
import { Check, X, Plus, Trash2, UserRound, Download, List } from 'lucide-react';
import { api, type Employee, type Agent, type AgentLead, type AgentLeadStage, type AgentTrainingPost } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc } from '../lib/date';
import { classifyAttachment } from '../lib/attachment';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import LoadingScreen from '../components/LoadingScreen';

// Раздел "Агенты" (v1.6.0) — физлица-рефереры без входа в CRM, регистрируются
// и работают через отдельного Telegram-бота (см. Settings.tsx::agentsBot,
// src-tauri/src/telegram.rs::handle_agents_bot_update). Общий вид (список
// подтверждённых агентов, их клиенты, обучение) виден всем сотрудникам — но
// личные данные агента (телефон/адрес/почта/фото паспорта) по прямой просьбе
// пользователя видит ТОЛЬКО админ, через отдельную кнопку "Список агентов".
const LEAD_STAGES: AgentLeadStage[] = ['new', 'thinking', 'agreed', 'rejected', 'converted'];

export default function Agents({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<AgentLead[]>([]);
  const [posts, setPosts] = useState<AgentTrainingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState<string | null>(null);

  const [fullListOpen, setFullListOpen] = useState(false);
  const [lightboxAgent, setLightboxAgent] = useState<Agent | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  const [postFormOpen, setPostFormOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postBusy, setPostBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.listAgents(), api.listAgentLeads(), api.listAgentTrainingPosts()])
      .then(([a, l, p]) => {
        setAgents(a);
        setLeads(l);
        setPosts(p);
        setLoading(false);
        setSelected((prev) => (prev ? a.find((x) => x.id === prev.id) ?? null : null));
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

  const pending = agents.filter((a) => a.status === 'pending');
  const resolved = agents.filter((a) => a.status !== 'pending');

  const handleResolve = async (agent: Agent, approve: boolean) => {
    setResolveBusy(true);
    try {
      await api.resolveAgentApplication({ actorId: currentEmployee.id, id: agent.id, approve });
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('agents.errorGeneric'));
    } finally {
      setResolveBusy(false);
    }
  };

  const handleAdvanceStage = async (lead: AgentLead, stage: AgentLeadStage) => {
    setStageBusy(lead.id);
    try {
      await api.advanceAgentLeadStage({ actorId: currentEmployee.id, leadId: lead.id, stage });
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('agents.errorGeneric'));
    } finally {
      setStageBusy(null);
    }
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postBody.trim()) {
      showToast('error', t('agents.postErrorRequired'));
      return;
    }
    setPostBusy(true);
    try {
      await api.createAgentTrainingPost({ actorId: currentEmployee.id, title: postTitle.trim(), body: postBody.trim() });
      setPostFormOpen(false);
      setPostTitle('');
      setPostBody('');
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('agents.errorGeneric'));
    } finally {
      setPostBusy(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await api.deleteAgentTrainingPost({ actorId: currentEmployee.id, id });
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('agents.errorGeneric'));
    }
  };

  const handleExportExcel = async () => {
    const destPath = await saveFileDialog({
      defaultPath: 'ib-crm-agenty.xlsx',
      filters: [{ name: 'Excel', extensions: ['xlsx'] }],
    });
    if (!destPath) return;
    setExportBusy(true);
    try {
      await api.exportAgentsExcel({ actorId: currentEmployee.id, outPath: destPath });
      showToast('success', t('agents.exportSuccess'));
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('agents.errorGeneric'));
    } finally {
      setExportBusy(false);
    }
  };

  if (loading) return <LoadingScreen />;

  const selectedLeads = selected ? leads.filter((l) => l.agentId === selected.id) : [];

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('agents.title')}</h1>
        {currentEmployee.isAdmin && (
          <button type="button" className="modal-btn" onClick={() => setFullListOpen(true)}>
            <List size={14} /> {t('agents.fullListBtn')}
          </button>
        )}
      </div>
      <p className="settings-hint">{t('agents.pageHint')}</p>

      {currentEmployee.isAdmin && pending.length > 0 && (
        <>
          <div className="department-members-title">
            {t('agents.pendingTitle')} <span className="home-tasks-count">{pending.length}</span>
          </div>
          <ul className="client-history-list">
            {pending.map((a) => (
              <li key={a.id} className="client-reg-item">
                <div>
                  <div className="client-reg-name">{a.fullName}</div>
                  <div className="settings-hint client-history-meta">
                    {a.phone || '—'} · {parseSqliteUtc(a.createdAt).toLocaleDateString()}
                  </div>
                  {a.passportPhotoData && classifyAttachment(a.passportPhotoData) === 'image' && (
                    <button type="button" className="reg-entry-attachment reg-attachment-image-link" onClick={() => setLightboxAgent(a)} style={{ marginTop: 4 }}>
                      {t('agents.viewPassportBtn')}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button type="button" className="modal-btn" onClick={() => handleResolve(a, true)} disabled={resolveBusy}>
                    <Check size={14} /> {t('agents.approveBtn')}
                  </button>
                  <button type="button" className="modal-btn danger" onClick={() => handleResolve(a, false)} disabled={resolveBusy}>
                    <X size={14} /> {t('agents.rejectBtn')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="department-members-title">{t('agents.listTitle')}</div>
      {resolved.length === 0 ? (
        <p className="settings-hint">{t('agents.empty')}</p>
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('agents.colName')}</th>
              <th>{t('agents.colStatus')}</th>
              <th>{t('agents.colLeadsCount')}</th>
            </tr>
          </thead>
          <tbody>
            {resolved.map((a) => (
              <tr key={a.id} className="employees-row" onClick={() => setSelected(a)}>
                <td>{a.fullName}</td>
                <td>
                  <span className={`absence-status absence-status-${a.status}`}>{t(`agents.status.${a.status}`)}</span>
                </td>
                <td>{leads.filter((l) => l.agentId === a.id).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="department-members-title" style={{ marginTop: 24 }}>
        {t('agents.trainingTitle')}
      </div>
      <p className="settings-hint">{t('agents.trainingHint')}</p>
      {posts.length === 0 ? (
        <p className="settings-hint">{t('agents.trainingEmpty')}</p>
      ) : (
        <ul className="client-history-list">
          {posts.map((p) => (
            <li key={p.id} className="client-reg-item">
              <div>
                <div className="client-reg-name">{p.title}</div>
                <div className="settings-hint client-history-meta">{p.body}</div>
              </div>
              {currentEmployee.isAdmin && (
                <button type="button" className="icon-btn" onClick={() => handleDeletePost(p.id)} title={t('common.deleteBtn')} style={{ flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {currentEmployee.isAdmin && (
        <button type="button" className="modal-btn" onClick={() => setPostFormOpen(true)} style={{ marginTop: 8 }}>
          <Plus size={14} /> {t('agents.addPostBtn')}
        </button>
      )}

      {/* Карточка агента — общая, без личных данных (телефон/адрес/почта/паспорт — только в admin-only "Список агентов" ниже) */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title={t('agents.cardTitle')}>
        {selected && (
          <div className="employee-card">
            <div className="employee-card-head">
              <div className="department-icon">
                <UserRound size={24} />
              </div>
              <div>
                <div className="employee-card-name">{selected.fullName}</div>
                <span className={`absence-status absence-status-${selected.status}`}>{t(`agents.status.${selected.status}`)}</span>
              </div>
            </div>

            <div className="department-members-title">{t('agents.leadsTitle')}</div>
            {selectedLeads.length === 0 ? (
              <p className="settings-hint">{t('agents.leadsEmpty')}</p>
            ) : (
              <ul className="client-history-list">
                {selectedLeads.map((l) => (
                  <li key={l.id} className="client-reg-item" style={{ flexWrap: 'wrap' }}>
                    <div>
                      <div className="client-reg-name">{l.clientName}</div>
                      <div className="settings-hint client-history-meta">
                        {t('agents.innLabel')}: {l.clientInn}
                        {l.companyName ? ` · ${l.companyName}` : ''}
                        {l.clientPhone ? ` · ${l.clientPhone}` : ''}
                      </div>
                    </div>
                    <span className={`absence-status absence-status-lead-${l.stage}`}>{t(`agents.stage.${l.stage}`)}</span>
                    {currentEmployee.isAdmin && l.stage !== 'converted' && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', width: '100%', marginTop: 6 }}>
                        {LEAD_STAGES.filter((s) => s !== l.stage).map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="modal-btn"
                            style={{ fontSize: 12, padding: '4px 8px' }}
                            disabled={stageBusy === l.id}
                            onClick={() => handleAdvanceStage(l, s)}
                          >
                            {t(`agents.stage.${s}`)}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Drawer>

      {/* Список агентов — admin-only, полные личные данные + Excel-выгрузка */}
      <Modal
        open={fullListOpen}
        title={t('agents.fullListBtn')}
        onClose={() => setFullListOpen(false)}
        size="lg"
        actions={
          <>
            <button className="modal-btn" onClick={handleExportExcel} disabled={exportBusy}>
              <Download size={14} /> {exportBusy ? t('common.loading') : t('agents.exportBtn')}
            </button>
            <button className="modal-btn danger" onClick={() => setFullListOpen(false)}>
              {t('common.close')}
            </button>
          </>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="employees-table">
            <thead>
              <tr>
                <th>{t('agents.colNumber')}</th>
                <th>{t('agents.colName')}</th>
                <th>{t('agents.colPhone')}</th>
                <th>{t('agents.colAddress')}</th>
                <th>{t('agents.colEmail')}</th>
                <th>{t('agents.colStatus')}</th>
                <th>{t('agents.colPassport')}</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td>{a.agentNumber}</td>
                  <td>{a.fullName}</td>
                  <td>{a.phone || '—'}</td>
                  <td>{a.address || '—'}</td>
                  <td>{a.email || '—'}</td>
                  <td>
                    <span className={`absence-status absence-status-${a.status}`}>{t(`agents.status.${a.status}`)}</span>
                  </td>
                  <td>
                    {a.passportPhotoData && classifyAttachment(a.passportPhotoData) === 'image' ? (
                      <button type="button" className="reg-entry-attachment reg-attachment-image-link" onClick={() => setLightboxAgent(a)}>
                        {t('agents.viewPassportBtn')}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {lightboxAgent?.passportPhotoData && (
        <div className="reg-lightbox" onClick={() => setLightboxAgent(null)}>
          <img src={lightboxAgent.passportPhotoData} alt="" />
          <button className="reg-lightbox-close" onClick={() => setLightboxAgent(null)}>
            <X size={20} />
          </button>
        </div>
      )}

      <Modal
        open={postFormOpen}
        title={t('agents.addPostBtn')}
        onClose={() => setPostFormOpen(false)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setPostFormOpen(false)}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleCreatePost} disabled={postBusy}>
              {postBusy ? t('employees.savingBusy') : t('employees.addConfirm')}
            </button>
          </>
        }
      >
        <div className="field">
          <label>{t('agents.postTitleLabel')}</label>
          <input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('agents.postBodyLabel')}</label>
          <textarea rows={5} value={postBody} onChange={(e) => setPostBody(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
