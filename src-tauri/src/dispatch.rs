// Диспетчер команд для HTTP-режима сервера (v0.2.0). Один большой match вместо
// 90 отдельных axum-роутов — каждая ветка десериализует то же тело запроса,
// что уже присылает фронтенд для Tauri-команды с тем же именем (см.
// src/lib/api.ts), и вызывает тот же метод Db, что и соответствующая
// #[tauri::command] в main.rs. Бизнес-логика не дублируется — дублируется
// только тонкая обвязка (десериализация payload → вызов Db → сериализация
// ответа), потому что tauri::State нельзя переиспользовать вне Tauri IPC.
//
// dispatch.rs — дочерний модуль корня крейта (main.rs), поэтому обращение к
// приватным (без pub) типам/функциям main.rs через `crate::Xxx` работает без
// дополнительных pub(crate) — таковы правила видимости Rust (приватное видно
// в своём модуле и всех дочерних).

use crate::db::Db;
use serde::{de::DeserializeOwned, Serialize};
use serde_json::Value;

fn from_payload<T: DeserializeOwned>(payload: Value) -> Result<T, String> {
    serde_json::from_value(payload).map_err(|e| format!("Некорректные данные запроса: {e}"))
}

fn to_json<T: Serialize>(value: T) -> Value {
    serde_json::to_value(value).expect("сериализация ответа не должна падать")
}

fn field(payload: &Value, key: &str) -> Result<String, String> {
    payload
        .get(key)
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| format!("Отсутствует поле '{key}'"))
}

