import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { connection, sessionToken } from './connection';

// Единственная точка входа для всех вызовов бэкенда (все ~90 обёрток ниже
// зовут именно её) — поэтому именно здесь, и только здесь, решаем, идти ли
// в локальный Tauri-процесс (как раньше) или по сети на чужой сервер
// (режим "клиент", см. connection.ts и src-tauri/src/server.rs). Ни одну из
// обёрток api.xxx() ниже менять не пришлось.
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!connection.isClient()) {
    return tauriInvoke<T>(cmd, args);
  }

  const serverUrl = connection.getServerUrl();
  if (!serverUrl) {
    // Кидаем именно строку, а не Error — весь остальной код (все catch-блоки
    // по всему приложению) писался под конвенцию локального Tauri IPC, где
    // ошибка Rust-команды (Result<T, String>) приходит в JS как голая строка,
    // а не объект Error. Если тут бросить Error, каждый `typeof err ===
    // 'string' ? err : ...` по всему приложению перестаёт находить реальный
    // текст ошибки и молча показывает общий фоллбэк — так и произошло, пока
    // это не поправили.
    throw 'Не задан адрес сервера';
  }

  // Tauri сам решает, как разложить args по параметрам Rust-команды: если
  // команда принимает один параметр payload — JS передаёт { payload: {...} },
  // если несколько отдельных (id, employeeId...) — передаёт их плоско. HTTP
  // на стороне сервера (dispatch.rs) ожидает всегда плоский объект под
  // "payload" в теле запроса — тут просто разворачиваем args так же, как
  // это неявно делает сам Tauri IPC.
  const body = args && 'payload' in args ? (args as { payload: unknown }).payload : (args ?? {});

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = sessionToken.get();
  if (token) headers['X-Session-Token'] = token;

  // Таймаут на сетевой запрос — без него зависшее соединение (сервер не
  // отвечает, но и не рвёт TCP-соединение явно) вешало бы страницу в
  // состоянии "загрузка" навсегда, даже после того как все catch-блоки по
  // всему приложению уже научились обрабатывать реальные ошибки.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response: Awaited<ReturnType<typeof tauriFetch>>;
  try {
    response = await tauriFetch(`${serverUrl}/api/invoke`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ command: cmd, payload: body }),
      signal: controller.signal,
    });
  } catch {
    throw 'Нет соединения с сервером';
  } finally {
    clearTimeout(timeoutId);
  }

  let result: { ok: boolean; data?: T; error?: string; token?: string };
  try {
    result = await response.json();
  } catch {
    throw `Сервер вернул некорректный ответ (HTTP ${response.status})`;
  }

  if (result.token) sessionToken.set(result.token);
  if (!result.ok) throw result.error || 'Ошибка сервера';
  return result.data as T;
}

export type EmployeeStatus = 'away15' | 'lunch' | 'vacation' | 'dayoff';

export type AbsenceRequestType = 'dayoff_worked' | 'dayoff_unpaid' | 'vacation' | 'business_trip' | 'remote_work';

export type AbsenceRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: AbsenceRequestType;
  startDate: string;
  endDate: string;
  reason: string | null;
  makeupSlots: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedBy: string | null;
  resolvedByName: string | null;
  resolvedByIsAdmin: boolean;
  resolvedAt: string | null;
};

