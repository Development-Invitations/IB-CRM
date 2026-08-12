import { invoke } from '@tauri-apps/api/core';

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
  content: string;
  isTask: boolean;
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
};

export type Session = {
  id: string;
  loginAt: string;
  logoutAt: string | null;
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
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
  }) => invoke<Client>('create_client', { payload }),

  updateClient: (payload: {
    id: string;
    name: string;
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

  sendProjectChatMessage: (payload: { actorId: string; projectId: string; content: string; isTask: boolean }) =>
    invoke<ProjectChatMessage>('send_project_chat_message', { payload }),

  recordLogin: (employeeId: string) => invoke<void>('record_login', { employeeId }),

  recordLogout: (employeeId: string) => invoke<void>('record_logout', { employeeId }),

  listRecentSessions: (employeeId: string) => invoke<Session[]>('list_recent_sessions', { employeeId }),
};
