import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { save as saveFileDialog } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { Check, X, Plus, Pencil, Trash2, UserRound, Download, List, RotateCcw, ExternalLink } from 'lucide-react';
import { api, type Employee, type Agent, type AgentLead, type AgentLeadStage, type AgentTrainingPost } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc } from '../lib/date';
import { classifyAttachment } from '../lib/attachment';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import LoadingScreen from '../components/LoadingScreen';

const REREGISTER_STEPS = ['full', 'name', 'phone', 'address', 'email', 'passport'] as const;
type ReregisterStep = (typeof REREGISTER_STEPS)[number];

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
  const location = useLocation();
  const navigate = useNavigate();

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
  const [editingPost, setEditingPost] = useState<AgentTrainingPost | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postBusy, setPostBusy] = useState(false);

  const [reregisterAgent, setReregisterAgent] = useState<Agent | null>(null);
  const [reregisterStep, setReregisterStep] = useState<ReregisterStep>('full');
  const [reregisterBusy, setReregisterBusy] = useState(false);

  const [deleteAgentTarget, setDeleteAgentTarget] = useState<Agent | null>(null);
  const [deleteAgentBusy, setDeleteAgentBusy] = useState(false);

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

  // Переход по уведомлению о заявке/новом клиенте агента (см.
  // Topbar.tsx::resolveNotificationTarget) — как только списки загрузились,
  // открываем нужную карточку агента.
  useEffect(() => {
    const state = location.state as { openAgentId?: string; openLeadId?: string } | undefined;
    if (!state) return;
    if (state.openAgentId) {
      const a = agents.find((x) => x.id === state.openAgentId);
      if (a) setSelected(a);
    } else if (state.openLeadId) {
      const lead = leads.find((x) => x.id === state.openLeadId);
      if (lead) {
        const a = agents.find((x) => x.id === lead.agentId);
        if (a) setSelected(a);
      }
    }
  }, [agents, leads, location.state]);

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

  const handleSavePost = async () => {
    if (!postTitle.trim() || !postBody.trim()) {
      showToast('error', t('agents.postErrorRequired'));
      return;
    }
    setPostBusy(true);
    try {
      if (editingPost) {
        await api.updateAgentTrainingPost({ actorId: currentEmployee.id, id: editingPost.id, title: postTitle.trim(), body: postBody.trim() });
      } else {
        await api.createAgentTrainingPost({ actorId: currentEmployee.id, title: postTitle.trim(), body: postBody.trim() });
      }
      setPostFormOpen(false);
      setEditingPost(null);
      setPostTitle('');
      setPostBody('');
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('agents.errorGeneric'));
    } finally {
      setPostBusy(false);
    }
  };

  const openEditPost = (post: AgentTrainingPost) => {
    setEditingPost(post);
    setPostTitle(post.title);
    setPostBody(post.body);
    setPostFormOpen(true);
  };

  const openNewPost = () => {
    setEditingPost(null);
    setPostTitle('');
    setPostBody('');
    setPostFormOpen(true);
  };

  const handleDeletePost = async (id: string) => {
    try {
      await api.deleteAgentTrainingPost({ actorId: currentEmployee.id, id });
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('agents.errorGeneric'));
    }
  };

  const handleRequestReregistration = async () => {
    if (!reregisterAgent) return;
    setReregisterBusy(true);
    try {
      await api.requestAgentReregistration({
        actorId: currentEmployee.id,
        agentId: reregisterAgent.id,
        fromStep: reregisterStep === 'full' ? undefined : reregisterStep,
      });
      showToast('success', t('agents.reregisterSuccess'));
      setReregisterAgent(null);
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('agents.errorGeneric'));
    } finally {
      setReregisterBusy(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!deleteAgentTarget) return;
    setDeleteAgentBusy(true);
    try {
      await api.deleteAgent({ actorId: currentEmployee.id, agentId: deleteAgentTarget.id });
      setDeleteAgentTarget(null);
      setSelected((prev) => (prev?.id === deleteAgentTarget.id ? null : prev));
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('agents.errorGeneric'));
    } finally {
      setDeleteAgentBusy(false);
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
      // Бэкенд отдаёт готовый файл как base64 (а не пишет его сам на диск) —
      // так экспорт работает и когда CRM подключена к серверу как клиент по
      // сети, а не только когда команда исполняется на самой машине с базой.
      const base64 = await api.exportAgentsExcel({ actorId: currentEmployee.id });
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      await writeFile(destPath, bytes);
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
                  <button
                    type="button"
                    className="icon-btn"
                    title={t('agents.reregisterBtn')}
                    onClick={() => {
                      setReregisterAgent(a);
                      setReregisterStep('full');
                    }}
                  >
                    <RotateCcw size={14} />
                  </button>
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
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button type="button" className="icon-btn" onClick={() => openEditPost(p)} title={t('common.editBtn')}>
                    <Pencil size={13} />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => handleDeletePost(p.id)} title={t('common.deleteBtn')}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {currentEmployee.isAdmin && (
        <button type="button" className="modal-btn" onClick={openNewPost} style={{ marginTop: 8 }}>
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
              {currentEmployee.isAdmin && (
                <button
                  type="button"
                  className="icon-btn"
                  style={{ marginLeft: 'auto' }}
                  title={t('agents.deleteAgentBtn')}
                  onClick={() => setDeleteAgentTarget(selected)}
                >
                  <Trash2 size={16} />
                </button>
              )}
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
                    {l.stage === 'converted' && l.convertedClientId && (
                      <button
                        type="button"
                        className="reg-entry-attachment reg-attachment-image-link"
                        style={{ width: '100%' }}
                        onClick={() => navigate('/dashboard/clients', { state: { openClientId: l.convertedClientId } })}
                      >
                        <ExternalLink size={12} /> {t('agents.openClientBtn')}
                      </button>
                    )}
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
        size="xl"
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
                <th />
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
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        className="icon-btn"
                        title={t('agents.reregisterBtn')}
                        onClick={() => {
                          setReregisterAgent(a);
                          setReregisterStep('full');
                        }}
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button type="button" className="icon-btn" title={t('agents.deleteAgentBtn')} onClick={() => setDeleteAgentTarget(a)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
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
        title={editingPost ? t('common.editBtn') : t('agents.addPostBtn')}
        onClose={() => setPostFormOpen(false)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setPostFormOpen(false)}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleSavePost} disabled={postBusy}>
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

      {/* Отправить агента на уточнение данных — целиком или с конкретного поля,
          по просьбе пользователя ("может попросить пройти заново регистрацию
          или же с того места откуда он считает нужным"). */}
      <Modal
        open={!!reregisterAgent}
        title={t('agents.reregisterBtn')}
        onClose={() => setReregisterAgent(null)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setReregisterAgent(null)}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleRequestReregistration} disabled={reregisterBusy}>
              {reregisterBusy ? t('common.loading') : t('agents.reregisterConfirmBtn')}
            </button>
          </>
        }
      >
        <p className="settings-hint">{t('agents.reregisterHint', { name: reregisterAgent?.fullName ?? '' })}</p>
        <div className="field">
          <label>{t('agents.reregisterStepLabel')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {REREGISTER_STEPS.map((step) => (
              <label key={step} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" name="reregister-step" checked={reregisterStep === step} onChange={() => setReregisterStep(step)} />
                {t(`agents.reregisterStep.${step}`)}
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteAgentTarget}
        title={t('agents.deleteAgentBtn')}
        onClose={() => setDeleteAgentTarget(null)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setDeleteAgentTarget(null)}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleDeleteAgent} disabled={deleteAgentBusy}>
              {deleteAgentBusy ? t('common.loading') : t('common.deleteBtn')}
            </button>
          </>
        }
      >
        <p className="settings-hint">{t('agents.deleteAgentConfirmBody', { name: deleteAgentTarget?.fullName ?? '' })}</p>
      </Modal>
    </div>
  );
}
