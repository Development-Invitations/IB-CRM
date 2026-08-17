#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod dispatch;
mod server;

use db::Db;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[derive(Clone, serde::Serialize)]
struct Employee {
    id: String,
    #[serde(rename = "employeeNumber")]
    employee_number: String,
    login: String,
    #[serde(rename = "fullName")]
    full_name: String,
    #[serde(rename = "isAdmin")]
    is_admin: bool,
    phone: Option<String>,
    #[serde(rename = "positionId")]
    position_id: Option<String>,
    #[serde(rename = "positionTitle")]
    position_title: Option<String>,
    #[serde(rename = "managerId")]
    manager_id: Option<String>,
    #[serde(rename = "managerName")]
    manager_name: Option<String>,
    #[serde(rename = "deputyId")]
    deputy_id: Option<String>,
    #[serde(rename = "deputyName")]
    deputy_name: Option<String>,
    #[serde(rename = "departmentId")]
    department_id: Option<String>,
    #[serde(rename = "departmentName")]
    department_name: Option<String>,
    #[serde(rename = "selfEditUntil")]
    self_edit_until: Option<String>,
    #[serde(rename = "hasPendingEditRequest")]
    has_pending_edit_request: bool,
    #[serde(rename = "avatarData")]
    avatar_data: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "isOnline")]
    is_online: bool,
    #[serde(rename = "lastSeenAt")]
    last_seen_at: Option<String>,
    #[serde(rename = "manualStatus")]
    manual_status: Option<String>,
    #[serde(rename = "manualStatusUntil")]
    manual_status_until: Option<String>,
    #[serde(rename = "workDays")]
    work_days: Option<String>,
    #[serde(rename = "workStart")]
    work_start: Option<String>,
    #[serde(rename = "workEnd")]
    work_end: Option<String>,
    #[serde(rename = "headOfDepartmentName")]
    head_of_department_name: Option<String>,
    #[serde(rename = "deputyOfDepartmentName")]
    deputy_of_department_name: Option<String>,
    #[serde(rename = "birthDate")]
    birth_date: Option<String>,
    #[serde(rename = "isPartner")]
    is_partner: bool,
    #[serde(rename = "partnerId")]
    partner_id: Option<String>,
    #[serde(rename = "partnerName")]
    partner_name: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct Partner {
    id: String,
    name: String,
    #[serde(rename = "createdBy")]
    created_by: Option<String>,
    #[serde(rename = "createdByName")]
    created_by_name: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "accountCount")]
    account_count: i64,
}

#[derive(Clone, serde::Serialize)]
struct Session {
    id: String,
    #[serde(rename = "loginAt")]
    login_at: String,
    #[serde(rename = "logoutAt")]
    logout_at: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct Department {
    id: String,
    name: String,
    #[serde(rename = "headEmployeeId")]
    head_employee_id: Option<String>,
    #[serde(rename = "headName")]
    head_name: Option<String>,
    #[serde(rename = "deputyEmployeeId")]
    deputy_employee_id: Option<String>,
    #[serde(rename = "deputyName")]
    deputy_name: Option<String>,
    #[serde(rename = "memberCount")]
    member_count: i64,
}

#[derive(Clone, serde::Serialize)]
struct Notification {
    id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "type")]
    notification_type: String,
    title: String,
    body: Option<String>,
    #[serde(rename = "relatedEntityType")]
    related_entity_type: Option<String>,
    #[serde(rename = "relatedEntityId")]
    related_entity_id: Option<String>,
    #[serde(rename = "isRead")]
    is_read: bool,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Clone, serde::Serialize)]
struct EditRequest {
    id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "employeeName")]
    employee_name: String,
    #[serde(rename = "requestedFullName")]
    requested_full_name: Option<String>,
    #[serde(rename = "requestedPhone")]
    requested_phone: Option<String>,
    note: Option<String>,
    status: String,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Clone, serde::Serialize)]
struct AbsenceRequest {
    id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "employeeName")]
    employee_name: String,
    #[serde(rename = "type")]
    request_type: String,
    #[serde(rename = "startDate")]
    start_date: String,
    #[serde(rename = "endDate")]
    end_date: String,
    reason: Option<String>,
    #[serde(rename = "makeupSlots")]
    makeup_slots: Option<String>,
    status: String,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "resolvedBy")]
    resolved_by: Option<String>,
    #[serde(rename = "resolvedByName")]
    resolved_by_name: Option<String>,
    #[serde(rename = "resolvedByIsAdmin")]
    resolved_by_is_admin: bool,
    #[serde(rename = "resolvedAt")]
    resolved_at: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct Client {
    id: String,
    #[serde(rename = "clientNumber")]
    client_number: String,
    name: String,
    #[serde(rename = "contactPerson")]
    contact_person: Option<String>,
    #[serde(rename = "contactPosition")]
    contact_position: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    notes: Option<String>,
    #[serde(rename = "createdBy")]
    created_by: Option<String>,
    #[serde(rename = "createdByName")]
    created_by_name: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Clone, serde::Serialize)]
struct ClientHistoryEntry {
    id: String,
    #[serde(rename = "clientId")]
    client_id: String,
    description: String,
    #[serde(rename = "createdBy")]
    created_by: Option<String>,
    #[serde(rename = "createdByName")]
    created_by_name: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Clone, serde::Serialize)]
struct Project {
    id: String,
    #[serde(rename = "projectNumber")]
    project_number: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "clientId")]
    client_id: Option<String>,
    #[serde(rename = "clientName")]
    client_name: Option<String>,
    #[serde(rename = "ownerId")]
    owner_id: String,
    #[serde(rename = "ownerName")]
    owner_name: String,
    status: String,
    #[serde(rename = "createdBy")]
    created_by: Option<String>,
    #[serde(rename = "createdByName")]
    created_by_name: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    #[serde(rename = "memberCount")]
    member_count: i64,
}

#[derive(Clone, serde::Serialize)]
struct ProjectMember {
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "employeeName")]
    employee_name: String,
    #[serde(rename = "roleInProject")]
    role_in_project: String,
    #[serde(rename = "isOwner")]
    is_owner: bool,
    #[serde(rename = "addedAt")]
    added_at: String,
}

#[derive(Clone, serde::Serialize)]
struct ProjectChatMessage {
    id: String,
    #[serde(rename = "projectId")]
    project_id: String,
    #[serde(rename = "senderId")]
    sender_id: String,
    #[serde(rename = "senderName")]
    sender_name: String,
    #[serde(rename = "targetEmployeeId")]
    target_employee_id: String,
    #[serde(rename = "targetName")]
    target_name: String,
    content: String,
    #[serde(rename = "attachmentData")]
    attachment_data: Option<String>,
    #[serde(rename = "attachmentName")]
    attachment_name: Option<String>,
    deadline: Option<String>,
    status: String,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "replyCount")]
    reply_count: i64,
}

#[derive(Clone, serde::Serialize)]
struct ProjectChatReply {
    id: String,
    #[serde(rename = "messageId")]
    message_id: String,
    #[serde(rename = "authorId")]
    author_id: String,
    #[serde(rename = "authorName")]
    author_name: String,
    content: String,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Clone, serde::Serialize)]
struct Regulation {
    id: String,
    #[serde(rename = "regNumber")]
    reg_number: String,
    slug: String,
    title: String,
    description: Option<String>,
    #[serde(rename = "clientId")]
    client_id: Option<String>,
    #[serde(rename = "clientName")]
    client_name: Option<String>,
    #[serde(rename = "ownerId")]
    owner_id: String,
    #[serde(rename = "ownerName")]
    owner_name: String,
    status: String,
    deadline: Option<String>,
    #[serde(rename = "closedAt")]
    closed_at: Option<String>,
    #[serde(rename = "createdBy")]
    created_by: Option<String>,
    #[serde(rename = "createdByName")]
    created_by_name: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    #[serde(rename = "memberCount")]
    member_count: i64,
    #[serde(rename = "entryCount")]
    entry_count: i64,
}

