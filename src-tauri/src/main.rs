#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;
mod db;
mod dispatch;
mod report_export;
mod server;
mod telegram;

use db::Db;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};

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
    #[serde(rename = "partnerId")]
    partner_id: Option<String>,
    #[serde(rename = "partnerName")]
    partner_name: Option<String>,
    #[serde(rename = "dealValue")]
    deal_value: Option<String>,
    #[serde(rename = "serviceId")]
    service_id: Option<String>,
    #[serde(rename = "serviceName")]
    service_name: Option<String>,
    #[serde(rename = "houseServiceId")]
    house_service_id: Option<String>,
    #[serde(rename = "houseServiceName")]
    house_service_name: Option<String>,
    #[serde(rename = "originPartnerId")]
    origin_partner_id: Option<String>,
    #[serde(rename = "originPartnerName")]
    origin_partner_name: Option<String>,
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
struct ClientService {
    id: String,
    #[serde(rename = "clientId")]
    client_id: String,
    #[serde(rename = "houseServiceId")]
    house_service_id: Option<String>,
    #[serde(rename = "serviceId")]
    service_id: Option<String>,
    #[serde(rename = "serviceName")]
    service_name: String,
    price: Option<String>,
    #[serde(rename = "addedBy")]
    added_by: Option<String>,
    #[serde(rename = "addedByName")]
    added_by_name: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Clone, serde::Serialize)]
struct ServiceMonthStat {
    month: String,
    #[serde(rename = "serviceName")]
    service_name: String,
    count: i64,
}

#[derive(Clone, serde::Serialize)]
struct Agent {
    id: String,
    #[serde(rename = "agentNumber")]
    agent_number: String,
    #[serde(rename = "fullName")]
    full_name: String,
    phone: Option<String>,
    address: Option<String>,
    email: Option<String>,
    #[serde(rename = "passportPhotoData")]
    passport_photo_data: Option<String>,
    #[serde(rename = "passportPhotoName")]
    passport_photo_name: Option<String>,
    #[serde(rename = "consentGiven")]
    consent_given: bool,
    #[serde(rename = "consentGivenAt")]
    consent_given_at: Option<String>,
    locale: String,
    status: String,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "resolvedAt")]
    resolved_at: Option<String>,
    #[serde(rename = "resolvedBy")]
    resolved_by: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct AgentLead {
    id: String,
    #[serde(rename = "agentId")]
    agent_id: String,
    #[serde(rename = "agentName")]
    agent_name: String,
    #[serde(rename = "clientName")]
    client_name: String,
    #[serde(rename = "clientInn")]
    client_inn: String,
    #[serde(rename = "clientPhone")]
    client_phone: Option<String>,
    #[serde(rename = "companyName")]
    company_name: Option<String>,
    note: Option<String>,
    stage: String,
    #[serde(rename = "convertedClientId")]
    converted_client_id: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

#[derive(Clone, serde::Serialize)]
struct AgentConsentSettings {
    enabled: bool,
    #[serde(rename = "textRu")]
    text_ru: String,
    #[serde(rename = "textUz")]
    text_uz: String,
    #[serde(rename = "textUzCyrl")]
    text_uz_cyrl: String,
    #[serde(rename = "chatLink")]
    chat_link: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct AgentTrainingPost {
    id: String,
    title: String,
    body: String,
    #[serde(rename = "createdBy")]
    created_by: Option<String>,
    #[serde(rename = "createdByName")]
    created_by_name: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(serde::Deserialize)]
struct ResolveAgentApplicationPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
    approve: bool,
}

#[derive(serde::Deserialize)]
struct GetAgentConsentSettingsPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
}

#[derive(serde::Deserialize)]
struct SetAgentConsentSettingsPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    enabled: bool,
    #[serde(rename = "textRu")]
    text_ru: String,
    #[serde(rename = "textUz")]
    text_uz: String,
    #[serde(rename = "textUzCyrl")]
    text_uz_cyrl: String,
    #[serde(rename = "chatLink")]
    chat_link: Option<String>,
}

#[derive(serde::Deserialize)]
struct ExportAgentsExcelPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "outPath")]
    out_path: String,
}

#[derive(serde::Deserialize)]
struct AdvanceAgentLeadStagePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "leadId")]
    lead_id: String,
    stage: String,
}

#[derive(serde::Deserialize)]
struct CreateAgentTrainingPostPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    title: String,
    body: String,
}

#[derive(serde::Deserialize)]
struct DeleteAgentTrainingPostPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
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
    #[serde(rename = "editedAt")]
    edited_at: Option<String>,
    #[serde(rename = "isDeleted")]
    is_deleted: bool,
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
    #[serde(rename = "editedAt")]
    edited_at: Option<String>,
    #[serde(rename = "isDeleted")]
    is_deleted: bool,
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
    #[serde(rename = "clientServiceId")]
    client_service_id: Option<String>,
    #[serde(rename = "clientServiceName")]
    client_service_name: Option<String>,
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
    #[serde(rename = "editedAt")]
    edited_at: Option<String>,
    #[serde(rename = "isDeleted")]
    is_deleted: bool,
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
struct MyProjectTask {
    #[serde(rename = "messageId")]
    message_id: String,
    #[serde(rename = "projectId")]
    project_id: String,
    #[serde(rename = "projectNumber")]
    project_number: String,
    #[serde(rename = "projectName")]
    project_name: String,
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
    #[serde(rename = "editedAt")]
    edited_at: Option<String>,
    #[serde(rename = "isDeleted")]
    is_deleted: bool,
}

// ---- Регламенты между админом и конкретным партнёром (v0.3.0) ----
#[derive(Clone, serde::Serialize)]
struct PartnerRegulation {
    id: String,
    #[serde(rename = "regNumber")]
    reg_number: String,
    #[serde(rename = "partnerId")]
    partner_id: String,
    #[serde(rename = "partnerName")]
    partner_name: String,
    #[serde(rename = "clientId")]
    client_id: Option<String>,
    #[serde(rename = "clientName")]
    client_name: Option<String>,
    title: String,
    description: Option<String>,
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
    #[serde(rename = "entryCount")]
    entry_count: i64,
    #[serde(rename = "assistantId")]
    assistant_id: Option<String>,
    #[serde(rename = "assistantName")]
    assistant_name: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct PartnerService {
    id: String,
    #[serde(rename = "partnerId")]
    partner_id: String,
    name: String,
    description: Option<String>,
    code: Option<String>,
    price: Option<String>,
    #[serde(rename = "rewardPercent")]
    reward_percent: Option<String>,
    #[serde(rename = "createdBy")]
    created_by: Option<String>,
    #[serde(rename = "createdByName")]
    created_by_name: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

#[derive(Clone, serde::Serialize)]
struct HouseService {
    id: String,
    name: String,
    description: Option<String>,
    code: Option<String>,
    price: Option<String>,
    #[serde(rename = "rewardPercent")]
    reward_percent: Option<String>,
    #[serde(rename = "createdBy")]
    created_by: Option<String>,
    #[serde(rename = "createdByName")]
    created_by_name: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

#[derive(Clone, serde::Serialize)]
struct PartnerRegulationEntry {
    id: String,
    #[serde(rename = "partnerRegulationId")]
    partner_regulation_id: String,
    #[serde(rename = "authorId")]
    author_id: String,
    #[serde(rename = "authorName")]
    author_name: String,
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
    #[serde(rename = "editedAt")]
    edited_at: Option<String>,
    #[serde(rename = "isDeleted")]
    is_deleted: bool,
}

#[derive(Clone, serde::Serialize)]
struct PartnerRegulationReply {
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
    #[serde(rename = "editedAt")]
    edited_at: Option<String>,
    #[serde(rename = "isDeleted")]
    is_deleted: bool,
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
struct RadminSettings {
    #[serde(rename = "networkId")]
    network_id: String,
    #[serde(rename = "networkPassword")]
    network_password: String,
    note: String,
}

#[derive(Clone, serde::Serialize)]
struct TelegramBotSettings {
    enabled: bool,
    token: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct TelegramLinkInfo {
    code: String,
    #[serde(rename = "deepLink")]
    deep_link: Option<String>,
    #[serde(rename = "botConfigured")]
    bot_configured: bool,
}

#[derive(Clone, serde::Serialize)]
struct NotebookSettings {
    enabled: bool,
    name: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct OnboardingStatus {
    completed: bool,
}

#[derive(Clone, serde::Serialize)]
struct NotebookNote {
    id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    title: String,
    content: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

fn to_notebook_settings(s: db::NotebookSettingsRecord) -> NotebookSettings {
    NotebookSettings { enabled: s.enabled, name: s.name }
}

fn to_onboarding_status(s: db::OnboardingStatusRecord) -> OnboardingStatus {
    OnboardingStatus { completed: s.completed }
}

fn to_notebook_note(n: db::NotebookNoteRecord) -> NotebookNote {
    NotebookNote { id: n.id, employee_id: n.employee_id, title: n.title, content: n.content, created_at: n.created_at, updated_at: n.updated_at }
}

#[derive(Clone, serde::Serialize)]
struct EmployeeReportRow {
    #[serde(rename = "employeeId")]
    employee_id: String,
    #[serde(rename = "fullName")]
    full_name: String,
    #[serde(rename = "employeeNumber")]
    employee_number: String,
    #[serde(rename = "departmentName")]
    department_name: Option<String>,
    #[serde(rename = "positionTitle")]
    position_title: Option<String>,
    #[serde(rename = "hoursWorked")]
    hours_worked: f64,
    #[serde(rename = "absenceCounts")]
    absence_counts: Vec<(String, i64)>,
    #[serde(rename = "regulationsCount")]
    regulations_count: i64,
    #[serde(rename = "projectsCount")]
    projects_count: i64,
}

#[derive(Clone, serde::Serialize)]
struct PartnerReportRow {
    #[serde(rename = "partnerId")]
    partner_id: String,
    #[serde(rename = "partnerName")]
    partner_name: String,
    #[serde(rename = "clientsAddedCount")]
    clients_added_count: i64,
    #[serde(rename = "regulationsCount")]
    regulations_count: i64,
    #[serde(rename = "financialTotal")]
    financial_total: Option<f64>,
    #[serde(rename = "financialTotalPartial")]
    financial_total_partial: bool,
    #[serde(rename = "financialRawValues")]
    financial_raw_values: Vec<String>,
}

#[derive(Clone, serde::Serialize)]
struct ReportExportSettings {
    enabled: bool,
    #[serde(rename = "dayMode")]
    day_mode: String,
    #[serde(rename = "fixedDay")]
    fixed_day: i64,
    #[serde(rename = "timeHhmm")]
    time_hhmm: String,
    folder: String,
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
    #[serde(rename = "partnerAudience")]
    partner_audience: Option<String>,
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
    #[serde(rename = "senderAvatar")]
    sender_avatar: Option<String>,
    content: String,
    #[serde(rename = "attachmentData")]
    attachment_data: Option<String>,
    #[serde(rename = "attachmentName")]
    attachment_name: Option<String>,
    #[serde(rename = "replyToId")]
    reply_to_id: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "editedAt")]
    edited_at: Option<String>,
    #[serde(rename = "isDeleted")]
    is_deleted: bool,
}

#[derive(Clone, serde::Serialize)]
struct DmChannelSummary {
    channel: String,
    #[serde(rename = "otherEmployeeId")]
    other_employee_id: String,
    #[serde(rename = "otherEmployeeName")]
    other_employee_name: String,
    #[serde(rename = "otherEmployeeAvatar")]
    other_employee_avatar: Option<String>,
    #[serde(rename = "lastMessage")]
    last_message: Option<String>,
    #[serde(rename = "lastMessageAt")]
    last_message_at: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct PartnerChatSummary {
    #[serde(rename = "partnerId")]
    partner_id: String,
    #[serde(rename = "partnerName")]
    partner_name: String,
    #[serde(rename = "lastMessage")]
    last_message: Option<String>,
    #[serde(rename = "lastMessageAt")]
    last_message_at: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct ChatGroup {
    id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "photoData")]
    photo_data: Option<String>,
    #[serde(rename = "departmentId")]
    department_id: Option<String>,
    #[serde(rename = "inviteCode")]
    invite_code: String,
    #[serde(rename = "createdBy")]
    created_by: Option<String>,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "memberCount")]
    member_count: i64,
}

#[derive(Clone, serde::Serialize)]
struct ChatGroupSummary {
    id: String,
    name: String,
    #[serde(rename = "photoData")]
    photo_data: Option<String>,
    #[serde(rename = "memberCount")]
    member_count: i64,
    #[serde(rename = "lastMessage")]
    last_message: Option<String>,
    #[serde(rename = "lastMessageAt")]
    last_message_at: Option<String>,
}

#[derive(serde::Deserialize)]
struct CreateChatGroupPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "photoData")]
    photo_data: Option<String>,
    #[serde(rename = "departmentId")]
    department_id: Option<String>,
    #[serde(rename = "memberIds")]
    member_ids: Option<Vec<String>>,
}

