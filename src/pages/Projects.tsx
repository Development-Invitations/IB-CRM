import { useEffect, useState } from 'react';
import { Plus, Pencil, FolderKanban, Trash2, Send, UserPlus, X, Repeat, CheckSquare } from 'lucide-react';
import { api, type Employee, type Project, type ProjectMember, type ProjectChatMessage, type Client, type ProjectMemberRole } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { parseSqliteUtc } from '../lib/date';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import Select from '../components/Select';
import SearchableSelect from '../components/SearchableSelect';
import ProjectFormModal from '../components/ProjectFormModal';
import LoadingScreen from '../components/LoadingScreen';

const STATUS_LABEL_KEYS: Record<Project['status'], string> = {
  planning: 'projects.statusPlanning',
  active: 'projects.statusActive',
  on_hold: 'projects.statusOnHold',
  completed: 'projects.statusCompleted',
  cancelled: 'projects.statusCancelled',
};

export default function Projects({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [chat, setChat] = useState<ProjectChatMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [addMemberId, setAddMemberId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<ProjectMemberRole>('member');
  const [addMemberBusy, setAddMemberBusy] = useState(false);

  const [transferTarget, setTransferTarget] = useState<ProjectMember | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);

  const [chatText, setChatText] = useState('');
  const [chatIsTask, setChatIsTask] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.listProjects(), api.listClients(), api.listEmployees()]).then(([p, c, e]) => {
      setProjects(p);
      setClients(c);
      setEmployees(e);
      setLoading(false);
      setSelected((prev) => (prev ? p.find((x) => x.id === prev.id) ?? null : null));
    });
  };

  useEffect(() => {
    load();
  }, []);

  const loadDetail = () => {
    if (!selected) return;
    setDetailLoading(true);
    Promise.all([api.listProjectMembers(selected.id), api.listProjectChat(selected.id)]).then(([m, c]) => {
      setMembers(m);
      setChat(c);
      setDetailLoading(false);
    });
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const isManager = !!selected && (currentEmployee.isAdmin || selected.ownerId === currentEmployee.id);
  const isParticipant =
    !!selected &&
    (currentEmployee.isAdmin || selected.ownerId === currentEmployee.id || members.some((m) => m.employeeId === currentEmployee.id));

  const openCreate = () => {
    setEditingProject(undefined);
    setFormOpen(true);
  };
  const openEdit = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleteBusy(true);
    try {
      await api.deleteProject({ adminId: currentEmployee.id, id: selected.id });
      showToast('success', t('projects.deleted'));
      setDeleteConfirmOpen(false);
      setSelected(null);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const memberOptions = selected
    ? [
        { value: '', label: t('employees.notSelected') },
        ...employees
          .filter((e) => !members.some((m) => m.employeeId === e.id))
          .map((e) => ({ value: e.id, label: e.fullName || e.login })),
      ]
    : [];

  const handleAddMember = async () => {
    if (!selected || !addMemberId) return;
    setAddMemberBusy(true);
    try {
      await api.addProjectMember({ actorId: currentEmployee.id, projectId: selected.id, employeeId: addMemberId, role: addMemberRole });
      showToast('success', t('projects.memberAdded'));
      setAddMemberId('');
      setAddMemberRole('member');
      loadDetail();
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setAddMemberBusy(false);
    }
  };

  const handleRemoveMember = async (m: ProjectMember) => {
    if (!selected) return;
    try {
      await api.removeProjectMember({ actorId: currentEmployee.id, projectId: selected.id, employeeId: m.employeeId });
      showToast('success', t('projects.memberRemoved'));
      loadDetail();
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    }
  };

  const handleTransfer = async () => {
    if (!selected || !transferTarget) return;
    setTransferBusy(true);
    try {
      await api.transferProjectOwnership({ actorId: currentEmployee.id, projectId: selected.id, newOwnerId: transferTarget.employeeId });
      showToast('success', t('projects.transferred'));
      setTransferTarget(null);
      loadDetail();
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setTransferBusy(false);
    }
  };

  const handleSendChat = async () => {
    if (!selected || !chatText.trim()) return;
    setChatBusy(true);
    try {
      await api.sendProjectChatMessage({ actorId: currentEmployee.id, projectId: selected.id, content: chatText.trim(), isTask: chatIsTask });
      setChatText('');
      setChatIsTask(false);
      const messages = await api.listProjectChat(selected.id);
      setChat(messages);
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('projects.errorGeneric'));
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('sidebar.projects')}</h1>
        <button className="primary employees-add-btn" onClick={openCreate}>
          <Plus size={16} /> {t('projects.addBtn')}
        </button>
      </div>

      {loading ? (
        <LoadingScreen compact />
      ) : projects.length === 0 ? (
        <p className="settings-hint">{t('projects.empty')}</p>
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('projects.colId')}</th>
              <th>{t('projects.colName')}</th>
              <th>{t('projects.colClient')}</th>
              <th>{t('projects.colOwner')}</th>
              <th>{t('projects.colStatus')}</th>
              <th>{t('projects.colMembers')}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="employees-row" onClick={() => setSelected(p)}>
                <td>{p.projectNumber}</td>
                <td>{p.name}</td>
                <td>{p.clientName || '—'}</td>
                <td>{p.ownerName}</td>
                <td>
                  <span className={`absence-status project-status-${p.status}`}>{t(STATUS_LABEL_KEYS[p.status])}</span>
                </td>
                <td>{p.memberCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={t('projects.cardTitle')}
        footer={
          selected && (
            <>
              {isManager && (
                <button className="modal-btn" onClick={() => openEdit(selected)}>
                  <Pencil size={14} /> {t('employees.editBtn')}
                </button>
              )}
              {currentEmployee.isAdmin && (
                <button className="modal-btn danger" onClick={() => setDeleteConfirmOpen(true)}>
                  <Trash2 size={14} /> {t('projects.deleteBtn')}
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
                <FolderKanban size={24} />
              </div>
              <div>
                <div className="employee-card-name">{selected.name}</div>
                <div className="settings-hint">{selected.projectNumber}</div>
              </div>
            </div>

            {selected.description && (
              <div className="employee-card-row">
                <span className="settings-hint">{t('projects.descriptionLabel')}</span>
                <span>{selected.description}</span>
              </div>
            )}
            <div className="employee-card-row">
              <span className="settings-hint">{t('projects.clientLabel')}</span>
              <span>{selected.clientName || '—'}</span>
            </div>
            <div className="employee-card-row">
              <span className="settings-hint">{t('projects.statusLabel')}</span>
              <span className={`absence-status project-status-${selected.status}`}>{t(STATUS_LABEL_KEYS[selected.status])}</span>
            </div>
            <div className="employee-card-row">
              <span className="settings-hint">{t('projects.ownerLabel')}</span>
              <span>{selected.ownerName}</span>
            </div>
            <div className="employee-card-row">
              <span className="settings-hint">{t('projects.createdLabel')}</span>
              <span>
                {parseSqliteUtc(selected.createdAt).toLocaleDateString()}
                {selected.createdByName ? ` · ${selected.createdByName}` : ''}
              </span>
            </div>

            <div className="department-members-title">{t('projects.membersTitle')}</div>

            {isManager && (
              <div className="department-add-member-row">
                <SearchableSelect
                  value={addMemberId}
                  options={memberOptions}
                  onChange={setAddMemberId}
                  searchPlaceholder={t('employees.searchPlaceholder')}
                  emptyLabel={t('employees.searchEmpty')}
                />
                <Select
                  value={addMemberRole}
                  options={[
                    { value: 'member', label: t('projects.roleMember') },
                    { value: 'assistant', label: t('projects.roleAssistant') },
                  ]}
                  onChange={(v) => setAddMemberRole(v as ProjectMemberRole)}
                />
                <button className="modal-btn" onClick={handleAddMember} disabled={!addMemberId || addMemberBusy}>
                  <UserPlus size={14} />
                </button>
              </div>
            )}

            {detailLoading ? (
              <LoadingScreen compact />
            ) : members.length === 0 ? (
              <p className="settings-hint">{t('departments.noMembers')}</p>
            ) : (
              <ul className="department-members-list">
                {members.map((m) => (
                  <li key={m.employeeId} className="department-member-row">
                    <span>
                      {m.employeeName}
                      {m.isOwner ? (
                        <span className="role-badge role-badge-head" style={{ marginLeft: 8 }}>
                          {t('projects.ownerLabel')}
                        </span>
                      ) : m.roleInProject === 'assistant' ? (
                        <span className="role-badge role-badge-deputy" style={{ marginLeft: 8 }}>
                          {t('projects.roleAssistant')}
                        </span>
                      ) : null}
                    </span>
                    {isManager && (
                      <span className="project-member-actions">
                        {!m.isOwner && (
                          <button
                            type="button"
                            className="department-member-remove"
                            title={t('projects.transferBtn')}
                            onClick={() => setTransferTarget(m)}
                          >
                            <Repeat size={13} />
                          </button>
                        )}
                        {!m.isOwner && (
                          <button
                            type="button"
                            className="department-member-remove"
                            title={t('projects.removeMemberBtn')}
                            onClick={() => handleRemoveMember(m)}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="department-members-title">{t('projects.chatTitle')}</div>

            {chat.length === 0 ? (
              <p className="settings-hint">{t('projects.chatEmpty')}</p>
            ) : (
              <ul className="project-chat-list">
                {chat.map((m) => (
                  <li key={m.id} className={m.isTask ? 'project-chat-task' : ''}>
                    <div className="project-chat-meta">
                      <strong>{m.senderName}</strong>
                      <span className="settings-hint">{parseSqliteUtc(m.createdAt).toLocaleString()}</span>
                      {m.isTask && (
                        <span className="role-badge role-badge-head">
                          <CheckSquare size={11} /> {t('projects.chatTaskBadge')}
                        </span>
                      )}
                    </div>
                    <div>{m.content}</div>
                  </li>
                ))}
              </ul>
            )}

            {isParticipant ? (
              <div className="project-chat-form">
                <textarea
                  rows={2}
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder={t('projects.chatPlaceholder')}
                />
                <div className="project-chat-form-actions">
                  <label className="checkbox-row">
                    <input type="checkbox" checked={chatIsTask} onChange={(e) => setChatIsTask(e.target.checked)} />
                    {t('projects.chatTaskToggle')}
                  </label>
                  <button className="modal-btn" onClick={handleSendChat} disabled={!chatText.trim() || chatBusy}>
                    <Send size={14} /> {t('projects.chatSendBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="settings-hint">{t('projects.notAMemberHint')}</p>
            )}
          </div>
        )}
      </Drawer>

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        project={editingProject}
        clients={clients}
        currentEmployeeId={currentEmployee.id}
        onSaved={load}
      />

      <Modal
        open={deleteConfirmOpen}
        title={t('projects.deleteConfirmTitle')}
        onClose={() => setDeleteConfirmOpen(false)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteBusy}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? t('common.loading') : t('projects.deleteBtn')}
            </button>
          </>
        }
      >
        {t('projects.deleteConfirmBody', { name: selected?.name ?? '' })}
      </Modal>

      <Modal
        open={!!transferTarget}
        title={t('projects.transferConfirmTitle')}
        onClose={() => setTransferTarget(null)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setTransferTarget(null)} disabled={transferBusy}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleTransfer} disabled={transferBusy}>
              {transferBusy ? t('common.loading') : t('projects.transferBtn')}
            </button>
          </>
        }
      >
        {t('projects.transferConfirmBody', { name: transferTarget?.employeeName ?? '' })}
      </Modal>
    </div>
  );
}