#[derive(Clone, serde::Serialize)]
struct RegulationMember {
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "employeeName")]
    employee_name: String,
    #[serde(rename = "roleInReg")]
    role_in_reg: String,
    #[serde(rename = "addedAt")]
    added_at: String,
}

#[derive(Clone, serde::Serialize)]
struct RegulationEntry {
    id: String,
    #[serde(rename = "regulationId")]
    regulation_id: String,
    #[serde(rename = "authorId")]
    author_id: String,
    #[serde(rename = "authorName")]
    author_name: String,
    #[serde(rename = "targetEmployeeId")]
    target_employee_id: String,
    #[serde(rename = "targetName")]
    target_name: String,
    content: String,
    #[serde(rename = "attachmentData")]
    attachment_data: Option<String>,
    #[serde(rename = "attachmentName")]
    attachment_name: Option<String>,
    deadline: Option<String>,
    status: String,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
    #[serde(rename = "replyCount")]
    reply_count: i64,
}

#[derive(Clone, serde::Serialize)]
struct MyTask {
    #[serde(rename = "entryId")]
    entry_id: String,
    #[serde(rename = "regulationId")]
    regulation_id: String,
    #[serde(rename = "regNumber")]
    reg_number: String,
    #[serde(rename = "regulationTitle")]
    regulation_title: String,
    slug: String,
    content: String,
    deadline: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Clone, serde::Serialize)]
struct RegulationReply {
    id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
    #[serde(rename = "authorId")]
    author_id: String,
    #[serde(rename = "authorName")]
    author_name: String,
    content: String,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Clone, serde::Serialize)]
struct RegulationReminder {
    id: String,
    #[serde(rename = "regulationId")]
    regulation_id: String,
    #[serde(rename = "entryId")]
    entry_id: Option<String>,
    #[serde(rename = "createdBy")]
    created_by: String,
    #[serde(rename = "createdByName")]
    created_by_name: String,
    #[serde(rename = "targetEmployeeId")]
    target_employee_id: String,
    #[serde(rename = "targetName")]
    target_name: String,
    #[serde(rename = "remindAt")]
    remind_at: String,
    note: String,
    fired: bool,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Clone, serde::Serialize)]
struct Position {
    id: String,
    title: String,
}

#[derive(Clone, serde::Serialize)]
struct ServerSettings {
    enabled: bool,
    port: u16,
}

#[derive(Clone, serde::Serialize)]
struct BlogTopic {
    id: String,
    category: String,
    title: String,
    content: Option<String>,
    #[serde(rename = "createdBy")]
    created_by: String,
    #[serde(rename = "createdByName")]
    created_by_name: String,
    pinned: bool,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "commentCount")]
    comment_count: i64,
}

#[derive(Clone, serde::Serialize)]
struct BlogComment {
    id: String,
    #[serde(rename = "topicId")]
    topic_id: String,
    #[serde(rename = "authorId")]
    author_id: String,
    #[serde(rename = "authorName")]
    author_name: String,
    content: String,
    #[serde(rename = "replyToId")]
    reply_to_id: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Clone, serde::Serialize)]
struct ChatMessage {
    id: String,
    channel: String,
    #[serde(rename = "senderId")]
    sender_id: String,
    #[serde(rename = "senderName")]
    sender_name: String,
    content: String,
    #[serde(rename = "attachmentData")]
    attachment_data: Option<String>,
    #[serde(rename = "attachmentName")]
    attachment_name: Option<String>,
    #[serde(rename = "replyToId")]
    reply_to_id: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(serde::Deserialize)]
struct CreateAdminPayload {
    login: String,
    password: String,
    #[serde(rename = "fullName")]
    full_name: String,
}

#[derive(serde::Deserialize)]
struct LoginPayload {
    login: String,
    password: String,
}

#[derive(serde::Deserialize)]
struct ChangePasswordPayload {
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "currentPassword")]
    current_password: String,
    #[serde(rename = "newPassword")]
    new_password: String,
}

#[derive(serde::Deserialize)]
struct CreateEmployeePayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    login: String,
    password: String,
    #[serde(rename = "fullName")]
    full_name: String,
    phone: Option<String>,
    #[serde(rename = "positionId")]
    position_id: Option<String>,
    #[serde(rename = "managerId")]
    manager_id: Option<String>,
    #[serde(rename = "deputyId")]
    deputy_id: Option<String>,
    #[serde(rename = "departmentId")]
    department_id: Option<String>,
    #[serde(rename = "avatarData")]
    avatar_data: Option<String>,
    #[serde(rename = "birthDate")]
    birth_date: Option<String>,
    #[serde(rename = "isPartner", default)]
    is_partner: bool,
    #[serde(rename = "partnerId")]
    partner_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct CreatePartnerPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    name: String,
}

#[derive(serde::Deserialize)]
struct DeletePartnerPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct RenamePartnerPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
    name: String,
}

#[derive(serde::Deserialize)]
struct AdminResetPasswordPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "newPassword")]
    new_password: String,
}

#[derive(serde::Deserialize)]
struct UpdateEmployeePayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "fullName")]
    full_name: String,
    phone: Option<String>,
    #[serde(rename = "positionId")]
    position_id: Option<String>,
    #[serde(rename = "managerId")]
    manager_id: Option<String>,
    #[serde(rename = "deputyId")]
    deputy_id: Option<String>,
    #[serde(rename = "departmentId")]
    department_id: Option<String>,
    #[serde(rename = "avatarData")]
    avatar_data: Option<String>,
    #[serde(rename = "birthDate")]
    birth_date: Option<String>,
}

#[derive(serde::Deserialize)]
struct CreateDepartmentPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    name: String,
    #[serde(rename = "headEmployeeId")]
    head_employee_id: Option<String>,
    #[serde(rename = "deputyEmployeeId")]
    deputy_employee_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateDepartmentPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
    name: String,
    #[serde(rename = "headEmployeeId")]
    head_employee_id: Option<String>,
    #[serde(rename = "deputyEmployeeId")]
    deputy_employee_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct DeleteDepartmentPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct CreateEditRequestPayload {
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "requestedFullName")]
    requested_full_name: Option<String>,
    #[serde(rename = "requestedPhone")]
    requested_phone: Option<String>,
    note: Option<String>,
}

#[derive(serde::Deserialize)]
struct ResolveEditRequestPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    #[serde(rename = "requestId")]
    request_id: String,
    action: String,
}

#[derive(serde::Deserialize)]
struct CreateAbsenceRequestPayload {
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "type")]
    request_type: String,
    #[serde(rename = "startDate")]
    start_date: String,
    #[serde(rename = "endDate")]
    end_date: String,
    reason: Option<String>,
    #[serde(rename = "makeupSlots")]
    makeup_slots: Option<String>,
}

#[derive(serde::Deserialize)]
struct GetAbsenceRequestPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "requestId")]
    request_id: String,
}

#[derive(serde::Deserialize)]
struct ResolveAbsenceRequestPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "requestId")]
    request_id: String,
    approve: bool,
}

#[derive(serde::Deserialize)]
struct CreateClientPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    name: String,
    #[serde(rename = "contactPerson")]
    contact_person: Option<String>,
    #[serde(rename = "contactPosition")]
    contact_position: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    notes: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateClientPayload {
    id: String,
    name: String,
    #[serde(rename = "contactPerson")]
    contact_person: Option<String>,
    #[serde(rename = "contactPosition")]
    contact_position: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
    notes: Option<String>,
}