#[derive(serde::Deserialize)]
struct UpdateChatGroupPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "groupId")]
    group_id: String,
    name: String,
    description: Option<String>,
    #[serde(rename = "photoData")]
    photo_data: Option<String>,
}

#[derive(serde::Deserialize)]
struct ChatGroupMemberPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "groupId")]
    group_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct JoinChatGroupPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "inviteCode")]
    invite_code: String,
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
struct ListClientsPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "partnerId")]
    partner_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct GetClientPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
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
    #[serde(rename = "partnerId")]
    partner_id: Option<String>,
    #[serde(rename = "dealValue")]
    deal_value: Option<String>,
    #[serde(rename = "serviceId")]
    service_id: Option<String>,
    #[serde(rename = "houseServiceId")]
    house_service_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateClientPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
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
    #[serde(rename = "partnerId")]
    partner_id: Option<String>,
    #[serde(rename = "dealValue")]
    deal_value: Option<String>,
    #[serde(rename = "serviceId")]
    service_id: Option<String>,
    #[serde(rename = "houseServiceId")]
    house_service_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct DeleteClientPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct ListClientHistoryPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "clientId")]
    client_id: String,
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
struct ListClientServicesPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "clientId")]
    client_id: String,
}

#[derive(serde::Deserialize)]
struct AddClientServicePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "clientId")]
    client_id: String,
    #[serde(rename = "houseServiceId")]
    house_service_id: Option<String>,
    #[serde(rename = "serviceId")]
    service_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct DeleteClientServicePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct GetServicesMonthlyStatsPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
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
    #[serde(rename = "clientServiceId")]
    client_service_id: Option<String>,
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
    #[serde(rename = "clientServiceId")]
    client_service_id: Option<String>,
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

// ---- Регламенты между админом и конкретным партнёром (v0.3.0) ----
#[derive(serde::Deserialize)]
struct ListPartnerRegulationsPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "partnerId")]
    partner_id: String,
}

#[derive(serde::Deserialize)]
struct CreatePartnerRegulationPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "partnerId")]
    partner_id: String,
    title: String,
    description: Option<String>,
    #[serde(rename = "clientId")]
    client_id: Option<String>,
    deadline: Option<String>,
    #[serde(rename = "assistantId")]
    assistant_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdatePartnerRegulationPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
    title: String,
    description: Option<String>,
    #[serde(rename = "clientId")]
    client_id: Option<String>,
    deadline: Option<String>,
    status: String,
    #[serde(rename = "assistantId")]
    assistant_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct DeletePartnerRegulationPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct ListPartnerServicesPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "partnerId")]
    partner_id: String,
}

#[derive(serde::Deserialize)]
struct CreatePartnerServicePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "partnerId")]
    partner_id: String,
    name: String,
    description: Option<String>,
    code: Option<String>,
    price: Option<String>,
    #[serde(rename = "rewardPercent")]
    reward_percent: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdatePartnerServicePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
    name: String,
    description: Option<String>,
    code: Option<String>,
    price: Option<String>,
    #[serde(rename = "rewardPercent")]
    reward_percent: Option<String>,
}

#[derive(serde::Deserialize)]
struct DeletePartnerServicePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct ListHouseServicesPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
}

#[derive(serde::Deserialize)]
struct CreateHouseServicePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    name: String,
    description: Option<String>,
    code: Option<String>,
    price: Option<String>,
    #[serde(rename = "rewardPercent")]
    reward_percent: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateHouseServicePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
    name: String,
    description: Option<String>,
    code: Option<String>,
    price: Option<String>,
    #[serde(rename = "rewardPercent")]
    reward_percent: Option<String>,
}

#[derive(serde::Deserialize)]
struct DeleteHouseServicePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct MoveClientToCrmBasePayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct ListPartnerOrgEmployeesPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "partnerId")]
    partner_id: String,
}

#[derive(serde::Deserialize)]
struct ListPartnerRegulationEntriesPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "partnerRegulationId")]
    partner_regulation_id: String,
}

#[derive(serde::Deserialize)]
struct AddPartnerRegulationEntryPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "partnerRegulationId")]
    partner_regulation_id: String,
    content: String,
    #[serde(rename = "attachmentData")]
    attachment_data: Option<String>,
    #[serde(rename = "attachmentName")]
    attachment_name: Option<String>,
    deadline: Option<String>,
}

#[derive(serde::Deserialize)]
struct EditPartnerRegulationEntryPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
    content: String,
}

#[derive(serde::Deserialize)]
struct DeletePartnerRegulationEntryPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
}

#[derive(serde::Deserialize)]
struct UpdatePartnerRegulationEntryStatusPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
    status: String,
}

#[derive(serde::Deserialize)]
struct ListPartnerRegulationRepliesPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
}

#[derive(serde::Deserialize)]
struct AddPartnerRegulationReplyPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
    content: String,
}

#[derive(serde::Deserialize)]
struct EditPartnerRegulationReplyPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "replyId")]
    reply_id: String,
    content: String,
}

#[derive(serde::Deserialize)]
struct DeletePartnerRegulationReplyPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "replyId")]
    reply_id: String,
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
    #[serde(rename = "partnerAudience")]
    partner_audience: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateBlogTopicPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
    category: String,
    title: String,
    content: Option<String>,
    #[serde(rename = "partnerAudience")]
    partner_audience: Option<String>,
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
struct EditChatMessagePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "messageId")]
    message_id: String,
    content: String,
}

#[derive(serde::Deserialize)]
struct DeleteChatMessagePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "messageId")]
    message_id: String,
}

#[derive(serde::Deserialize)]
struct EditRegulationEntryPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
    content: String,
}

#[derive(serde::Deserialize)]
struct DeleteRegulationEntryPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "entryId")]
    entry_id: String,
}

#[derive(serde::Deserialize)]
struct EditRegulationReplyPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "replyId")]
    reply_id: String,
    content: String,
}

#[derive(serde::Deserialize)]
struct DeleteRegulationReplyPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "replyId")]
    reply_id: String,
}

#[derive(serde::Deserialize)]
struct EditProjectChatMessagePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "messageId")]
    message_id: String,
    content: String,
}

#[derive(serde::Deserialize)]
struct DeleteProjectChatMessagePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "messageId")]
    message_id: String,
}

#[derive(serde::Deserialize)]
struct EditProjectChatReplyPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "replyId")]
    reply_id: String,
    content: String,
}

#[derive(serde::Deserialize)]
struct DeleteProjectChatReplyPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "replyId")]
    reply_id: String,
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
struct SetRadminSettingsPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    #[serde(rename = "networkId")]
    network_id: String,
    #[serde(rename = "networkPassword")]
    network_password: String,
    note: String,
}

#[derive(serde::Deserialize)]
struct GetTelegramBotSettingsPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    role: String,
}

#[derive(serde::Deserialize)]
struct SetTelegramBotSettingsPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    role: String,
    enabled: bool,
    token: Option<String>,
}

#[derive(serde::Deserialize)]
struct GenerateTelegramLinkCodePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct GetTelegramLinkStatusPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct PingTypingPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    channel: String,
}

#[derive(serde::Deserialize)]
struct GetTypingStatusPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    channel: String,
}