export type Client = {
  id: string;
  clientNumber: string;
  name: string;
  contactPerson: string | null;
  contactPosition: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type ClientHistoryEntry = {
  id: string;
  clientId: string;
  description: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export type Project = {
  id: string;
  projectNumber: string;
  name: string;
  description: string | null;
  clientId: string | null;
  clientName: string | null;
  ownerId: string;
  ownerName: string;
  status: ProjectStatus;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
};

export type ProjectMemberRole = 'member' | 'assistant';

export type ProjectMember = {
  employeeId: string;
  employeeName: string;
  roleInProject: ProjectMemberRole;
  isOwner: boolean;
  addedAt: string;
};

export type ProjectChatMessage = {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  targetEmployeeId: string;
  targetName: string;
  content: string;
  attachmentData: string | null;
  attachmentName: string | null;
  deadline: string | null;
  status: RegulationEntryStatus;
  createdAt: string;
  replyCount: number;
};

export type ProjectChatReply = {
  id: string;
  messageId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type RegulationStatus = 'active' | 'closed';
export type RegulationEntryStatus = 'open' | 'done' | 'cancelled';
export type RegulationMemberRole = 'owner' | 'member' | 'assistant';

export type Regulation = {
  id: string;
  regNumber: string;
  slug: string;
  title: string;
  description: string | null;
  clientId: string | null;
  clientName: string | null;
  ownerId: string;
  ownerName: string;
  status: RegulationStatus;
  deadline: string | null;
  closedAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  entryCount: number;
};

export type RegulationMember = {
  employeeId: string;
  employeeName: string;
  roleInReg: RegulationMemberRole;
  addedAt: string;
};

export type RegulationEntry = {
  id: string;
  regulationId: string;
  authorId: string;
  authorName: string;
  targetEmployeeId: string;
  targetName: string;
  content: string;
  attachmentData: string | null;
  attachmentName: string | null;
  deadline: string | null;
  status: RegulationEntryStatus;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
};

export type MyTask = {
  entryId: string;
  regulationId: string;
  regNumber: string;
  regulationTitle: string;
  slug: string;
  content: string;
  deadline: string | null;
  createdAt: string;
};

export type RegulationReply = {
  id: string;
  entryId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type RegulationReminder = {
  id: string;
  regulationId: string;
  entryId: string | null;
  createdBy: string;
  createdByName: string;
  targetEmployeeId: string;
  targetName: string;
  remindAt: string;
  note: string;
  fired: boolean;
  createdAt: string;
};

export type BlogCategory = 'announcement' | 'discussion' | 'useful' | 'qna' | 'custom';

export type BlogTopic = {
  id: string;
  category: BlogCategory;
  title: string;
  content: string | null;
  createdBy: string;
  createdByName: string;
  pinned: boolean;
  createdAt: string;
  commentCount: number;
};

export type BlogComment = {
  id: string;
  topicId: string;
  authorId: string;
  authorName: string;
  content: string;
  replyToId: string | null;
  createdAt: string;
};

export type Employee = {
  id: string;
  employeeNumber: string;
  login: string;
  fullName: string;
  isAdmin: boolean;
  phone: string | null;
  positionId: string | null;
  positionTitle: string | null;
  managerId: string | null;
  managerName: string | null;
  deputyId: string | null;
  deputyName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  selfEditUntil: string | null;
  hasPendingEditRequest: boolean;
  avatarData: string | null;
  createdAt: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  manualStatus: EmployeeStatus | null;
  manualStatusUntil: string | null;
  workDays: string | null;
  workStart: string | null;
  workEnd: string | null;
  headOfDepartmentName: string | null;
  deputyOfDepartmentName: string | null;
  birthDate: string | null;
};

export type Session = {
  id: string;
  loginAt: string;
  logoutAt: string | null;
};

export type ServerSettings = {
  enabled: boolean;
  port: number;
};

export type Position = { id: string; title: string };

export type Department = {
  id: string;
  name: string;
  headEmployeeId: string | null;
  headName: string | null;
  deputyEmployeeId: string | null;
  deputyName: string | null;
  memberCount: number;
};

export type Notification = {
  id: string;
  employeeId: string;
  type: string;
  title: string;
  body: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: string;
};

export type EditRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  requestedFullName: string | null;
  requestedPhone: string | null;
  note: string | null;
  status: string;
  createdAt: string;
};

export type LoginResult =
  | { success: true; employee: Employee; message?: undefined }
  | { success: false; employee?: undefined; message: string };

export type EmployeeFormPayload = {
  fullName: string;
  phone?: string | null;
  positionId?: string | null;
  managerId?: string | null;
  deputyId?: string | null;
  departmentId?: string | null;
  avatarData?: string | null;
  birthDate?: string | null;
};

export const api = {
  hasAdmin: () => invoke<boolean>('has_admin'),

  createAdmin: (payload: { login: string; password: string; fullName: string }) =>
    invoke<Employee>('create_admin', { payload }),

  login: (payload: { login: string; password: string }) =>
    invoke<LoginResult>('login', { payload }),

  changePassword: (payload: { employeeId: string; currentPassword: string; newPassword: string }) =>
    invoke<void>('change_password', { payload }),

  listEmployees: () => invoke<Employee[]>('list_employees'),

  getEmployee: (id: string) => invoke<Employee | null>('get_employee', { id }),

  createEmployee: (payload: EmployeeFormPayload & { adminId: string; login: string; password: string }) =>
    invoke<Employee>('create_employee', { payload }),

  updateEmployee: (payload: EmployeeFormPayload & { adminId: string; employeeId: string }) =>
    invoke<Employee>('update_employee', { payload }),

  listPositions: () => invoke<Position[]>('list_positions'),

  createPosition: (title: string) => invoke<Position>('create_position', { title }),

  listDepartments: () => invoke<Department[]>('list_departments'),

  createDepartment: (payload: {
    adminId: string;
    name: string;
    headEmployeeId?: string | null;
    deputyEmployeeId?: string | null;
  }) => invoke<Department>('create_department', { payload }),

  updateDepartment: (payload: {
    adminId: string;
    id: string;
    name: string;
    headEmployeeId?: string | null;
    deputyEmployeeId?: string | null;
  }) => invoke<Department>('update_department', { payload }),

  deleteDepartment: (payload: { adminId: string; id: string }) => invoke<void>('delete_department', { payload }),

  listNotifications: (employeeId: string) => invoke<Notification[]>('list_notifications', { employeeId }),

  markNotificationRead: (id: string) => invoke<void>('mark_notification_read', { id }),

  createEditRequest: (payload: {
    employeeId: string;
    requestedFullName?: string | null;
    requestedPhone?: string | null;
    note?: string | null;
  }) => invoke<EditRequest>('create_edit_request', { payload }),

  listEditRequests: (adminId: string) => invoke<EditRequest[]>('list_edit_requests', { adminId }),

  resolveEditRequest: (payload: { adminId: string; requestId: string; action: 'apply' | 'grant_access' | 'reject' }) =>
    invoke<void>('resolve_edit_request', { payload }),

  selfUpdateEmployee: (payload: { employeeId: string; fullName: string; phone?: string | null }) =>
    invoke<Employee>('self_update_employee', { payload }),

  updateOwnAvatar: (payload: { employeeId: string; avatarData: string | null }) =>
    invoke<Employee>('update_own_avatar', { payload }),

  setEmployeeStatus: (payload: { employeeId: string; status: EmployeeStatus | null }) =>
    invoke<Employee>('set_employee_status', { payload }),

  setEmployeeSchedule: (payload: {
    adminId: string;
    employeeId: string;
    workDays: string | null;
    workStart: string | null;
    workEnd: string | null;
  }) => invoke<Employee>('set_employee_schedule', { payload }),

  createAbsenceRequest: (payload: {
    employeeId: string;
    type: AbsenceRequestType;
    startDate: string;
    endDate: string;
    reason?: string | null;
    makeupSlots?: string | null;
  }) => invoke<AbsenceRequest>('create_absence_request', { payload }),

  listAbsenceRequestsForEmployee: (employeeId: string) =>
    invoke<AbsenceRequest[]>('list_absence_requests_for_employee', { employeeId }),

  listPendingApprovals: (actorId: string) => invoke<AbsenceRequest[]>('list_pending_approvals', { actorId }),

  listAllAbsenceRequests: (adminId: string) => invoke<AbsenceRequest[]>('list_all_absence_requests', { adminId }),

  getAbsenceRequest: (payload: { actorId: string; requestId: string }) =>
    invoke<AbsenceRequest>('get_absence_request', { payload }),

  resolveAbsenceRequest: (payload: { actorId: string; requestId: string; approve: boolean }) =>
    invoke<void>('resolve_absence_request', { payload }),

  listClients: () => invoke<Client[]>('list_clients'),

  getClient: (id: string) => invoke<Client | null>('get_client', { id }),

  createClient: (payload: {
    actorId: string;
    name: string;
    contactPerson?: string | null;
    contactPosition?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
  }) => invoke<Client>('create_client', { payload }),

  updateClient: (payload: {
    id: string;
    name: string;
    contactPerson?: string | null;
    contactPosition?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
  }) => invoke<Client>('update_client', { payload }),

  deleteClient: (payload: { adminId: string; id: string }) => invoke<void>('delete_client', { payload }),

  listClientHistory: (clientId: string) => invoke<ClientHistoryEntry[]>('list_client_history', { clientId }),

  addClientHistory: (payload: { clientId: string; actorId: string; description: string }) =>
    invoke<ClientHistoryEntry>('add_client_history', { payload }),

  listProjects: () => invoke<Project[]>('list_projects'),

  getProject: (id: string) => invoke<Project | null>('get_project', { id }),

  createProject: (payload: {
    actorId: string;
    name: string;
    description?: string | null;
    clientId?: string | null;
    status: ProjectStatus;
  }) => invoke<Project>('create_project', { payload }),

  updateProject: (payload: {
    actorId: string;
    id: string;
    name: string;
    description?: string | null;
    clientId?: string | null;
    status: ProjectStatus;
  }) => invoke<Project>('update_project', { payload }),

  deleteProject: (payload: { adminId: string; id: string }) => invoke<void>('delete_project', { payload }),

  listProjectMembers: (projectId: string) => invoke<ProjectMember[]>('list_project_members', { projectId }),

  addProjectMember: (payload: { actorId: string; projectId: string; employeeId: string; role: ProjectMemberRole }) =>
    invoke<void>('add_project_member', { payload }),

  removeProjectMember: (payload: { actorId: string; projectId: string; employeeId: string }) =>
    invoke<void>('remove_project_member', { payload }),

  transferProjectOwnership: (payload: { actorId: string; projectId: string; newOwnerId: string }) =>
    invoke<Project>('transfer_project_ownership', { payload }),

  listProjectChat: (projectId: string) => invoke<ProjectChatMessage[]>('list_project_chat', { projectId }),

  sendProjectChatMessage: (payload: { actorId: string; projectId: string; targetEmployeeId: string; content: string; attachmentData?: string | null; attachmentName?: string | null; deadline?: string | null }) =>
    invoke<ProjectChatMessage>('send_project_chat_message', { payload }),

  assignProjectChatMessage: (payload: { actorId: string; messageId: string; targetEmployeeId: string; deadline?: string | null }) =>
    invoke<void>('assign_project_chat_message', { payload }),

  updateProjectChatMessageStatus: (payload: { actorId: string; messageId: string; status: RegulationEntryStatus }) =>
    invoke<void>('update_project_chat_message_status', { payload }),

  listProjectChatReplies: (messageId: string) => invoke<ProjectChatReply[]>('list_project_chat_replies', { messageId }),

  addProjectChatReply: (payload: { actorId: string; messageId: string; content: string }) =>
    invoke<ProjectChatReply>('add_project_chat_reply', { payload }),

  listRegulations: () => invoke<Regulation[]>('list_regulations'),
  getRegulation: (id: string) => invoke<Regulation | null>('get_regulation', { id }),
  createRegulation: (payload: { actorId: string; title: string; description?: string | null; clientId?: string | null; deadline?: string | null }) =>
    invoke<Regulation>('create_regulation', { payload }),
  updateRegulation: (payload: { actorId: string; id: string; title: string; description?: string | null; clientId?: string | null; deadline?: string | null; status: RegulationStatus }) =>
    invoke<Regulation>('update_regulation', { payload }),
  deleteRegulation: (payload: { adminId: string; id: string }) => invoke<void>('delete_regulation', { payload }),

  listRegulationMembers: (regulationId: string) => invoke<RegulationMember[]>('list_regulation_members', { regulationId }),
  addRegulationMember: (payload: { actorId: string; regulationId: string; employeeId: string; role: string }) =>
    invoke<void>('add_regulation_member', { payload }),
  removeRegulationMember: (payload: { actorId: string; regulationId: string; employeeId: string }) =>
    invoke<void>('remove_regulation_member', { payload }),

  listRegulationEntries: (regulationId: string) => invoke<RegulationEntry[]>('list_regulation_entries', { regulationId }),
  listMyOpenTasks: (employeeId: string) => invoke<MyTask[]>('list_my_open_tasks', { employeeId }),
  addRegulationEntry: (payload: { actorId: string; regulationId: string; targetEmployeeId: string; content: string; attachmentData?: string | null; attachmentName?: string | null; deadline?: string | null }) =>
    invoke<RegulationEntry>('add_regulation_entry', { payload }),
  assignRegulationEntry: (payload: { actorId: string; entryId: string; targetEmployeeId: string; deadline?: string | null }) =>
    invoke<void>('assign_regulation_entry', { payload }),
  updateEntryStatus: (payload: { actorId: string; entryId: string; status: RegulationEntryStatus }) =>
    invoke<void>('update_entry_status', { payload }),

  listRegulationReplies: (entryId: string) => invoke<RegulationReply[]>('list_regulation_replies', { entryId }),
  addRegulationReply: (payload: { actorId: string; entryId: string; content: string }) =>
    invoke<RegulationReply>('add_regulation_reply', { payload }),

  addRegulationReminder: (payload: {
    actorId: string;
    regulationId: string;
    entryId?: string | null;
    targetEmployeeId: string;
    remindAt: string;
    note: string;
  }) => invoke<RegulationReminder>('add_regulation_reminder', { payload }),

  listRegulationReminders: (payload: { regulationId: string; employeeId: string }) =>
    invoke<RegulationReminder[]>('list_regulation_reminders', { payload }),

  updateRegulationEntryDeadline: (payload: { actorId: string; entryId: string; deadline: string | null }) =>
    invoke<void>('update_regulation_entry_deadline', { payload }),

  listBlogTopics: () => invoke<BlogTopic[]>('list_blog_topics'),
  createBlogTopic: (payload: { actorId: string; category: BlogCategory; title: string; content?: string | null }) =>
    invoke<BlogTopic>('create_blog_topic', { payload }),
  updateBlogTopic: (payload: { actorId: string; id: string; category: BlogCategory; title: string; content?: string | null }) =>
    invoke<BlogTopic>('update_blog_topic', { payload }),
  setBlogTopicPinned: (payload: { adminId: string; id: string; pinned: boolean }) =>
    invoke<void>('set_blog_topic_pinned', { payload }),
  deleteBlogTopic: (payload: { actorId: string; id: string }) => invoke<void>('delete_blog_topic', { payload }),
  listBlogComments: (topicId: string) => invoke<BlogComment[]>('list_blog_comments', { topicId }),
  addBlogComment: (payload: { actorId: string; topicId: string; content: string; replyToId?: string | null }) =>
    invoke<BlogComment>('add_blog_comment', { payload }),

  recordLogin: (employeeId: string) => invoke<void>('record_login', { employeeId }),

  recordLogout: (employeeId: string) => invoke<void>('record_logout', { employeeId }),

  listRecentSessions: (employeeId: string) => invoke<Session[]>('list_recent_sessions', { employeeId }),

  getServerSettings: () => invoke<ServerSettings>('get_server_settings'),
  setServerSettings: (payload: { adminId: string; enabled: boolean; port: number }) =>
    invoke<ServerSettings>('set_server_settings', { payload }),
  getLanAddress: () => invoke<string | null>('get_lan_address'),
  getAppVersion: () => invoke<string>('get_app_version'),
};