#[derive(serde::Deserialize)]
struct DeleteClientPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct AddClientHistoryPayload {
    #[serde(rename = "clientId")]
    client_id: String,
    #[serde(rename = "actorId")]
    actor_id: String,
    description: String,
}

#[derive(serde::Deserialize)]
struct CreateProjectPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "clientId")]
    client_id: Option<String>,
    status: String,
}

#[derive(serde::Deserialize)]
struct UpdateProjectPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "clientId")]
    client_id: Option<String>,
    status: String,
}

#[derive(serde::Deserialize)]
struct DeleteProjectPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct AddProjectMemberPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "projectId")]
    project_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    role: String,
}

#[derive(serde::Deserialize)]
struct RemoveProjectMemberPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "projectId")]
    project_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct TransferProjectOwnershipPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "projectId")]
    project_id: String,
    #[serde(rename = "newOwnerId")]
    new_owner_id: String,
}

#[derive(serde::Deserialize)]
struct SendProjectChatMessagePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "projectId")]
    project_id: String,
    #[serde(rename = "targetEmployeeId")]
    target_employee_id: String,
    content: String,
    #[serde(rename = "attachmentData")]
    attachment_data: Option<String>,
    #[serde(rename = "attachmentName")]
    attachment_name: Option<String>,
    deadline: Option<String>,
}

#[derive(serde::Deserialize)]
struct AssignProjectChatMessagePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "messageId")]
    message_id: String,
    #[serde(rename = "targetEmployeeId")]
    target_employee_id: String,
    deadline: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateProjectChatMessageStatusPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "messageId")]
    message_id: String,
    status: String,
}

#[derive(serde::Deserialize)]
struct AddProjectChatReplyPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "messageId")]
    message_id: String,
    content: String,
}

#[derive(serde::Deserialize)]
struct CreateRegulationPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    title: String,
    description: Option<String>,
    #[serde(rename = "clientId")]
    client_id: Option<String>,
    deadline: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateRegulationPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
    title: String,
    description: Option<String>,
    #[serde(rename = "clientId")]
    client_id: Option<String>,
    deadline: Option<String>,
    status: String,
}

#[derive(serde::Deserialize)]
struct DeleteRegulationPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct AddRegulationMemberPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "regulationId")]
    regulation_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    role: String,
}

#[derive(serde::Deserialize)]
struct RemoveRegulationMemberPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "regulationId")]
    regulation_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct AddRegulationEntryPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "regulationId")]
    regulation_id: String,
    #[serde(rename = "targetEmployeeId")]
    target_employee_id: String,
    content: String,
    #[serde(rename = "attachmentData")]
    attachment_data: Option<String>,
    #[serde(rename = "attachmentName")]
    attachment_name: Option<String>,
    deadline: Option<String>,
}

#[derive(serde::Deserialize)]
struct AssignRegulationEntryPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
    #[serde(rename = "targetEmployeeId")]
    target_employee_id: String,
    deadline: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateEntryStatusPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
    status: String,
}

#[derive(serde::Deserialize)]
struct AddRegulationReplyPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
    content: String,
}

#[derive(serde::Deserialize)]
struct AddRegulationReminderPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "regulationId")]
    regulation_id: String,
    #[serde(rename = "entryId")]
    entry_id: Option<String>,
    #[serde(rename = "targetEmployeeId")]
    target_employee_id: String,
    #[serde(rename = "remindAt")]
    remind_at: String,
    note: String,
}

#[derive(serde::Deserialize)]
struct ListRegulationRemindersPayload {
    #[serde(rename = "regulationId")]
    regulation_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct UpdateEntryDeadlinePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
    deadline: Option<String>,
}

#[derive(serde::Deserialize)]
struct CreateBlogTopicPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    category: String,
    title: String,
    content: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateBlogTopicPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
    category: String,
    title: String,
    content: Option<String>,
}

#[derive(serde::Deserialize)]
struct SetBlogTopicPinnedPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
    pinned: bool,
}

#[derive(serde::Deserialize)]
struct DeleteBlogTopicPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct AddBlogCommentPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "topicId")]
    topic_id: String,
    content: String,
    #[serde(rename = "replyToId")]
    reply_to_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct SendChatMessagePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    channel: String,
    content: String,
    #[serde(rename = "attachmentData")]
    attachment_data: Option<String>,
    #[serde(rename = "attachmentName")]
    attachment_name: Option<String>,
    #[serde(rename = "replyToId")]
    reply_to_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct MarkChatChannelReadPayload {
    #[serde(rename = "employeeId")]
    employee_id: String,
    channel: String,
}

#[derive(serde::Deserialize)]
struct SetServerSettingsPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    enabled: bool,
    port: u16,
}

#[derive(serde::Deserialize)]
struct SetEmployeeSchedulePayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "workDays")]
    work_days: Option<String>,
    #[serde(rename = "workStart")]
    work_start: Option<String>,
    #[serde(rename = "workEnd")]
    work_end: Option<String>,
}

#[derive(serde::Deserialize)]
struct SelfUpdateEmployeePayload {
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "fullName")]
    full_name: String,
    phone: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateOwnAvatarPayload {
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "avatarData")]
    avatar_data: Option<String>,
}

#[derive(serde::Deserialize)]
struct SetEmployeeStatusPayload {
    #[serde(rename = "employeeId")]
    employee_id: String,
    // null/отсутствие — снять статус; иначе одно из: "away15" | "lunch" | "vacation" | "dayoff"
    status: Option<String>,
}

#[derive(serde::Serialize)]
struct LoginResult {
    success: bool,
    employee: Option<Employee>,
    message: Option<String>,
}

// Arc — чтобы то же состояние можно было отдать и Tauri (app.manage), и
// фоновому axum-серверу (см. server.rs) без второго соединения к SQLite.
// Все существующие команды продолжают работать без изменений: state.0.lock()
// у Arc<Mutex<Db>> работает так же, как у Mutex<Db> (Deref).
pub struct AppState(pub Arc<Mutex<Db>>);

// Отдельное managed-состояние (не поле AppState — иначе пришлось бы менять
// все ~90 существующих команд с `state.0.lock()` на `state.db.lock()`) —
// нужен для загрузки обновлений (см. update_installer_path ниже): и
// локальным Tauri-командам, и HTTP-серверу (через ServerState в server.rs)
// нужно знать, где на диске лежит файл установщика.
pub struct AppDataDir(pub std::path::PathBuf);

// Путь к файлу установщика, который сервер раздаёт клиентам для практичного
// (без ключа подписи) обновления — см. журнал v0.2.9 в docs/TZ.md. Админ
// сам кладёт туда новый установщик после пересборки; имя файла фиксировано,
// чтобы не парсить версии из имени файла.
pub fn update_installer_path(app_data_dir: &std::path::Path) -> std::path::PathBuf {
    app_data_dir.join("updates").join("downloaded-installer.exe")
}

#[derive(Clone, serde::Serialize)]
pub struct UpdateInstallerInfo {
    available: bool,
    #[serde(rename = "sizeBytes")]
    size_bytes: u64,
}

pub fn get_update_installer_info_impl(app_data_dir: &std::path::Path) -> UpdateInstallerInfo {
    match std::fs::metadata(update_installer_path(app_data_dir)) {
        Ok(meta) if meta.is_file() => UpdateInstallerInfo { available: true, size_bytes: meta.len() },
        _ => UpdateInstallerInfo { available: false, size_bytes: 0 },
    }
}