#[derive(serde::Deserialize)]
struct UnlinkTelegramPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct GetNotebookSettingsPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct SetNotebookSettingsPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    enabled: bool,
    name: Option<String>,
}

#[derive(serde::Deserialize)]
struct GetOnboardingStatusPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct SetOnboardingCompletedPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct ListNotebookNotesPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
}

#[derive(serde::Deserialize)]
struct CreateNotebookNotePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "employeeId")]
    employee_id: String,
    title: String,
    content: Option<String>,
}

#[derive(serde::Deserialize)]
struct UpdateNotebookNotePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
    title: String,
    content: Option<String>,
}

#[derive(serde::Deserialize)]
struct DeleteNotebookNotePayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    id: String,
}

#[derive(serde::Deserialize)]
struct GetEmployeeReportPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    #[serde(rename = "periodStart")]
    period_start: String,
    #[serde(rename = "periodEnd")]
    period_end: String,
}

#[derive(serde::Deserialize)]
struct GetPartnerReportPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
    #[serde(rename = "partnerId")]
    partner_id: Option<String>,
    #[serde(rename = "periodStart")]
    period_start: Option<String>,
    #[serde(rename = "periodEnd")]
    period_end: Option<String>,
}

#[derive(serde::Deserialize)]
struct GetReportExportSettingsPayload {
    #[serde(rename = "actorId")]
    actor_id: String,
}

#[derive(serde::Deserialize)]
struct SetReportExportSettingsPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    enabled: bool,
    #[serde(rename = "dayMode")]
    day_mode: String,
    #[serde(rename = "fixedDay")]
    fixed_day: i64,
    #[serde(rename = "timeHhmm")]
    time_hhmm: String,
    folder: String,
}

#[derive(serde::Deserialize)]
struct GenerateReportNowPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    #[serde(rename = "periodStart")]
    period_start: String,
    #[serde(rename = "periodEnd")]
    period_end: String,
    folder: Option<String>,
}

#[derive(serde::Deserialize)]
struct SetAppLogoPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    #[serde(rename = "logoData")]
    logo_data: Option<String>,
}

#[derive(serde::Deserialize)]
struct ExportBackupPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    password: String,
    #[serde(rename = "destPath")]
    dest_path: String,
}

#[derive(serde::Deserialize)]
struct RestoreBackupPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    password: String,
    #[serde(rename = "sourcePath")]
    source_path: String,
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

#[derive(serde::Deserialize)]
struct SetUpdateInstallerPayload {
    #[serde(rename = "adminId")]
    admin_id: String,
    #[serde(rename = "sourcePath")]
    source_path: String,
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
        partner_id: c.partner_id,
        partner_name: c.partner_name,
        deal_value: c.deal_value,
        service_id: c.service_id,
        service_name: c.service_name,
        house_service_id: c.house_service_id,
        house_service_name: c.house_service_name,
        origin_partner_id: c.origin_partner_id,
        origin_partner_name: c.origin_partner_name,
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

fn to_client_service(cs: db::ClientServiceRecord) -> ClientService {
    ClientService {
        id: cs.id,
        client_id: cs.client_id,
        house_service_id: cs.house_service_id,
        service_id: cs.service_id,
        service_name: cs.service_name,
        price: cs.price,
        added_by: cs.added_by,
        added_by_name: cs.added_by_name,
        created_at: cs.created_at,
    }
}

fn to_service_month_stat(s: db::ServiceMonthStat) -> ServiceMonthStat {
    ServiceMonthStat { month: s.month, service_name: s.service_name, count: s.count }
}

fn to_agent(a: db::AgentRecord) -> Agent {
    Agent {
        id: a.id,
        agent_number: a.agent_number,
        full_name: a.full_name,
        phone: a.phone,
        address: a.address,
        email: a.email,
        passport_photo_data: a.passport_photo_data,
        passport_photo_name: a.passport_photo_name,
        consent_given: a.consent_given,
        consent_given_at: a.consent_given_at,
        locale: a.locale,
        status: a.status,
        created_at: a.created_at,
        resolved_at: a.resolved_at,
        resolved_by: a.resolved_by,
    }
}

fn to_agent_lead(l: db::AgentLeadRecord) -> AgentLead {
    AgentLead {
        id: l.id,
        agent_id: l.agent_id,
        agent_name: l.agent_name,
        client_name: l.client_name,
        client_inn: l.client_inn,
        client_phone: l.client_phone,
        company_name: l.company_name,
        note: l.note,
        stage: l.stage,
        converted_client_id: l.converted_client_id,
        created_at: l.created_at,
        updated_at: l.updated_at,
    }
}

fn to_agent_consent_settings(s: db::AgentConsentSettings) -> AgentConsentSettings {
    AgentConsentSettings { enabled: s.enabled, text_ru: s.text_ru, text_uz: s.text_uz, text_uz_cyrl: s.text_uz_cyrl, chat_link: s.chat_link }
}

fn to_agent_training_post(p: db::AgentTrainingPostRecord) -> AgentTrainingPost {
    AgentTrainingPost {
        id: p.id,
        title: p.title,
        body: p.body,
        created_by: p.created_by,
        created_by_name: p.created_by_name,
        created_at: p.created_at,
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
        edited_at: m.edited_at,
        is_deleted: m.is_deleted,
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
        edited_at: r.edited_at,
        is_deleted: r.is_deleted,
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
        client_service_id: r.client_service_id, client_service_name: r.client_service_name,
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
        edited_at: e.edited_at, is_deleted: e.is_deleted,
    }
}

fn to_my_task(t: db::MyTaskRecord) -> MyTask {
    MyTask {
        entry_id: t.entry_id, regulation_id: t.regulation_id, reg_number: t.reg_number,
        regulation_title: t.regulation_title, slug: t.slug, content: t.content,
        deadline: t.deadline, created_at: t.created_at,
    }
}

fn to_my_project_task(t: db::MyProjectTaskRecord) -> MyProjectTask {
    MyProjectTask {
        message_id: t.message_id, project_id: t.project_id, project_number: t.project_number,
        project_name: t.project_name, content: t.content, deadline: t.deadline, created_at: t.created_at,
    }
}

fn to_reg_reply(r: db::RegulationReplyRecord) -> RegulationReply {
    RegulationReply {
        id: r.id, entry_id: r.entry_id, author_id: r.author_id, author_name: r.author_name, content: r.content, created_at: r.created_at,
        edited_at: r.edited_at, is_deleted: r.is_deleted,
    }
}

fn to_partner_regulation(r: db::PartnerRegulationRecord) -> PartnerRegulation {
    PartnerRegulation {
        id: r.id,
        reg_number: r.reg_number,
        partner_id: r.partner_id,
        partner_name: r.partner_name,
        client_id: r.client_id,
        client_name: r.client_name,
        title: r.title,
        description: r.description,
        status: r.status,
        deadline: r.deadline,
        closed_at: r.closed_at,
        created_by: r.created_by,
        created_by_name: r.created_by_name,
        created_at: r.created_at,
        updated_at: r.updated_at,
        entry_count: r.entry_count,
        assistant_id: r.assistant_id,
        assistant_name: r.assistant_name,
    }
}

fn to_partner_service(s: db::PartnerServiceRecord) -> PartnerService {
    PartnerService {
        id: s.id,
        partner_id: s.partner_id,
        name: s.name,
        description: s.description,
        code: s.code,
        price: s.price,
        reward_percent: s.reward_percent,
        created_by: s.created_by,
        created_by_name: s.created_by_name,
        created_at: s.created_at,
        updated_at: s.updated_at,
    }
}

fn to_house_service(s: db::HouseServiceRecord) -> HouseService {
    HouseService {
        id: s.id,
        name: s.name,
        description: s.description,
        code: s.code,
        price: s.price,
        reward_percent: s.reward_percent,
        created_by: s.created_by,
        created_by_name: s.created_by_name,
        created_at: s.created_at,
        updated_at: s.updated_at,
    }
}

fn to_partner_regulation_entry(e: db::PartnerRegulationEntryRecord) -> PartnerRegulationEntry {
    PartnerRegulationEntry {
        id: e.id,
        partner_regulation_id: e.partner_regulation_id,
        author_id: e.author_id,
        author_name: e.author_name,
        content: e.content,
        attachment_data: e.attachment_data,
        attachment_name: e.attachment_name,
        deadline: e.deadline,
        status: e.status,
        created_at: e.created_at,
        updated_at: e.updated_at,
        reply_count: e.reply_count,
        edited_at: e.edited_at,
        is_deleted: e.is_deleted,
    }
}

fn to_partner_regulation_reply(r: db::PartnerRegulationReplyRecord) -> PartnerRegulationReply {
    PartnerRegulationReply {
        id: r.id, entry_id: r.entry_id, author_id: r.author_id, author_name: r.author_name, content: r.content, created_at: r.created_at,
        edited_at: r.edited_at, is_deleted: r.is_deleted,
    }
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
        partner_audience: t.partner_audience,
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
        sender_avatar: m.sender_avatar,
        content: m.content,
        attachment_data: m.attachment_data,
        attachment_name: m.attachment_name,
        reply_to_id: m.reply_to_id,
        created_at: m.created_at,
        edited_at: m.edited_at,
        is_deleted: m.is_deleted,
    }
}

fn to_dm_channel_summary(s: db::DmChannelSummary) -> DmChannelSummary {
    DmChannelSummary {
        channel: s.channel,
        other_employee_id: s.other_employee_id,
        other_employee_name: s.other_employee_name,
        other_employee_avatar: s.other_employee_avatar,
        last_message: s.last_message,
        last_message_at: s.last_message_at,
    }
}

fn to_partner_chat_summary(s: db::PartnerChatSummary) -> PartnerChatSummary {
    PartnerChatSummary {
        partner_id: s.partner_id,
        partner_name: s.partner_name,
        last_message: s.last_message,
        last_message_at: s.last_message_at,
    }
}

fn to_chat_group(g: db::ChatGroupRecord) -> ChatGroup {
    ChatGroup {
        id: g.id,
        name: g.name,
        description: g.description,
        photo_data: g.photo_data,
        department_id: g.department_id,
        invite_code: g.invite_code,
        created_by: g.created_by,
        created_at: g.created_at,
        member_count: g.member_count,
    }
}

