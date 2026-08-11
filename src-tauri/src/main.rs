#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;

use db::Db;
use std::sync::Mutex;
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
struct Position {
    id: String,
    title: String,
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

struct AppState(Mutex<Db>);

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

fn to_position(p: db::PositionRecord) -> Position {
    Position { id: p.id, title: p.title }
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
    )
    .map(to_employee)
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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("нет app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();
            let db = Db::init(&app_data_dir.join("ib-crm.db"));
            app.manage(AppState(Mutex::new(db)));
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
            set_employee_status,
            set_employee_schedule,
            create_absence_request,
            list_absence_requests_for_employee,
            list_pending_approvals,
            list_all_absence_requests,
            get_absence_request,
            resolve_absence_request,
            record_login,
            record_logout,
            list_recent_sessions
        ])
        .run(tauri::generate_context!())
        .expect("ошибка запуска tauri приложения");
}