fn to_employee(e: db::EmployeeRecord) -> Employee {
    Employee {
        id: e.id,
        employee_number: e.employee_number,
        login: e.login,
        full_name: e.full_name,
        is_admin: e.is_admin,
        phone: e.phone,
        position_id: e.position_id,
        position_title: e.position_title,
        manager_id: e.manager_id,
        manager_name: e.manager_name,
        deputy_id: e.deputy_id,
        deputy_name: e.deputy_name,
        department_id: e.department_id,
        department_name: e.department_name,
        self_edit_until: e.self_edit_until,
        has_pending_edit_request: e.has_pending_edit_request,
        avatar_data: e.avatar_data,
        created_at: e.created_at,
        is_online: e.is_online,
        last_seen_at: e.last_seen_at,
        manual_status: e.manual_status,
        manual_status_until: e.manual_status_until,
        work_days: e.work_days,
        work_start: e.work_start,
        work_end: e.work_end,
        head_of_department_name: e.head_of_department_name,
        deputy_of_department_name: e.deputy_of_department_name,
        birth_date: e.birth_date,
        is_partner: e.is_partner,
        partner_id: e.partner_id,
        partner_name: e.partner_name,
    }
}

fn to_partner(p: db::PartnerRecord) -> Partner {
    Partner {
        id: p.id,
        name: p.name,
        created_by: p.created_by,
        created_by_name: p.created_by_name,
        created_at: p.created_at,
        account_count: p.account_count,
    }
}

fn to_absence_request(r: db::AbsenceRequestRecord) -> AbsenceRequest {
    AbsenceRequest {
        id: r.id,
        employee_id: r.employee_id,
        employee_name: r.employee_name,
        request_type: r.request_type,
        start_date: r.start_date,
        end_date: r.end_date,
        reason: r.reason,
        makeup_slots: r.makeup_slots,
        status: r.status,
        created_at: r.created_at,
        resolved_by: r.resolved_by,
        resolved_by_name: r.resolved_by_name,
        resolved_by_is_admin: r.resolved_by_is_admin,
        resolved_at: r.resolved_at,
    }
}

fn to_session(s: db::SessionRecord) -> Session {
    Session { id: s.id, login_at: s.login_at, logout_at: s.logout_at }
}

fn to_client(c: db::ClientRecord) -> Client {
    Client {
        id: c.id,
        client_number: c.client_number,
        name: c.name,
        contact_person: c.contact_person,
        contact_position: c.contact_position,
        phone: c.phone,
        email: c.email,
        address: c.address,
        notes: c.notes,
        created_by: c.created_by,
        created_by_name: c.created_by_name,
        created_at: c.created_at,
    }
}

fn to_client_history(h: db::ClientHistoryRecord) -> ClientHistoryEntry {
    ClientHistoryEntry {
        id: h.id,
        client_id: h.client_id,
        description: h.description,
        created_by: h.created_by,
        created_by_name: h.created_by_name,
        created_at: h.created_at,
    }
}

fn to_project(p: db::ProjectRecord) -> Project {
    Project {
        id: p.id,
        project_number: p.project_number,
        name: p.name,
        description: p.description,
        client_id: p.client_id,
        client_name: p.client_name,
        owner_id: p.owner_id,
        owner_name: p.owner_name,
        status: p.status,
        created_by: p.created_by,
        created_by_name: p.created_by_name,
        created_at: p.created_at,
        updated_at: p.updated_at,
        member_count: p.member_count,
    }
}

fn to_project_member(m: db::ProjectMemberRecord) -> ProjectMember {
    ProjectMember {
        employee_id: m.employee_id,
        employee_name: m.employee_name,
        role_in_project: m.role_in_project,
        is_owner: m.is_owner,
        added_at: m.added_at,
    }
}

fn to_project_chat_message(m: db::ProjectChatMessageRecord) -> ProjectChatMessage {
    ProjectChatMessage {
        id: m.id,
        project_id: m.project_id,
        sender_id: m.sender_id,
        sender_name: m.sender_name,
        target_employee_id: m.target_employee_id,
        target_name: m.target_name,
        content: m.content,
        attachment_data: m.attachment_data,
        attachment_name: m.attachment_name,
        deadline: m.deadline,
        status: m.status,
        created_at: m.created_at,
        reply_count: m.reply_count,
    }
}

fn to_project_chat_reply(r: db::ProjectChatReplyRecord) -> ProjectChatReply {
    ProjectChatReply {
        id: r.id,
        message_id: r.message_id,
        author_id: r.author_id,
        author_name: r.author_name,
        content: r.content,
        created_at: r.created_at,
    }
}

fn to_regulation(r: db::RegulationRecord) -> Regulation {
    Regulation {
        id: r.id, reg_number: r.reg_number, slug: r.slug, title: r.title,
        description: r.description, client_id: r.client_id, client_name: r.client_name,
        owner_id: r.owner_id, owner_name: r.owner_name, status: r.status,
        deadline: r.deadline, closed_at: r.closed_at,
        created_by: r.created_by, created_by_name: r.created_by_name,
        created_at: r.created_at, updated_at: r.updated_at,
        member_count: r.member_count, entry_count: r.entry_count,
    }
}

fn to_reg_member(m: db::RegulationMemberRecord) -> RegulationMember {
    RegulationMember { employee_id: m.employee_id, employee_name: m.employee_name, role_in_reg: m.role_in_reg, added_at: m.added_at }
}

fn to_reg_entry(e: db::RegulationEntryRecord) -> RegulationEntry {
    RegulationEntry {
        id: e.id, regulation_id: e.regulation_id, author_id: e.author_id, author_name: e.author_name,
        target_employee_id: e.target_employee_id, target_name: e.target_name,
        content: e.content, attachment_data: e.attachment_data, attachment_name: e.attachment_name,
        deadline: e.deadline, status: e.status, created_at: e.created_at, updated_at: e.updated_at, reply_count: e.reply_count,
    }
}

fn to_my_task(t: db::MyTaskRecord) -> MyTask {
    MyTask {
        entry_id: t.entry_id, regulation_id: t.regulation_id, reg_number: t.reg_number,
        regulation_title: t.regulation_title, slug: t.slug, content: t.content,
        deadline: t.deadline, created_at: t.created_at,
    }
}

fn to_reg_reply(r: db::RegulationReplyRecord) -> RegulationReply {
    RegulationReply { id: r.id, entry_id: r.entry_id, author_id: r.author_id, author_name: r.author_name, content: r.content, created_at: r.created_at }
}

fn to_reg_reminder(r: db::RegulationReminderRecord) -> RegulationReminder {
    RegulationReminder {
        id: r.id,
        regulation_id: r.regulation_id,
        entry_id: r.entry_id,
        created_by: r.created_by,
        created_by_name: r.created_by_name,
        target_employee_id: r.target_employee_id,
        target_name: r.target_name,
        remind_at: r.remind_at,
        note: r.note,
        fired: r.fired,
        created_at: r.created_at,
    }
}

fn to_position(p: db::PositionRecord) -> Position {
    Position { id: p.id, title: p.title }
}

fn to_blog_topic(t: db::BlogTopicRecord) -> BlogTopic {
    BlogTopic {
        id: t.id, category: t.category, title: t.title, content: t.content,
        created_by: t.created_by, created_by_name: t.created_by_name,
        pinned: t.pinned, created_at: t.created_at, comment_count: t.comment_count,
    }
}

fn to_blog_comment(c: db::BlogCommentRecord) -> BlogComment {
    BlogComment {
        id: c.id, topic_id: c.topic_id, author_id: c.author_id, author_name: c.author_name,
        content: c.content, reply_to_id: c.reply_to_id, created_at: c.created_at,
    }
}