fn to_chat_group_summary(s: db::ChatGroupSummary) -> ChatGroupSummary {
    ChatGroupSummary {
        id: s.id,
        name: s.name,
        photo_data: s.photo_data,
        member_count: s.member_count,
        last_message: s.last_message,
        last_message_at: s.last_message_at,
    }
}

fn to_server_settings(s: db::ServerSettingsRecord) -> ServerSettings {
    ServerSettings { enabled: s.enabled, port: s.port }
}

fn to_radmin_settings(r: db::RadminSettingsRecord) -> RadminSettings {
    RadminSettings {
        network_id: r.network_id,
        network_password: r.network_password,
        note: r.note,
    }
}

fn to_telegram_bot_settings(s: db::TelegramBotSettingsRecord) -> TelegramBotSettings {
    TelegramBotSettings { enabled: s.enabled, token: s.token }
}

fn to_employee_report_row(r: db::EmployeeReportRow) -> EmployeeReportRow {
    EmployeeReportRow {
        employee_id: r.employee_id,
        full_name: r.full_name,
        employee_number: r.employee_number,
        department_name: r.department_name,
        position_title: r.position_title,
        hours_worked: r.hours_worked,
        absence_counts: r.absence_counts,
        regulations_count: r.regulations_count,
        projects_count: r.projects_count,
    }
}

fn to_partner_report_row(r: db::PartnerReportRow) -> PartnerReportRow {
    PartnerReportRow {
        partner_id: r.partner_id,
        partner_name: r.partner_name,
        clients_added_count: r.clients_added_count,
        regulations_count: r.regulations_count,
        financial_total: r.financial_total,
        financial_total_partial: r.financial_total_partial,
        financial_raw_values: r.financial_raw_values,
    }
}

fn to_report_export_settings(s: db::ReportExportSettingsRecord) -> ReportExportSettings {
    ReportExportSettings {
        enabled: s.enabled,
        day_mode: s.day_mode,
        fixed_day: s.fixed_day,
        time_hhmm: s.time_hhmm,
        folder: s.folder,
    }
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
fn list_clients(payload: ListClientsPayload, state: tauri::State<AppState>) -> Vec<Client> {
    let db = state.0.lock().unwrap();
    db.list_clients(&payload.actor_id, payload.partner_id.as_deref()).into_iter().map(to_client).collect()
}

#[tauri::command]
fn get_client(payload: GetClientPayload, state: tauri::State<AppState>) -> Option<Client> {
    let db = state.0.lock().unwrap();
    db.get_client(&payload.actor_id, &payload.id).map(to_client)
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
        payload.partner_id.as_deref(),
        payload.deal_value.as_deref(),
        payload.service_id.as_deref(),
        payload.house_service_id.as_deref(),
    )
    .map(to_client)
}

#[tauri::command]
fn update_client(payload: UpdateClientPayload, state: tauri::State<AppState>) -> Result<Client, String> {
    let db = state.0.lock().unwrap();
    db.update_client(
        &payload.actor_id,
        &payload.id,
        &payload.name,
        payload.contact_person.as_deref(),
        payload.contact_position.as_deref(),
        payload.phone.as_deref(),
        payload.email.as_deref(),
        payload.address.as_deref(),
        payload.notes.as_deref(),
        payload.partner_id.as_deref(),
        payload.deal_value.as_deref(),
        payload.service_id.as_deref(),
        payload.house_service_id.as_deref(),
    )
    .map(to_client)
}

#[tauri::command]
fn delete_client(payload: DeleteClientPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_client(&payload.admin_id, &payload.id)
}

#[tauri::command]
fn move_client_to_crm_base(payload: MoveClientToCrmBasePayload, state: tauri::State<AppState>) -> Result<Client, String> {
    let db = state.0.lock().unwrap();
    db.move_client_to_crm_base(&payload.admin_id, &payload.id).map(to_client)
}

#[tauri::command]
fn list_client_history(payload: ListClientHistoryPayload, state: tauri::State<AppState>) -> Vec<ClientHistoryEntry> {
    let db = state.0.lock().unwrap();
    db.list_client_history(&payload.actor_id, &payload.client_id).into_iter().map(to_client_history).collect()
}

#[tauri::command]
fn add_client_history(payload: AddClientHistoryPayload, state: tauri::State<AppState>) -> Result<ClientHistoryEntry, String> {
    let db = state.0.lock().unwrap();
    db.add_client_history(&payload.client_id, &payload.actor_id, &payload.description)
        .map(to_client_history)
}

#[tauri::command]
fn list_client_services(payload: ListClientServicesPayload, state: tauri::State<AppState>) -> Result<Vec<ClientService>, String> {
    let db = state.0.lock().unwrap();
    db.list_client_services(&payload.actor_id, &payload.client_id)
        .map(|list| list.into_iter().map(to_client_service).collect())
}

#[tauri::command]
fn add_client_service(payload: AddClientServicePayload, state: tauri::State<AppState>) -> Result<ClientService, String> {
    let db = state.0.lock().unwrap();
    db.add_client_service(&payload.actor_id, &payload.client_id, payload.house_service_id.as_deref(), payload.service_id.as_deref())
        .map(to_client_service)
}

#[tauri::command]
fn delete_client_service(payload: DeleteClientServicePayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_client_service(&payload.actor_id, &payload.id)
}