pub fn dispatch(cmd: &str, payload: Value, db: &Db, app_data_dir: &std::path::Path) -> Result<Value, String> {
    match cmd {
        // ---- Авторизация / сотрудники ----
        "has_admin" => Ok(to_json(db.has_admin())),
        "create_admin" => {
            let p: crate::CreateAdminPayload = from_payload(payload)?;
            db.create_admin(&p.login, &p.password, &p.full_name).map(crate::to_employee).map(to_json)
        }
        "login" => {
            let p: crate::LoginPayload = from_payload(payload)?;
            let result = match db.verify_login(&p.login, &p.password) {
                Ok(e) => crate::LoginResult { success: true, employee: Some(crate::to_employee(e)), message: None },
                Err(msg) => crate::LoginResult { success: false, employee: None, message: Some(msg) },
            };
            Ok(to_json(result))
        }
        "change_password" => {
            let p: crate::ChangePasswordPayload = from_payload(payload)?;
            db.change_password(&p.employee_id, &p.current_password, &p.new_password).map(to_json)
        }
        "list_employees" => Ok(to_json(db.list_employees().into_iter().map(crate::to_employee).collect::<Vec<_>>())),
        "get_employee" => {
            let id = field(&payload, "id")?;
            Ok(to_json(db.get_employee(&id).map(crate::to_employee)))
        }
        "create_employee" => {
            let p: crate::CreateEmployeePayload = from_payload(payload)?;
            db.create_employee(
                &p.admin_id, &p.login, &p.password, &p.full_name,
                p.phone.as_deref(), p.position_id.as_deref(), p.manager_id.as_deref(),
                p.deputy_id.as_deref(), p.department_id.as_deref(), p.avatar_data.as_deref(),
                p.birth_date.as_deref(), p.is_partner, p.partner_id.as_deref(),
            ).map(crate::to_employee).map(to_json)
        }
        "list_partners" => Ok(to_json(db.list_partners().into_iter().map(crate::to_partner).collect::<Vec<_>>())),
        "create_partner" => {
            let p: crate::CreatePartnerPayload = from_payload(payload)?;
            db.create_partner(&p.admin_id, &p.name).map(crate::to_partner).map(to_json)
        }
        "delete_partner" => {
            let p: crate::DeletePartnerPayload = from_payload(payload)?;
            db.delete_partner(&p.admin_id, &p.id).map(to_json)
        }
        "rename_partner" => {
            let p: crate::RenamePartnerPayload = from_payload(payload)?;
            db.rename_partner(&p.admin_id, &p.id, &p.name).map(crate::to_partner).map(to_json)
        }
        "admin_reset_password" => {
            let p: crate::AdminResetPasswordPayload = from_payload(payload)?;
            db.admin_reset_password(&p.admin_id, &p.employee_id, &p.new_password).map(to_json)
        }
        "update_employee" => {
            let p: crate::UpdateEmployeePayload = from_payload(payload)?;
            db.update_employee(
                &p.admin_id, &p.employee_id, &p.full_name,
                p.phone.as_deref(), p.position_id.as_deref(), p.manager_id.as_deref(),
                p.deputy_id.as_deref(), p.department_id.as_deref(), p.avatar_data.as_deref(),
                p.birth_date.as_deref(),
            ).map(crate::to_employee).map(to_json)
        }
        "self_update_employee" => {
            let p: crate::SelfUpdateEmployeePayload = from_payload(payload)?;
            db.self_update_employee(&p.employee_id, &p.full_name, p.phone.as_deref()).map(crate::to_employee).map(to_json)
        }
        "update_own_avatar" => {
            let p: crate::UpdateOwnAvatarPayload = from_payload(payload)?;
            db.update_own_avatar(&p.employee_id, p.avatar_data.as_deref()).map(crate::to_employee).map(to_json)
        }
        "set_employee_status" => {
            let p: crate::SetEmployeeStatusPayload = from_payload(payload)?;
            db.set_employee_status(&p.employee_id, p.status.as_deref()).map(crate::to_employee).map(to_json)
        }
        "set_employee_schedule" => {
            let p: crate::SetEmployeeSchedulePayload = from_payload(payload)?;
            db.set_employee_schedule(&p.admin_id, &p.employee_id, p.work_days.as_deref(), p.work_start.as_deref(), p.work_end.as_deref())
                .map(crate::to_employee).map(to_json)
        }
        "record_login" => {
            let employee_id = field(&payload, "employeeId")?;
            db.record_login(&employee_id).map(to_json)
        }
        "record_logout" => {
            let employee_id = field(&payload, "employeeId")?;
            db.record_logout(&employee_id).map(to_json)
        }
        "list_recent_sessions" => {
            let employee_id = field(&payload, "employeeId")?;
            Ok(to_json(db.list_recent_sessions(&employee_id, 20).into_iter().map(crate::to_session).collect::<Vec<_>>()))
        }

        // ---- Должности / подразделения ----
        "list_positions" => Ok(to_json(db.list_positions().into_iter().map(crate::to_position).collect::<Vec<_>>())),
        "create_position" => {
            let title = field(&payload, "title")?;
            db.create_position(&title).map(crate::to_position).map(to_json)
        }
        "list_departments" => Ok(to_json(db.list_departments().into_iter().map(crate::to_department).collect::<Vec<_>>())),
        "create_department" => {
            let p: crate::CreateDepartmentPayload = from_payload(payload)?;
            db.create_department(&p.admin_id, &p.name, p.head_employee_id.as_deref(), p.deputy_employee_id.as_deref())
                .map(crate::to_department).map(to_json)
        }
        "update_department" => {
            let p: crate::UpdateDepartmentPayload = from_payload(payload)?;
            db.update_department(&p.admin_id, &p.id, &p.name, p.head_employee_id.as_deref(), p.deputy_employee_id.as_deref())
                .map(crate::to_department).map(to_json)
        }
        "delete_department" => {
            let p: crate::DeleteDepartmentPayload = from_payload(payload)?;
            db.delete_department(&p.admin_id, &p.id).map(to_json)
        }

        // ---- Уведомления / заявки на изменение данных ----
        "list_notifications" => {
            let employee_id = field(&payload, "employeeId")?;
            Ok(to_json(db.list_notifications(&employee_id).into_iter().map(crate::to_notification).collect::<Vec<_>>()))
        }
        "mark_notification_read" => {
            let id = field(&payload, "id")?;
            db.mark_notification_read(&id).map(to_json)
        }
        "create_edit_request" => {
            let p: crate::CreateEditRequestPayload = from_payload(payload)?;
            db.create_edit_request(&p.employee_id, p.requested_full_name.as_deref(), p.requested_phone.as_deref(), p.note.as_deref())
                .map(crate::to_edit_request).map(to_json)
        }
        "list_edit_requests" => {
            let admin_id = field(&payload, "adminId")?;
            db.list_edit_requests(&admin_id).map(|rows| to_json(rows.into_iter().map(crate::to_edit_request).collect::<Vec<_>>()))
        }
        "resolve_edit_request" => {
            let p: crate::ResolveEditRequestPayload = from_payload(payload)?;
            db.resolve_edit_request(&p.admin_id, &p.request_id, &p.action).map(to_json)
        }

        // ---- Заявки на отсутствие ----
        "create_absence_request" => {
            let p: crate::CreateAbsenceRequestPayload = from_payload(payload)?;
            db.create_absence_request(&p.employee_id, &p.request_type, &p.start_date, &p.end_date, p.reason.as_deref(), p.makeup_slots.as_deref())
                .map(crate::to_absence_request).map(to_json)
        }
        "list_absence_requests_for_employee" => {
            let employee_id = field(&payload, "employeeId")?;
            Ok(to_json(db.list_absence_requests_for_employee(&employee_id).into_iter().map(crate::to_absence_request).collect::<Vec<_>>()))
        }
        "list_pending_approvals" => {
            let actor_id = field(&payload, "actorId")?;
            Ok(to_json(db.list_pending_approvals(&actor_id).into_iter().map(crate::to_absence_request).collect::<Vec<_>>()))
        }
        "list_all_absence_requests" => {
            let admin_id = field(&payload, "adminId")?;
            db.list_all_absence_requests(&admin_id).map(|rows| to_json(rows.into_iter().map(crate::to_absence_request).collect::<Vec<_>>()))
        }
        "get_absence_request" => {
            let p: crate::GetAbsenceRequestPayload = from_payload(payload)?;
            db.get_absence_request(&p.actor_id, &p.request_id).map(crate::to_absence_request).map(to_json)
        }
        "resolve_absence_request" => {
            let p: crate::ResolveAbsenceRequestPayload = from_payload(payload)?;
            db.resolve_absence_request(&p.actor_id, &p.request_id, p.approve).map(to_json)
        }

        // ---- Клиенты ----
        "list_clients" => {
            let p: crate::ListClientsPayload = from_payload(payload)?;
            Ok(to_json(db.list_clients(&p.actor_id, p.partner_id.as_deref()).into_iter().map(crate::to_client).collect::<Vec<_>>()))
        }
        "get_client" => {
            let p: crate::GetClientPayload = from_payload(payload)?;
            Ok(to_json(db.get_client(&p.actor_id, &p.id).map(crate::to_client)))
        }
        "create_client" => {
            let p: crate::CreateClientPayload = from_payload(payload)?;
            db.create_client(
                &p.actor_id, &p.name, p.contact_person.as_deref(), p.contact_position.as_deref(),
                p.phone.as_deref(), p.email.as_deref(), p.address.as_deref(), p.notes.as_deref(),
                p.partner_id.as_deref(), p.deal_value.as_deref(), p.service_id.as_deref(),
            ).map(crate::to_client).map(to_json)
        }
        "update_client" => {
            let p: crate::UpdateClientPayload = from_payload(payload)?;
            db.update_client(
                &p.actor_id, &p.id, &p.name, p.contact_person.as_deref(), p.contact_position.as_deref(),
                p.phone.as_deref(), p.email.as_deref(), p.address.as_deref(), p.notes.as_deref(),
                p.partner_id.as_deref(), p.deal_value.as_deref(), p.service_id.as_deref(),
            ).map(crate::to_client).map(to_json)
        }
        "delete_client" => {
            let p: crate::DeleteClientPayload = from_payload(payload)?;
            db.delete_client(&p.admin_id, &p.id).map(to_json)
        }
        "list_client_history" => {
            let p: crate::ListClientHistoryPayload = from_payload(payload)?;
            Ok(to_json(db.list_client_history(&p.actor_id, &p.client_id).into_iter().map(crate::to_client_history).collect::<Vec<_>>()))
        }
        "add_client_history" => {
            let p: crate::AddClientHistoryPayload = from_payload(payload)?;
            db.add_client_history(&p.client_id, &p.actor_id, &p.description).map(crate::to_client_history).map(to_json)
        }

        // ---- Проекты ----
        "list_projects" => Ok(to_json(db.list_projects().into_iter().map(crate::to_project).collect::<Vec<_>>())),
        "get_project" => {
            let id = field(&payload, "id")?;
            Ok(to_json(db.get_project(&id).map(crate::to_project)))
        }
        "create_project" => {
            let p: crate::CreateProjectPayload = from_payload(payload)?;
            db.create_project(&p.actor_id, &p.name, p.description.as_deref(), p.client_id.as_deref(), &p.status)
                .map(crate::to_project).map(to_json)
        }
        "update_project" => {
            let p: crate::UpdateProjectPayload = from_payload(payload)?;
            db.update_project(&p.actor_id, &p.id, &p.name, p.description.as_deref(), p.client_id.as_deref(), &p.status)
                .map(crate::to_project).map(to_json)
        }
        "delete_project" => {
            let p: crate::DeleteProjectPayload = from_payload(payload)?;
            db.delete_project(&p.admin_id, &p.id).map(to_json)
        }
        "list_project_members" => {
            let project_id = field(&payload, "projectId")?;
            Ok(to_json(db.list_project_members(&project_id).into_iter().map(crate::to_project_member).collect::<Vec<_>>()))
        }
        "add_project_member" => {
            let p: crate::AddProjectMemberPayload = from_payload(payload)?;
            db.add_project_member(&p.actor_id, &p.project_id, &p.employee_id, &p.role).map(to_json)
        }
        "remove_project_member" => {
            let p: crate::RemoveProjectMemberPayload = from_payload(payload)?;
            db.remove_project_member(&p.actor_id, &p.project_id, &p.employee_id).map(to_json)
        }
        "transfer_project_ownership" => {
            let p: crate::TransferProjectOwnershipPayload = from_payload(payload)?;
            db.transfer_project_ownership(&p.actor_id, &p.project_id, &p.new_owner_id).map(crate::to_project).map(to_json)
        }
        "list_project_chat" => {
            let project_id = field(&payload, "projectId")?;
            Ok(to_json(db.list_project_chat(&project_id).into_iter().map(crate::to_project_chat_message).collect::<Vec<_>>()))
        }
        "send_project_chat_message" => {
            let p: crate::SendProjectChatMessagePayload = from_payload(payload)?;
            db.send_project_chat_message(&p.actor_id, &p.project_id, &p.target_employee_id, &p.content, p.attachment_data.as_deref(), p.attachment_name.as_deref(), p.deadline.as_deref())
                .map(crate::to_project_chat_message).map(to_json)
        }
        "edit_project_chat_message" => {
            let p: crate::EditProjectChatMessagePayload = from_payload(payload)?;
            db.edit_project_chat_message(&p.actor_id, &p.message_id, &p.content).map(crate::to_project_chat_message).map(to_json)
        }
        "delete_project_chat_message" => {
            let p: crate::DeleteProjectChatMessagePayload = from_payload(payload)?;
            db.delete_project_chat_message(&p.actor_id, &p.message_id).map(to_json)
        }
        "assign_project_chat_message" => {
            let p: crate::AssignProjectChatMessagePayload = from_payload(payload)?;
            db.assign_project_chat_message(&p.actor_id, &p.message_id, &p.target_employee_id, p.deadline.as_deref()).map(to_json)
        }
        "update_project_chat_message_status" => {
            let p: crate::UpdateProjectChatMessageStatusPayload = from_payload(payload)?;
            db.update_project_chat_message_status(&p.actor_id, &p.message_id, &p.status).map(to_json)
        }
        "list_project_chat_replies" => {
            let message_id = field(&payload, "messageId")?;
            Ok(to_json(db.list_project_chat_replies(&message_id).into_iter().map(crate::to_project_chat_reply).collect::<Vec<_>>()))
        }
        "add_project_chat_reply" => {
            let p: crate::AddProjectChatReplyPayload = from_payload(payload)?;
            db.add_project_chat_reply(&p.actor_id, &p.message_id, &p.content).map(crate::to_project_chat_reply).map(to_json)
        }
        "edit_project_chat_reply" => {
            let p: crate::EditProjectChatReplyPayload = from_payload(payload)?;
            db.edit_project_chat_reply(&p.actor_id, &p.reply_id, &p.content).map(crate::to_project_chat_reply).map(to_json)
        }
        "delete_project_chat_reply" => {
            let p: crate::DeleteProjectChatReplyPayload = from_payload(payload)?;
            db.delete_project_chat_reply(&p.actor_id, &p.reply_id).map(to_json)
        }

        // ---- Регламенты ----
        "list_regulations" => Ok(to_json(db.list_regulations().into_iter().map(crate::to_regulation).collect::<Vec<_>>())),
        "get_regulation" => {
            let id = field(&payload, "id")?;
            Ok(to_json(db.get_regulation(&id).map(crate::to_regulation)))
        }
        "create_regulation" => {
            let p: crate::CreateRegulationPayload = from_payload(payload)?;
            db.create_regulation(&p.actor_id, &p.title, p.description.as_deref(), p.client_id.as_deref(), p.deadline.as_deref())
                .map(crate::to_regulation).map(to_json)
        }
        "update_regulation" => {
            let p: crate::UpdateRegulationPayload = from_payload(payload)?;
            db.update_regulation(&p.actor_id, &p.id, &p.title, p.description.as_deref(), p.client_id.as_deref(), p.deadline.as_deref(), &p.status)
                .map(crate::to_regulation).map(to_json)
        }
        "delete_regulation" => {
            let p: crate::DeleteRegulationPayload = from_payload(payload)?;
            db.delete_regulation(&p.admin_id, &p.id).map(to_json)
        }
        "list_regulation_members" => {
            let regulation_id = field(&payload, "regulationId")?;
            Ok(to_json(db.list_regulation_members(&regulation_id).into_iter().map(crate::to_reg_member).collect::<Vec<_>>()))
        }
        "add_regulation_member" => {
            let p: crate::AddRegulationMemberPayload = from_payload(payload)?;
            db.add_regulation_member(&p.actor_id, &p.regulation_id, &p.employee_id, &p.role).map(to_json)
        }
        "remove_regulation_member" => {
            let p: crate::RemoveRegulationMemberPayload = from_payload(payload)?;
            db.remove_regulation_member(&p.actor_id, &p.regulation_id, &p.employee_id).map(to_json)
        }
        "list_regulation_entries" => {
            let regulation_id = field(&payload, "regulationId")?;
            Ok(to_json(db.list_regulation_entries(&regulation_id).into_iter().map(crate::to_reg_entry).collect::<Vec<_>>()))
        }
        "list_my_open_tasks" => {
            let employee_id = field(&payload, "employeeId")?;
            Ok(to_json(db.list_my_open_tasks(&employee_id).into_iter().map(crate::to_my_task).collect::<Vec<_>>()))
        }
        "list_my_open_project_tasks" => {
            let employee_id = field(&payload, "employeeId")?;
            Ok(to_json(db.list_my_open_project_tasks(&employee_id).into_iter().map(crate::to_my_project_task).collect::<Vec<_>>()))
        }
        "add_regulation_entry" => {
            let p: crate::AddRegulationEntryPayload = from_payload(payload)?;
            db.add_regulation_entry(&p.actor_id, &p.regulation_id, &p.target_employee_id, &p.content, p.attachment_data.as_deref(), p.attachment_name.as_deref(), p.deadline.as_deref())
                .map(crate::to_reg_entry).map(to_json)
        }
        "edit_regulation_entry" => {
            let p: crate::EditRegulationEntryPayload = from_payload(payload)?;
            db.edit_regulation_entry_content(&p.actor_id, &p.entry_id, &p.content).map(crate::to_reg_entry).map(to_json)
        }
        "delete_regulation_entry" => {
            let p: crate::DeleteRegulationEntryPayload = from_payload(payload)?;
            db.delete_regulation_entry(&p.actor_id, &p.entry_id).map(to_json)
        }
        "assign_regulation_entry" => {
            let p: crate::AssignRegulationEntryPayload = from_payload(payload)?;
            db.assign_regulation_entry(&p.actor_id, &p.entry_id, &p.target_employee_id, p.deadline.as_deref()).map(to_json)
        }
        "update_entry_status" => {
            let p: crate::UpdateEntryStatusPayload = from_payload(payload)?;
            db.update_entry_status(&p.actor_id, &p.entry_id, &p.status).map(to_json)
        }
        "list_regulation_replies" => {
            let entry_id = field(&payload, "entryId")?;
            Ok(to_json(db.list_regulation_replies(&entry_id).into_iter().map(crate::to_reg_reply).collect::<Vec<_>>()))
        }
        "add_regulation_reply" => {
            let p: crate::AddRegulationReplyPayload = from_payload(payload)?;
            db.add_regulation_reply(&p.actor_id, &p.entry_id, &p.content).map(crate::to_reg_reply).map(to_json)
        }
        "edit_regulation_reply" => {
            let p: crate::EditRegulationReplyPayload = from_payload(payload)?;
            db.edit_regulation_reply(&p.actor_id, &p.reply_id, &p.content).map(crate::to_reg_reply).map(to_json)
        }
        "delete_regulation_reply" => {
            let p: crate::DeleteRegulationReplyPayload = from_payload(payload)?;
            db.delete_regulation_reply(&p.actor_id, &p.reply_id).map(to_json)
        }

        // ---- Регламенты между админом и конкретным партнёром (v0.3.0) ----
        "list_partner_regulations" => {
            let p: crate::ListPartnerRegulationsPayload = from_payload(payload)?;
            db.list_partner_regulations(&p.actor_id, &p.partner_id).map(|rows| rows.into_iter().map(crate::to_partner_regulation).collect::<Vec<_>>()).map(to_json)
        }
        "get_partner_regulation" => {
            let id = field(&payload, "id")?;
            Ok(to_json(db.get_partner_regulation(&id).map(crate::to_partner_regulation)))
        }
        "create_partner_regulation" => {
            let p: crate::CreatePartnerRegulationPayload = from_payload(payload)?;
            db.create_partner_regulation(&p.actor_id, &p.partner_id, &p.title, p.description.as_deref(), p.client_id.as_deref(), p.deadline.as_deref(), p.assistant_id.as_deref())
                .map(crate::to_partner_regulation).map(to_json)
        }
        "update_partner_regulation" => {
            let p: crate::UpdatePartnerRegulationPayload = from_payload(payload)?;
            db.update_partner_regulation(&p.actor_id, &p.id, &p.title, p.description.as_deref(), p.client_id.as_deref(), p.deadline.as_deref(), &p.status, p.assistant_id.as_deref())
                .map(crate::to_partner_regulation).map(to_json)
        }
        "delete_partner_regulation" => {
            let p: crate::DeletePartnerRegulationPayload = from_payload(payload)?;
            db.delete_partner_regulation(&p.admin_id, &p.id).map(to_json)
        }
        "list_partner_regulation_entries" => {
            let p: crate::ListPartnerRegulationEntriesPayload = from_payload(payload)?;
            db.list_partner_regulation_entries(&p.actor_id, &p.partner_regulation_id).map(|rows| rows.into_iter().map(crate::to_partner_regulation_entry).collect::<Vec<_>>()).map(to_json)
        }
        "add_partner_regulation_entry" => {
            let p: crate::AddPartnerRegulationEntryPayload = from_payload(payload)?;
            db.add_partner_regulation_entry(&p.actor_id, &p.partner_regulation_id, &p.content, p.attachment_data.as_deref(), p.attachment_name.as_deref(), p.deadline.as_deref())
                .map(crate::to_partner_regulation_entry).map(to_json)
        }
        "edit_partner_regulation_entry" => {
            let p: crate::EditPartnerRegulationEntryPayload = from_payload(payload)?;
            db.edit_partner_regulation_entry(&p.actor_id, &p.entry_id, &p.content).map(crate::to_partner_regulation_entry).map(to_json)
        }
        "delete_partner_regulation_entry" => {
            let p: crate::DeletePartnerRegulationEntryPayload = from_payload(payload)?;
            db.delete_partner_regulation_entry(&p.actor_id, &p.entry_id).map(to_json)
        }
        "update_partner_regulation_entry_status" => {
            let p: crate::UpdatePartnerRegulationEntryStatusPayload = from_payload(payload)?;
            db.update_partner_regulation_entry_status(&p.actor_id, &p.entry_id, &p.status).map(to_json)
        }
        "list_partner_regulation_replies" => {
            let p: crate::ListPartnerRegulationRepliesPayload = from_payload(payload)?;
            db.list_partner_regulation_replies(&p.actor_id, &p.entry_id).map(|rows| rows.into_iter().map(crate::to_partner_regulation_reply).collect::<Vec<_>>()).map(to_json)
        }
        "add_partner_regulation_reply" => {
            let p: crate::AddPartnerRegulationReplyPayload = from_payload(payload)?;
            db.add_partner_regulation_reply(&p.actor_id, &p.entry_id, &p.content).map(crate::to_partner_regulation_reply).map(to_json)
        }
        "edit_partner_regulation_reply" => {
            let p: crate::EditPartnerRegulationReplyPayload = from_payload(payload)?;
            db.edit_partner_regulation_reply(&p.actor_id, &p.reply_id, &p.content).map(crate::to_partner_regulation_reply).map(to_json)
        }
        "delete_partner_regulation_reply" => {
            let p: crate::DeletePartnerRegulationReplyPayload = from_payload(payload)?;
            db.delete_partner_regulation_reply(&p.actor_id, &p.reply_id).map(to_json)
        }

        // ---- Услуги партнёра (v0.4.0) ----
        "list_partner_services" => {
            let p: crate::ListPartnerServicesPayload = from_payload(payload)?;
            db.list_partner_services(&p.actor_id, &p.partner_id).map(|rows| rows.into_iter().map(crate::to_partner_service).collect::<Vec<_>>()).map(to_json)
        }
        "create_partner_service" => {
            let p: crate::CreatePartnerServicePayload = from_payload(payload)?;
            db.create_partner_service(&p.actor_id, &p.partner_id, &p.name, p.description.as_deref(), p.price.as_deref(), p.reward_percent.as_deref())
                .map(crate::to_partner_service).map(to_json)
        }
        "update_partner_service" => {
            let p: crate::UpdatePartnerServicePayload = from_payload(payload)?;
            db.update_partner_service(&p.actor_id, &p.id, &p.name, p.description.as_deref(), p.price.as_deref(), p.reward_percent.as_deref())
                .map(crate::to_partner_service).map(to_json)
        }
        "delete_partner_service" => {
            let p: crate::DeletePartnerServicePayload = from_payload(payload)?;
            db.delete_partner_service(&p.actor_id, &p.id).map(to_json)
        }
        "list_admin_employees" => Ok(to_json(db.list_admin_employees().into_iter().map(crate::to_employee).collect::<Vec<_>>())),
        "list_partner_org_employees" => {
            let p: crate::ListPartnerOrgEmployeesPayload = from_payload(payload)?;
            db.list_partner_org_employees(&p.actor_id, &p.partner_id).map(|rows| rows.into_iter().map(crate::to_employee).collect::<Vec<_>>()).map(to_json)
        }

        "add_regulation_reminder" => {
            let p: crate::AddRegulationReminderPayload = from_payload(payload)?;
            db.add_regulation_reminder(&p.actor_id, &p.regulation_id, p.entry_id.as_deref(), &p.target_employee_id, &p.remind_at, &p.note)
                .map(crate::to_reg_reminder).map(to_json)
        }
        "list_regulation_reminders" => {
            let p: crate::ListRegulationRemindersPayload = from_payload(payload)?;
            Ok(to_json(db.list_regulation_reminders(&p.regulation_id, &p.employee_id).into_iter().map(crate::to_reg_reminder).collect::<Vec<_>>()))
        }
        "update_regulation_entry_deadline" => {
            let p: crate::UpdateEntryDeadlinePayload = from_payload(payload)?;
            db.update_regulation_entry_deadline(&p.actor_id, &p.entry_id, p.deadline.as_deref()).map(to_json)
        }

        // ---- Блог ----
        "list_blog_topics" => {
            let actor_id = field(&payload, "actorId")?;
            Ok(to_json(db.list_blog_topics(&actor_id).into_iter().map(crate::to_blog_topic).collect::<Vec<_>>()))
        }
        "create_blog_topic" => {
            let p: crate::CreateBlogTopicPayload = from_payload(payload)?;
            db.create_blog_topic(&p.actor_id, &p.category, &p.title, p.content.as_deref(), p.partner_audience.as_deref()).map(crate::to_blog_topic).map(to_json)
        }
        "update_blog_topic" => {
            let p: crate::UpdateBlogTopicPayload = from_payload(payload)?;
            db.update_blog_topic(&p.actor_id, &p.id, &p.category, &p.title, p.content.as_deref(), p.partner_audience.as_deref()).map(crate::to_blog_topic).map(to_json)
        }
        "set_blog_topic_pinned" => {
            let p: crate::SetBlogTopicPinnedPayload = from_payload(payload)?;
            db.set_blog_topic_pinned(&p.admin_id, &p.id, p.pinned).map(to_json)
        }
        "delete_blog_topic" => {
            let p: crate::DeleteBlogTopicPayload = from_payload(payload)?;
            db.delete_blog_topic(&p.actor_id, &p.id).map(to_json)
        }
        "list_blog_comments" => {
            let topic_id = field(&payload, "topicId")?;
            Ok(to_json(db.list_blog_comments(&topic_id).into_iter().map(crate::to_blog_comment).collect::<Vec<_>>()))
        }
        "add_blog_comment" => {
            let p: crate::AddBlogCommentPayload = from_payload(payload)?;
            db.add_blog_comment(&p.actor_id, &p.topic_id, &p.content, p.reply_to_id.as_deref()).map(crate::to_blog_comment).map(to_json)
        }
        "list_chat_messages" => {
            let employee_id = field(&payload, "employeeId")?;
            let channel = field(&payload, "channel")?;
            db.list_chat_messages(&employee_id, &channel)
                .map(|v| to_json(v.into_iter().map(crate::to_chat_message).collect::<Vec<_>>()))
        }
        "list_my_dm_channels" => {
            let employee_id = field(&payload, "employeeId")?;
            Ok(to_json(db.list_my_dm_channels(&employee_id).into_iter().map(crate::to_dm_channel_summary).collect::<Vec<_>>()))
        }
        "list_my_partner_chats" => {
            let actor_id = field(&payload, "actorId")?;
            let list = if db.is_admin(&actor_id) { db.list_my_partner_chats() } else { Vec::new() };
            Ok(to_json(list.into_iter().map(crate::to_partner_chat_summary).collect::<Vec<_>>()))
        }
        "create_chat_group" => {
            let p: crate::CreateChatGroupPayload = from_payload(payload)?;
            db.create_chat_group(
                &p.actor_id,
                &p.name,
                p.description.as_deref(),
                p.photo_data.as_deref(),
                p.department_id.as_deref(),
                p.member_ids.as_deref(),
            )
            .map(crate::to_chat_group)
            .map(to_json)
        }
        "list_my_chat_groups" => {
            let employee_id = field(&payload, "employeeId")?;
            Ok(to_json(db.list_my_chat_groups(&employee_id).into_iter().map(crate::to_chat_group_summary).collect::<Vec<_>>()))
        }
        "get_chat_group" => {
            let group_id = field(&payload, "groupId")?;
            Ok(to_json(db.get_chat_group(&group_id).map(crate::to_chat_group)))
        }
        "list_chat_group_members" => {
            let employee_id = field(&payload, "employeeId")?;
            let group_id = field(&payload, "groupId")?;
            db.list_chat_group_members(&employee_id, &group_id)
                .map(|v| to_json(v.into_iter().map(crate::to_employee).collect::<Vec<_>>()))
        }
        "update_chat_group" => {
            let p: crate::UpdateChatGroupPayload = from_payload(payload)?;
            db.update_chat_group(&p.actor_id, &p.group_id, &p.name, p.description.as_deref(), p.photo_data.as_deref())
                .map(crate::to_chat_group)
                .map(to_json)
        }
        "add_chat_group_member" => {
            let p: crate::ChatGroupMemberPayload = from_payload(payload)?;
            db.add_chat_group_member(&p.actor_id, &p.group_id, &p.employee_id).map(to_json)
        }
        "remove_chat_group_member" => {
            let p: crate::ChatGroupMemberPayload = from_payload(payload)?;
            db.remove_chat_group_member(&p.actor_id, &p.group_id, &p.employee_id).map(to_json)
        }
        "join_chat_group_by_invite" => {
            let p: crate::JoinChatGroupPayload = from_payload(payload)?;
            db.join_chat_group_by_invite(&p.actor_id, &p.invite_code).map(crate::to_chat_group).map(to_json)
        }
        "send_chat_message" => {
            let p: crate::SendChatMessagePayload = from_payload(payload)?;
            db.send_chat_message(
                &p.actor_id,
                &p.channel,
                &p.content,
                p.attachment_data.as_deref(),
                p.attachment_name.as_deref(),
                p.reply_to_id.as_deref(),
            )
            .map(crate::to_chat_message)
            .map(to_json)
        }
        "edit_chat_message" => {
            let p: crate::EditChatMessagePayload = from_payload(payload)?;
            db.edit_chat_message(&p.actor_id, &p.message_id, &p.content).map(crate::to_chat_message).map(to_json)
        }
        "delete_chat_message" => {
            let p: crate::DeleteChatMessagePayload = from_payload(payload)?;
            db.delete_chat_message(&p.actor_id, &p.message_id).map(to_json)
        }
        "mark_chat_channel_read" => {
            let p: crate::MarkChatChannelReadPayload = from_payload(payload)?;
            db.mark_chat_channel_read(&p.employee_id, &p.channel);
            Ok(to_json(()))
        }

        // ---- Настройки сервера (обычно используются только локально на
        // самой серверной машине, но диспетчеру всё равно, откуда вызов) ----
        "get_server_settings" => Ok(to_json(crate::to_server_settings(db.get_server_settings()))),
        "get_lan_address" => Ok(to_json(crate::get_lan_address())),
        "get_app_version" => Ok(to_json(crate::get_app_version())),
        "get_update_installer_info" => Ok(to_json(crate::get_update_installer_info_impl(app_data_dir))),
        "get_update_installer_path" => Ok(to_json(crate::update_installer_path(app_data_dir).display().to_string())),
        "set_server_settings" => {
            let p: crate::SetServerSettingsPayload = from_payload(payload)?;
            db.set_server_settings(&p.admin_id, p.enabled, p.port).map(crate::to_server_settings).map(to_json)
        }
        "get_radmin_settings" => Ok(to_json(crate::to_radmin_settings(db.get_radmin_settings()))),
        "set_radmin_settings" => {
            let p: crate::SetRadminSettingsPayload = from_payload(payload)?;
            db.set_radmin_settings(&p.admin_id, &p.network_id, &p.network_password, &p.note)
                .map(crate::to_radmin_settings)
                .map(to_json)
        }
        "get_telegram_bot_settings" => {
            let p: crate::GetTelegramBotSettingsPayload = from_payload(payload)?;
            db.get_telegram_bot_settings(&p.actor_id).map(crate::to_telegram_bot_settings).map(to_json)
        }
        "set_telegram_bot_settings" => {
            let p: crate::SetTelegramBotSettingsPayload = from_payload(payload)?;
            db.set_telegram_bot_settings(
                &p.admin_id,
                p.admin_task_enabled,
                p.admin_task_token.as_deref(),
                p.task_close_enabled,
                p.task_close_token.as_deref(),
                p.admin_partner_enabled,
                p.admin_partner_token.as_deref(),
            ).map(crate::to_telegram_bot_settings).map(to_json)
        }
        "get_employee_report" => {
            let p: crate::GetEmployeeReportPayload = from_payload(payload)?;
            db.list_employee_report_rows(&p.admin_id, &p.period_start, &p.period_end)
                .map(|rows| rows.into_iter().map(crate::to_employee_report_row).collect::<Vec<_>>()).map(to_json)
        }
        "get_partner_report" => {
            let p: crate::GetPartnerReportPayload = from_payload(payload)?;
            db.list_partner_report_rows(&p.actor_id, p.partner_id.as_deref(), p.period_start.as_deref(), p.period_end.as_deref())
                .map(|rows| rows.into_iter().map(crate::to_partner_report_row).collect::<Vec<_>>()).map(to_json)
        }
        // get_report_export_settings/set_report_export_settings/generate_report_now
        // сознательно НЕ зеркалированы здесь — folder — путь на диске конкретной машины
        // (та, что реально считает по расписанию и пишет файл), тем же принципом, что у
        // export_backup/set_update_installer выше по файлу: с клиента путь, выбранный в
        // диалоге на ЕГО машине, был бы бессмысленным на диске сервера. UI (Settings.tsx)
        // прячет всю секцию "Авто-выгрузка отчётов" в режиме клиента — это не должно
        // вызываться по сети, но на случай прямого вызова команды — падаем явной ошибкой,
        // а не тихо пишем не туда.
        "get_app_logo" => Ok(to_json(db.get_app_logo())),
        "set_app_logo" => {
            let p: crate::SetAppLogoPayload = from_payload(payload)?;
            db.set_app_logo(&p.admin_id, p.logo_data.as_deref()).map(to_json)
        }

        other => Err(format!("Неизвестная команда: {other}")),
    }
}