fn to_chat_message(m: db::ChatMessageRecord) -> ChatMessage {
    ChatMessage {
        id: m.id,
        channel: m.channel,
        sender_id: m.sender_id,
        sender_name: m.sender_name,
        content: m.content,
        attachment_data: m.attachment_data,
        attachment_name: m.attachment_name,
        reply_to_id: m.reply_to_id,
        created_at: m.created_at,
    }
}

fn to_server_settings(s: db::ServerSettingsRecord) -> ServerSettings {
    ServerSettings { enabled: s.enabled, port: s.port }
}

fn to_department(d: db::DepartmentRecord) -> Department {
    Department {
        id: d.id,
        name: d.name,
        head_employee_id: d.head_employee_id,
        head_name: d.head_name,
        deputy_employee_id: d.deputy_employee_id,
        deputy_name: d.deputy_name,
        member_count: d.member_count,
    }
}

fn to_notification(n: db::NotificationRecord) -> Notification {
    Notification {
        id: n.id,
        employee_id: n.employee_id,
        notification_type: n.notification_type,
        title: n.title,
        body: n.body,
        related_entity_type: n.related_entity_type,
        related_entity_id: n.related_entity_id,
        is_read: n.is_read,
        created_at: n.created_at,
    }
}

fn to_edit_request(r: db::EditRequestRecord) -> EditRequest {
    EditRequest {
        id: r.id,
        employee_id: r.employee_id,
        employee_name: r.employee_name,
        requested_full_name: r.requested_full_name,
        requested_phone: r.requested_phone,
        note: r.note,
        status: r.status,
        created_at: r.created_at,
    }
}

#[tauri::command]
fn has_admin(state: tauri::State<AppState>) -> bool {
    let db = state.0.lock().unwrap();
    db.has_admin()
}

#[tauri::command]
fn create_admin(payload: CreateAdminPayload, state: tauri::State<AppState>) -> Result<Employee, String> {
    let db = state.0.lock().unwrap();
    db.create_admin(&payload.login, &payload.password, &payload.full_name)
        .map(to_employee)
}

#[tauri::command]
fn login(payload: LoginPayload, state: tauri::State<AppState>) -> LoginResult {
    let db = state.0.lock().unwrap();
    match db.verify_login(&payload.login, &payload.password) {
        Ok(e) => LoginResult { success: true, employee: Some(to_employee(e)), message: None },
        Err(msg) => LoginResult { success: false, employee: None, message: Some(msg) },
    }
}

#[tauri::command]
fn change_password(payload: ChangePasswordPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.change_password(&payload.employee_id, &payload.current_password, &payload.new_password)
}

#[tauri::command]
fn list_employees(state: tauri::State<AppState>) -> Vec<Employee> {
    let db = state.0.lock().unwrap();
    db.list_employees().into_iter().map(to_employee).collect()
}

#[tauri::command]
fn get_employee(id: String, state: tauri::State<AppState>) -> Option<Employee> {
    let db = state.0.lock().unwrap();
    db.get_employee(&id).map(to_employee)
}

#[tauri::command]
fn create_employee(payload: CreateEmployeePayload, state: tauri::State<AppState>) -> Result<Employee, String> {
    let db = state.0.lock().unwrap();
    db.create_employee(
        &payload.admin_id,
        &payload.login,
        &payload.password,
        &payload.full_name,
        payload.phone.as_deref(),
        payload.position_id.as_deref(),
        payload.manager_id.as_deref(),
        payload.deputy_id.as_deref(),
        payload.department_id.as_deref(),
        payload.avatar_data.as_deref(),
        payload.birth_date.as_deref(),
        payload.is_partner,
        payload.partner_id.as_deref(),
    )
    .map(to_employee)
}

#[tauri::command]
fn list_partners(state: tauri::State<AppState>) -> Vec<Partner> {
    let db = state.0.lock().unwrap();
    db.list_partners().into_iter().map(to_partner).collect()
}

#[tauri::command]
fn create_partner(payload: CreatePartnerPayload, state: tauri::State<AppState>) -> Result<Partner, String> {
    let db = state.0.lock().unwrap();
    db.create_partner(&payload.admin_id, &payload.name).map(to_partner)
}

#[tauri::command]
fn delete_partner(payload: DeletePartnerPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_partner(&payload.admin_id, &payload.id)
}

#[tauri::command]
fn rename_partner(payload: RenamePartnerPayload, state: tauri::State<AppState>) -> Result<Partner, String> {
    let db = state.0.lock().unwrap();
    db.rename_partner(&payload.admin_id, &payload.id, &payload.name).map(to_partner)
}

#[tauri::command]
fn admin_reset_password(payload: AdminResetPasswordPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.admin_reset_password(&payload.admin_id, &payload.employee_id, &payload.new_password)
}

#[tauri::command]
fn update_employee(payload: UpdateEmployeePayload, state: tauri::State<AppState>) -> Result<Employee, String> {
    let db = state.0.lock().unwrap();
    db.update_employee(
        &payload.admin_id,
        &payload.employee_id,
        &payload.full_name,
        payload.phone.as_deref(),
        payload.position_id.as_deref(),
        payload.manager_id.as_deref(),
        payload.deputy_id.as_deref(),
        payload.department_id.as_deref(),
        payload.avatar_data.as_deref(),
        payload.birth_date.as_deref(),
    )
    .map(to_employee)
}

#[tauri::command]
fn list_positions(state: tauri::State<AppState>) -> Vec<Position> {
    let db = state.0.lock().unwrap();
    db.list_positions().into_iter().map(to_position).collect()
}

#[tauri::command]
fn create_position(title: String, state: tauri::State<AppState>) -> Result<Position, String> {
    let db = state.0.lock().unwrap();
    db.create_position(&title).map(to_position)
}

#[tauri::command]
fn list_departments(state: tauri::State<AppState>) -> Vec<Department> {
    let db = state.0.lock().unwrap();
    db.list_departments().into_iter().map(to_department).collect()
}

#[tauri::command]
fn create_department(payload: CreateDepartmentPayload, state: tauri::State<AppState>) -> Result<Department, String> {
    let db = state.0.lock().unwrap();
    db.create_department(
        &payload.admin_id,
        &payload.name,
        payload.head_employee_id.as_deref(),
        payload.deputy_employee_id.as_deref(),
    )
    .map(to_department)
}

#[tauri::command]
fn update_department(payload: UpdateDepartmentPayload, state: tauri::State<AppState>) -> Result<Department, String> {
    let db = state.0.lock().unwrap();
    db.update_department(
        &payload.admin_id,
        &payload.id,
        &payload.name,
        payload.head_employee_id.as_deref(),
        payload.deputy_employee_id.as_deref(),
    )
    .map(to_department)
}

#[tauri::command]
fn delete_department(payload: DeleteDepartmentPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_department(&payload.admin_id, &payload.id)
}

#[tauri::command]
fn list_notifications(employee_id: String, state: tauri::State<AppState>) -> Vec<Notification> {
    let db = state.0.lock().unwrap();
    db.list_notifications(&employee_id).into_iter().map(to_notification).collect()
}

#[tauri::command]
fn mark_notification_read(id: String, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.mark_notification_read(&id)
}

#[tauri::command]
fn create_edit_request(payload: CreateEditRequestPayload, state: tauri::State<AppState>) -> Result<EditRequest, String> {
    let db = state.0.lock().unwrap();
    db.create_edit_request(
        &payload.employee_id,
        payload.requested_full_name.as_deref(),
        payload.requested_phone.as_deref(),
        payload.note.as_deref(),
    )
    .map(to_edit_request)
}

