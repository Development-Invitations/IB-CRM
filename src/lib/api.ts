import { invoke } from '@tauri-apps/api/core';

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
};

export type Position = { id: string; title: string };

export type Department = {
  id: string;
  name: string;
  headEmployeeId: string | null;
  headName: string | null;
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

  createDepartment: (payload: { adminId: string; name: string; headEmployeeId?: string | null }) =>
    invoke<Department>('create_department', { payload }),

  updateDepartment: (payload: { adminId: string; id: string; name: string; headEmployeeId?: string | null }) =>
    invoke<Department>('update_department', { payload }),

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
};
