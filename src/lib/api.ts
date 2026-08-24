import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { connection, sessionToken } from './connection';
import { notifySessionExpired } from './sessionExpiry';

// Ровно та же строка, что server.rs::unauthorized() отдаёт при отсутствующем
// или невалидном токене сессии (см. dispatch выше в invoke_handler) —
// единственный источник этой ошибки, поэтому safe матчить по тексту: если
// клиент был залогинен и вдруг получил именно её — значит сервер перезапустили
// (см. sessionExpiry.ts) и локальную сессию нужно сбросить, а не просто
// показать общую ошибку загрузки на текущей странице.
const SESSION_INVALID_MESSAGE = 'Не авторизован — войдите заново';

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
  if (!result.ok) {
    if (result.error === SESSION_INVALID_MESSAGE && cmd !== 'login') notifySessionExpired();
    throw result.error || 'Ошибка сервера';
  }
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
  partnerId: string | null;
  partnerName: string | null;
  dealValue: string | null;
  serviceId: string | null;
  serviceName: string | null;
  houseServiceId: string | null;
  houseServiceName: string | null;
  originPartnerId: string | null;
  originPartnerName: string | null;
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
  editedAt: string | null;
  isDeleted: boolean;
};

export type ProjectChatReply = {
  id: string;
  messageId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
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
  editedAt: string | null;
  isDeleted: boolean;
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

export type MyProjectTask = {
  messageId: string;
  projectId: string;
  projectNumber: string;
  projectName: string;
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
  editedAt: string | null;
  isDeleted: boolean;
};

export type PartnerRegulationStatus = 'active' | 'closed';

export type PartnerRegulation = {
  id: string;
  regNumber: string;
  partnerId: string;
  partnerName: string;
  clientId: string | null;
  clientName: string | null;
  title: string;
  description: string | null;
  status: PartnerRegulationStatus;
  deadline: string | null;
  closedAt: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  entryCount: number;
  assistantId: string | null;
  assistantName: string | null;
};

export type PartnerService = {
  id: string;
  partnerId: string;
  name: string;
  description: string | null;
  price: string | null;
  rewardPercent: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HouseService = {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  rewardPercent: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartnerRegulationEntry = {
  id: string;
  partnerRegulationId: string;
  authorId: string;
  authorName: string;
  content: string;
  attachmentData: string | null;
  attachmentName: string | null;
  deadline: string | null;
  status: RegulationEntryStatus;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  editedAt: string | null;
  isDeleted: boolean;
};

export type PartnerRegulationReply = {
  id: string;
  entryId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
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
  partnerAudience: string | null;
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

export type ChatMessage = {
  id: string;
  channel: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string;
  attachmentData: string | null;
  attachmentName: string | null;
  replyToId: string | null;
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
};

export type DmChannelSummary = {
  channel: string;
  otherEmployeeId: string;
  otherEmployeeName: string;
  otherEmployeeAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

export type PartnerChatSummary = {
  partnerId: string;
  partnerName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

export type ChatGroup = {
  id: string;
  name: string;
  description: string | null;
  photoData: string | null;
  departmentId: string | null;
  inviteCode: string;
  createdBy: string | null;
  createdAt: string;
  memberCount: number;
};

export type ChatGroupSummary = {
  id: string;
  name: string;
  photoData: string | null;
  memberCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
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
  isPartner: boolean;
  partnerId: string | null;
  partnerName: string | null;
};

export type Partner = {
  id: string;
  name: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  accountCount: number;
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

export type RadminSettings = {
  networkId: string;
  networkPassword: string;
  note: string;
};

export type TelegramBotSettings = {
  enabled: boolean;
  token: string | null;
};

export type TelegramLinkInfo = {
  code: string;
  deepLink: string | null;
  botConfigured: boolean;
};

export type NotebookSettings = {
  enabled: boolean;
  name: string | null;
};

export type NotebookNote = {
  id: string;
  employeeId: string;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeReportRow = {
  employeeId: string;
  fullName: string;
  employeeNumber: string;
  departmentName: string | null;
  positionTitle: string | null;
  hoursWorked: number;
  absenceCounts: [string, number][];
  regulationsCount: number;
  projectsCount: number;
};

export type PartnerReportRow = {
  partnerId: string;
  partnerName: string;
  clientsAddedCount: number;
  regulationsCount: number;
  financialTotal: number | null;
  financialTotalPartial: boolean;
  financialRawValues: string[];
};

export type ReportExportSettings = {
  enabled: boolean;
  dayMode: string;
  fixedDay: number;
  timeHhmm: string;
  folder: string;
};

export type UpdateInstallerInfo = {
  available: boolean;
  sizeBytes: number;
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

  createEmployee: (payload: EmployeeFormPayload & { adminId: string; login: string; password: string; isPartner?: boolean; partnerId?: string | null }) =>
    invoke<Employee>('create_employee', { payload }),

  updateEmployee: (payload: EmployeeFormPayload & { adminId: string; employeeId: string }) =>
    invoke<Employee>('update_employee', { payload }),

  listPartners: () => invoke<Partner[]>('list_partners'),

  createPartner: (payload: { adminId: string; name: string }) =>
    invoke<Partner>('create_partner', { payload }),

  deletePartner: (payload: { adminId: string; id: string }) =>
    invoke<void>('delete_partner', { payload }),

  renamePartner: (payload: { adminId: string; id: string; name: string }) =>
    invoke<Partner>('rename_partner', { payload }),

  adminResetPassword: (payload: { adminId: string; employeeId: string; newPassword: string }) =>
    invoke<void>('admin_reset_password', { payload }),

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

  listClients: (payload: { actorId: string; partnerId?: string | null }) => invoke<Client[]>('list_clients', { payload }),

  getClient: (payload: { actorId: string; id: string }) => invoke<Client | null>('get_client', { payload }),

  createClient: (payload: {
    actorId: string;
    name: string;
    contactPerson?: string | null;
    contactPosition?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
    partnerId?: string | null;
    dealValue?: string | null;
    serviceId?: string | null;
    houseServiceId?: string | null;
  }) => invoke<Client>('create_client', { payload }),

  updateClient: (payload: {
    actorId: string;
    id: string;
    name: string;
    contactPerson?: string | null;
    contactPosition?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
    partnerId?: string | null;
    dealValue?: string | null;
    serviceId?: string | null;
    houseServiceId?: string | null;
  }) => invoke<Client>('update_client', { payload }),

  deleteClient: (payload: { adminId: string; id: string }) => invoke<void>('delete_client', { payload }),

  moveClientToCrmBase: (payload: { adminId: string; id: string }) => invoke<Client>('move_client_to_crm_base', { payload }),

  listClientHistory: (payload: { actorId: string; clientId: string }) => invoke<ClientHistoryEntry[]>('list_client_history', { payload }),

  addClientHistory: (payload: { clientId: string; actorId: string; description: string }) =>
    invoke<ClientHistoryEntry>('add_client_history', { payload }),

  listPartnerRegulations: (payload: { actorId: string; partnerId: string }) =>
    invoke<PartnerRegulation[]>('list_partner_regulations', { payload }),

  getPartnerRegulation: (id: string) => invoke<PartnerRegulation | null>('get_partner_regulation', { id }),

  createPartnerRegulation: (payload: { actorId: string; partnerId: string; title: string; description?: string | null; clientId?: string | null; deadline?: string | null; assistantId?: string | null }) =>
    invoke<PartnerRegulation>('create_partner_regulation', { payload }),

  updatePartnerRegulation: (payload: { actorId: string; id: string; title: string; description?: string | null; clientId?: string | null; deadline?: string | null; status: PartnerRegulationStatus; assistantId?: string | null }) =>
    invoke<PartnerRegulation>('update_partner_regulation', { payload }),

  deletePartnerRegulation: (payload: { adminId: string; id: string }) => invoke<void>('delete_partner_regulation', { payload }),

  listPartnerServices: (payload: { actorId: string; partnerId: string }) =>
    invoke<PartnerService[]>('list_partner_services', { payload }),

  createPartnerService: (payload: { actorId: string; partnerId: string; name: string; description?: string | null; price?: string | null; rewardPercent?: string | null }) =>
    invoke<PartnerService>('create_partner_service', { payload }),

  updatePartnerService: (payload: { actorId: string; id: string; name: string; description?: string | null; price?: string | null; rewardPercent?: string | null }) =>
    invoke<PartnerService>('update_partner_service', { payload }),

  deletePartnerService: (payload: { actorId: string; id: string }) => invoke<void>('delete_partner_service', { payload }),

  listHouseServices: (payload: { actorId: string }) => invoke<HouseService[]>('list_house_services', { payload }),

  createHouseService: (payload: { actorId: string; name: string; description?: string | null; price?: string | null; rewardPercent?: string | null }) =>
    invoke<HouseService>('create_house_service', { payload }),

  updateHouseService: (payload: { actorId: string; id: string; name: string; description?: string | null; price?: string | null; rewardPercent?: string | null }) =>
    invoke<HouseService>('update_house_service', { payload }),

  deleteHouseService: (payload: { actorId: string; id: string }) => invoke<void>('delete_house_service', { payload }),

  listAdminEmployees: () => invoke<Employee[]>('list_admin_employees'),

  listPartnerOrgEmployees: (payload: { actorId: string; partnerId: string }) =>
    invoke<Employee[]>('list_partner_org_employees', { payload }),

  listPartnerRegulationEntries: (payload: { actorId: string; partnerRegulationId: string }) =>
    invoke<PartnerRegulationEntry[]>('list_partner_regulation_entries', { payload }),

  addPartnerRegulationEntry: (payload: { actorId: string; partnerRegulationId: string; content: string; attachmentData?: string | null; attachmentName?: string | null; deadline?: string | null }) =>
    invoke<PartnerRegulationEntry>('add_partner_regulation_entry', { payload }),

  editPartnerRegulationEntry: (payload: { actorId: string; entryId: string; content: string }) =>
    invoke<PartnerRegulationEntry>('edit_partner_regulation_entry', { payload }),

  deletePartnerRegulationEntry: (payload: { actorId: string; entryId: string }) => invoke<void>('delete_partner_regulation_entry', { payload }),

  updatePartnerRegulationEntryStatus: (payload: { actorId: string; entryId: string; status: RegulationEntryStatus }) =>
    invoke<void>('update_partner_regulation_entry_status', { payload }),

  listPartnerRegulationReplies: (payload: { actorId: string; entryId: string }) =>
    invoke<PartnerRegulationReply[]>('list_partner_regulation_replies', { payload }),

  addPartnerRegulationReply: (payload: { actorId: string; entryId: string; content: string }) =>
    invoke<PartnerRegulationReply>('add_partner_regulation_reply', { payload }),

  editPartnerRegulationReply: (payload: { actorId: string; replyId: string; content: string }) =>
    invoke<PartnerRegulationReply>('edit_partner_regulation_reply', { payload }),

  deletePartnerRegulationReply: (payload: { actorId: string; replyId: string }) => invoke<void>('delete_partner_regulation_reply', { payload }),

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

  editProjectChatMessage: (payload: { actorId: string; messageId: string; content: string }) =>
    invoke<ProjectChatMessage>('edit_project_chat_message', { payload }),
  deleteProjectChatMessage: (payload: { actorId: string; messageId: string }) =>
    invoke<void>('delete_project_chat_message', { payload }),

  assignProjectChatMessage: (payload: { actorId: string; messageId: string; targetEmployeeId: string; deadline?: string | null }) =>
    invoke<void>('assign_project_chat_message', { payload }),

  updateProjectChatMessageStatus: (payload: { actorId: string; messageId: string; status: RegulationEntryStatus }) =>
    invoke<void>('update_project_chat_message_status', { payload }),

  listProjectChatReplies: (messageId: string) => invoke<ProjectChatReply[]>('list_project_chat_replies', { messageId }),

  addProjectChatReply: (payload: { actorId: string; messageId: string; content: string }) =>
    invoke<ProjectChatReply>('add_project_chat_reply', { payload }),
  editProjectChatReply: (payload: { actorId: string; replyId: string; content: string }) =>
    invoke<ProjectChatReply>('edit_project_chat_reply', { payload }),
  deleteProjectChatReply: (payload: { actorId: string; replyId: string }) =>
    invoke<void>('delete_project_chat_reply', { payload }),

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
  listMyOpenProjectTasks: (employeeId: string) => invoke<MyProjectTask[]>('list_my_open_project_tasks', { employeeId }),
  addRegulationEntry: (payload: { actorId: string; regulationId: string; targetEmployeeId: string; content: string; attachmentData?: string | null; attachmentName?: string | null; deadline?: string | null }) =>
    invoke<RegulationEntry>('add_regulation_entry', { payload }),
  editRegulationEntry: (payload: { actorId: string; entryId: string; content: string }) =>
    invoke<RegulationEntry>('edit_regulation_entry', { payload }),
  deleteRegulationEntry: (payload: { actorId: string; entryId: string }) =>
    invoke<void>('delete_regulation_entry', { payload }),
  assignRegulationEntry: (payload: { actorId: string; entryId: string; targetEmployeeId: string; deadline?: string | null }) =>
    invoke<void>('assign_regulation_entry', { payload }),
  updateEntryStatus: (payload: { actorId: string; entryId: string; status: RegulationEntryStatus }) =>
    invoke<void>('update_entry_status', { payload }),

  listRegulationReplies: (entryId: string) => invoke<RegulationReply[]>('list_regulation_replies', { entryId }),
  addRegulationReply: (payload: { actorId: string; entryId: string; content: string }) =>
    invoke<RegulationReply>('add_regulation_reply', { payload }),
  editRegulationReply: (payload: { actorId: string; replyId: string; content: string }) =>
    invoke<RegulationReply>('edit_regulation_reply', { payload }),
  deleteRegulationReply: (payload: { actorId: string; replyId: string }) =>
    invoke<void>('delete_regulation_reply', { payload }),

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

  listBlogTopics: (actorId: string) => invoke<BlogTopic[]>('list_blog_topics', { actorId }),
  createBlogTopic: (payload: { actorId: string; category: BlogCategory; title: string; content?: string | null; partnerAudience?: string | null }) =>
    invoke<BlogTopic>('create_blog_topic', { payload }),
  updateBlogTopic: (payload: { actorId: string; id: string; category: BlogCategory; title: string; content?: string | null; partnerAudience?: string | null }) =>
    invoke<BlogTopic>('update_blog_topic', { payload }),
  setBlogTopicPinned: (payload: { adminId: string; id: string; pinned: boolean }) =>
    invoke<void>('set_blog_topic_pinned', { payload }),
  deleteBlogTopic: (payload: { actorId: string; id: string }) => invoke<void>('delete_blog_topic', { payload }),
  listBlogComments: (topicId: string) => invoke<BlogComment[]>('list_blog_comments', { topicId }),
  addBlogComment: (payload: { actorId: string; topicId: string; content: string; replyToId?: string | null }) =>
    invoke<BlogComment>('add_blog_comment', { payload }),

  listChatMessages: (employeeId: string, channel: string) =>
    invoke<ChatMessage[]>('list_chat_messages', { employeeId, channel }),
  sendChatMessage: (payload: {
    actorId: string;
    channel: string;
    content: string;
    attachmentData?: string | null;
    attachmentName?: string | null;
    replyToId?: string | null;
  }) => invoke<ChatMessage>('send_chat_message', { payload }),
  editChatMessage: (payload: { actorId: string; messageId: string; content: string }) =>
    invoke<ChatMessage>('edit_chat_message', { payload }),
  deleteChatMessage: (payload: { actorId: string; messageId: string }) =>
    invoke<void>('delete_chat_message', { payload }),
  markChatChannelRead: (payload: { employeeId: string; channel: string }) =>
    invoke<void>('mark_chat_channel_read', { payload }),
  listMyDmChannels: (employeeId: string) => invoke<DmChannelSummary[]>('list_my_dm_channels', { employeeId }),
  listMyPartnerChats: (actorId: string) => invoke<PartnerChatSummary[]>('list_my_partner_chats', { actorId }),

  createChatGroup: (payload: {
    actorId: string;
    name: string;
    description?: string | null;
    photoData?: string | null;
    departmentId?: string | null;
    memberIds?: string[] | null;
  }) => invoke<ChatGroup>('create_chat_group', { payload }),
  listMyChatGroups: (employeeId: string) => invoke<ChatGroupSummary[]>('list_my_chat_groups', { employeeId }),
  getChatGroup: (groupId: string) => invoke<ChatGroup | null>('get_chat_group', { groupId }),
  listChatGroupMembers: (employeeId: string, groupId: string) =>
    invoke<Employee[]>('list_chat_group_members', { employeeId, groupId }),
  updateChatGroup: (payload: { actorId: string; groupId: string; name: string; description?: string | null; photoData?: string | null }) =>
    invoke<ChatGroup>('update_chat_group', { payload }),
  addChatGroupMember: (payload: { actorId: string; groupId: string; employeeId: string }) =>
    invoke<void>('add_chat_group_member', { payload }),
  removeChatGroupMember: (payload: { actorId: string; groupId: string; employeeId: string }) =>
    invoke<void>('remove_chat_group_member', { payload }),
  joinChatGroupByInvite: (payload: { actorId: string; inviteCode: string }) =>
    invoke<ChatGroup>('join_chat_group_by_invite', { payload }),

  recordLogin: (employeeId: string) => invoke<void>('record_login', { employeeId }),

  recordLogout: (employeeId: string) => invoke<void>('record_logout', { employeeId }),

  listRecentSessions: (employeeId: string) => invoke<Session[]>('list_recent_sessions', { employeeId }),

  getServerSettings: () => invoke<ServerSettings>('get_server_settings'),
  setServerSettings: (payload: { adminId: string; enabled: boolean; port: number }) =>
    invoke<ServerSettings>('set_server_settings', { payload }),
  getRadminSettings: () => invoke<RadminSettings>('get_radmin_settings'),
  setRadminSettings: (payload: { adminId: string; networkId: string; networkPassword: string; note: string }) =>
    invoke<RadminSettings>('set_radmin_settings', { payload }),
  getTelegramBotSettings: (payload: { actorId: string }) => invoke<TelegramBotSettings>('get_telegram_bot_settings', { payload }),
  setTelegramBotSettings: (payload: { adminId: string; enabled: boolean; token?: string | null }) =>
    invoke<TelegramBotSettings>('set_telegram_bot_settings', { payload }),
  generateTelegramLinkCode: (payload: { actorId: string; employeeId: string }) =>
    invoke<TelegramLinkInfo>('generate_telegram_link_code', { payload }),
  getTelegramLinkStatus: (payload: { actorId: string; employeeId: string }) =>
    invoke<boolean>('get_telegram_link_status', { payload }),
  unlinkTelegram: (payload: { actorId: string; employeeId: string }) =>
    invoke<void>('unlink_telegram', { payload }),

  getNotebookSettings: (payload: { actorId: string; employeeId: string }) =>
    invoke<NotebookSettings>('get_notebook_settings', { payload }),
  setNotebookSettings: (payload: { actorId: string; employeeId: string; enabled: boolean; name: string | null }) =>
    invoke<NotebookSettings>('set_notebook_settings', { payload }),
  listNotebookNotes: (payload: { actorId: string; employeeId: string }) =>
    invoke<NotebookNote[]>('list_notebook_notes', { payload }),
  createNotebookNote: (payload: { actorId: string; employeeId: string; title: string; content: string | null }) =>
    invoke<NotebookNote>('create_notebook_note', { payload }),
  updateNotebookNote: (payload: { actorId: string; id: string; title: string; content: string | null }) =>
    invoke<NotebookNote>('update_notebook_note', { payload }),
  deleteNotebookNote: (payload: { actorId: string; id: string }) =>
    invoke<void>('delete_notebook_note', { payload }),

  getEmployeeReport: (payload: { adminId: string; periodStart: string; periodEnd: string }) =>
    invoke<EmployeeReportRow[]>('get_employee_report', { payload }),
  getPartnerReport: (payload: { actorId: string; partnerId?: string | null; periodStart?: string | null; periodEnd?: string | null }) =>
    invoke<PartnerReportRow[]>('get_partner_report', { payload }),
  getReportExportSettings: (payload: { actorId: string }) =>
    invoke<ReportExportSettings>('get_report_export_settings', { payload }),
  setReportExportSettings: (payload: { adminId: string; enabled: boolean; dayMode: string; fixedDay: number; timeHhmm: string; folder: string }) =>
    invoke<ReportExportSettings>('set_report_export_settings', { payload }),
  generateReportNow: (payload: { adminId: string; periodStart: string; periodEnd: string; folder?: string | null }) =>
    invoke<string>('generate_report_now', { payload }),

  getAppLogo: () => invoke<string | null>('get_app_logo'),
  setAppLogo: (payload: { adminId: string; logoData: string | null }) =>
    invoke<string | null>('set_app_logo', { payload }),
  exportBackup: (payload: { adminId: string; password: string; destPath: string }) =>
    invoke<void>('export_backup', { payload }),
  restoreBackup: (payload: { adminId: string; password: string; sourcePath: string }) =>
    invoke<void>('restore_backup', { payload }),
  getLanAddress: () => invoke<string | null>('get_lan_address'),
  getAppVersion: () => invoke<string>('get_app_version'),
  getUpdateInstallerInfo: () => invoke<UpdateInstallerInfo>('get_update_installer_info'),
  getUpdateInstallerPath: () => invoke<string>('get_update_installer_path'),
  setUpdateInstaller: (payload: { adminId: string; sourcePath: string }) => invoke<void>('set_update_installer', { payload }),
};