#[tauri::command]
fn list_edit_requests(admin_id: String, state: tauri::State<AppState>) -> Result<Vec<EditRequest>, String> {
    let db = state.0.lock().unwrap();
    db.list_edit_requests(&admin_id).map(|rows| rows.into_iter().map(to_edit_request).collect())
}

#[tauri::command]
fn resolve_edit_request(payload: ResolveEditRequestPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.resolve_edit_request(&payload.admin_id, &payload.request_id, &payload.action)
}

#[tauri::command]
fn self_update_employee(payload: SelfUpdateEmployeePayload, state: tauri::State<AppState>) -> Result<Employee, String> {
    let db = state.0.lock().unwrap();
    db.self_update_employee(&payload.employee_id, &payload.full_name, payload.phone.as_deref())
        .map(to_employee)
}

#[tauri::command]
fn update_own_avatar(payload: UpdateOwnAvatarPayload, state: tauri::State<AppState>) -> Result<Employee, String> {
    let db = state.0.lock().unwrap();
    db.update_own_avatar(&payload.employee_id, payload.avatar_data.as_deref()).map(to_employee)
}

#[tauri::command]
fn set_employee_status(payload: SetEmployeeStatusPayload, state: tauri::State<AppState>) -> Result<Employee, String> {
    let db = state.0.lock().unwrap();
    db.set_employee_status(&payload.employee_id, payload.status.as_deref())
        .map(to_employee)
}

#[tauri::command]
fn set_employee_schedule(payload: SetEmployeeSchedulePayload, state: tauri::State<AppState>) -> Result<Employee, String> {
    let db = state.0.lock().unwrap();
    db.set_employee_schedule(
        &payload.admin_id,
        &payload.employee_id,
        payload.work_days.as_deref(),
        payload.work_start.as_deref(),
        payload.work_end.as_deref(),
    )
    .map(to_employee)
}

#[tauri::command]
fn create_absence_request(payload: CreateAbsenceRequestPayload, state: tauri::State<AppState>) -> Result<AbsenceRequest, String> {
    let db = state.0.lock().unwrap();
    db.create_absence_request(
        &payload.employee_id,
        &payload.request_type,
        &payload.start_date,
        &payload.end_date,
        payload.reason.as_deref(),
        payload.makeup_slots.as_deref(),
    )
    .map(to_absence_request)
}

#[tauri::command]
fn list_absence_requests_for_employee(employee_id: String, state: tauri::State<AppState>) -> Vec<AbsenceRequest> {
    let db = state.0.lock().unwrap();
    db.list_absence_requests_for_employee(&employee_id).into_iter().map(to_absence_request).collect()
}

#[tauri::command]
fn list_pending_approvals(actor_id: String, state: tauri::State<AppState>) -> Vec<AbsenceRequest> {
    let db = state.0.lock().unwrap();
    db.list_pending_approvals(&actor_id).into_iter().map(to_absence_request).collect()
}

#[tauri::command]
fn list_all_absence_requests(admin_id: String, state: tauri::State<AppState>) -> Result<Vec<AbsenceRequest>, String> {
    let db = state.0.lock().unwrap();
    db.list_all_absence_requests(&admin_id).map(|rows| rows.into_iter().map(to_absence_request).collect())
}

#[tauri::command]
fn get_absence_request(payload: GetAbsenceRequestPayload, state: tauri::State<AppState>) -> Result<AbsenceRequest, String> {
    let db = state.0.lock().unwrap();
    db.get_absence_request(&payload.actor_id, &payload.request_id).map(to_absence_request)
}

#[tauri::command]
fn resolve_absence_request(payload: ResolveAbsenceRequestPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.resolve_absence_request(&payload.actor_id, &payload.request_id, payload.approve)
}

#[tauri::command]
fn list_clients(state: tauri::State<AppState>) -> Vec<Client> {
    let db = state.0.lock().unwrap();
    db.list_clients().into_iter().map(to_client).collect()
}

#[tauri::command]
fn get_client(id: String, state: tauri::State<AppState>) -> Option<Client> {
    let db = state.0.lock().unwrap();
    db.get_client(&id).map(to_client)
}

#[tauri::command]
fn create_client(payload: CreateClientPayload, state: tauri::State<AppState>) -> Result<Client, String> {
    let db = state.0.lock().unwrap();
    db.create_client(
        &payload.actor_id,
        &payload.name,
        payload.contact_person.as_deref(),
        payload.contact_position.as_deref(),
        payload.phone.as_deref(),
        payload.email.as_deref(),
        payload.address.as_deref(),
        payload.notes.as_deref(),
    )
    .map(to_client)
}

#[tauri::command]
fn update_client(payload: UpdateClientPayload, state: tauri::State<AppState>) -> Result<Client, String> {
    let db = state.0.lock().unwrap();
    db.update_client(
        &payload.id,
        &payload.name,
        payload.contact_person.as_deref(),
        payload.contact_position.as_deref(),
        payload.phone.as_deref(),
        payload.email.as_deref(),
        payload.address.as_deref(),
        payload.notes.as_deref(),
    )
    .map(to_client)
}

#[tauri::command]
fn delete_client(payload: DeleteClientPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_client(&payload.admin_id, &payload.id)
}

#[tauri::command]
fn list_client_history(client_id: String, state: tauri::State<AppState>) -> Vec<ClientHistoryEntry> {
    let db = state.0.lock().unwrap();
    db.list_client_history(&client_id).into_iter().map(to_client_history).collect()
}

#[tauri::command]
fn add_client_history(payload: AddClientHistoryPayload, state: tauri::State<AppState>) -> Result<ClientHistoryEntry, String> {
    let db = state.0.lock().unwrap();
    db.add_client_history(&payload.client_id, &payload.actor_id, &payload.description)
        .map(to_client_history)
}

#[tauri::command]
fn list_projects(state: tauri::State<AppState>) -> Vec<Project> {
    let db = state.0.lock().unwrap();
    db.list_projects().into_iter().map(to_project).collect()
}

#[tauri::command]
fn get_project(id: String, state: tauri::State<AppState>) -> Option<Project> {
    let db = state.0.lock().unwrap();
    db.get_project(&id).map(to_project)
}

#[tauri::command]
fn create_project(payload: CreateProjectPayload, state: tauri::State<AppState>) -> Result<Project, String> {
    let db = state.0.lock().unwrap();
    db.create_project(
        &payload.actor_id,
        &payload.name,
        payload.description.as_deref(),
        payload.client_id.as_deref(),
        &payload.status,
    )
    .map(to_project)
}

#[tauri::command]
fn update_project(payload: UpdateProjectPayload, state: tauri::State<AppState>) -> Result<Project, String> {
    let db = state.0.lock().unwrap();
    db.update_project(
        &payload.actor_id,
        &payload.id,
        &payload.name,
        payload.description.as_deref(),
        payload.client_id.as_deref(),
        &payload.status,
    )
    .map(to_project)
}

#[tauri::command]
fn delete_project(payload: DeleteProjectPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_project(&payload.admin_id, &payload.id)
}

#[tauri::command]
fn list_project_members(project_id: String, state: tauri::State<AppState>) -> Vec<ProjectMember> {
    let db = state.0.lock().unwrap();
    db.list_project_members(&project_id).into_iter().map(to_project_member).collect()
}

#[tauri::command]
fn add_project_member(payload: AddProjectMemberPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.add_project_member(&payload.actor_id, &payload.project_id, &payload.employee_id, &payload.role)
}

#[tauri::command]
fn remove_project_member(payload: RemoveProjectMemberPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.remove_project_member(&payload.actor_id, &payload.project_id, &payload.employee_id)
}