#[tauri::command]
fn get_services_monthly_stats(payload: GetServicesMonthlyStatsPayload, state: tauri::State<AppState>) -> Result<Vec<ServiceMonthStat>, String> {
    let db = state.0.lock().unwrap();
    db.get_services_monthly_stats(&payload.actor_id)
        .map(|list| list.into_iter().map(to_service_month_stat).collect())
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

// ---- Telegram: fire-and-forget уведомление о назначенной задаче (v0.5.3) ----
// Общий хелпер для 4 хук-поинтов ниже (send_project_chat_message,
// assign_project_chat_message, add_regulation_entry, assign_regulation_entry).
// resolve_* лочит db КОРОТКО и синхронно (внутри уже открытого lock-блока
// команды), собирает всё нужное owned-значениями и возвращает None, если
// слать некому/нечем (сам себе, бот не настроен, получатель не привязан) —
// spawn_telegram_task потом безопасно вызывается уже ПОСЛЕ того, как lock
// на state.0 отпущен (Mutex<Db> нельзя держать через .await). pub(crate) —
// dispatch.rs зеркалирует эти же 4 команды для HTTP-режима "клиент" и
// переиспользует эти же функции (crate::resolve_telegram_task_spawn/
// crate::spawn_telegram_task) вместо дублирования логики.
pub(crate) struct TelegramTaskSpawn {
    db: Arc<Mutex<Db>>,
    client: reqwest::Client,
    token: String,
    chat_id: String,
    employee_name: String,
    title: String,
    body: String,
    deadline: Option<String>,
    entry_kind: &'static str,
    entry_id: String,
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn resolve_telegram_task_spawn(
    db: &Db,
    state_db: &Arc<Mutex<Db>>,
    assignee_id: &str,
    actor_id: &str,
    title: String,
    body: String,
    deadline: Option<String>,
    entry_kind: &'static str,
    entry_id: String,
) -> Option<TelegramTaskSpawn> {
    if assignee_id == actor_id {
        return None;
    }
    let settings = db.get_telegram_bot_settings_internal("bot");
    let token = settings.token.filter(|t| !t.is_empty()).filter(|_| settings.enabled)?;
    let chat_id = db.get_employee_telegram_chat_id(assignee_id)?;
    let employee_name = db.get_employee(assignee_id).map(|e| e.full_name).unwrap_or_default();
    Some(TelegramTaskSpawn { db: state_db.clone(), client: reqwest::Client::new(), token, chat_id, employee_name, title, body, deadline, entry_kind, entry_id })
}

pub(crate) fn spawn_telegram_task(spawn: TelegramTaskSpawn) {
    tauri::async_runtime::spawn(telegram::notify_task_assigned(
        spawn.db, spawn.client, spawn.token, spawn.chat_id, spawn.employee_name,
        spawn.title, spawn.body, spawn.deadline, spawn.entry_kind, spawn.entry_id,
    ));
}

#[tauri::command]
fn list_project_chat(project_id: String, state: tauri::State<AppState>) -> Vec<ProjectChatMessage> {
    let db = state.0.lock().unwrap();
    db.list_project_chat(&project_id).into_iter().map(to_project_chat_message).collect()
}

#[tauri::command]
fn send_project_chat_message(payload: SendProjectChatMessagePayload, state: tauri::State<AppState>) -> Result<ProjectChatMessage, String> {
    let (result, spawn) = {
        let db = state.0.lock().unwrap();
        let message = db.send_project_chat_message(&payload.actor_id, &payload.project_id, &payload.target_employee_id, &payload.content, payload.attachment_data.as_deref(), payload.attachment_name.as_deref(), payload.deadline.as_deref())?;
        let project_name = db.get_project(&payload.project_id).map(|p| p.name).unwrap_or_default();
        let spawn = resolve_telegram_task_spawn(
            &db, &state.0, &message.target_employee_id, &payload.actor_id,
            format!("Вам поставили задачу в проекте «{project_name}»"),
            message.content.clone(), message.deadline.clone(), "proj", message.id.clone(),
        );
        (to_project_chat_message(message), spawn)
    };
    if let Some(spawn) = spawn {
        spawn_telegram_task(spawn);
    }
    Ok(result)
}

#[tauri::command]
fn edit_project_chat_message(payload: EditProjectChatMessagePayload, state: tauri::State<AppState>) -> Result<ProjectChatMessage, String> {
    let db = state.0.lock().unwrap();
    db.edit_project_chat_message(&payload.actor_id, &payload.message_id, &payload.content).map(to_project_chat_message)
}

#[tauri::command]
fn delete_project_chat_message(payload: DeleteProjectChatMessagePayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_project_chat_message(&payload.actor_id, &payload.message_id)
}

#[tauri::command]
fn assign_project_chat_message(payload: AssignProjectChatMessagePayload, state: tauri::State<AppState>) -> Result<(), String> {
    let spawn = {
        let db = state.0.lock().unwrap();
        db.assign_project_chat_message(&payload.actor_id, &payload.message_id, &payload.target_employee_id, payload.deadline.as_deref())?;
        db.get_project_chat_message(&payload.message_id).and_then(|message| {
            let project_name = db.get_project(&message.project_id).map(|p| p.name).unwrap_or_default();
            resolve_telegram_task_spawn(
                &db, &state.0, &message.target_employee_id, &payload.actor_id,
                format!("Вам передали задачу в проекте «{project_name}»"),
                message.content.clone(), message.deadline.clone(), "proj", message.id.clone(),
            )
        })
    };
    if let Some(spawn) = spawn {
        spawn_telegram_task(spawn);
    }
    Ok(())
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
fn edit_project_chat_reply(payload: EditProjectChatReplyPayload, state: tauri::State<AppState>) -> Result<ProjectChatReply, String> {
    let db = state.0.lock().unwrap();
    db.edit_project_chat_reply(&payload.actor_id, &payload.reply_id, &payload.content).map(to_project_chat_reply)
}

#[tauri::command]
fn delete_project_chat_reply(payload: DeleteProjectChatReplyPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_project_chat_reply(&payload.actor_id, &payload.reply_id)
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
    db.create_regulation(&payload.actor_id, &payload.title, payload.description.as_deref(), payload.client_id.as_deref(), payload.client_service_id.as_deref(), payload.deadline.as_deref())
        .map(to_regulation)
}

#[tauri::command]
fn update_regulation(payload: UpdateRegulationPayload, state: tauri::State<AppState>) -> Result<Regulation, String> {
    let db = state.0.lock().unwrap();
    db.update_regulation(&payload.actor_id, &payload.id, &payload.title, payload.description.as_deref(), payload.client_id.as_deref(), payload.client_service_id.as_deref(), payload.deadline.as_deref(), &payload.status)
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
fn list_my_open_project_tasks(employee_id: String, state: tauri::State<AppState>) -> Vec<MyProjectTask> {
    let db = state.0.lock().unwrap();
    db.list_my_open_project_tasks(&employee_id).into_iter().map(to_my_project_task).collect()
}

#[tauri::command]
fn add_regulation_entry(payload: AddRegulationEntryPayload, state: tauri::State<AppState>) -> Result<RegulationEntry, String> {
    let (result, spawn) = {
        let db = state.0.lock().unwrap();
        let entry = db.add_regulation_entry(&payload.actor_id, &payload.regulation_id, &payload.target_employee_id, &payload.content, payload.attachment_data.as_deref(), payload.attachment_name.as_deref(), payload.deadline.as_deref())?;
        let reg_title = db.get_regulation(&payload.regulation_id).map(|r| r.title).unwrap_or_default();
        let spawn = resolve_telegram_task_spawn(
            &db, &state.0, &entry.target_employee_id, &payload.actor_id,
            format!("Вам поставили задачу в регламенте «{reg_title}»"),
            entry.content.clone(), entry.deadline.clone(), "reg", entry.id.clone(),
        );
        (to_reg_entry(entry), spawn)
    };
    if let Some(spawn) = spawn {
        spawn_telegram_task(spawn);
    }
    Ok(result)
}

#[tauri::command]
fn edit_regulation_entry(payload: EditRegulationEntryPayload, state: tauri::State<AppState>) -> Result<RegulationEntry, String> {
    let db = state.0.lock().unwrap();
    db.edit_regulation_entry_content(&payload.actor_id, &payload.entry_id, &payload.content).map(to_reg_entry)
}

#[tauri::command]
fn delete_regulation_entry(payload: DeleteRegulationEntryPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_regulation_entry(&payload.actor_id, &payload.entry_id)
}

#[tauri::command]
fn assign_regulation_entry(payload: AssignRegulationEntryPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let spawn = {
        let db = state.0.lock().unwrap();
        db.assign_regulation_entry(&payload.actor_id, &payload.entry_id, &payload.target_employee_id, payload.deadline.as_deref())?;
        db.get_regulation_entry(&payload.entry_id).and_then(|entry| {
            let reg_title = db.get_regulation(&entry.regulation_id).map(|r| r.title).unwrap_or_default();
            resolve_telegram_task_spawn(
                &db, &state.0, &entry.target_employee_id, &payload.actor_id,
                format!("Вам передали задачу в регламенте «{reg_title}»"),
                entry.content.clone(), entry.deadline.clone(), "reg", entry.id.clone(),
            )
        })
    };
    if let Some(spawn) = spawn {
        spawn_telegram_task(spawn);
    }
    Ok(())
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
fn edit_regulation_reply(payload: EditRegulationReplyPayload, state: tauri::State<AppState>) -> Result<RegulationReply, String> {
    let db = state.0.lock().unwrap();
    db.edit_regulation_reply(&payload.actor_id, &payload.reply_id, &payload.content).map(to_reg_reply)
}

#[tauri::command]
fn delete_regulation_reply(payload: DeleteRegulationReplyPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_regulation_reply(&payload.actor_id, &payload.reply_id)
}

// ---- Регламенты между админом и конкретным партнёром (v0.3.0) ----

#[tauri::command]
fn list_partner_regulations(payload: ListPartnerRegulationsPayload, state: tauri::State<AppState>) -> Result<Vec<PartnerRegulation>, String> {
    let db = state.0.lock().unwrap();
    db.list_partner_regulations(&payload.actor_id, &payload.partner_id).map(|rows| rows.into_iter().map(to_partner_regulation).collect())
}

#[tauri::command]
fn get_partner_regulation(id: String, state: tauri::State<AppState>) -> Option<PartnerRegulation> {
    let db = state.0.lock().unwrap();
    db.get_partner_regulation(&id).map(to_partner_regulation)
}

#[tauri::command]
fn create_partner_regulation(payload: CreatePartnerRegulationPayload, state: tauri::State<AppState>) -> Result<PartnerRegulation, String> {
    let db = state.0.lock().unwrap();
    db.create_partner_regulation(&payload.actor_id, &payload.partner_id, &payload.title, payload.description.as_deref(), payload.client_id.as_deref(), payload.deadline.as_deref(), payload.assistant_id.as_deref())
        .map(to_partner_regulation)
}

#[tauri::command]
fn update_partner_regulation(payload: UpdatePartnerRegulationPayload, state: tauri::State<AppState>) -> Result<PartnerRegulation, String> {
    let db = state.0.lock().unwrap();
    db.update_partner_regulation(&payload.actor_id, &payload.id, &payload.title, payload.description.as_deref(), payload.client_id.as_deref(), payload.deadline.as_deref(), &payload.status, payload.assistant_id.as_deref())
        .map(to_partner_regulation)
}

#[tauri::command]
fn delete_partner_regulation(payload: DeletePartnerRegulationPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_partner_regulation(&payload.admin_id, &payload.id)
}

#[tauri::command]
fn list_partner_services(payload: ListPartnerServicesPayload, state: tauri::State<AppState>) -> Result<Vec<PartnerService>, String> {
    let db = state.0.lock().unwrap();
    db.list_partner_services(&payload.actor_id, &payload.partner_id).map(|rows| rows.into_iter().map(to_partner_service).collect())
}

#[tauri::command]
fn create_partner_service(payload: CreatePartnerServicePayload, state: tauri::State<AppState>) -> Result<PartnerService, String> {
    let db = state.0.lock().unwrap();
    db.create_partner_service(&payload.actor_id, &payload.partner_id, &payload.name, payload.description.as_deref(), payload.code.as_deref(), payload.price.as_deref(), payload.reward_percent.as_deref())
        .map(to_partner_service)
}

#[tauri::command]
fn update_partner_service(payload: UpdatePartnerServicePayload, state: tauri::State<AppState>) -> Result<PartnerService, String> {
    let db = state.0.lock().unwrap();
    db.update_partner_service(&payload.actor_id, &payload.id, &payload.name, payload.description.as_deref(), payload.code.as_deref(), payload.price.as_deref(), payload.reward_percent.as_deref())
        .map(to_partner_service)
}

#[tauri::command]
fn delete_partner_service(payload: DeletePartnerServicePayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_partner_service(&payload.actor_id, &payload.id)
}

#[tauri::command]
fn list_house_services(payload: ListHouseServicesPayload, state: tauri::State<AppState>) -> Vec<HouseService> {
    let db = state.0.lock().unwrap();
    db.list_house_services(&payload.actor_id).into_iter().map(to_house_service).collect()
}

#[tauri::command]
fn create_house_service(payload: CreateHouseServicePayload, state: tauri::State<AppState>) -> Result<HouseService, String> {
    let db = state.0.lock().unwrap();
    db.create_house_service(&payload.actor_id, &payload.name, payload.description.as_deref(), payload.code.as_deref(), payload.price.as_deref(), payload.reward_percent.as_deref())
        .map(to_house_service)
}

#[tauri::command]
fn update_house_service(payload: UpdateHouseServicePayload, state: tauri::State<AppState>) -> Result<HouseService, String> {
    let db = state.0.lock().unwrap();
    db.update_house_service(&payload.actor_id, &payload.id, &payload.name, payload.description.as_deref(), payload.code.as_deref(), payload.price.as_deref(), payload.reward_percent.as_deref())
        .map(to_house_service)
}

#[tauri::command]
fn delete_house_service(payload: DeleteHouseServicePayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_house_service(&payload.actor_id, &payload.id)
}

#[tauri::command]
fn list_admin_employees(state: tauri::State<AppState>) -> Vec<Employee> {
    let db = state.0.lock().unwrap();
    db.list_admin_employees().into_iter().map(to_employee).collect()
}

#[tauri::command]
fn list_partner_org_employees(payload: ListPartnerOrgEmployeesPayload, state: tauri::State<AppState>) -> Result<Vec<Employee>, String> {
    let db = state.0.lock().unwrap();
    db.list_partner_org_employees(&payload.actor_id, &payload.partner_id).map(|rows| rows.into_iter().map(to_employee).collect())
}

#[tauri::command]
fn list_partner_regulation_entries(payload: ListPartnerRegulationEntriesPayload, state: tauri::State<AppState>) -> Result<Vec<PartnerRegulationEntry>, String> {
    let db = state.0.lock().unwrap();
    db.list_partner_regulation_entries(&payload.actor_id, &payload.partner_regulation_id).map(|rows| rows.into_iter().map(to_partner_regulation_entry).collect())
}

#[tauri::command]
fn add_partner_regulation_entry(payload: AddPartnerRegulationEntryPayload, state: tauri::State<AppState>) -> Result<PartnerRegulationEntry, String> {
    let db = state.0.lock().unwrap();
    db.add_partner_regulation_entry(&payload.actor_id, &payload.partner_regulation_id, &payload.content, payload.attachment_data.as_deref(), payload.attachment_name.as_deref(), payload.deadline.as_deref())
        .map(to_partner_regulation_entry)
}

#[tauri::command]
fn edit_partner_regulation_entry(payload: EditPartnerRegulationEntryPayload, state: tauri::State<AppState>) -> Result<PartnerRegulationEntry, String> {
    let db = state.0.lock().unwrap();
    db.edit_partner_regulation_entry(&payload.actor_id, &payload.entry_id, &payload.content).map(to_partner_regulation_entry)
}

#[tauri::command]
fn delete_partner_regulation_entry(payload: DeletePartnerRegulationEntryPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_partner_regulation_entry(&payload.actor_id, &payload.entry_id)
}

#[tauri::command]
fn update_partner_regulation_entry_status(payload: UpdatePartnerRegulationEntryStatusPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.update_partner_regulation_entry_status(&payload.actor_id, &payload.entry_id, &payload.status)
}

#[tauri::command]
fn list_partner_regulation_replies(payload: ListPartnerRegulationRepliesPayload, state: tauri::State<AppState>) -> Result<Vec<PartnerRegulationReply>, String> {
    let db = state.0.lock().unwrap();
    db.list_partner_regulation_replies(&payload.actor_id, &payload.entry_id).map(|rows| rows.into_iter().map(to_partner_regulation_reply).collect())
}

#[tauri::command]
fn add_partner_regulation_reply(payload: AddPartnerRegulationReplyPayload, state: tauri::State<AppState>) -> Result<PartnerRegulationReply, String> {
    let db = state.0.lock().unwrap();
    db.add_partner_regulation_reply(&payload.actor_id, &payload.entry_id, &payload.content).map(to_partner_regulation_reply)
}

#[tauri::command]
fn edit_partner_regulation_reply(payload: EditPartnerRegulationReplyPayload, state: tauri::State<AppState>) -> Result<PartnerRegulationReply, String> {
    let db = state.0.lock().unwrap();
    db.edit_partner_regulation_reply(&payload.actor_id, &payload.reply_id, &payload.content).map(to_partner_regulation_reply)
}

#[tauri::command]
fn delete_partner_regulation_reply(payload: DeletePartnerRegulationReplyPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_partner_regulation_reply(&payload.actor_id, &payload.reply_id)
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
fn list_blog_topics(actor_id: String, state: tauri::State<AppState>) -> Vec<BlogTopic> {
    let db = state.0.lock().unwrap();
    db.list_blog_topics(&actor_id).into_iter().map(to_blog_topic).collect()
}

#[tauri::command]
fn create_blog_topic(payload: CreateBlogTopicPayload, state: tauri::State<AppState>) -> Result<BlogTopic, String> {
    let db = state.0.lock().unwrap();
    db.create_blog_topic(&payload.actor_id, &payload.category, &payload.title, payload.content.as_deref(), payload.partner_audience.as_deref())
        .map(to_blog_topic)
}

#[tauri::command]
fn update_blog_topic(payload: UpdateBlogTopicPayload, state: tauri::State<AppState>) -> Result<BlogTopic, String> {
    let db = state.0.lock().unwrap();
    db.update_blog_topic(&payload.actor_id, &payload.id, &payload.category, &payload.title, payload.content.as_deref(), payload.partner_audience.as_deref())
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
fn ping_typing(payload: PingTypingPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.ping_typing(&payload.actor_id, &payload.channel)
}

#[tauri::command]
fn get_typing_status(payload: GetTypingStatusPayload, state: tauri::State<AppState>) -> Result<bool, String> {
    let db = state.0.lock().unwrap();
    db.is_other_typing(&payload.actor_id, &payload.channel)
}

#[tauri::command]
fn list_my_dm_channels(employee_id: String, state: tauri::State<AppState>) -> Vec<DmChannelSummary> {
    let db = state.0.lock().unwrap();
    db.list_my_dm_channels(&employee_id).into_iter().map(to_dm_channel_summary).collect()
}

#[tauri::command]
fn list_my_partner_chats(actor_id: String, state: tauri::State<AppState>) -> Vec<PartnerChatSummary> {
    let db = state.0.lock().unwrap();
    if !db.is_admin(&actor_id) {
        return Vec::new();
    }
    db.list_my_partner_chats().into_iter().map(to_partner_chat_summary).collect()
}

#[tauri::command]
fn create_chat_group(payload: CreateChatGroupPayload, state: tauri::State<AppState>) -> Result<ChatGroup, String> {
    let db = state.0.lock().unwrap();
    db.create_chat_group(
        &payload.actor_id,
        &payload.name,
        payload.description.as_deref(),
        payload.photo_data.as_deref(),
        payload.department_id.as_deref(),
        payload.member_ids.as_deref(),
    )
    .map(to_chat_group)
}

#[tauri::command]
fn list_my_chat_groups(employee_id: String, state: tauri::State<AppState>) -> Vec<ChatGroupSummary> {
    let db = state.0.lock().unwrap();
    db.list_my_chat_groups(&employee_id).into_iter().map(to_chat_group_summary).collect()
}

#[tauri::command]
fn get_chat_group(group_id: String, state: tauri::State<AppState>) -> Option<ChatGroup> {
    let db = state.0.lock().unwrap();
    db.get_chat_group(&group_id).map(to_chat_group)
}

#[tauri::command]
fn list_chat_group_members(employee_id: String, group_id: String, state: tauri::State<AppState>) -> Result<Vec<Employee>, String> {
    let db = state.0.lock().unwrap();
    db.list_chat_group_members(&employee_id, &group_id).map(|v| v.into_iter().map(to_employee).collect())
}

#[tauri::command]
fn update_chat_group(payload: UpdateChatGroupPayload, state: tauri::State<AppState>) -> Result<ChatGroup, String> {
    let db = state.0.lock().unwrap();
    db.update_chat_group(&payload.actor_id, &payload.group_id, &payload.name, payload.description.as_deref(), payload.photo_data.as_deref())
        .map(to_chat_group)
}

#[tauri::command]
fn add_chat_group_member(payload: ChatGroupMemberPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.add_chat_group_member(&payload.actor_id, &payload.group_id, &payload.employee_id)
}

#[tauri::command]
fn remove_chat_group_member(payload: ChatGroupMemberPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.remove_chat_group_member(&payload.actor_id, &payload.group_id, &payload.employee_id)
}

#[tauri::command]
fn join_chat_group_by_invite(payload: JoinChatGroupPayload, state: tauri::State<AppState>) -> Result<ChatGroup, String> {
    let db = state.0.lock().unwrap();
    db.join_chat_group_by_invite(&payload.actor_id, &payload.invite_code).map(to_chat_group)
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
fn edit_chat_message(payload: EditChatMessagePayload, state: tauri::State<AppState>) -> Result<ChatMessage, String> {
    let db = state.0.lock().unwrap();
    db.edit_chat_message(&payload.actor_id, &payload.message_id, &payload.content).map(to_chat_message)
}

#[tauri::command]
fn delete_chat_message(payload: DeleteChatMessagePayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_chat_message(&payload.actor_id, &payload.message_id)
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
fn get_radmin_settings(state: tauri::State<AppState>) -> RadminSettings {
    let db = state.0.lock().unwrap();
    to_radmin_settings(db.get_radmin_settings())
}

#[tauri::command]
fn set_radmin_settings(payload: SetRadminSettingsPayload, state: tauri::State<AppState>) -> Result<RadminSettings, String> {
    let db = state.0.lock().unwrap();
    db.set_radmin_settings(&payload.admin_id, &payload.network_id, &payload.network_password, &payload.note)
        .map(to_radmin_settings)
}

#[tauri::command]
fn get_telegram_bot_settings(payload: GetTelegramBotSettingsPayload, state: tauri::State<AppState>) -> Result<TelegramBotSettings, String> {
    let db = state.0.lock().unwrap();
    db.get_telegram_bot_settings(&payload.actor_id, &payload.role).map(to_telegram_bot_settings)
}

#[tauri::command]
fn set_telegram_bot_settings(payload: SetTelegramBotSettingsPayload, state: tauri::State<AppState>) -> Result<TelegramBotSettings, String> {
    let db = state.0.lock().unwrap();
    db.set_telegram_bot_settings(&payload.admin_id, &payload.role, payload.enabled, payload.token.as_deref()).map(to_telegram_bot_settings)
}

// ---- Агенты (v1.6.0) ----

#[tauri::command]
fn list_agents(state: tauri::State<AppState>) -> Vec<Agent> {
    let db = state.0.lock().unwrap();
    db.list_agents().into_iter().map(to_agent).collect()
}

#[tauri::command]
fn resolve_agent_application(payload: ResolveAgentApplicationPayload, state: tauri::State<AppState>) -> Result<Agent, String> {
    let db = state.0.lock().unwrap();
    db.resolve_agent_application(&payload.actor_id, &payload.id, payload.approve).map(to_agent)
}

#[tauri::command]
fn list_agent_leads(state: tauri::State<AppState>) -> Vec<AgentLead> {
    let db = state.0.lock().unwrap();
    db.list_agent_leads().into_iter().map(to_agent_lead).collect()
}

#[tauri::command]
fn advance_agent_lead_stage(payload: AdvanceAgentLeadStagePayload, state: tauri::State<AppState>) -> Result<AgentLead, String> {
    let db = state.0.lock().unwrap();
    db.advance_agent_lead_stage(&payload.actor_id, &payload.lead_id, &payload.stage).map(to_agent_lead)
}

#[tauri::command]
fn list_agent_training_posts(state: tauri::State<AppState>) -> Vec<AgentTrainingPost> {
    let db = state.0.lock().unwrap();
    db.list_agent_training_posts().into_iter().map(to_agent_training_post).collect()
}

#[tauri::command]
fn create_agent_training_post(payload: CreateAgentTrainingPostPayload, state: tauri::State<AppState>) -> Result<AgentTrainingPost, String> {
    let db = state.0.lock().unwrap();
    db.create_agent_training_post(&payload.actor_id, &payload.title, &payload.body).map(to_agent_training_post)
}

#[tauri::command]
fn delete_agent_training_post(payload: DeleteAgentTrainingPostPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_agent_training_post(&payload.actor_id, &payload.id)
}

#[tauri::command]
fn get_agent_consent_settings(payload: GetAgentConsentSettingsPayload, state: tauri::State<AppState>) -> Result<AgentConsentSettings, String> {
    let db = state.0.lock().unwrap();
    db.get_agent_consent_settings(&payload.actor_id).map(to_agent_consent_settings)
}

#[tauri::command]
fn set_agent_consent_settings(payload: SetAgentConsentSettingsPayload, state: tauri::State<AppState>) -> Result<AgentConsentSettings, String> {
    let db = state.0.lock().unwrap();
    db.set_agent_consent_settings(&payload.admin_id, payload.enabled, &payload.text_ru, &payload.text_uz, &payload.text_uz_cyrl, payload.chat_link.as_deref())
        .map(to_agent_consent_settings)
}

#[tauri::command]
fn export_agents_excel(payload: ExportAgentsExcelPayload, state: tauri::State<AppState>) -> Result<String, String> {
    let db = state.0.lock().unwrap();
    if !db.is_admin(&payload.actor_id) {
        return Err("Недостаточно прав".into());
    }
    let agents = db.list_agents();
    let out_path = std::path::Path::new(&payload.out_path);
    report_export::generate_agents_workbook(&agents, out_path)?;
    Ok(payload.out_path)
}

#[tauri::command]
fn generate_telegram_link_code(payload: GenerateTelegramLinkCodePayload, state: tauri::State<AppState>) -> Result<TelegramLinkInfo, String> {
    let db = state.0.lock().unwrap();
    let code = db.generate_telegram_link_code(&payload.actor_id, &payload.employee_id)?;
    let settings = db.get_telegram_bot_settings_internal("bot");
    let bot_configured = settings.enabled && settings.token.is_some();
    let deep_link = if bot_configured {
        db.get_telegram_bot_username("bot").map(|username| format!("https://t.me/{username}?start={code}"))
    } else {
        None
    };
    Ok(TelegramLinkInfo { code, deep_link, bot_configured })
}

#[tauri::command]
fn get_telegram_link_status(payload: GetTelegramLinkStatusPayload, state: tauri::State<AppState>) -> Result<bool, String> {
    let db = state.0.lock().unwrap();
    if payload.actor_id != payload.employee_id && !db.is_admin(&payload.actor_id) {
        return Err("Недостаточно прав".into());
    }
    Ok(db.telegram_link_status(&payload.employee_id))
}

#[tauri::command]
fn unlink_telegram(payload: UnlinkTelegramPayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.unlink_telegram(&payload.actor_id, &payload.employee_id)
}

#[tauri::command]
fn get_notebook_settings(payload: GetNotebookSettingsPayload, state: tauri::State<AppState>) -> Result<NotebookSettings, String> {
    let db = state.0.lock().unwrap();
    db.get_notebook_settings(&payload.actor_id, &payload.employee_id).map(to_notebook_settings)
}

#[tauri::command]
fn set_notebook_settings(payload: SetNotebookSettingsPayload, state: tauri::State<AppState>) -> Result<NotebookSettings, String> {
    let db = state.0.lock().unwrap();
    db.set_notebook_settings(&payload.actor_id, &payload.employee_id, payload.enabled, payload.name.as_deref()).map(to_notebook_settings)
}

#[tauri::command]
fn get_onboarding_status(payload: GetOnboardingStatusPayload, state: tauri::State<AppState>) -> Result<OnboardingStatus, String> {
    let db = state.0.lock().unwrap();
    db.get_onboarding_status(&payload.actor_id, &payload.employee_id).map(to_onboarding_status)
}

#[tauri::command]
fn set_onboarding_completed(payload: SetOnboardingCompletedPayload, state: tauri::State<AppState>) -> Result<OnboardingStatus, String> {
    let db = state.0.lock().unwrap();
    db.set_onboarding_completed(&payload.actor_id, &payload.employee_id).map(to_onboarding_status)
}

#[tauri::command]
fn list_notebook_notes(payload: ListNotebookNotesPayload, state: tauri::State<AppState>) -> Result<Vec<NotebookNote>, String> {
    let db = state.0.lock().unwrap();
    db.list_notebook_notes(&payload.actor_id, &payload.employee_id).map(|v| v.into_iter().map(to_notebook_note).collect())
}

#[tauri::command]
fn create_notebook_note(payload: CreateNotebookNotePayload, state: tauri::State<AppState>) -> Result<NotebookNote, String> {
    let db = state.0.lock().unwrap();
    db.create_notebook_note(&payload.actor_id, &payload.employee_id, &payload.title, payload.content.as_deref()).map(to_notebook_note)
}

#[tauri::command]
fn update_notebook_note(payload: UpdateNotebookNotePayload, state: tauri::State<AppState>) -> Result<NotebookNote, String> {
    let db = state.0.lock().unwrap();
    db.update_notebook_note(&payload.actor_id, &payload.id, &payload.title, payload.content.as_deref()).map(to_notebook_note)
}

#[tauri::command]
fn delete_notebook_note(payload: DeleteNotebookNotePayload, state: tauri::State<AppState>) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    db.delete_notebook_note(&payload.actor_id, &payload.id)
}

#[tauri::command]
fn get_employee_report(payload: GetEmployeeReportPayload, state: tauri::State<AppState>) -> Result<Vec<EmployeeReportRow>, String> {
    let db = state.0.lock().unwrap();
    db.list_employee_report_rows(&payload.admin_id, &payload.period_start, &payload.period_end)
        .map(|rows| rows.into_iter().map(to_employee_report_row).collect())
}

#[tauri::command]
fn get_partner_report(payload: GetPartnerReportPayload, state: tauri::State<AppState>) -> Result<Vec<PartnerReportRow>, String> {
    let db = state.0.lock().unwrap();
    db.list_partner_report_rows(&payload.actor_id, payload.partner_id.as_deref(), payload.period_start.as_deref(), payload.period_end.as_deref())
        .map(|rows| rows.into_iter().map(to_partner_report_row).collect())
}

#[tauri::command]
fn get_report_export_settings(payload: GetReportExportSettingsPayload, state: tauri::State<AppState>) -> Result<ReportExportSettings, String> {
    let db = state.0.lock().unwrap();
    db.get_report_export_settings(&payload.actor_id).map(to_report_export_settings)
}

#[tauri::command]
fn set_report_export_settings(payload: SetReportExportSettingsPayload, state: tauri::State<AppState>) -> Result<ReportExportSettings, String> {
    let db = state.0.lock().unwrap();
    db.set_report_export_settings(&payload.admin_id, payload.enabled, &payload.day_mode, payload.fixed_day, &payload.time_hhmm, &payload.folder)
        .map(to_report_export_settings)
}

#[tauri::command]
fn generate_report_now(payload: GenerateReportNowPayload, state: tauri::State<AppState>) -> Result<String, String> {
    let db = state.0.lock().unwrap();
    let folder = match payload.folder.filter(|f| !f.is_empty()) {
        Some(f) => f,
        None => {
            let settings = db.get_report_export_settings(&payload.admin_id)?;
            if settings.folder.is_empty() {
                return Err("Не выбрана папка для сохранения отчёта".into());
            }
            settings.folder
        }
    };
    let employee_rows = db.list_employee_report_rows(&payload.admin_id, &payload.period_start, &payload.period_end)?;
    let partner_rows = db.list_partner_report_rows(&payload.admin_id, None, Some(&payload.period_start), Some(&payload.period_end))?;
    let file_name = format!("IB-CRM-Otchet-{}_{}.xlsx", payload.period_start, payload.period_end);
    let out_path = std::path::Path::new(&folder).join(file_name);
    report_export::generate_report_workbook(&employee_rows, &partner_rows, &out_path)?;
    Ok(out_path.to_string_lossy().to_string())
}

// Без авторизации — логотип нужен уже на экране входа/первого запуска, до
// того, как известен actor_id.
#[tauri::command]
fn get_app_logo(state: tauri::State<AppState>) -> Option<String> {
    let db = state.0.lock().unwrap();
    db.get_app_logo()
}

#[tauri::command]
fn set_app_logo(payload: SetAppLogoPayload, state: tauri::State<AppState>) -> Result<Option<String>, String> {
    let db = state.0.lock().unwrap();
    db.set_app_logo(&payload.admin_id, payload.logo_data.as_deref())
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

// Админ выбирает свежесобранный установщик через нативный диалог выбора
// файла (см. Settings.tsx) — команда сама копирует и переименовывает файл
// в нужное место, без ручного поиска папки AppData и переименования, из-за
// которых на практике возникла путаница (см. журнал v0.2.12 в docs/TZ.md).
// Только локально: source_path — это путь на диске ТОГО ЖЕ компьютера, где
// открылся диалог выбора, поэтому не регистрируется в dispatch.rs (по сети
// такой путь не имел бы смысла).
#[tauri::command]
fn set_update_installer(
    payload: SetUpdateInstallerPayload,
    state: tauri::State<AppState>,
    app_data_dir: tauri::State<AppDataDir>,
) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    if !db.is_admin(&payload.admin_id) {
        return Err("Недостаточно прав".into());
    }
    let dest = update_installer_path(&app_data_dir.0);
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::copy(&payload.source_path, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

// Только локально: dest_path — путь на диске ТОГО ЖЕ компьютера, где
// открылся диалог сохранения (см. Settings.tsx), тем же принципом, что и
// set_update_installer выше — не регистрируется в dispatch.rs.
#[tauri::command]
fn export_backup(
    payload: ExportBackupPayload,
    state: tauri::State<AppState>,
    app_data_dir: tauri::State<AppDataDir>,
) -> Result<(), String> {
    if payload.password.trim().chars().count() < 6 {
        return Err("Пароль резервной копии должен быть не короче 6 символов".into());
    }
    let db = state.0.lock().unwrap();
    if !db.is_admin(&payload.admin_id) {
        return Err("Недостаточно прав".into());
    }
    let plain = db.export_backup_plain(&app_data_dir.0)?;
    let encrypted = backup::encrypt(&plain, &payload.password)?;
    std::fs::write(&payload.dest_path, encrypted).map_err(|e| e.to_string())?;
    Ok(())
}

// Только локально, тем же принципом: source_path имеет смысл только на
// машине сервера, а восстановление физически подменяет файл базы ЭТОГО
// процесса — недопустимо проксировать с удалённого клиента.
#[tauri::command]
fn restore_backup(
    payload: RestoreBackupPayload,
    state: tauri::State<AppState>,
    app_data_dir: tauri::State<AppDataDir>,
) -> Result<(), String> {
    let db = state.0.lock().unwrap();
    if !db.is_admin(&payload.admin_id) {
        return Err("Недостаточно прав".into());
    }
    let encrypted = std::fs::read(&payload.source_path).map_err(|e| e.to_string())?;
    let plain = backup::decrypt(&encrypted, &payload.password)?;
    std::fs::write(app_data_dir.0.join("pending-restore.db"), plain).map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("нет app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();
            // Папка для установщика создаётся заранее, а не только когда клиент
            // туда что-то скачивает — иначе админу пришлось бы вручную угадывать
            // и создавать вложенную папку "updates" самому, прежде чем класть
            // туда файл (см. журнал v0.2.9/v0.2.12 в docs/TZ.md — реальная
            // путаница на практике).
            std::fs::create_dir_all(app_data_dir.join("updates")).ok();

            // Применение отложенного восстановления из резервной копии (см.
            // Настройки → Резервные копии). restore_backup() не может
            // безопасно подменить уже открытое Arc<Mutex<Db>>, поэтому просто
            // кладёт расшифрованный файл рядом как pending-restore.db и
            // просит перезапустить приложение — здесь, на самом старте, до
            // открытия основной базы, подменяем файл и убираем маркер.
            let db_path = app_data_dir.join("ib-crm.db");
            let pending_restore = app_data_dir.join("pending-restore.db");
            if pending_restore.is_file() {
                if db_path.is_file() {
                    // Единственная подстраховочная копия "до восстановления",
                    // перезаписывается при каждом восстановлении — не архив.
                    let _ = std::fs::rename(&db_path, app_data_dir.join("ib-crm.pre-restore.bak"));
                }
                if std::fs::rename(&pending_restore, &db_path).is_err() {
                    // rename может не сработать между разными томами.
                    let _ = std::fs::copy(&pending_restore, &db_path);
                }
                let _ = std::fs::remove_file(&pending_restore);
            }
            let db = Arc::new(Mutex::new(Db::init(&db_path)));

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

            let report_export_db = db.clone();
            let telegram_db = db.clone();

            app.manage(AppState(db));
            app.manage(AppDataDir(app_data_dir));

            // Тикер уведомлений — отдельный ОС-поток (не JS-таймер!). Раньше
            // опрос новых уведомлений держался на `setInterval` во фронтенде
            // (Topbar.tsx), а Chromium/WebView2 сильно замедляет таймеры
            // свёрнутого/неактивного окна — на практике баннер мог не
            // появляться минутами, пока пользователь работал в другом
            // приложении. Поток ОС такому троттлингу не подвержен: тикает
            // регулярно независимо от видимости окна, событие 'notification-tick'
            // долетает до вебвью и обрабатывается сразу, даже свёрнутого —
            // доставка событий это не setTimeout/setInterval, а входящее IPC-
            // сообщение (см. журнал v0.2.17 в docs/TZ.md). Сам поток ничего не
            // знает про сотрудников/сессии — просто "будит" фронтенд, вся
            // логика "что и для кого загрузить" остаётся в Topbar.tsx как была.
            let ticker_handle = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(8));
                let _ = ticker_handle.emit("notification-tick", ());
            });

            // Планировщик авто-выгрузки отчётов (v0.5.0) — тот же паттерн ОС-потока,
            // что у тикера уведомлений выше, но логика целиком здесь, в Rust (не нужен
            // round-trip в JS — экспорт это чтение БД + запись файла, фронтенду нечего
            // тут делать). На машине в режиме "клиент" report_export_enabled в её
            // локальном app_meta никогда не станет true — Settings.tsx прячет всю
            // секцию в этом режиме (та же причина, что у export_backup/
            // set_update_installer — путь к папке имеет смысл только на машине,
            // которая реально пишет файл) — поэтому здесь не нужно отдельно проверять
            // локальный/серверный режим, достаточно проверить сам флаг.
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(60));
                let settings = report_export_db.lock().unwrap().read_report_export_settings();
                if !settings.enabled {
                    continue;
                }
                let now = chrono::Local::now().naive_local();
                use chrono::Datelike;
                let today = now.format("%Y-%m-%d").to_string();
                let is_target_day = if settings.day_mode == "fixed_day" {
                    now.day() as i64 == settings.fixed_day
                } else {
                    // "Последний день месяца" — считаем так, если завтра уже другой месяц.
                    (now.date() + chrono::Duration::days(1)).month() != now.month()
                };
                if !is_target_day || now.format("%H:%M").to_string() != settings.time_hhmm {
                    continue;
                }
                let db = report_export_db.lock().unwrap();
                if db.report_export_last_fired_date().as_deref() == Some(today.as_str()) {
                    continue;
                }
                let Some(admin_id) = db.report_export_admin_id() else { continue };
                let period_start = format!("{}-01", now.format("%Y-%m"));
                let employee_rows = db.list_employee_report_rows(&admin_id, &period_start, &today);
                let partner_rows = db.list_partner_report_rows(&admin_id, None, Some(&period_start), Some(&today));
                if let (Ok(employee_rows), Ok(partner_rows)) = (employee_rows, partner_rows) {
                    let file_name = format!("IB-CRM-Otchet-{}.xlsx", now.format("%Y-%m"));
                    let out_path = std::path::Path::new(&settings.folder).join(file_name);
                    let _ = report_export::generate_report_workbook(&employee_rows, &partner_rows, &out_path);
                }
                db.set_report_export_last_fired_date(&today);
            });

            // Telegram-боты (v0.5.3) — long-polling getUpdates, по одной
            // async-задаче на каждую из 3 ролей (см. telegram.rs). В отличие
            // от тикеров выше это настоящий async I/O (сетевые запросы),
            // поэтому tauri::async_runtime::spawn, а не std::thread — тот же
            // рантайм, что уже используют embedded axum-сервер (server::run
            // чуть выше) и отправка задач (main.rs::spawn_telegram_task).
            // Настройки перечитываются на каждой итерации цикла — без
            // рестарта приложения; на клиент-машине включённость всегда
            // false локально (запись проксируется в БД сервера), поэтому
            // реально работает только там, где живёт канонический Db.
            telegram::spawn_polling_tasks(telegram_db, app.handle().clone());

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
            move_client_to_crm_base,
            list_client_history,
            add_client_history,
            list_client_services,
            add_client_service,
            delete_client_service,
            get_services_monthly_stats,
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
            edit_project_chat_message,
            delete_project_chat_message,
            assign_project_chat_message,
            update_project_chat_message_status,
            list_project_chat_replies,
            add_project_chat_reply,
            edit_project_chat_reply,
            delete_project_chat_reply,
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
            list_my_open_project_tasks,
            add_regulation_entry,
            edit_regulation_entry,
            delete_regulation_entry,
            assign_regulation_entry,
            update_entry_status,
            list_regulation_replies,
            add_regulation_reply,
            edit_regulation_reply,
            delete_regulation_reply,
            list_partner_regulations,
            get_partner_regulation,
            create_partner_regulation,
            update_partner_regulation,
            delete_partner_regulation,
            list_partner_regulation_entries,
            add_partner_regulation_entry,
            edit_partner_regulation_entry,
            delete_partner_regulation_entry,
            update_partner_regulation_entry_status,
            list_partner_regulation_replies,
            add_partner_regulation_reply,
            edit_partner_regulation_reply,
            delete_partner_regulation_reply,
            list_partner_services,
            create_partner_service,
            update_partner_service,
            delete_partner_service,
            list_house_services,
            create_house_service,
            update_house_service,
            delete_house_service,
            list_admin_employees,
            list_partner_org_employees,
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
            ping_typing,
            get_typing_status,
            list_my_dm_channels,
            list_my_partner_chats,
            create_chat_group,
            list_my_chat_groups,
            get_chat_group,
            list_chat_group_members,
            update_chat_group,
            add_chat_group_member,
            remove_chat_group_member,
            join_chat_group_by_invite,
            send_chat_message,
            edit_chat_message,
            delete_chat_message,
            mark_chat_channel_read,
            get_server_settings,
            set_server_settings,
            get_radmin_settings,
            set_radmin_settings,
            get_telegram_bot_settings,
            set_telegram_bot_settings,
            list_agents,
            resolve_agent_application,
            list_agent_leads,
            advance_agent_lead_stage,
            list_agent_training_posts,
            create_agent_training_post,
            delete_agent_training_post,
            get_agent_consent_settings,
            set_agent_consent_settings,
            export_agents_excel,
            generate_telegram_link_code,
            get_telegram_link_status,
            unlink_telegram,
            get_notebook_settings,
            set_notebook_settings,
            list_notebook_notes,
            create_notebook_note,
            update_notebook_note,
            delete_notebook_note,
            get_onboarding_status,
            set_onboarding_completed,
            get_employee_report,
            get_partner_report,
            get_report_export_settings,
            set_report_export_settings,
            generate_report_now,
            get_app_logo,
            set_app_logo,
            export_backup,
            restore_backup,
            get_lan_address,
            get_app_version,
            get_update_installer_info,
            get_update_installer_path,
            set_update_installer,
            record_login,
            record_logout,
            list_recent_sessions
        ])
        .run(tauri::generate_context!())
        .expect("ошибка запуска tauri приложения");
}