#[tauri::command]
fn transfer_project_ownership(payload: TransferProjectOwnershipPayload, state: tauri::State<AppState>) -> Result<Project, String> {
    let db = state.0.lock().unwrap();
    db.transfer_project_ownership(&payload.actor_id, &payload.project_id, &payload.new_owner_id)
        .map(to_project)
}

#[tauri::command]
fn list_project_chat(project_id: String, state: tauri::State<AppState>) -> Vec<ProjectChatMessage> {
    let db = state.0.lock().unwrap();
    db.list_project_chat(&project_id).into_iter().map(to_project_chat_message).collect()
}

#[tauri::command]
fn send_project_chat_message(payload: SendProjectChatMessagePayload, state: tauri::State<AppState>) -> Result<ProjectChatMessage, String> {
    let db = state.0.lock().unwrap();
    db.send_project_chat_message(&payload.actor_id, &payload.project_id, &payload.target_employee_id, &payload.content, payload.attachment_data.as_deref(), payload.attachment_name.as_deref(), payload.deadline.as_deref())
        .map(to_project_chat_message)
}

#[tauri::command]
fn assign_project_chat_message(payload: AssignProjectChatMessagePayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.assign_project_chat_message(&payload.actor_id, &payload.message_id, &payload.target_employee_id, payload.deadline.as_deref())
}

#[tauri::command]
fn update_project_chat_message_status(payload: UpdateProjectChatMessageStatusPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.update_project_chat_message_status(&payload.actor_id, &payload.message_id, &payload.status)
}

#[tauri::command]
fn list_project_chat_replies(message_id: String, state: tauri::State<AppState>) -> Vec<ProjectChatReply> {
    let db = state.0.lock().unwrap();
    db.list_project_chat_replies(&message_id).into_iter().map(to_project_chat_reply).collect()
}

#[tauri::command]
fn add_project_chat_reply(payload: AddProjectChatReplyPayload, state: tauri::State<AppState>) -> Result<ProjectChatReply, String> {
    let db = state.0.lock().unwrap();
    db.add_project_chat_reply(&payload.actor_id, &payload.message_id, &payload.content)
        .map(to_project_chat_reply)
}

#[tauri::command]
fn list_regulations(state: tauri::State<AppState>) -> Vec<Regulation> {
    let db = state.0.lock().unwrap();
    db.list_regulations().into_iter().map(to_regulation).collect()
}

#[tauri::command]
fn get_regulation(id: String, state: tauri::State<AppState>) -> Option<Regulation> {
    let db = state.0.lock().unwrap();
    db.get_regulation(&id).map(to_regulation)
}

#[tauri::command]
fn create_regulation(payload: CreateRegulationPayload, state: tauri::State<AppState>) -> Result<Regulation, String> {
    let db = state.0.lock().unwrap();
    db.create_regulation(&payload.actor_id, &payload.title, payload.description.as_deref(), payload.client_id.as_deref(), payload.deadline.as_deref())
        .map(to_regulation)
}

#[tauri::command]
fn update_regulation(payload: UpdateRegulationPayload, state: tauri::State<AppState>) -> Result<Regulation, String> {
    let db = state.0.lock().unwrap();
    db.update_regulation(&payload.actor_id, &payload.id, &payload.title, payload.description.as_deref(), payload.client_id.as_deref(), payload.deadline.as_deref(), &payload.status)
        .map(to_regulation)
}

#[tauri::command]
fn delete_regulation(payload: DeleteRegulationPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_regulation(&payload.admin_id, &payload.id)
}

#[tauri::command]
fn list_regulation_members(regulation_id: String, state: tauri::State<AppState>) -> Vec<RegulationMember> {
    let db = state.0.lock().unwrap();
    db.list_regulation_members(&regulation_id).into_iter().map(to_reg_member).collect()
}

#[tauri::command]
fn add_regulation_member(payload: AddRegulationMemberPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.add_regulation_member(&payload.actor_id, &payload.regulation_id, &payload.employee_id, &payload.role)
}

#[tauri::command]
fn remove_regulation_member(payload: RemoveRegulationMemberPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.remove_regulation_member(&payload.actor_id, &payload.regulation_id, &payload.employee_id)
}

#[tauri::command]
fn list_regulation_entries(regulation_id: String, state: tauri::State<AppState>) -> Vec<RegulationEntry> {
    let db = state.0.lock().unwrap();
    db.list_regulation_entries(&regulation_id).into_iter().map(to_reg_entry).collect()
}

#[tauri::command]
fn list_my_open_tasks(employee_id: String, state: tauri::State<AppState>) -> Vec<MyTask> {
    let db = state.0.lock().unwrap();
    db.list_my_open_tasks(&employee_id).into_iter().map(to_my_task).collect()
}

#[tauri::command]
fn add_regulation_entry(payload: AddRegulationEntryPayload, state: tauri::State<AppState>) -> Result<RegulationEntry, String> {
    let db = state.0.lock().unwrap();
    db.add_regulation_entry(&payload.actor_id, &payload.regulation_id, &payload.target_employee_id, &payload.content, payload.attachment_data.as_deref(), payload.attachment_name.as_deref(), payload.deadline.as_deref())
        .map(to_reg_entry)
}

#[tauri::command]
fn assign_regulation_entry(payload: AssignRegulationEntryPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.assign_regulation_entry(&payload.actor_id, &payload.entry_id, &payload.target_employee_id, payload.deadline.as_deref())
}

#[tauri::command]
fn update_entry_status(payload: UpdateEntryStatusPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.update_entry_status(&payload.actor_id, &payload.entry_id, &payload.status)
}

#[tauri::command]
fn list_regulation_replies(entry_id: String, state: tauri::State<AppState>) -> Vec<RegulationReply> {
    let db = state.0.lock().unwrap();
    db.list_regulation_replies(&entry_id).into_iter().map(to_reg_reply).collect()
}

#[tauri::command]
fn add_regulation_reply(payload: AddRegulationReplyPayload, state: tauri::State<AppState>) -> Result<RegulationReply, String> {
    let db = state.0.lock().unwrap();
    db.add_regulation_reply(&payload.actor_id, &payload.entry_id, &payload.content)
        .map(to_reg_reply)
}

#[tauri::command]
fn add_regulation_reminder(payload: AddRegulationReminderPayload, state: tauri::State<AppState>) -> Result<RegulationReminder, String> {
    let db = state.0.lock().unwrap();
    db.add_regulation_reminder(
        &payload.actor_id,
        &payload.regulation_id,
        payload.entry_id.as_deref(),
        &payload.target_employee_id,
        &payload.remind_at,
        &payload.note,
    )
    .map(to_reg_reminder)
}

#[tauri::command]
fn list_regulation_reminders(payload: ListRegulationRemindersPayload, state: tauri::State<AppState>) -> Vec<RegulationReminder> {
    let db = state.0.lock().unwrap();
    db.list_regulation_reminders(&payload.regulation_id, &payload.employee_id)
        .into_iter()
        .map(to_reg_reminder)
        .collect()
}

#[tauri::command]
fn update_regulation_entry_deadline(payload: UpdateEntryDeadlinePayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.update_regulation_entry_deadline(&payload.actor_id, &payload.entry_id, payload.deadline.as_deref())
}

#[tauri::command]
fn list_blog_topics(state: tauri::State<AppState>) -> Vec<BlogTopic> {
    let db = state.0.lock().unwrap();
    db.list_blog_topics().into_iter().map(to_blog_topic).collect()
}

#[tauri::command]
fn create_blog_topic(payload: CreateBlogTopicPayload, state: tauri::State<AppState>) -> Result<BlogTopic, String> {
    let db = state.0.lock().unwrap();
    db.create_blog_topic(&payload.actor_id, &payload.category, &payload.title, payload.content.as_deref())
        .map(to_blog_topic)
}

#[tauri::command]
fn update_blog_topic(payload: UpdateBlogTopicPayload, state: tauri::State<AppState>) -> Result<BlogTopic, String> {
    let db = state.0.lock().unwrap();
    db.update_blog_topic(&payload.actor_id, &payload.id, &payload.category, &payload.title, payload.content.as_deref())
        .map(to_blog_topic)
}

#[tauri::command]
fn set_blog_topic_pinned(payload: SetBlogTopicPinnedPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.set_blog_topic_pinned(&payload.admin_id, &payload.id, payload.pinned)
}

#[tauri::command]
fn delete_blog_topic(payload: DeleteBlogTopicPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_blog_topic(&payload.actor_id, &payload.id)
}

#[tauri::command]
fn list_blog_comments(topic_id: String, state: tauri::State<AppState>) -> Vec<BlogComment> {
    let db = state.0.lock().unwrap();
    db.list_blog_comments(&topic_id).into_iter().map(to_blog_comment).collect()
}

#[tauri::command]
fn add_blog_comment(payload: AddBlogCommentPayload, state: tauri::State<AppState>) -> Result<BlogComment, String> {
    let db = state.0.lock().unwrap();
    db.add_blog_comment(&payload.actor_id, &payload.topic_id, &payload.content, payload.reply_to_id.as_deref())
        .map(to_blog_comment)
}

#[tauri::command]
fn list_chat_messages(employee_id: String, channel: String, state: tauri::State<AppState>) -> Result<Vec<ChatMessage>, String> {
    let db = state.0.lock().unwrap();
    db.list_chat_messages(&employee_id, &channel).map(|v| v.into_iter().map(to_chat_message).collect())
}

#[tauri::command]
fn send_chat_message(payload: SendChatMessagePayload, state: tauri::State<AppState>) -> Result<ChatMessage, String> {
    let db = state.0.lock().unwrap();
    db.send_chat_message(
        &payload.actor_id,
        &payload.channel,
        &payload.content,
        payload.attachment_data.as_deref(),
        payload.attachment_name.as_deref(),
        payload.reply_to_id.as_deref(),
    )
    .map(to_chat_message)
}

#[tauri::command]
fn mark_chat_channel_read(payload: MarkChatChannelReadPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.mark_chat_channel_read(&payload.employee_id, &payload.channel);
    Ok(())
}

#[tauri::command]
fn get_server_settings(state: tauri::State<AppState>) -> ServerSettings {
    let db = state.0.lock().unwrap();
    to_server_settings(db.get_server_settings())
}

#[tauri::command]
fn set_server_settings(payload: SetServerSettingsPayload, state: tauri::State<AppState>) -> Result<ServerSettings, String> {
    let db = state.0.lock().unwrap();
    db.set_server_settings(&payload.admin_id, payload.enabled, payload.port)
        .map(to_server_settings)
}

#[tauri::command]
fn record_login(employee_id: String, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.record_login(&employee_id)
}

#[tauri::command]
fn record_logout(employee_id: String, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.record_logout(&employee_id)
}

#[tauri::command]
fn list_recent_sessions(employee_id: String, state: tauri::State<AppState>) -> Vec<Session> {
    let db = state.0.lock().unwrap();
    db.list_recent_sessions(&employee_id, 20).into_iter().map(to_session).collect()
}

// Локальный LAN-адрес этого ПК — только чтобы показать админу, что давать
// коллегам при включении режима сервера (Настройки → Сервер). Классический
// трюк без внешних зависимостей: UDP "connect" не отправляет пакетов, только
// выбирает исходящий интерфейс/маршрут по таблице маршрутизации ОС, после
// чего local_addr() отдаёт реальный IP этого интерфейса.
#[tauri::command]
fn get_lan_address() -> Option<String> {
    use std::net::UdpSocket;
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|addr| addr.ip().to_string())
}

// Версия того процесса, который реально отвечает на вызов — не завязана на
// то, локальный ли это режим или сервер. В режиме клиента invoke() уходит
// на сервер, так что этот вызов вернёт версию СЕРВЕРА — ровно то, что нужно
// для практичной проверки "клиент отстал от сервера", раз настоящий
// автообновитель (см. src/lib/updater.ts) требует ключ подписи и публикацию
// релизов, которых пока нет.
#[tauri::command]
fn get_app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[tauri::command]
fn get_update_installer_info(app_data_dir: tauri::State<AppDataDir>) -> UpdateInstallerInfo {
    get_update_installer_info_impl(&app_data_dir.0)
}

#[tauri::command]
fn get_update_installer_path(app_data_dir: tauri::State<AppDataDir>) -> String {
    update_installer_path(&app_data_dir.0).display().to_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("нет app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();
            let db = Arc::new(Mutex::new(Db::init(&app_data_dir.join("ib-crm.db"))));

            // Если включён режим сервера (настройка в app_meta, см. Settings →
            // "Сервер") — поднимаем фоновый HTTP-сервер на том же Db, без
            // второго соединения к SQLite. Требует перезапуск приложения
            // после включения тумблера — динамический горячий старт/стоп
            // сознательно не делали в v0.2.0, чтобы не городить graceful
            // shutdown ради второстепенного UX-удобства.
            let settings = db.lock().unwrap().get_server_settings();
            if settings.enabled {
                let server_db = db.clone();
                let server_dir = app_data_dir.clone();
                tauri::async_runtime::spawn(server::run(server_db, settings.port, server_dir));
            }

            app.manage(AppState(db));
            app.manage(AppDataDir(app_data_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            has_admin,
            create_admin,
            login,
            change_password,
            list_employees,
            get_employee,
            create_employee,
            list_partners,
            create_partner,
            delete_partner,
            rename_partner,
            admin_reset_password,
            update_employee,
            list_positions,
            create_position,
            list_departments,
            create_department,
            update_department,
            delete_department,
            list_notifications,
            mark_notification_read,
            create_edit_request,
            list_edit_requests,
            resolve_edit_request,
            self_update_employee,
            update_own_avatar,
            set_employee_status,
            set_employee_schedule,
            create_absence_request,
            list_absence_requests_for_employee,
            list_pending_approvals,
            list_all_absence_requests,
            get_absence_request,
            resolve_absence_request,
            list_clients,
            get_client,
            create_client,
            update_client,
            delete_client,
            list_client_history,
            add_client_history,
            list_projects,
            get_project,
            create_project,
            update_project,
            delete_project,
            list_project_members,
            add_project_member,
            remove_project_member,
            transfer_project_ownership,
            list_project_chat,
            send_project_chat_message,
            assign_project_chat_message,
            update_project_chat_message_status,
            list_project_chat_replies,
            add_project_chat_reply,
            list_regulations,
            get_regulation,
            create_regulation,
            update_regulation,
            delete_regulation,
            list_regulation_members,
            add_regulation_member,
            remove_regulation_member,
            list_regulation_entries,
            list_my_open_tasks,
            add_regulation_entry,
            assign_regulation_entry,
            update_entry_status,
            list_regulation_replies,
            add_regulation_reply,
            add_regulation_reminder,
            list_regulation_reminders,
            update_regulation_entry_deadline,
            list_blog_topics,
            create_blog_topic,
            update_blog_topic,
            set_blog_topic_pinned,
            delete_blog_topic,
            list_blog_comments,
            add_blog_comment,
            list_chat_messages,
            send_chat_message,
            mark_chat_channel_read,
            get_server_settings,
            set_server_settings,
            get_lan_address,
            get_app_version,
            get_update_installer_info,
            get_update_installer_path,
            record_login,
            record_logout,
            list_recent_sessions
        ])
        .run(tauri::generate_context!())
        .expect("ошибка запуска tauri приложения");
}
