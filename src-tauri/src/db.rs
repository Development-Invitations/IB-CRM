use chrono::NaiveDateTime;
use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use uuid::Uuid;

// В v0.1.x работаем полностью локально (SQLite-файл в app data dir).
// Когда появится подключение к серверу (v0.2.0), эта схема станет "зеркалом"
// основной PostgreSQL-схемы (см. docs/db/schema.sql).

pub struct Db {
    conn: Connection,
    // "Печатает…" в личных чатах (v1.4.0) — намеренно НЕ в SQLite: состояние
    // живёт секунды, писать его на диск при каждом нажатии клавиши избыточно.
    // Отдельный Mutex поверх — свой для этого поля, не пересекается с внешним
    // Arc<Mutex<Db>>, которым уже обёрнута вся Db в AppState (никакого риска
    // взаимной блокировки — это разные Mutex). Ключ — id канала (тот же
    // "dm:a:b", что и в остальном чате), значение — (кто печатает, когда
    // истечёт).
    typing: Mutex<HashMap<String, (String, Instant)>>,
}

pub struct EmployeeRecord {
    pub id: String,
    pub employee_number: String,
    pub login: String,
    pub full_name: String,
    pub is_admin: bool,
    pub phone: Option<String>,
    pub position_id: Option<String>,
    pub position_title: Option<String>,
    pub manager_id: Option<String>,
    pub manager_name: Option<String>,
    pub deputy_id: Option<String>,
    pub deputy_name: Option<String>,
    pub department_id: Option<String>,
    pub department_name: Option<String>,
    pub self_edit_until: Option<String>,
    pub has_pending_edit_request: bool,
    pub avatar_data: Option<String>,
    pub created_at: String,
    pub is_online: bool,
    pub last_seen_at: Option<String>,
    pub manual_status: Option<String>,
    pub manual_status_until: Option<String>,
    pub work_days: Option<String>,
    pub work_start: Option<String>,
    pub work_end: Option<String>,
    pub head_of_department_name: Option<String>,
    pub deputy_of_department_name: Option<String>,
    pub birth_date: Option<String>,
    pub is_partner: bool,
    pub partner_id: Option<String>,
    pub partner_name: Option<String>,
}

pub struct PartnerRecord {
    pub id: String,
    pub name: String,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
    pub created_at: String,
    pub account_count: i64,
}

pub struct ChatMessageRecord {
    pub id: String,
    pub channel: String,
    pub sender_id: String,
    pub sender_name: String,
    pub sender_avatar: Option<String>,
    pub content: String,
    pub attachment_data: Option<String>,
    pub attachment_name: Option<String>,
    pub reply_to_id: Option<String>,
    pub created_at: String,
    pub edited_at: Option<String>,
    pub is_deleted: bool,
}

pub struct DmChannelSummary {
    pub channel: String,
    pub other_employee_id: String,
    pub other_employee_name: String,
    pub other_employee_avatar: Option<String>,
    pub last_message: Option<String>,
    pub last_message_at: Option<String>,
}

pub struct PartnerChatSummary {
    pub partner_id: String,
    pub partner_name: String,
    pub last_message: Option<String>,
    pub last_message_at: Option<String>,
}

pub struct ChatGroupRecord {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub photo_data: Option<String>,
    pub department_id: Option<String>,
    pub invite_code: String,
    pub created_by: Option<String>,
    pub created_at: String,
    pub member_count: i64,
}

pub struct ChatGroupSummary {
    pub id: String,
    pub name: String,
    pub photo_data: Option<String>,
    pub member_count: i64,
    pub last_message: Option<String>,
    pub last_message_at: Option<String>,
}

pub struct SessionRecord {
    pub id: String,
    pub login_at: String,
    pub logout_at: Option<String>,
}

pub struct DepartmentRecord {
    pub id: String,
    pub name: String,
    pub head_employee_id: Option<String>,
    pub head_name: Option<String>,
    pub deputy_employee_id: Option<String>,
    pub deputy_name: Option<String>,
    pub member_count: i64,
}

pub struct NotificationRecord {
    pub id: String,
    pub employee_id: String,
    pub notification_type: String,
    pub title: String,
    pub body: Option<String>,
    pub related_entity_type: Option<String>,
    pub related_entity_id: Option<String>,
    pub is_read: bool,
    pub created_at: String,
}

pub struct EditRequestRecord {
    pub id: String,
    pub employee_id: String,
    pub employee_name: String,
    pub requested_full_name: Option<String>,
    pub requested_phone: Option<String>,
    pub note: Option<String>,
    pub status: String,
    pub created_at: String,
}

pub struct AbsenceRequestRecord {
    pub id: String,
    pub employee_id: String,
    pub employee_name: String,
    pub request_type: String,
    pub start_date: String,
    pub end_date: String,
    pub reason: Option<String>,
    // JSON-массив [{date, start, end}] — сколько угодно слотов отработки
    // (был один фиксированный слот, теперь можно добавлять несколько).
    pub makeup_slots: Option<String>,
    pub status: String,
    pub created_at: String,
    pub resolved_by: Option<String>,
    pub resolved_by_name: Option<String>,
    pub resolved_by_is_admin: bool,
    pub resolved_at: Option<String>,
}

pub struct ClientRecord {
    pub id: String,
    pub client_number: String,
    pub name: String,
    pub contact_person: Option<String>,
    pub contact_position: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
    pub created_at: String,
    pub partner_id: Option<String>,
    pub partner_name: Option<String>,
    pub deal_value: Option<String>,
    pub service_id: Option<String>,
    pub service_name: Option<String>,
    pub house_service_id: Option<String>,
    pub house_service_name: Option<String>,
    pub origin_partner_id: Option<String>,
    pub origin_partner_name: Option<String>,
}

pub struct ClientHistoryRecord {
    pub id: String,
    pub client_id: String,
    pub description: String,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
    pub created_at: String,
}

pub struct ProjectRecord {
    pub id: String,
    pub project_number: String,
    pub name: String,
    pub description: Option<String>,
    pub client_id: Option<String>,
    pub client_name: Option<String>,
    pub owner_id: String,
    pub owner_name: String,
    pub status: String,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub member_count: i64,
}

pub struct ProjectMemberRecord {
    pub employee_id: String,
    pub employee_name: String,
    pub role_in_project: String,
    pub is_owner: bool,
    pub added_at: String,
}

pub struct ProjectChatMessageRecord {
    pub id: String,
    pub project_id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub target_employee_id: String,
    pub target_name: String,
    pub content: String,
    pub attachment_data: Option<String>,
    pub attachment_name: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub created_at: String,
    pub reply_count: i64,
    pub edited_at: Option<String>,
    pub is_deleted: bool,
}

pub struct ProjectChatReplyRecord {
    pub id: String,
    pub message_id: String,
    pub author_id: String,
    pub author_name: String,
    pub content: String,
    pub created_at: String,
    pub edited_at: Option<String>,
    pub is_deleted: bool,
}

pub struct RegulationRecord {
    pub id: String,
    pub reg_number: String,
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub client_id: Option<String>,
    pub client_name: Option<String>,
    pub owner_id: String,
    pub owner_name: String,
    pub status: String,
    pub deadline: Option<String>,
    pub closed_at: Option<String>,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub member_count: i64,
    pub entry_count: i64,
}

pub struct RegulationMemberRecord {
    pub employee_id: String,
    pub employee_name: String,
    pub role_in_reg: String,
    pub added_at: String,
}

pub struct RegulationEntryRecord {
    pub id: String,
    pub regulation_id: String,
    pub author_id: String,
    pub author_name: String,
    pub target_employee_id: String,
    pub target_name: String,
    pub content: String,
    pub attachment_data: Option<String>,
    pub attachment_name: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub reply_count: i64,
    pub edited_at: Option<String>,
    pub is_deleted: bool,
}

pub struct MyTaskRecord {
    pub entry_id: String,
    pub regulation_id: String,
    pub reg_number: String,
    pub regulation_title: String,
    pub slug: String,
    pub content: String,
    pub deadline: Option<String>,
    pub created_at: String,
}

pub struct MyProjectTaskRecord {
    pub message_id: String,
    pub project_id: String,
    pub project_number: String,
    pub project_name: String,
    pub content: String,
    pub deadline: Option<String>,
    pub created_at: String,
}

pub struct RegulationReplyRecord {
    pub id: String,
    pub entry_id: String,
    pub author_id: String,
    pub author_name: String,
    pub content: String,
    pub created_at: String,
    pub edited_at: Option<String>,
    pub is_deleted: bool,
}

pub struct RegulationReminderRecord {
    pub id: String,
    pub regulation_id: String,
    pub entry_id: Option<String>,
    pub created_by: String,
    pub created_by_name: String,
    pub target_employee_id: String,
    pub target_name: String,
    pub remind_at: String,
    pub note: String,
    pub fired: bool,
    pub created_at: String,
}

// ---- Регламенты между админом и конкретным партнёром (v0.3.0) ----
// Плоский тред без regulation_members/target_employee_id — в отличие от
// обычных регламентов (компания-широкая multi-member модель), это ровно
// "любой аккаунт этого партнёра" + "любой админ", без под-тредов.
pub struct PartnerRegulationRecord {
    pub id: String,
    pub reg_number: String,
    pub partner_id: String,
    pub partner_name: String,
    pub client_id: Option<String>,
    pub client_name: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub deadline: Option<String>,
    pub closed_at: Option<String>,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub entry_count: i64,
    pub assistant_id: Option<String>,
    pub assistant_name: Option<String>,
}

// Каталог услуг партнёра (v0.4.0) — общий, редактируется и партнёром, и
// админом (гейт can_access_partner_org, как у партнёрских регламентов).
pub struct PartnerServiceRecord {
    pub id: String,
    pub partner_id: String,
    pub name: String,
    pub description: Option<String>,
    pub code: Option<String>,
    pub price: Option<String>,
    pub reward_percent: Option<String>,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// Общий каталог "Наши услуги" (v0.7.0) — без владельца-партнёра, один на всю
// CRM, ведёт только админ (см. list_house_services/create_house_service и
// т.д.). Выбирает партнёр при создании СВОЕГО клиента.
pub struct HouseServiceRecord {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub code: Option<String>,
    pub price: Option<String>,
    pub reward_percent: Option<String>,
    pub created_by: Option<String>,
    pub created_by_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct PartnerRegulationEntryRecord {
    pub id: String,
    pub partner_regulation_id: String,
    pub author_id: String,
    pub author_name: String,
    pub content: String,
    pub attachment_data: Option<String>,
    pub attachment_name: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
    pub reply_count: i64,
    pub edited_at: Option<String>,
    pub is_deleted: bool,
}

pub struct PartnerRegulationReplyRecord {
    pub id: String,
    pub entry_id: String,
    pub author_id: String,
    pub author_name: String,
    pub content: String,
    pub created_at: String,
    pub edited_at: Option<String>,
    pub is_deleted: bool,
}

pub struct PositionRecord {
    pub id: String,
    pub title: String,
}

pub struct BlogTopicRecord {
    pub id: String,
    pub category: String,
    pub title: String,
    pub content: Option<String>,
    pub created_by: String,
    pub created_by_name: String,
    pub pinned: bool,
    pub created_at: String,
    pub comment_count: i64,
    pub partner_audience: Option<String>,
}

pub struct BlogCommentRecord {
    pub id: String,
    pub topic_id: String,
    pub author_id: String,
    pub author_name: String,
    pub content: String,
    pub reply_to_id: Option<String>,
    pub created_at: String,
}

pub struct NotebookSettingsRecord {
    pub enabled: bool,
    pub name: Option<String>,
}

pub struct OnboardingStatusRecord {
    pub completed: bool,
}

pub struct NotebookNoteRecord {
    pub id: String,
    pub employee_id: String,
    pub title: String,
    pub content: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// SQLite не умеет "ADD COLUMN IF NOT EXISTS" — просто пробуем добавить
// колонку и молча игнорируем ошибку, если она уже есть (на свежей базе
// сработает сразу через CREATE TABLE, на старой — домигрирует один раз).
fn add_column_if_missing(conn: &Connection, table: &str, column_decl: &str) {
    let sql = format!("ALTER TABLE {table} ADD COLUMN {column_decl}");
    let _ = conn.execute(&sql, []);
}

impl Db {
    pub fn init(path: &Path) -> Self {
        let conn = Connection::open(path).expect("не удалось открыть sqlite базу");
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS employees (
                id TEXT PRIMARY KEY,
                employee_number TEXT UNIQUE NOT NULL,
                login TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                password_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
                full_name TEXT,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS positions (
                id TEXT PRIMARY KEY,
                title TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS departments (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                head_employee_id TEXT REFERENCES employees(id),
                deputy_employee_id TEXT REFERENCES employees(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                employee_id TEXT NOT NULL REFERENCES employees(id),
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT,
                related_entity_type TEXT,
                related_entity_id TEXT,
                is_read INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS edit_requests (
                id TEXT PRIMARY KEY,
                employee_id TEXT NOT NULL REFERENCES employees(id),
                requested_full_name TEXT,
                requested_phone TEXT,
                note TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                resolved_at TEXT,
                resolved_by TEXT
            );
            CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            );
            CREATE TABLE IF NOT EXISTS employee_sessions (
                id TEXT PRIMARY KEY,
                employee_id TEXT NOT NULL REFERENCES employees(id),
                login_at TEXT NOT NULL DEFAULT (datetime('now')),
                logout_at TEXT
            );
            CREATE TABLE IF NOT EXISTS absence_requests (
                id TEXT PRIMARY KEY,
                employee_id TEXT NOT NULL REFERENCES employees(id),
                type TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                reason TEXT,
                makeup_slots TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                resolved_at TEXT,
                resolved_by TEXT
            );
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                client_number TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                contact_person TEXT,
                contact_position TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                notes TEXT,
                created_by TEXT REFERENCES employees(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS client_history (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL REFERENCES clients(id),
                description TEXT NOT NULL,
                created_by TEXT REFERENCES employees(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                project_number TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                client_id TEXT REFERENCES clients(id),
                owner_id TEXT NOT NULL REFERENCES employees(id),
                status TEXT NOT NULL DEFAULT 'planning',
                created_by TEXT REFERENCES employees(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS project_members (
                project_id TEXT NOT NULL REFERENCES projects(id),
                employee_id TEXT NOT NULL REFERENCES employees(id),
                role_in_project TEXT NOT NULL DEFAULT 'member',
                added_by TEXT REFERENCES employees(id),
                added_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (project_id, employee_id)
            );
            CREATE TABLE IF NOT EXISTS project_ownership_transfers (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id),
                from_employee_id TEXT REFERENCES employees(id),
                to_employee_id TEXT NOT NULL REFERENCES employees(id),
                transferred_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS project_chat_messages (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id),
                sender_id TEXT NOT NULL REFERENCES employees(id),
                content TEXT NOT NULL,
                is_task INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS project_chat_replies (
                id TEXT PRIMARY KEY,
                message_id TEXT NOT NULL REFERENCES project_chat_messages(id),
                author_id TEXT NOT NULL REFERENCES employees(id),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS regulations (
                id TEXT PRIMARY KEY,
                reg_number TEXT UNIQUE NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                client_id TEXT REFERENCES clients(id),
                owner_id TEXT NOT NULL REFERENCES employees(id),
                status TEXT NOT NULL DEFAULT 'active',
                deadline TEXT,
                closed_at TEXT,
                created_by TEXT REFERENCES employees(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS regulation_members (
                regulation_id TEXT NOT NULL REFERENCES regulations(id),
                employee_id TEXT NOT NULL REFERENCES employees(id),
                role_in_reg TEXT NOT NULL DEFAULT 'member',
                added_by TEXT REFERENCES employees(id),
                added_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (regulation_id, employee_id)
            );
            CREATE TABLE IF NOT EXISTS regulation_entries (
                id TEXT PRIMARY KEY,
                regulation_id TEXT NOT NULL REFERENCES regulations(id),
                author_id TEXT NOT NULL REFERENCES employees(id),
                content TEXT NOT NULL,
                attachment_data TEXT,
                attachment_name TEXT,
                deadline TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS regulation_replies (
                id TEXT PRIMARY KEY,
                entry_id TEXT NOT NULL REFERENCES regulation_entries(id),
                author_id TEXT NOT NULL REFERENCES employees(id),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS regulation_reminders (
                id TEXT PRIMARY KEY,
                regulation_id TEXT NOT NULL REFERENCES regulations(id),
                entry_id TEXT REFERENCES regulation_entries(id),
                created_by TEXT NOT NULL REFERENCES employees(id),
                target_employee_id TEXT NOT NULL REFERENCES employees(id),
                remind_at TEXT NOT NULL,
                note TEXT NOT NULL,
                fired INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS blog_topics (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL DEFAULT 'discussion',
                title TEXT NOT NULL,
                content TEXT,
                created_by TEXT NOT NULL REFERENCES employees(id),
                pinned INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS blog_comments (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL REFERENCES blog_topics(id),
                author_id TEXT NOT NULL REFERENCES employees(id),
                content TEXT NOT NULL,
                reply_to_id TEXT REFERENCES blog_comments(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );",
        )
        .expect("не удалось инициализировать схему");

        // Миграция — добавляем таблицу напоминаний если её нет (для старых баз)
        let _ = conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS regulation_reminders (
                id TEXT PRIMARY KEY,
                regulation_id TEXT NOT NULL,
                entry_id TEXT,
                created_by TEXT NOT NULL,
                target_employee_id TEXT NOT NULL,
                remind_at TEXT NOT NULL,
                note TEXT NOT NULL,
                fired INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );"
        );

        // Регламенты между админом и конкретным партнёром (v0.3.0) — плоский
        // тред без members/target_employee_id, в отдельных таблицах, а не
        // добавлением partner_id в обычные regulations: у обычных регламентов
        // сегодня вообще нет проверки доступа на чтение (list_regulations и
        // т.п. открыты всем), ретрофитить туда приватность партнёра рискованно.
        let _ = conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS partner_regulations (
                id TEXT PRIMARY KEY,
                reg_number TEXT UNIQUE NOT NULL,
                partner_id TEXT NOT NULL REFERENCES partners(id),
                client_id TEXT REFERENCES clients(id),
                title TEXT NOT NULL,
                description TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                deadline TEXT,
                closed_at TEXT,
                created_by TEXT REFERENCES employees(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS partner_regulation_entries (
                id TEXT PRIMARY KEY,
                partner_regulation_id TEXT NOT NULL REFERENCES partner_regulations(id),
                author_id TEXT NOT NULL REFERENCES employees(id),
                content TEXT NOT NULL,
                attachment_data TEXT,
                attachment_name TEXT,
                deadline TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                edited_at TEXT,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS partner_regulation_replies (
                id TEXT PRIMARY KEY,
                entry_id TEXT NOT NULL REFERENCES partner_regulation_entries(id),
                author_id TEXT NOT NULL REFERENCES employees(id),
                content TEXT NOT NULL,
                edited_at TEXT,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_partner_regs_partner ON partner_regulations(partner_id);
            CREATE INDEX IF NOT EXISTS idx_partner_reg_entries_reg ON partner_regulation_entries(partner_regulation_id);
            CREATE INDEX IF NOT EXISTS idx_partner_reg_replies_entry ON partner_regulation_replies(entry_id);"
        );

        // Каталог услуг партнёра (v0.4.0) — общий, редактируемый и партнёром,
        // и админом (через can_access_partner_org, та же проверка, что у
        // партнёрских регламентов) — не только для чтения одной стороной.
        let _ = conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS partner_services (
                id TEXT PRIMARY KEY,
                partner_id TEXT NOT NULL REFERENCES partners(id),
                name TEXT NOT NULL,
                price TEXT,
                reward_percent TEXT,
                created_by TEXT REFERENCES employees(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_partner_services_partner ON partner_services(partner_id);"
        );

        // Общий каталог "Наши услуги" (v0.7.0) — в отличие от partner_services,
        // не привязан к партнёру: один каталог на всю CRM, ведёт только админ.
        // Выбирает партнёр при создании СВОЕГО клиента (см. clients.house_service_id).
        let _ = conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS house_services (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price TEXT,
                reward_percent TEXT,
                created_by TEXT REFERENCES employees(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );"
        );

        // Миграции для баз, созданных более ранними версиями.
        add_column_if_missing(&conn, "employees", "phone TEXT");
        add_column_if_missing(&conn, "employees", "position_id TEXT REFERENCES positions(id)");
        add_column_if_missing(&conn, "employees", "manager_id TEXT REFERENCES employees(id)");
        add_column_if_missing(&conn, "employees", "deputy_id TEXT REFERENCES employees(id)");
        add_column_if_missing(&conn, "employees", "department_id TEXT REFERENCES departments(id)");
        add_column_if_missing(&conn, "employees", "self_edit_until TEXT");
        // Фото сотрудника храним как base64 data URL прямо в SQLite (сжато на
        // фронтенде до разумного размера перед отправкой, см. src/lib/photo.ts) —
        // для локального офлайн-режима этого достаточно, без файлового хранилища.
        add_column_if_missing(&conn, "employees", "avatar_data TEXT");
        // Дата рождения — только день и месяц используются календарём ДР, год
        // тоже хранится (проще взять готовый <input type="date">, чем городить
        // отдельный день/месяц-пикер), но нигде не показывается в интерфейсе.
        add_column_if_missing(&conn, "employees", "birth_date TEXT");
        add_column_if_missing(&conn, "employees", "manual_status TEXT");
        add_column_if_missing(&conn, "employees", "manual_status_until TEXT");
        // Рабочий график: дни недели — строка вида "1,2,3,4,5" (1=Пн..7=Вс),
        // время — "HH:MM". Задаётся админом при добавлении/редактировании сотрудника.
        add_column_if_missing(&conn, "employees", "work_days TEXT");
        add_column_if_missing(&conn, "employees", "work_start TEXT");
        add_column_if_missing(&conn, "employees", "work_end TEXT");
        // Слоты отработки для "отгула с отработкой" — JSON-массив
        // [{date, start, end}, ...], произвольное количество (было 3 отдельные
        // колонки под ровно один слот — заменено одной JSON-колонкой).
        add_column_if_missing(&conn, "absence_requests", "makeup_slots TEXT");
        add_column_if_missing(&conn, "clients", "contact_person TEXT");
        add_column_if_missing(&conn, "clients", "contact_position TEXT");
        // NULL = клиент CRM; иначе — клиент партнёра (виден и в основной CRM
        // всем сотрудникам, и в панели именно этого партнёра), см. v0.3.0.
        add_column_if_missing(&conn, "clients", "partner_id TEXT REFERENCES partners(id)");
        add_column_if_missing(&conn, "clients", "deal_value TEXT");
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_clients_partner_id ON clients(partner_id)", []);
        // Услуга партнёра, привязанная к клиенту (v0.4.0) — при наличии
        // deal_value подставляется сервером из service.price, поле "Стоимость"
        // в форме заменяется выбором услуги (см. create_client/update_client).
        add_column_if_missing(&conn, "clients", "service_id TEXT REFERENCES partner_services(id)");
        // Услуга из общего каталога "Наши услуги" (v0.7.0) — выбирает партнёр
        // при создании СВОЕГО клиента (в отличие от service_id/partner_services,
        // который выбирает админ для клиента партнёра). Мутуально исключающе
        // с service_id — см. resolve_client_service_selection.
        add_column_if_missing(&conn, "clients", "house_service_id TEXT REFERENCES house_services(id)");
        // Партнёр-источник (v0.7.0) — проставляется один раз при переносе
        // клиента в общую базу CRM (move_client_to_crm_base), НЕ трогается
        // обычным update_client. Нужен для истории/отчётности после отвязки
        // partner_id (см. list_clients_for_partner_report).
        add_column_if_missing(&conn, "clients", "origin_partner_id TEXT REFERENCES partners(id)");
        let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_clients_origin_partner_id ON clients(origin_partner_id)", []);
        // "Помощник" по регламенту партнёра (v0.4.0) — админ, если создаёт
        // партнёр, или конкретный сотрудник этого партнёра, если создаёт админ.
        add_column_if_missing(&conn, "partner_regulations", "assistant_id TEXT REFERENCES employees(id)");
        add_column_if_missing(&conn, "partner_services", "description TEXT");
        // Код/артикул услуги (v1.4.0) — свободный текст, для сверки с
        // прайс-листом поставщика (например, код позиции 1С).
        add_column_if_missing(&conn, "partner_services", "code TEXT");
        add_column_if_missing(&conn, "house_services", "code TEXT");
        // NULL = тема видна только сотрудникам (как раньше); '*' = всем
        // партнёрам; иначе — id конкретного партнёра, см. v0.3.0.
        add_column_if_missing(&conn, "blog_topics", "partner_audience TEXT");
        add_column_if_missing(&conn, "departments", "deputy_employee_id TEXT REFERENCES employees(id)");
        // Запись регламента теперь принадлежит чьему-то персональному треду — по
        // умолчанию треду автора, а при передаче задачи коллеге переставляется на
        // получателя (см. assign_regulation_entry).
        add_column_if_missing(&conn, "regulation_entries", "target_employee_id TEXT REFERENCES employees(id)");
        let _ = conn.execute(
            "UPDATE regulation_entries SET target_employee_id = author_id WHERE target_employee_id IS NULL",
            [],
        );

        // Сообщение чата проекта тоже принадлежит чьему-то персональному треду —
        // та же модель, что и у записей регламента (см. выше).
        add_column_if_missing(&conn, "project_chat_messages", "target_employee_id TEXT REFERENCES employees(id)");
        add_column_if_missing(&conn, "project_chat_messages", "deadline TEXT");
        add_column_if_missing(&conn, "project_chat_messages", "attachment_data TEXT");
        add_column_if_missing(&conn, "project_chat_messages", "attachment_name TEXT");
        add_column_if_missing(&conn, "project_chat_messages", "status TEXT NOT NULL DEFAULT 'open'");
        let _ = conn.execute(
            "UPDATE project_chat_messages SET target_employee_id = sender_id WHERE target_employee_id IS NULL",
            [],
        );

        // Ретроактивно проставляем department_id всем руководителям подразделений,
        // у которых оно не заполнено (было сознательно не заполнено в ранних версиях,
        // теперь политика изменилась — руководитель тоже должен иметь department_id
        // для корректного отображения во всех карточках/кабинетах).
        let _ = conn.execute(
            "UPDATE employees SET department_id = (
                SELECT d.id FROM departments d WHERE d.head_employee_id = employees.id LIMIT 1
             ) WHERE department_id IS NULL AND EXISTS (
                SELECT 1 FROM departments d WHERE d.head_employee_id = employees.id
             )",
            [],
        );

        // Разовая (но безвредная при повторных запусках) ретроактивная чистка:
        // раньше уведомления по заявкам не помечались прочитанными при решении
        // (эта логика появилась только в v0.1.9, см. mark_notifications_for_entity_read).
        // Из-за этого в базах, созданных до этой версии, могли остаться "зависшие"
        // непрочитанные уведомления по заявкам, которые на самом деле уже давно
        // одобрены/отклонены. Чистим их сразу при старте, чтобы не тянуть старый
        // мусор — новые заявки и так будут чиститься автоматически по ходу дела.
        let _ = conn.execute(
            "UPDATE notifications SET is_read = 1
             WHERE related_entity_id IN (
                 SELECT id FROM edit_requests WHERE status != 'pending'
                 UNION
                 SELECT id FROM absence_requests WHERE status != 'pending'
             )",
            [],
        );

        // Партнёры — организации-партнёры компании. Отдельная лёгкая таблица
        // (просто название + кто создал), по аналогии с department/position, а
        // не полноценная сущность с собственными полями — тех пока не требуется.
        // Аккаунты партнёров — это ОБЫЧНЫЕ записи employees с флагом is_partner
        // и ссылкой на partner_id, а не отдельная таблица: так переиспользуется
        // весь существующий механизм логина/пароля/сессий без дублирования.
        let _ = conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS partners (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_by TEXT REFERENCES employees(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );",
        );
        add_column_if_missing(&conn, "employees", "is_partner INTEGER NOT NULL DEFAULT 0");
        add_column_if_missing(&conn, "employees", "partner_id TEXT REFERENCES partners(id)");

        // Привязка Telegram-аккаунта (v0.5.3) — одна строка employees = один
        // логин (штатный или партнёрский), значит один Telegram-чат и один
        // активный одноразовый код одновременно; отдельная таблица не нужна.
        add_column_if_missing(&conn, "employees", "telegram_chat_id TEXT");
        add_column_if_missing(&conn, "employees", "telegram_link_code TEXT");
        add_column_if_missing(&conn, "employees", "telegram_link_code_expires_at TEXT");

        // Чат — "channel" хранит либо литерал 'general' (общий чат всех не-партнёров),
        // либо id из таблицы partners (приватный тред с этим партнёром, доступен только
        // админам и аккаунтам этого партнёра — см. Db::can_access_chat_channel). Ответ на
        // конкретное сообщение — self-referencing reply_to_id, тот же паттерн, что
        // blog_comments.reply_to_id — без денормализации текста цитаты: весь канал
        // грузится целиком за раз, фронт сам находит цитируемое сообщение в уже
        // загруженном списке (как Blog.tsx делает для комментариев).
        let _ = conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                channel TEXT NOT NULL,
                sender_id TEXT NOT NULL REFERENCES employees(id),
                content TEXT NOT NULL,
                attachment_data TEXT,
                attachment_name TEXT,
                reply_to_id TEXT REFERENCES chat_messages(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel, created_at);",
        );

        // Редактирование/удаление своего сообщения/записи/ответа — своя же (не
        // админ/владелец) правка текста и мягкое удаление (is_deleted, содержимое
        // физически не стирается — аудит; но map_*_row ниже подменяет content/
        // attachment_* на пустые при отдаче наружу, если is_deleted). Единый
        // паттерн на 5 таблиц.
        for table in [
            "chat_messages",
            "regulation_entries",
            "regulation_replies",
            "project_chat_messages",
            "project_chat_replies",
        ] {
            add_column_if_missing(&conn, table, "edited_at TEXT");
            add_column_if_missing(&conn, table, "is_deleted INTEGER NOT NULL DEFAULT 0");
        }

        // Группы чата — четвёртый вид канала, 'group:<id>' (см. Db::can_access_chat_channel).
        // В отличие от 'general'/'dm:'/партнёрского канала у группы есть метаданные
        // (название/описание/фото/кто состоит) — нужна собственная таблица + таблица
        // участников. invite_code — короткий код для вступления по приглашению (не
        // URL со своей схемой — регистрировать кастомный протокол в NSIS ради этого
        // не нужно, код просто передаётся словами/через общий чат).
        let _ = conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS chat_groups (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                photo_data TEXT,
                department_id TEXT REFERENCES departments(id),
                invite_code TEXT NOT NULL UNIQUE,
                created_by TEXT REFERENCES employees(id),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS chat_group_members (
                group_id TEXT NOT NULL REFERENCES chat_groups(id),
                employee_id TEXT NOT NULL REFERENCES employees(id),
                joined_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (group_id, employee_id)
            );",
        );

        // Личная записная книжка сотрудника/партнёра (v0.6.0) — каждый
        // employees-аккаунт может включить себе персональный блокнот для
        // заметок/паролей. Явно БЕЗ пароля на сам блокнот (обсуждалось и
        // отклонено пользователем) — доступ гейтится только тем же логином/
        // сессией CRM, как и весь остальной личный кабинет. enabled/name —
        // 1:1 с сотрудником, поэтому колонки прямо на employees (как
        // is_partner/telegram_chat_id), а не в app_meta (та — для глобальных
        // настроек приложения, не персональных).
        add_column_if_missing(&conn, "employees", "notebook_enabled INTEGER NOT NULL DEFAULT 0");
        add_column_if_missing(&conn, "employees", "notebook_name TEXT");

        // Интерактивный обучающий тур (v1.2.0) — показывается один раз при
        // первом входе нового сотрудника/партнёра. DEFAULT 1 ("уже пройден")
        // — намеренно НЕ 0: ALTER TABLE ADD COLUMN бэкфиллит ВСЕХ уже
        // существующих сотрудников одним значением, отличить "существовал до
        // апдейта" от "никогда не логинился" через голый backfill нельзя. Раз
        // тур сильнее раздражает тех, кто уже знает интерфейс, чем помогает —
        // грандфазерим существующих сотрудников в "пройден" значением по
        // умолчанию колонки. Новые сотрудники получают onboarding_completed=0
        // явно в самом INSERT (см. create_employee/create_admin) —
        // единственное сознательное отличие от паттерна notebook_enabled
        // выше, который просто опускает колонку из INSERT и полагается на
        // DEFAULT.
        add_column_if_missing(&conn, "employees", "onboarding_completed INTEGER NOT NULL DEFAULT 1");

        // Заметки — отдельная таблица (много строк на одного сотрудника), тот
        // же паттерн, что notifications/absence_requests: employee_id FK +
        // обычный CRUD. Без is_deleted/edited_at (в отличие от
        // chat_messages/regulation_entries) — это не общий тред с несколькими
        // читателями, которым нужен аудит правок, а единоличная сущность
        // одного пользователя, поэтому DELETE — настоящий.
        let _ = conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS notebook_notes (
                id TEXT PRIMARY KEY,
                employee_id TEXT NOT NULL REFERENCES employees(id),
                title TEXT NOT NULL,
                content TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_notebook_notes_employee ON notebook_notes(employee_id);",
        );

        let db = Db { conn, typing: Mutex::new(HashMap::new()) };
        db.notify_todays_birthdays();
        db
    }

    // Поздравления для уведомлений о дне рождения — выбираются детерминированно
    // по имени именинника (без crate rand), просто чтобы текст не повторялся
    // один в один каждый раз у разных людей.
    const BIRTHDAY_CONGRATS: [&'static str; 5] = [
        "Пусть этот год принесёт много ярких моментов, успехов в делах и тепла в кругу близких!",
        "Желаем крепкого здоровья, вдохновения и удачи во всех начинаниях!",
        "Пусть каждый день радует новыми победами и приятными сюрпризами!",
        "Счастья, благополучия и исполнения самых заветных желаний!",
        "Пусть команда всегда будет рядом, а успех сопутствует во всём!",
    ];

    // Раз в день (по факту — раз при первом запуске приложения в этот день)
    // уведомляем всех сотрудников о том, у кого сегодня день рождения. Дата
    // хранится как полный YYYY-MM-DD (из <input type="date">), но сравниваем
    // только день и месяц — год рождения тут не участвует.
    fn notify_todays_birthdays(&self) {
        let today: String = self.conn.query_row("SELECT date('now')", [], |row| row.get(0)).unwrap_or_default();
        let last_notified: Option<String> = self.conn
            .query_row("SELECT value FROM app_meta WHERE key = 'last_birthday_notify_date'", [], |row| row.get(0))
            .ok();
        if last_notified.as_deref() == Some(today.as_str()) {
            return;
        }

        let birthday_people: Vec<(String, String)> = {
            let mut stmt = match self.conn.prepare(
                "SELECT id, full_name FROM employees
                 WHERE birth_date IS NOT NULL AND strftime('%m-%d', birth_date) = strftime('%m-%d', 'now')",
            ) {
                Ok(s) => s,
                Err(_) => return,
            };
            stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
                .map(|rows| rows.filter_map(|r| r.ok()).collect())
                .unwrap_or_default()
        };

        if !birthday_people.is_empty() {
            let all_employee_ids: Vec<String> = {
                let mut stmt = match self.conn.prepare("SELECT id FROM employees") {
                    Ok(s) => s,
                    Err(_) => return,
                };
                stmt.query_map([], |row| row.get::<_, String>(0))
                    .map(|rows| rows.filter_map(|r| r.ok()).collect())
                    .unwrap_or_default()
            };

            for (index, (birthday_employee_id, birthday_name)) in birthday_people.iter().enumerate() {
                let title = format!("Сегодня день рождения у {}! 🎉", birthday_name);
                let body = Self::BIRTHDAY_CONGRATS[index % Self::BIRTHDAY_CONGRATS.len()];
                for employee_id in &all_employee_ids {
                    if employee_id == birthday_employee_id {
                        continue;
                    }
                    self.notify(employee_id, "birthday", &title, Some(body), Some("employee"), Some(birthday_employee_id));
                }
            }
        }

        let _ = self.conn.execute(
            "INSERT INTO app_meta (key, value) VALUES ('last_birthday_notify_date', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![today],
        );
    }

    pub fn has_admin(&self) -> bool {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM employees WHERE is_admin = 1", [], |row| row.get(0))
            .unwrap_or(0);
        count > 0
    }

    fn next_employee_number(&self) -> String {
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM employees", [], |row| row.get(0))
            .unwrap_or(0);
        format!("EMP-{:05}", count + 1)
    }

    pub fn is_admin(&self, employee_id: &str) -> bool {
        self.conn
            .query_row(
                "SELECT is_admin FROM employees WHERE id = ?1",
                params![employee_id],
                |row| row.get::<_, i64>(0),
            )
            .map(|v| v != 0)
            .unwrap_or(false)
    }

    const EMPLOYEE_SELECT: &'static str = "SELECT
            e.id, e.employee_number, e.login, e.full_name, e.is_admin, e.phone,
            e.position_id, p.title,
            e.manager_id, m.full_name,
            e.deputy_id, d.full_name,
            e.department_id, dep.name,
            e.self_edit_until,
            EXISTS(SELECT 1 FROM edit_requests er WHERE er.employee_id = e.id AND er.status = 'pending'),
            e.avatar_data,
            e.created_at,
            EXISTS(SELECT 1 FROM employee_sessions s WHERE s.employee_id = e.id AND s.logout_at IS NULL),
            (SELECT MAX(COALESCE(s.logout_at, s.login_at)) FROM employee_sessions s WHERE s.employee_id = e.id),
            e.manual_status, e.manual_status_until,
            e.work_days, e.work_start, e.work_end,
            (SELECT hd.name FROM departments hd WHERE hd.head_employee_id = e.id LIMIT 1),
            (SELECT dd.name FROM departments dd WHERE dd.deputy_employee_id = e.id LIMIT 1),
            e.birth_date,
            e.is_partner, e.partner_id, pr.name
        FROM employees e
        LEFT JOIN positions p ON p.id = e.position_id
        LEFT JOIN employees m ON m.id = e.manager_id
        LEFT JOIN employees d ON d.id = e.deputy_id
        LEFT JOIN departments dep ON dep.id = e.department_id
        LEFT JOIN partners pr ON pr.id = e.partner_id";

    fn map_employee_row(row: &rusqlite::Row) -> rusqlite::Result<EmployeeRecord> {
        Ok(EmployeeRecord {
            id: row.get(0)?,
            employee_number: row.get(1)?,
            login: row.get(2)?,
            full_name: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
            is_admin: row.get::<_, i64>(4)? != 0,
            phone: row.get(5)?,
            position_id: row.get(6)?,
            position_title: row.get(7)?,
            manager_id: row.get(8)?,
            manager_name: row.get(9)?,
            deputy_id: row.get(10)?,
            deputy_name: row.get(11)?,
            department_id: row.get(12)?,
            department_name: row.get(13)?,
            self_edit_until: row.get(14)?,
            has_pending_edit_request: row.get::<_, i64>(15)? != 0,
            avatar_data: row.get(16)?,
            created_at: row.get(17)?,
            is_online: row.get::<_, i64>(18)? != 0,
            last_seen_at: row.get(19)?,
            manual_status: row.get(20)?,
            manual_status_until: row.get(21)?,
            work_days: row.get(22)?,
            work_start: row.get(23)?,
            work_end: row.get(24)?,
            head_of_department_name: row.get(25)?,
            deputy_of_department_name: row.get(26)?,
            birth_date: row.get(27)?,
            is_partner: row.get::<_, i64>(28)? != 0,
            partner_id: row.get(29)?,
            partner_name: row.get(30)?,
        })
    }

    pub fn create_admin(&self, login: &str, password: &str, full_name: &str) -> Result<EmployeeRecord, String> {
        if self.has_admin() {
            return Err("Администратор уже создан".into());
        }
        let id = Uuid::new_v4().to_string();
        let password_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
        let employee_number = self.next_employee_number();

        self.conn
            .execute(
                "INSERT INTO employees (id, employee_number, login, password_hash, full_name, is_admin, onboarding_completed)
                 VALUES (?1, ?2, ?3, ?4, ?5, 1, 0)",
                params![id, employee_number, login, password_hash, full_name],
            )
            .map_err(|e| e.to_string())?;

        self.get_employee(&id).ok_or_else(|| "Не удалось создать администратора".to_string())
    }

    pub fn verify_login(&self, login: &str, password: &str) -> Result<EmployeeRecord, String> {
        let password_hash: Result<String, _> = self.conn.query_row(
            "SELECT password_hash FROM employees WHERE login = ?1",
            params![login],
            |row| row.get(0),
        );

        let password_hash = password_hash.map_err(|_| "Неверный логин или пароль".to_string())?;
        let valid = bcrypt::verify(password, &password_hash).unwrap_or(false);
        if !valid {
            return Err("Неверный логин или пароль".into());
        }

        let id: String = self
            .conn
            .query_row("SELECT id FROM employees WHERE login = ?1", params![login], |row| row.get(0))
            .map_err(|_| "Неверный логин или пароль".to_string())?;

        self.get_employee(&id).ok_or_else(|| "Неверный логин или пароль".to_string())
    }

    pub fn change_password(&self, employee_id: &str, current_password: &str, new_password: &str) -> Result<(), String> {
        let password_hash: String = self
            .conn
            .query_row(
                "SELECT password_hash FROM employees WHERE id = ?1",
                params![employee_id],
                |row| row.get(0),
            )
            .map_err(|_| "Сотрудник не найден".to_string())?;

        let valid = bcrypt::verify(current_password, &password_hash).unwrap_or(false);
        if !valid {
            return Err("Текущий пароль указан неверно".into());
        }
        if new_password.len() < 6 {
            return Err("Новый пароль должен быть не короче 6 символов".into());
        }

        let new_hash = bcrypt::hash(new_password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;

        self.conn
            .execute(
                "UPDATE employees SET password_hash = ?1, password_changed_at = datetime('now')
                 WHERE id = ?2",
                params![new_hash, employee_id],
            )
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn get_employee(&self, id: &str) -> Option<EmployeeRecord> {
        let sql = format!("{} WHERE e.id = ?1", Self::EMPLOYEE_SELECT);
        self.conn.query_row(&sql, params![id], Self::map_employee_row).ok()
    }

    pub fn list_employees(&self) -> Vec<EmployeeRecord> {
        let sql = format!("{} ORDER BY e.created_at ASC", Self::EMPLOYEE_SELECT);
        let mut stmt = self.conn.prepare(&sql).expect("не удалось подготовить запрос");
        let rows = stmt.query_map([], Self::map_employee_row).expect("не удалось выполнить запрос");
        rows.filter_map(|r| r.ok()).collect()
    }

    // Узкие списки для панели партнёра (v0.4.0) — вместо list_employees (без
    // ACL вообще, отдаёт весь список сотрудников компании), чтобы партнёр не
    // мог через прямой вызов API увидеть чужой ростер.
    pub fn list_admin_employees(&self) -> Vec<EmployeeRecord> {
        let sql = format!("{} WHERE e.is_admin = 1 ORDER BY e.full_name ASC", Self::EMPLOYEE_SELECT);
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map([], Self::map_employee_row)
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default()
    }

    pub fn list_partner_org_employees(&self, actor_id: &str, partner_id: &str) -> Result<Vec<EmployeeRecord>, String> {
        self.can_access_partner_org(actor_id, partner_id)?;
        let sql = format!("{} WHERE e.partner_id = ?1 ORDER BY e.full_name ASC", Self::EMPLOYEE_SELECT);
        let mut stmt = self.conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![partner_id], Self::map_employee_row).map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    // Если явный руководитель не выбран, но сотрудник привязан к подразделению —
    // автоматически берём в руководители главу этого подразделения (см. TZ).
    fn resolve_manager(&self, manager_id: Option<&str>, department_id: Option<&str>) -> Result<Option<String>, String> {
        if let Some(m) = manager_id {
            return Ok(Some(m.to_string()));
        }
        if let Some(dep_id) = department_id {
            let head: Option<String> = self
                .conn
                .query_row(
                    "SELECT head_employee_id FROM departments WHERE id = ?1",
                    params![dep_id],
                    |row| row.get(0),
                )
                .ok()
                .flatten();
            return Ok(head);
        }
        Ok(None)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_employee(
        &self,
        admin_id: &str,
        login: &str,
        password: &str,
        full_name: &str,
        phone: Option<&str>,
        position_id: Option<&str>,
        manager_id: Option<&str>,
        deputy_id: Option<&str>,
        department_id: Option<&str>,
        avatar_data: Option<&str>,
        birth_date: Option<&str>,
        is_partner: bool,
        partner_id: Option<&str>,
    ) -> Result<EmployeeRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав для добавления сотрудников".into());
        }
        if password.len() < 6 {
            return Err("Пароль должен быть не короче 6 символов".into());
        }
        if is_partner && partner_id.is_none() {
            return Err("Выберите партнёра для этого аккаунта".into());
        }

        let resolved_manager_id = self.resolve_manager(manager_id, department_id)?;

        let id = Uuid::new_v4().to_string();
        let password_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
        let employee_number = self.next_employee_number();

        self.conn
            .execute(
                "INSERT INTO employees (id, employee_number, login, password_hash, full_name, is_admin, phone, position_id, manager_id, deputy_id, department_id, avatar_data, birth_date, is_partner, partner_id, onboarding_completed)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, 0)",
                params![id, employee_number, login, password_hash, full_name, phone, position_id, resolved_manager_id, deputy_id, department_id, avatar_data, birth_date, is_partner, partner_id],
            )
            .map_err(|e| {
                if e.to_string().contains("UNIQUE") {
                    "Такой логин уже занят".to_string()
                } else {
                    e.to_string()
                }
            })?;

        self.get_employee(&id).ok_or_else(|| "Не удалось создать сотрудника".to_string())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn update_employee(
        &self,
        admin_id: &str,
        employee_id: &str,
        full_name: &str,
        phone: Option<&str>,
        position_id: Option<&str>,
        manager_id: Option<&str>,
        deputy_id: Option<&str>,
        department_id: Option<&str>,
        avatar_data: Option<&str>,
        birth_date: Option<&str>,
    ) -> Result<EmployeeRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав для редактирования сотрудников".into());
        }
        if manager_id == Some(employee_id) || deputy_id == Some(employee_id) {
            return Err("Сотрудник не может быть руководителем или заместителем самого себя".into());
        }

        let resolved_manager_id = self.resolve_manager(manager_id, department_id)?;

        self.conn
            .execute(
                "UPDATE employees SET full_name = ?1, phone = ?2, position_id = ?3, manager_id = ?4, deputy_id = ?5, department_id = ?6, avatar_data = ?7, birth_date = ?8
                 WHERE id = ?9",
                params![full_name, phone, position_id, resolved_manager_id, deputy_id, department_id, avatar_data, birth_date, employee_id],
            )
            .map_err(|e| e.to_string())?;

        self.get_employee(employee_id).ok_or_else(|| "Сотрудник не найден".to_string())
    }

    // ---- Рабочий график сотрудника ----
    // work_days — строка вида "1,2,3,4,5" (1=Пн..7=Вс), пустая строка/NULL — не задано.
    pub fn set_employee_schedule(
        &self,
        admin_id: &str,
        employee_id: &str,
        work_days: Option<&str>,
        work_start: Option<&str>,
        work_end: Option<&str>,
    ) -> Result<EmployeeRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав для настройки графика".into());
        }
        self.conn
            .execute(
                "UPDATE employees SET work_days = ?1, work_start = ?2, work_end = ?3 WHERE id = ?4",
                params![work_days, work_start, work_end, employee_id],
            )
            .map_err(|e| e.to_string())?;

        self.get_employee(employee_id).ok_or_else(|| "Сотрудник не найден".to_string())
    }

    pub fn list_positions(&self) -> Vec<PositionRecord> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, title FROM positions ORDER BY title ASC")
            .expect("не удалось подготовить запрос");
        let rows = stmt
            .query_map([], |row| {
                Ok(PositionRecord { id: row.get(0)?, title: row.get(1)? })
            })
            .expect("не удалось выполнить запрос");
        rows.filter_map(|r| r.ok()).collect()
    }

    pub fn create_position(&self, title: &str) -> Result<PositionRecord, String> {
        let title = title.trim();
        if title.is_empty() {
            return Err("Название должности не может быть пустым".into());
        }
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute("INSERT INTO positions (id, title) VALUES (?1, ?2)", params![id, title])
            .map_err(|e| {
                if e.to_string().contains("UNIQUE") {
                    "Такая должность уже есть".to_string()
                } else {
                    e.to_string()
                }
            })?;
        Ok(PositionRecord { id, title: title.to_string() })
    }

    // ---- Партнёры (см. §"Партнёры" — организации-партнёры компании) ----
    pub fn list_partners(&self) -> Vec<PartnerRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT pr.id, pr.name, pr.created_by, e.full_name, pr.created_at,
                    (SELECT COUNT(*) FROM employees acc WHERE acc.partner_id = pr.id)
             FROM partners pr
             LEFT JOIN employees e ON e.id = pr.created_by
             ORDER BY pr.name ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map([], |row| {
            Ok(PartnerRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                created_by: row.get(2)?,
                created_by_name: row.get(3)?,
                created_at: row.get(4)?,
                account_count: row.get(5)?,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    // Для Telegram-уведомления партнёру (v0.5.3) — только имя, без полного PartnerRecord.
    pub fn get_partner_name(&self, partner_id: &str) -> Option<String> {
        self.conn.query_row("SELECT name FROM partners WHERE id = ?1", params![partner_id], |row| row.get(0)).ok()
    }

    pub fn create_partner(&self, admin_id: &str, name: &str) -> Result<PartnerRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        let name = name.trim();
        if name.is_empty() {
            return Err("Укажите название партнёра".into());
        }
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO partners (id, name, created_by) VALUES (?1, ?2, ?3)",
                params![id, name, admin_id],
            )
            .map_err(|e| e.to_string())?;
        self.list_partners()
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| "Не удалось создать партнёра".to_string())
    }

    pub fn rename_partner(&self, admin_id: &str, id: &str, name: &str) -> Result<PartnerRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        let name = name.trim();
        if name.is_empty() {
            return Err("Укажите название партнёра".into());
        }
        self.conn
            .execute("UPDATE partners SET name = ?1 WHERE id = ?2", params![name, id])
            .map_err(|e| e.to_string())?;
        self.list_partners()
            .into_iter()
            .find(|p| p.id == id)
            .ok_or_else(|| "Партнёр не найден".to_string())
    }

    // Для аккаунтов партнёров — у них нет самостоятельного доступа к
    // "Сменить пароль" (обычно логинятся редко, забывают пароль чаще), поэтому
    // админ может назначить новый пароль напрямую, без знания текущего (в
    // отличие от change_password выше, которое требует ввести старый пароль).
    pub fn admin_reset_password(&self, admin_id: &str, employee_id: &str, new_password: &str) -> Result<(), String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        if new_password.len() < 6 {
            return Err("Новый пароль должен быть не короче 6 символов".into());
        }
        let new_hash = bcrypt::hash(new_password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
        self.conn
            .execute(
                "UPDATE employees SET password_hash = ?1, password_changed_at = datetime('now') WHERE id = ?2",
                params![new_hash, employee_id],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_partner(&self, admin_id: &str, id: &str) -> Result<(), String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        let in_use: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM employees WHERE partner_id = ?1", params![id], |row| row.get(0))
            .unwrap_or(0);
        if in_use > 0 {
            return Err("У этого партнёра ещё есть аккаунты — сначала удалите или перепривяжите их".into());
        }
        self.conn.execute("DELETE FROM partners WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // ---- Чат ----
    // Четыре вида каналов: 'general' (общий чат всех не-партнёров), 'dm:<id1>:<id2>'
    // (личка между двумя сотрудниками CRM — не партнёрами), 'group:<id>' (группа —
    // см. секцию "Группы чата" ниже) и id из partners (приватный тред CRM с
    // конкретным партнёром — переписываться с партнёром может только админ;
    // аккаунты самого партнёра видят свой канал).

    // Канал 'dm:<id1>:<id2>' — id отсортированы, собирается на фронтенде
    // (src/lib/chat.ts::dmChannelId) одинаково независимо от того, кто из
    // двух сотрудников его вычисляет; здесь только парсится, не строится.
    fn can_access_chat_channel(&self, employee_id: &str, channel: &str) -> Result<EmployeeRecord, String> {
        let employee = self.get_employee(employee_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        if channel == "general" {
            if employee.is_partner {
                return Err("Партнёрам недоступен общий чат".into());
            }
            return Ok(employee);
        }
        if let Some(rest) = channel.strip_prefix("dm:") {
            if employee.is_partner {
                return Err("Партнёрам недоступна личная переписка".into());
            }
            let parts: Vec<&str> = rest.split(':').collect();
            if parts.len() != 2 {
                return Err("Некорректный канал".into());
            }
            if parts[0] != employee_id && parts[1] != employee_id {
                return Err("Недостаточно прав".into());
            }
            for pid in &parts {
                let ok: bool = self
                    .conn
                    .query_row("SELECT 1 FROM employees WHERE id = ?1 AND is_partner = 0", params![pid], |_| Ok(true))
                    .unwrap_or(false);
                if !ok {
                    return Err("Собеседник не найден".into());
                }
            }
            return Ok(employee);
        }
        if let Some(group_id) = channel.strip_prefix("group:") {
            if employee.is_partner {
                return Err("Партнёрам недоступны группы".into());
            }
            let is_member: bool = self
                .conn
                .query_row(
                    "SELECT 1 FROM chat_group_members WHERE group_id = ?1 AND employee_id = ?2",
                    params![group_id, employee_id],
                    |_| Ok(true),
                )
                .unwrap_or(false);
            if !is_member {
                return Err("Недостаточно прав".into());
            }
            return Ok(employee);
        }
        let partner_exists: bool = self
            .conn
            .query_row("SELECT 1 FROM partners WHERE id = ?1", params![channel], |_| Ok(true))
            .unwrap_or(false);
        if !partner_exists {
            return Err("Партнёр не найден".into());
        }
        if employee.is_partner {
            if employee.partner_id.as_deref() != Some(channel) {
                return Err("Недостаточно прав".into());
            }
        } else if !employee.is_admin {
            return Err("Недостаточно прав".into());
        }
        Ok(employee)
    }

    pub fn list_chat_messages(&self, employee_id: &str, channel: &str) -> Result<Vec<ChatMessageRecord>, String> {
        self.can_access_chat_channel(employee_id, channel)?;
        let mut stmt = self
            .conn
            .prepare(
                "SELECT m.id, m.channel, m.sender_id, e.full_name, e.avatar_data, m.content, m.attachment_data,
                        m.attachment_name, m.reply_to_id, m.created_at, m.edited_at, m.is_deleted
                 FROM chat_messages m JOIN employees e ON e.id = m.sender_id
                 WHERE m.channel = ?1 ORDER BY m.created_at ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![channel], |row| {
                let is_deleted: bool = row.get(11)?;
                Ok(ChatMessageRecord {
                    id: row.get(0)?,
                    channel: row.get(1)?,
                    sender_id: row.get(2)?,
                    sender_name: row.get(3)?,
                    sender_avatar: row.get(4)?,
                    content: if is_deleted { String::new() } else { row.get(5)? },
                    attachment_data: if is_deleted { None } else { row.get(6)? },
                    attachment_name: if is_deleted { None } else { row.get(7)? },
                    reply_to_id: row.get(8)?,
                    created_at: row.get(9)?,
                    edited_at: row.get(10)?,
                    is_deleted,
                })
            })
            .map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    // "Печатает…" (v1.4.0) — ping ставит метку "я печатаю" на 5 секунд
    // вперёд, is_other_typing спрашивает "печатает ли СЕЙЧАС кто-то другой
    // (не сам actor) в этом канале". Best-effort: если composer не успел
    // пингануть перед закрытием — метка просто истечёт сама по себе, никакого
    // "отписаться" не нужно.
    const TYPING_TTL: Duration = Duration::from_secs(5);

    pub fn ping_typing(&self, actor_id: &str, channel: &str) -> Result<(), String> {
        self.can_access_chat_channel(actor_id, channel)?;
        let mut map = self.typing.lock().unwrap();
        map.insert(channel.to_string(), (actor_id.to_string(), Instant::now() + Self::TYPING_TTL));
        Ok(())
    }

    pub fn is_other_typing(&self, actor_id: &str, channel: &str) -> Result<bool, String> {
        self.can_access_chat_channel(actor_id, channel)?;
        let map = self.typing.lock().unwrap();
        Ok(match map.get(channel) {
            Some((typer_id, expires_at)) => typer_id != actor_id && Instant::now() < *expires_at,
            None => false,
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub fn send_chat_message(
        &self,
        actor_id: &str,
        channel: &str,
        content: &str,
        attachment_data: Option<&str>,
        attachment_name: Option<&str>,
        reply_to_id: Option<&str>,
    ) -> Result<ChatMessageRecord, String> {
        let sender = self.can_access_chat_channel(actor_id, channel)?;
        let content = content.trim();
        if content.is_empty() {
            return Err("Сообщение не может быть пустым".into());
        }
        if let Some(reply_id) = reply_to_id {
            let reply_channel: Option<String> = self
                .conn
                .query_row("SELECT channel FROM chat_messages WHERE id = ?1", params![reply_id], |row| row.get(0))
                .ok();
            if reply_channel.as_deref() != Some(channel) {
                return Err("Сообщение, на которое отвечаете, не найдено".into());
            }
        }
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO chat_messages (id, channel, sender_id, content, attachment_data, attachment_name, reply_to_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, channel, actor_id, content, attachment_data, attachment_name, reply_to_id],
            )
            .map_err(|e| e.to_string())?;

        self.notify_chat_message(channel, actor_id, &sender, content);

        Ok(ChatMessageRecord {
            id,
            channel: channel.to_string(),
            sender_id: actor_id.to_string(),
            sender_name: sender.full_name,
            sender_avatar: sender.avatar_data,
            content: content.to_string(),
            attachment_data: attachment_data.map(str::to_string),
            attachment_name: attachment_name.map(str::to_string),
            reply_to_id: reply_to_id.map(str::to_string),
            created_at: String::new(),
            edited_at: None,
            is_deleted: false,
        })
    }

    // Редактирование/удаление своего сообщения чата — только отправитель, без
    // ограничения по времени; правит только текст (вложение/канал не трогаем).
    pub fn edit_chat_message(&self, actor_id: &str, message_id: &str, content: &str) -> Result<ChatMessageRecord, String> {
        let (sender_id, channel, is_deleted): (String, String, bool) = self
            .conn
            .query_row(
                "SELECT sender_id, channel, is_deleted FROM chat_messages WHERE id = ?1",
                params![message_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "Сообщение не найдено".to_string())?;
        if sender_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        if is_deleted {
            return Err("Сообщение удалено".into());
        }
        let content = content.trim();
        if content.is_empty() {
            return Err("Сообщение не может быть пустым".into());
        }
        self.conn
            .execute(
                "UPDATE chat_messages SET content = ?1, edited_at = datetime('now') WHERE id = ?2",
                params![content, message_id],
            )
            .map_err(|e| e.to_string())?;
        self.list_chat_messages(actor_id, &channel)?
            .into_iter()
            .find(|m| m.id == message_id)
            .ok_or_else(|| "Сообщение не найдено".to_string())
    }

    pub fn delete_chat_message(&self, actor_id: &str, message_id: &str) -> Result<(), String> {
        let sender_id: String = self
            .conn
            .query_row("SELECT sender_id FROM chat_messages WHERE id = ?1", params![message_id], |row| row.get(0))
            .map_err(|_| "Сообщение не найдено".to_string())?;
        if sender_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn
            .execute("UPDATE chat_messages SET is_deleted = 1 WHERE id = ?1", params![message_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Получатели уведомления зависят от канала и от того, кто пишет:
    // в общем чате — все остальные сотрудники (не партнёры); в партнёрском
    // канале — если пишет сам партнёр, уведомляем всех админов (переиспользуем
    // notify_all_admins), если пишет админ — уведомляем аккаунты этого партнёра.
    fn notify_chat_message(&self, channel: &str, sender_id: &str, sender: &EmployeeRecord, content: &str) {
        let title = format!("Новое сообщение в чате от {}", sender.full_name);
        if let Some(rest) = channel.strip_prefix("dm:") {
            if let Some((a, b)) = rest.split_once(':') {
                let other = if a == sender_id { b } else { a };
                self.notify(other, "chat_message", &title, Some(content), Some("chat"), Some(channel));
            }
            return;
        }
        if let Some(group_id) = channel.strip_prefix("group:") {
            let mut stmt = match self.conn.prepare("SELECT employee_id FROM chat_group_members WHERE group_id = ?1 AND employee_id != ?2") {
                Ok(s) => s,
                Err(_) => return,
            };
            let ids: Vec<String> = stmt
                .query_map(params![group_id, sender_id], |row| row.get(0))
                .map(|rows| rows.filter_map(|r| r.ok()).collect())
                .unwrap_or_default();
            for id in ids {
                self.notify(&id, "chat_message", &title, Some(content), Some("chat"), Some(channel));
            }
            return;
        }
        if channel == "general" {
            let mut stmt = match self.conn.prepare("SELECT id FROM employees WHERE is_partner = 0 AND id != ?1") {
                Ok(s) => s,
                Err(_) => return,
            };
            let ids: Vec<String> = stmt
                .query_map(params![sender_id], |row| row.get(0))
                .map(|rows| rows.filter_map(|r| r.ok()).collect())
                .unwrap_or_default();
            for id in ids {
                self.notify(&id, "chat_message", &title, Some(content), Some("chat"), Some(channel));
            }
        } else if sender.is_partner {
            self.notify_all_admins("chat_message", &title, Some(content), Some("chat"), Some(channel));
        } else {
            let mut stmt = match self.conn.prepare("SELECT id FROM employees WHERE partner_id = ?1 AND id != ?2") {
                Ok(s) => s,
                Err(_) => return,
            };
            let ids: Vec<String> = stmt
                .query_map(params![channel, sender_id], |row| row.get(0))
                .map(|rows| rows.filter_map(|r| r.ok()).collect())
                .unwrap_or_default();
            for id in ids {
                self.notify(&id, "chat_message", &title, Some(content), Some("chat"), Some(channel));
            }
        }
    }

    // НЕ переиспользует mark_notifications_for_entity_read — тот помечает
    // прочитанным для ВСЕХ получателей одного уведомления (верно для "заявку
    // рассмотрели"), а тут должна отмечаться только СВОЯ копия у открывшего канал.
    pub fn mark_chat_channel_read(&self, employee_id: &str, channel: &str) {
        let _ = self.conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE employee_id = ?1 AND type = 'chat_message' AND related_entity_id = ?2",
            params![employee_id, channel],
        );
    }

    // Список личных переписок сотрудника — каналы вида 'dm:<id1>:<id2>', где
    // employee_id — один из двух участников. Отдельной таблицы "диалогов" нет
    // (см. комментарий выше про dm_channel_id), поэтому смотрим на уже
    // отправленные сообщения: раз сообщение есть — переписка существует.
    // Новый диалог, в котором ещё нет ни одного сообщения, тут не появится —
    // это ожидаемо, он и не нужен в списке "уже начатых" переписок.
    pub fn list_my_dm_channels(&self, employee_id: &str) -> Vec<DmChannelSummary> {
        let mut stmt = match self.conn.prepare(
            "SELECT DISTINCT channel FROM chat_messages
             WHERE channel LIKE 'dm:' || ?1 || ':%' OR channel LIKE 'dm:%:' || ?1",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        let channels: Vec<String> = match stmt.query_map(params![employee_id], |row| row.get(0)) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(_) => return Vec::new(),
        };

        let mut summaries: Vec<DmChannelSummary> = channels
            .into_iter()
            .filter_map(|channel| {
                let rest = channel.strip_prefix("dm:")?;
                let (a, b) = rest.split_once(':')?;
                let other_id = (if a == employee_id { b } else { a }).to_string();
                let (other_name, other_avatar): (String, Option<String>) = self
                    .conn
                    .query_row(
                        "SELECT full_name, avatar_data FROM employees WHERE id = ?1",
                        params![other_id],
                        |row| Ok((row.get(0)?, row.get(1)?)),
                    )
                    .ok()?;
                let last: Option<(String, String)> = self
                    .conn
                    .query_row(
                        "SELECT content, created_at FROM chat_messages WHERE channel = ?1 ORDER BY created_at DESC LIMIT 1",
                        params![channel],
                        |row| Ok((row.get(0)?, row.get(1)?)),
                    )
                    .ok();
                Some(DmChannelSummary {
                    channel,
                    other_employee_id: other_id,
                    other_employee_name: other_name,
                    other_employee_avatar: other_avatar,
                    last_message: last.as_ref().map(|(c, _)| c.clone()),
                    last_message_at: last.map(|(_, t)| t),
                })
            })
            .collect();

        summaries.sort_by(|a, b| b.last_message_at.cmp(&a.last_message_at));
        summaries
    }

    // Список уже начатых переписок с партнёрами (channel = id партнёра
    // напрямую, без префикса) — только каналы, где реально есть хотя бы одно
    // сообщение. Раньше админ видел в сайдбаре ВСЕХ партнёров компании сразу,
    // даже с кем ни разу не переписывались — по просьбе показываем только
    // реально начатые, тем же принципом, что list_my_dm_channels. Новый
    // партнёр для первого сообщения ищется отдельно (полный список партнёров
    // уже загружен через list_partners для admin).
    pub fn list_my_partner_chats(&self) -> Vec<PartnerChatSummary> {
        let mut stmt = match self.conn.prepare(
            "SELECT DISTINCT cm.channel FROM chat_messages cm INNER JOIN partners p ON p.id = cm.channel",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        let channels: Vec<String> = match stmt.query_map([], |row| row.get(0)) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(_) => return Vec::new(),
        };

        let mut summaries: Vec<PartnerChatSummary> = channels
            .into_iter()
            .filter_map(|channel| {
                let partner_name: String = self
                    .conn
                    .query_row("SELECT name FROM partners WHERE id = ?1", params![channel], |row| row.get(0))
                    .ok()?;
                let last: Option<(String, String)> = self
                    .conn
                    .query_row(
                        "SELECT content, created_at FROM chat_messages WHERE channel = ?1 ORDER BY created_at DESC LIMIT 1",
                        params![channel],
                        |row| Ok((row.get(0)?, row.get(1)?)),
                    )
                    .ok();
                Some(PartnerChatSummary {
                    partner_id: channel,
                    partner_name,
                    last_message: last.as_ref().map(|(c, _)| c.clone()),
                    last_message_at: last.map(|(_, t)| t),
                })
            })
            .collect();

        summaries.sort_by(|a, b| b.last_message_at.cmp(&a.last_message_at));
        summaries
    }

    // ---- Группы чата ----
    // Два способа создания: "по подразделению" (только глава этого подразделения
    // или админ, участники — автоматически весь состав подразделения) и "вручную"
    // (любой сотрудник, сам выбирает состав). После создания состав никак не связан
    // с фактическим составом подразделения — если туда кто-то придёт позже, в
    // группу его придётся добавить отдельно (осознанное упрощение, не синхронизация).

    fn generate_invite_code() -> String {
        Uuid::new_v4().to_string().replace('-', "")[..8].to_uppercase()
    }

    fn is_department_head(&self, employee_id: &str, department_id: &str) -> bool {
        self.conn
            .query_row(
                "SELECT 1 FROM departments WHERE id = ?1 AND head_employee_id = ?2",
                params![department_id, employee_id],
                |_| Ok(true),
            )
            .unwrap_or(false)
    }

    fn map_chat_group_row(row: &rusqlite::Row) -> rusqlite::Result<ChatGroupRecord> {
        Ok(ChatGroupRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            photo_data: row.get(3)?,
            department_id: row.get(4)?,
            invite_code: row.get(5)?,
            created_by: row.get(6)?,
            created_at: row.get(7)?,
            member_count: row.get(8)?,
        })
    }

    const CHAT_GROUP_SELECT: &'static str = "SELECT
            g.id, g.name, g.description, g.photo_data, g.department_id, g.invite_code,
            g.created_by, g.created_at,
            (SELECT COUNT(*) FROM chat_group_members gm WHERE gm.group_id = g.id)
        FROM chat_groups g";

    pub fn get_chat_group(&self, group_id: &str) -> Option<ChatGroupRecord> {
        let sql = format!("{} WHERE g.id = ?1", Self::CHAT_GROUP_SELECT);
        self.conn.query_row(&sql, params![group_id], Self::map_chat_group_row).ok()
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_chat_group(
        &self,
        actor_id: &str,
        name: &str,
        description: Option<&str>,
        photo_data: Option<&str>,
        department_id: Option<&str>,
        member_ids: Option<&[String]>,
    ) -> Result<ChatGroupRecord, String> {
        let actor = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        if actor.is_partner {
            return Err("Партнёрам недоступны группы".into());
        }
        let name = name.trim();
        if name.is_empty() {
            return Err("Укажите название группы".into());
        }

        let mut members: Vec<String> = if let Some(dep_id) = department_id {
            if !self.is_department_head(actor_id, dep_id) && !actor.is_admin {
                return Err("Создавать группу подразделения может только его руководитель".into());
            }
            let mut stmt = self
                .conn
                .prepare("SELECT id FROM employees WHERE department_id = ?1 AND is_partner = 0")
                .map_err(|e| e.to_string())?;
            let dep_members: Vec<String> = stmt
                .query_map(params![dep_id], |row| row.get(0))
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();
            dep_members
        } else {
            let picked = member_ids.filter(|m| !m.is_empty()).ok_or_else(|| "Выберите хотя бы одного участника".to_string())?;
            picked.to_vec()
        };
        if !members.iter().any(|m| m == actor_id) {
            members.push(actor_id.to_string());
        }

        let id = Uuid::new_v4().to_string();
        let invite_code = Self::generate_invite_code();
        self.conn
            .execute(
                "INSERT INTO chat_groups (id, name, description, photo_data, department_id, invite_code, created_by)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, name, description, photo_data, department_id, invite_code, actor_id],
            )
            .map_err(|e| e.to_string())?;
        for member_id in &members {
            let _ = self.conn.execute(
                "INSERT OR IGNORE INTO chat_group_members (group_id, employee_id) VALUES (?1, ?2)",
                params![id, member_id],
            );
        }

        self.get_chat_group(&id).ok_or_else(|| "Не удалось создать группу".to_string())
    }

    pub fn list_my_chat_groups(&self, employee_id: &str) -> Vec<ChatGroupSummary> {
        let sql = format!(
            "{} WHERE g.id IN (SELECT group_id FROM chat_group_members WHERE employee_id = ?1)",
            Self::CHAT_GROUP_SELECT
        );
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        let groups: Vec<ChatGroupRecord> = match stmt.query_map(params![employee_id], Self::map_chat_group_row) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(_) => return Vec::new(),
        };

        let mut summaries: Vec<ChatGroupSummary> = groups
            .into_iter()
            .map(|g| {
                let channel = format!("group:{}", g.id);
                let last: Option<(String, String)> = self
                    .conn
                    .query_row(
                        "SELECT content, created_at FROM chat_messages WHERE channel = ?1 ORDER BY created_at DESC LIMIT 1",
                        params![channel],
                        |row| Ok((row.get(0)?, row.get(1)?)),
                    )
                    .ok();
                ChatGroupSummary {
                    id: g.id,
                    name: g.name,
                    photo_data: g.photo_data,
                    member_count: g.member_count,
                    last_message: last.as_ref().map(|(c, _)| c.clone()),
                    last_message_at: last.map(|(_, t)| t),
                }
            })
            .collect();

        summaries.sort_by(|a, b| b.last_message_at.cmp(&a.last_message_at));
        summaries
    }

    pub fn list_chat_group_members(&self, employee_id: &str, group_id: &str) -> Result<Vec<EmployeeRecord>, String> {
        self.can_access_chat_channel(employee_id, &format!("group:{group_id}"))?;
        let sql = format!(
            "{} WHERE e.id IN (SELECT employee_id FROM chat_group_members WHERE group_id = ?1)",
            Self::EMPLOYEE_SELECT
        );
        let mut stmt = self.conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![group_id], Self::map_employee_row).map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    fn is_chat_group_manager(&self, employee_id: &str, group: &ChatGroupRecord) -> bool {
        self.is_admin(employee_id) || group.created_by.as_deref() == Some(employee_id)
    }

    pub fn update_chat_group(
        &self,
        actor_id: &str,
        group_id: &str,
        name: &str,
        description: Option<&str>,
        photo_data: Option<&str>,
    ) -> Result<ChatGroupRecord, String> {
        let group = self.get_chat_group(group_id).ok_or_else(|| "Группа не найдена".to_string())?;
        if !self.is_chat_group_manager(actor_id, &group) {
            return Err("Недостаточно прав".into());
        }
        let name = name.trim();
        if name.is_empty() {
            return Err("Укажите название группы".into());
        }
        self.conn
            .execute(
                "UPDATE chat_groups SET name = ?1, description = ?2, photo_data = ?3 WHERE id = ?4",
                params![name, description, photo_data, group_id],
            )
            .map_err(|e| e.to_string())?;
        self.get_chat_group(group_id).ok_or_else(|| "Группа не найдена".to_string())
    }

    pub fn add_chat_group_member(&self, actor_id: &str, group_id: &str, employee_id: &str) -> Result<(), String> {
        let group = self.get_chat_group(group_id).ok_or_else(|| "Группа не найдена".to_string())?;
        if !self.is_chat_group_manager(actor_id, &group) {
            return Err("Недостаточно прав".into());
        }
        let target = self.get_employee(employee_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        if target.is_partner {
            return Err("Партнёрам недоступны группы".into());
        }
        self.conn
            .execute(
                "INSERT OR IGNORE INTO chat_group_members (group_id, employee_id) VALUES (?1, ?2)",
                params![group_id, employee_id],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Убрать СЕБЯ (выйти из группы) может любой участник; убрать ДРУГОГО —
    // только создатель группы/админ.
    pub fn remove_chat_group_member(&self, actor_id: &str, group_id: &str, employee_id: &str) -> Result<(), String> {
        let group = self.get_chat_group(group_id).ok_or_else(|| "Группа не найдена".to_string())?;
        if actor_id != employee_id && !self.is_chat_group_manager(actor_id, &group) {
            return Err("Недостаточно прав".into());
        }
        self.conn
            .execute(
                "DELETE FROM chat_group_members WHERE group_id = ?1 AND employee_id = ?2",
                params![group_id, employee_id],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn join_chat_group_by_invite(&self, actor_id: &str, invite_code: &str) -> Result<ChatGroupRecord, String> {
        let actor = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        if actor.is_partner {
            return Err("Партнёрам недоступны группы".into());
        }
        let sql = format!("{} WHERE g.invite_code = ?1", Self::CHAT_GROUP_SELECT);
        let group = self
            .conn
            .query_row(&sql, params![invite_code.trim().to_uppercase()], Self::map_chat_group_row)
            .map_err(|_| "Код приглашения не найден".to_string())?;
        self.conn
            .execute(
                "INSERT OR IGNORE INTO chat_group_members (group_id, employee_id) VALUES (?1, ?2)",
                params![group.id, actor_id],
            )
            .map_err(|e| e.to_string())?;
        self.get_chat_group(&group.id).ok_or_else(|| "Группа не найдена".to_string())
    }

    // ---- Подразделения ----

    const DEPARTMENT_SELECT: &'static str = "SELECT
            dep.id, dep.name, dep.head_employee_id, h.full_name,
            dep.deputy_employee_id, dpt.full_name,
            (SELECT COUNT(*) FROM employees e WHERE e.department_id = dep.id
                AND (dep.head_employee_id IS NULL OR e.id != dep.head_employee_id))
        FROM departments dep
        LEFT JOIN employees h ON h.id = dep.head_employee_id
        LEFT JOIN employees dpt ON dpt.id = dep.deputy_employee_id";

    fn map_department_row(row: &rusqlite::Row) -> rusqlite::Result<DepartmentRecord> {
        Ok(DepartmentRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            head_employee_id: row.get(2)?,
            head_name: row.get(3)?,
            deputy_employee_id: row.get(4)?,
            deputy_name: row.get(5)?,
            member_count: row.get(6)?,
        })
    }

    pub fn list_departments(&self) -> Vec<DepartmentRecord> {
        let sql = format!("{} ORDER BY dep.name ASC", Self::DEPARTMENT_SELECT);
        let mut stmt = self.conn.prepare(&sql).expect("не удалось подготовить запрос");
        let rows = stmt.query_map([], Self::map_department_row).expect("не удалось выполнить запрос");
        rows.filter_map(|r| r.ok()).collect()
    }

    // Заместитель подразделения автоматически становится его "сотрудником"
    // (department_id) с руководителем подразделения в качестве менеджера — как
    // и просили: "заместитель идёт как сотрудник, руководитель — нет".
    fn link_deputy_as_member(&self, department_id: &str, deputy_employee_id: Option<&str>, head_employee_id: Option<&str>) {
        if let Some(dep_id) = deputy_employee_id {
            let _ = self.conn.execute(
                "UPDATE employees SET department_id = ?1, manager_id = ?2 WHERE id = ?3",
                params![department_id, head_employee_id, dep_id],
            );
        }
    }

    pub fn create_department(
        &self,
        admin_id: &str,
        name: &str,
        head_employee_id: Option<&str>,
        deputy_employee_id: Option<&str>,
    ) -> Result<DepartmentRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав для управления подразделениями".into());
        }
        let name = name.trim();
        if name.is_empty() {
            return Err("Название подразделения не может быть пустым".into());
        }
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO departments (id, name, head_employee_id, deputy_employee_id) VALUES (?1, ?2, ?3, ?4)",
                params![id, name, head_employee_id, deputy_employee_id],
            )
            .map_err(|e| {
                if e.to_string().contains("UNIQUE") {
                    "Такое подразделение уже есть".to_string()
                } else {
                    e.to_string()
                }
            })?;

        self.link_deputy_as_member(&id, deputy_employee_id, head_employee_id);

        // Руководитель тоже получает department_id этого подразделения — чтобы
        // в карточке и кабинете не было прочерков. Руководитель при этом не числится
        // в project_members подразделения (только заместитель), но поле department_id
        // должно быть заполнено для корректного отображения во всех местах.
        if let Some(head_id) = head_employee_id {
            let _ = self.conn.execute(
                "UPDATE employees SET department_id = ?1 WHERE id = ?2",
                params![id, head_id],
            );
        }

        let sql = format!("{} WHERE dep.id = ?1", Self::DEPARTMENT_SELECT);
        self.conn
            .query_row(&sql, params![id], Self::map_department_row)
            .map_err(|e| e.to_string())
    }

    pub fn update_department(
        &self,
        admin_id: &str,
        id: &str,
        name: &str,
        head_employee_id: Option<&str>,
        deputy_employee_id: Option<&str>,
    ) -> Result<DepartmentRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав для управления подразделениями".into());
        }
        let name = name.trim();
        if name.is_empty() {
            return Err("Название подразделения не может быть пустым".into());
        }

        // Получаем старого руководителя, чтобы снять у него department_id
        // если он больше не является главой этого подразделения.
        let old_head_id: Option<String> = self.conn
            .query_row("SELECT head_employee_id FROM departments WHERE id = ?1", params![id], |row| row.get(0))
            .unwrap_or(None);

        self.conn
            .execute(
                "UPDATE departments SET name = ?1, head_employee_id = ?2, deputy_employee_id = ?3 WHERE id = ?4",
                params![name, head_employee_id, deputy_employee_id, id],
            )
            .map_err(|e| e.to_string())?;

        // Если руководитель сменился — снимаем department_id у старого
        if old_head_id.as_deref() != head_employee_id {
            if let Some(old_id) = &old_head_id {
                let _ = self.conn.execute(
                    "UPDATE employees SET department_id = NULL WHERE id = ?1 AND department_id = ?2",
                    params![old_id, id],
                );
            }
        }

        self.link_deputy_as_member(id, deputy_employee_id, head_employee_id);

        // Новому руководителю проставляем department_id
        if let Some(head_id) = head_employee_id {
            let _ = self.conn.execute(
                "UPDATE employees SET department_id = ?1 WHERE id = ?2",
                params![id, head_id],
            );
        }

        let sql = format!("{} WHERE dep.id = ?1", Self::DEPARTMENT_SELECT);
        self.conn
            .query_row(&sql, params![id], Self::map_department_row)
            .map_err(|e| e.to_string())
    }

    pub fn delete_department(&self, admin_id: &str, id: &str) -> Result<(), String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав для управления подразделениями".into());
        }
        // Сотрудников этого подразделения не удаляем — просто отвязываем
        // (department_id -> NULL), сама привязка руководителя/заместителя не трогается.
        self.conn
            .execute("UPDATE employees SET department_id = NULL WHERE department_id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        self.conn
            .execute("DELETE FROM departments WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // ---- Уведомления ----

    fn notify(&self, employee_id: &str, notification_type: &str, title: &str, body: Option<&str>, related_type: Option<&str>, related_id: Option<&str>) {
        let id = Uuid::new_v4().to_string();
        let _ = self.conn.execute(
            "INSERT INTO notifications (id, employee_id, type, title, body, related_entity_type, related_entity_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, employee_id, notification_type, title, body, related_type, related_id],
        );
    }

    fn notify_all_admins(&self, notification_type: &str, title: &str, body: Option<&str>, related_type: Option<&str>, related_id: Option<&str>) {
        let mut stmt = match self.conn.prepare("SELECT id FROM employees WHERE is_admin = 1") {
            Ok(s) => s,
            Err(_) => return,
        };
        let admin_ids: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default();
        for admin_id in admin_ids {
            self.notify(&admin_id, notification_type, title, body, related_type, related_id);
        }
    }

    // Уведомляет все аккаунты одного партнёра (v0.4.0) — зеркало
    // notify_all_admins для обратного направления (админ пишет партнёру).
    fn notify_partner_org(&self, partner_id: &str, notification_type: &str, title: &str, body: Option<&str>, related_type: Option<&str>, related_id: Option<&str>) {
        let mut stmt = match self.conn.prepare("SELECT id FROM employees WHERE partner_id = ?1 AND is_partner = 1") {
            Ok(s) => s,
            Err(_) => return,
        };
        let ids: Vec<String> = stmt
            .query_map(params![partner_id], |row| row.get::<_, String>(0))
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default();
        for id in ids {
            self.notify(&id, notification_type, title, body, related_type, related_id);
        }
    }

    // Вызывается из telegram.rs (не может видеть приватный notify_all_admins
    // напрямую — другой модуль) при неудачной отправке sendMessage, обычно
    // означает, что человек ни разу не писал этому боту /start. Best-effort,
    // как и остальные notify*.
    pub fn notify_telegram_send_failed(&self, target_name: &str) {
        self.notify_all_admins(
            "telegram_send_failed",
            "Не удалось отправить уведомление в Telegram",
            Some(&format!(
                "«{target_name}» — сообщение не доставлено. Возможно, аккаунт нужно привязать заново (написать боту /start в Telegram).",
            )),
            None,
            None,
        );
    }

    pub fn list_notifications(&self, employee_id: &str) -> Vec<NotificationRecord> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, employee_id, type, title, body, related_entity_type, related_entity_id, is_read, created_at
                 FROM notifications WHERE employee_id = ?1 ORDER BY created_at DESC LIMIT 30",
            )
            .expect("не удалось подготовить запрос");
        let rows = stmt
            .query_map(params![employee_id], |row| {
                Ok(NotificationRecord {
                    id: row.get(0)?,
                    employee_id: row.get(1)?,
                    notification_type: row.get(2)?,
                    title: row.get(3)?,
                    body: row.get(4)?,
                    related_entity_type: row.get(5)?,
                    related_entity_id: row.get(6)?,
                    is_read: row.get::<_, i64>(7)? != 0,
                    created_at: row.get(8)?,
                })
            })
            .expect("не удалось выполнить запрос");
        rows.filter_map(|r| r.ok()).collect()
    }

    pub fn mark_notification_read(&self, id: &str) -> Result<(), String> {
        self.conn
            .execute("UPDATE notifications SET is_read = 1 WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Заявку могли увидеть несколько человек (руководитель + его заместитель,
    // либо сразу все админы) — у каждого своя копия уведомления со своим id.
    // Когда заявка решена ЛЮБЫМ из них, у остальных получателей уведомление
    // всё равно оставалось непрочитанным (раньше mark_notification_read
    // помечал только ту копию, по которой кликнули) — из-за этого badge
    // "висел" даже после того, как заявка уже была обработана кем-то другим.
    fn mark_notifications_for_entity_read(&self, related_entity_id: &str) {
        let _ = self.conn.execute(
            "UPDATE notifications SET is_read = 1 WHERE related_entity_id = ?1",
            params![related_entity_id],
        );
    }

    // ---- Заявки на редактирование профиля ----

    pub fn create_edit_request(
        &self,
        employee_id: &str,
        requested_full_name: Option<&str>,
        requested_phone: Option<&str>,
        note: Option<&str>,
    ) -> Result<EditRequestRecord, String> {
        if requested_full_name.is_none() && requested_phone.is_none() {
            return Err("Укажите хотя бы одно поле для изменения".into());
        }
        let existing: i64 = self
            .conn
            .query_row(
                "SELECT COUNT(*) FROM edit_requests WHERE employee_id = ?1 AND status = 'pending'",
                params![employee_id],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if existing > 0 {
            return Err("У вас уже есть заявка на рассмотрении".into());
        }

        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO edit_requests (id, employee_id, requested_full_name, requested_phone, note)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, employee_id, requested_full_name, requested_phone, note],
            )
            .map_err(|e| e.to_string())?;

        let employee_name: String = self
            .conn
            .query_row("SELECT full_name FROM employees WHERE id = ?1", params![employee_id], |row| row.get(0))
            .unwrap_or_default();

        self.notify_all_admins(
            "edit_request",
            &format!("Заявка на изменение данных: {employee_name}"),
            note,
            Some("edit_request"),
            Some(&id),
        );

        Ok(EditRequestRecord {
            id,
            employee_id: employee_id.to_string(),
            employee_name,
            requested_full_name: requested_full_name.map(str::to_string),
            requested_phone: requested_phone.map(str::to_string),
            note: note.map(str::to_string),
            status: "pending".to_string(),
            created_at: String::new(),
        })
    }

    pub fn list_edit_requests(&self, admin_id: &str) -> Result<Vec<EditRequestRecord>, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        let mut stmt = self
            .conn
            .prepare(
                "SELECT er.id, er.employee_id, e.full_name, er.requested_full_name, er.requested_phone, er.note, er.status, er.created_at
                 FROM edit_requests er
                 JOIN employees e ON e.id = er.employee_id
                 WHERE er.status = 'pending'
                 ORDER BY er.created_at ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(EditRequestRecord {
                    id: row.get(0)?,
                    employee_id: row.get(1)?,
                    employee_name: row.get(2)?,
                    requested_full_name: row.get(3)?,
                    requested_phone: row.get(4)?,
                    note: row.get(5)?,
                    status: row.get(6)?,
                    created_at: row.get(7)?,
                })
            })
            .map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn resolve_edit_request(&self, admin_id: &str, request_id: &str, action: &str) -> Result<(), String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }

        let (employee_id, requested_full_name, requested_phone, status): (String, Option<String>, Option<String>, String) = self
            .conn
            .query_row(
                "SELECT employee_id, requested_full_name, requested_phone, status FROM edit_requests WHERE id = ?1",
                params![request_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .map_err(|_| "Заявка не найдена".to_string())?;

        if status != "pending" {
            return Err("Заявка уже обработана".into());
        }

        match action {
            "apply" => {
                if let Some(name) = &requested_full_name {
                    self.conn
                        .execute("UPDATE employees SET full_name = ?1 WHERE id = ?2", params![name, employee_id])
                        .map_err(|e| e.to_string())?;
                }
                if let Some(phone) = &requested_phone {
                    self.conn
                        .execute("UPDATE employees SET phone = ?1 WHERE id = ?2", params![phone, employee_id])
                        .map_err(|e| e.to_string())?;
                }
                self.notify(&employee_id, "edit_request_resolved", "Изменения применены", None, None, None);
            }
            "grant_access" => {
                self.conn
                    .execute(
                        "UPDATE employees SET self_edit_until = datetime('now', '+24 hours') WHERE id = ?1",
                        params![employee_id],
                    )
                    .map_err(|e| e.to_string())?;
                self.notify(
                    &employee_id,
                    "edit_request_resolved",
                    "Доступ к редактированию профиля открыт на 24 часа",
                    None,
                    None,
                    None,
                );
            }
            "reject" => {
                self.notify(&employee_id, "edit_request_resolved", "Заявка на изменение данных отклонена", None, None, None);
            }
            _ => return Err("Неизвестное действие".into()),
        }

        let resolved_status = match action {
            "apply" => "approved",
            "grant_access" => "granted",
            _ => "rejected",
        };
        self.conn
            .execute(
                "UPDATE edit_requests SET status = ?1, resolved_at = datetime('now'), resolved_by = ?2 WHERE id = ?3",
                params![resolved_status, admin_id, request_id],
            )
            .map_err(|e| e.to_string())?;

        self.mark_notifications_for_entity_read(request_id);

        Ok(())
    }

    // ---- Заявки на отсутствие (отгул с отработкой / за свой счёт, отпуск, командировка) ----
    // Согласование — у руководителя сотрудника (employees.manager_id). Если руководитель не
    // назначен, заявка уходит всем админам (аналогично edit_requests). Админ при этом видит
    // и может рассмотреть/отклонить ЛЮБУЮ заявку — ему нужен полный обзор для отчётов
    // (отдельная вкладка "Заявки"), а не только те, что были явно адресованы ему.
    fn map_absence_row(row: &rusqlite::Row) -> rusqlite::Result<AbsenceRequestRecord> {
        Ok(AbsenceRequestRecord {
            id: row.get(0)?,
            employee_id: row.get(1)?,
            employee_name: row.get(2)?,
            request_type: row.get(3)?,
            start_date: row.get(4)?,
            end_date: row.get(5)?,
            reason: row.get(6)?,
            status: row.get(7)?,
            created_at: row.get(8)?,
            resolved_by: row.get(9)?,
            resolved_by_name: row.get(10)?,
            resolved_at: row.get(11)?,
            makeup_slots: row.get(12)?,
            resolved_by_is_admin: row.get::<_, Option<i64>>(13)?.unwrap_or(0) != 0,
        })
    }

    const ABSENCE_SELECT: &'static str = "SELECT
            ar.id, ar.employee_id, e.full_name, ar.type, ar.start_date, ar.end_date, ar.reason,
            ar.status, ar.created_at, ar.resolved_by, r.full_name, ar.resolved_at,
            ar.makeup_slots, r.is_admin
        FROM absence_requests ar
        JOIN employees e ON e.id = ar.employee_id
        LEFT JOIN employees r ON r.id = ar.resolved_by";

    pub fn create_absence_request(
        &self,
        employee_id: &str,
        request_type: &str,
        start_date: &str,
        end_date: &str,
        reason: Option<&str>,
        makeup_slots: Option<&str>,
    ) -> Result<AbsenceRequestRecord, String> {
        if !["dayoff_worked", "dayoff_unpaid", "vacation", "business_trip", "remote_work"].contains(&request_type) {
            return Err("Некорректный тип заявки".into());
        }
        if start_date > end_date {
            return Err("Дата окончания раньше даты начала".into());
        }

        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO absence_requests (id, employee_id, type, start_date, end_date, reason, makeup_slots)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, employee_id, request_type, start_date, end_date, reason, makeup_slots],
            )
            .map_err(|e| e.to_string())?;

        let (employee_name, manager_id, department_id): (String, Option<String>, Option<String>) = self
            .conn
            .query_row(
                "SELECT full_name, manager_id, department_id FROM employees WHERE id = ?1",
                params![employee_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap_or_default();

        let title = format!("Заявка на отсутствие: {employee_name}");
        match &manager_id {
            Some(mid) => {
                self.notify(mid, "absence_request", &title, reason, Some("absence_request"), Some(&id));
                // Заместитель руководителя (личный, если задан) тоже может одобрить —
                // на случай если сам руководитель недоступен.
                let manager_deputy_id: Option<String> = self
                    .conn
                    .query_row("SELECT deputy_id FROM employees WHERE id = ?1", params![mid], |row| row.get(0))
                    .unwrap_or(None);
                if let Some(dep_id) = manager_deputy_id {
                    self.notify(&dep_id, "absence_request", &title, reason, Some("absence_request"), Some(&id));
                }
            }
            None => self.notify_all_admins("absence_request", &title, reason, Some("absence_request"), Some(&id)),
        }

        // Заместитель ИМЕННО подразделения сотрудника — отдельно от личного
        // заместителя руководителя выше (это разные вещи: department.deputy_employee_id
        // против employees.deputy_id у руководителя). Уведомляем обоих, если оба заданы.
        if let Some(dep_id) = &department_id {
            let dept_deputy_id: Option<String> = self
                .conn
                .query_row("SELECT deputy_employee_id FROM departments WHERE id = ?1", params![dep_id], |row| row.get(0))
                .unwrap_or(None);
            if let Some(deputy_id) = dept_deputy_id {
                if manager_id.as_deref() != Some(&deputy_id) {
                    self.notify(&deputy_id, "absence_request", &title, reason, Some("absence_request"), Some(&id));
                }
            }
        }

        Ok(AbsenceRequestRecord {
            id,
            employee_id: employee_id.to_string(),
            employee_name,
            request_type: request_type.to_string(),
            start_date: start_date.to_string(),
            end_date: end_date.to_string(),
            reason: reason.map(str::to_string),
            makeup_slots: makeup_slots.map(str::to_string),
            status: "pending".to_string(),
            created_at: String::new(),
            resolved_by: None,
            resolved_by_name: None,
            resolved_by_is_admin: false,
            resolved_at: None,
        })
    }

    pub fn list_absence_requests_for_employee(&self, employee_id: &str) -> Vec<AbsenceRequestRecord> {
        let sql = format!("{} WHERE ar.employee_id = ?1 ORDER BY ar.created_at DESC", Self::ABSENCE_SELECT);
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![employee_id], Self::map_absence_row)
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default()
    }

    // Общая проверка прав на рассмотрение заявки конкретного сотрудника:
    // админ, ЛИБО руководитель этого сотрудника, ЛИБО заместитель этого руководителя
    // (личный заместитель сотрудника-руководителя), ЛИБО заместитель ПОДРАЗДЕЛЕНИЯ,
    // в котором состоит сотрудник (departments.deputy_employee_id) — три независимых
    // источника права на одобрение, как и просили.
    fn can_resolve_absence(&self, actor_id: &str, employee_id: &str) -> bool {
        if self.is_admin(actor_id) {
            return true;
        }
        let (manager_id, department_id): (Option<String>, Option<String>) = self
            .conn
            .query_row(
                "SELECT manager_id, department_id FROM employees WHERE id = ?1",
                params![employee_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap_or((None, None));

        if manager_id.as_deref() == Some(actor_id) {
            return true;
        }

        if let Some(mid) = &manager_id {
            let manager_deputy_id: Option<String> = self
                .conn
                .query_row("SELECT deputy_id FROM employees WHERE id = ?1", params![mid], |row| row.get(0))
                .unwrap_or(None);
            if manager_deputy_id.as_deref() == Some(actor_id) {
                return true;
            }
        }

        if let Some(dep_id) = department_id {
            let dept_deputy_id: Option<String> = self
                .conn
                .query_row("SELECT deputy_employee_id FROM departments WHERE id = ?1", params![dep_id], |row| row.get(0))
                .unwrap_or(None);
            if dept_deputy_id.as_deref() == Some(actor_id) {
                return true;
            }
        }

        false
    }

    pub fn list_all_absence_requests(&self, admin_id: &str) -> Result<Vec<AbsenceRequestRecord>, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        let sql = format!("{} ORDER BY ar.created_at DESC", Self::ABSENCE_SELECT);
        let mut stmt = self.conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], Self::map_absence_row).map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    // Заявки, ожидающие решения именно этого сотрудника как руководителя (или
    // заместителя руководителя) — чтобы показать их прямо на странице "Заявки",
    // а не только через клик по уведомлению. Админ видит ВСЕ ожидающие заявки
    // (не только те, где он назначен руководителем/заместителем) — он и так
    // может рассмотреть любую (см. can_resolve_absence), а без этого заявка
    // сотрудника без руководителя приходила ему только разовым уведомлением
    // в колокольчик: пропустил/закрыл — и заявка нигде больше не видна как
    // требующая действия (оставалась только в read-only таблице "Все заявки").
    pub fn list_pending_approvals(&self, actor_id: &str) -> Vec<AbsenceRequestRecord> {
        if self.is_admin(actor_id) {
            let sql = format!("{} WHERE ar.status = 'pending' ORDER BY ar.created_at ASC", Self::ABSENCE_SELECT);
            let mut stmt = match self.conn.prepare(&sql) {
                Ok(s) => s,
                Err(_) => return Vec::new(),
            };
            return stmt
                .query_map([], Self::map_absence_row)
                .map(|rows| rows.filter_map(|r| r.ok()).collect())
                .unwrap_or_default();
        }
        let sql = format!(
            "{} WHERE ar.status = 'pending' AND (
                e.manager_id = ?1
                OR EXISTS(SELECT 1 FROM employees mgr WHERE mgr.id = e.manager_id AND mgr.deputy_id = ?1)
                OR EXISTS(SELECT 1 FROM departments dep2 WHERE dep2.id = e.department_id AND dep2.deputy_employee_id = ?1)
             ) ORDER BY ar.created_at ASC",
            Self::ABSENCE_SELECT
        );
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![actor_id], Self::map_absence_row)
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default()
    }

    // Точечный просмотр одной заявки — нужен руководителю (не админу), который
    // получил уведомление и переходит рассмотреть конкретную заявку своего
    // подчинённого; ему не даём list_all_absence_requests (это только для админа).
    pub fn get_absence_request(&self, actor_id: &str, request_id: &str) -> Result<AbsenceRequestRecord, String> {
        let sql = format!("{} WHERE ar.id = ?1", Self::ABSENCE_SELECT);
        let record = self
            .conn
            .query_row(&sql, params![request_id], Self::map_absence_row)
            .map_err(|_| "Заявка не найдена".to_string())?;

        let allowed = self.can_resolve_absence(actor_id, &record.employee_id) || record.employee_id == actor_id;
        if !allowed {
            return Err("Недостаточно прав".into());
        }
        Ok(record)
    }

    pub fn resolve_absence_request(&self, actor_id: &str, request_id: &str, approve: bool) -> Result<(), String> {
        let (employee_id, status): (String, String) = self
            .conn
            .query_row(
                "SELECT employee_id, status FROM absence_requests WHERE id = ?1",
                params![request_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|_| "Заявка не найдена".to_string())?;

        if status != "pending" {
            return Err("Заявка уже обработана".into());
        }

        if !self.can_resolve_absence(actor_id, &employee_id) {
            return Err("Недостаточно прав для рассмотрения этой заявки".into());
        }

        let new_status = if approve { "approved" } else { "rejected" };
        self.conn
            .execute(
                "UPDATE absence_requests SET status = ?1, resolved_at = datetime('now'), resolved_by = ?2 WHERE id = ?3",
                params![new_status, actor_id, request_id],
            )
            .map_err(|e| e.to_string())?;

        let title = if approve { "Заявка на отсутствие одобрена" } else { "Заявка на отсутствие отклонена" };
        self.notify(&employee_id, "absence_request_resolved", title, None, None, None);

        self.mark_notifications_for_entity_read(request_id);

        Ok(())
    }

    pub fn self_update_employee(&self, employee_id: &str, full_name: &str, phone: Option<&str>) -> Result<EmployeeRecord, String> {
        let self_edit_until: Option<String> = self
            .conn
            .query_row(
                "SELECT self_edit_until FROM employees WHERE id = ?1",
                params![employee_id],
                |row| row.get(0),
            )
            .map_err(|_| "Сотрудник не найден".to_string())?;

        let still_valid: i64 = self
            .conn
            .query_row(
                "SELECT CASE WHEN self_edit_until IS NOT NULL AND self_edit_until > datetime('now') THEN 1 ELSE 0 END FROM employees WHERE id = ?1",
                params![employee_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if self_edit_until.is_none() || still_valid == 0 {
            return Err("Доступ для самостоятельного редактирования истёк или не был выдан".into());
        }

        self.conn
            .execute(
                "UPDATE employees SET full_name = ?1, phone = ?2 WHERE id = ?3",
                params![full_name, phone, employee_id],
            )
            .map_err(|e| e.to_string())?;

        self.get_employee(employee_id).ok_or_else(|| "Сотрудник не найден".to_string())
    }

    // Фото профиля — единственное поле, которое сотрудник может менять сам в
    // любой момент, без выдачи временного доступа админом (в отличие от ФИО/
    // телефона выше): это чисто косметическая правка, не влияющая на данные,
    // которыми оперируют другие модули (отчёты, поиск и т.д.).
    pub fn update_own_avatar(&self, employee_id: &str, avatar_data: Option<&str>) -> Result<EmployeeRecord, String> {
        self.conn
            .execute("UPDATE employees SET avatar_data = ?1 WHERE id = ?2", params![avatar_data, employee_id])
            .map_err(|e| e.to_string())?;
        self.get_employee(employee_id).ok_or_else(|| "Сотрудник не найден".to_string())
    }

    // ---- Ручной статус сотрудника ("Отошёл на 15 мин", "Обед", "Отпуск", "Отгул") ----
    // Отдельно от онлайн/офлайн (тот вычисляется по сессиям автоматически) — это то,
    // что сотрудник сам про себя указывает, по аналогии со статусом в Slack/Teams.
    // "away15" автоматически "истекает" через 15 минут (проверяется на фронтенде по
    // manual_status_until, как и self_edit_until) — остальные статусы снимаются только
    // вручную самим сотрудником.
    pub fn set_employee_status(&self, employee_id: &str, status: Option<&str>) -> Result<EmployeeRecord, String> {
        if let Some(s) = status {
            if !["away15", "lunch", "vacation", "dayoff"].contains(&s) {
                return Err("Некорректный статус".into());
            }
        }

        let until_expr = if status == Some("away15") {
            "datetime('now', '+15 minutes')"
        } else {
            "NULL"
        };
        let sql = format!(
            "UPDATE employees SET manual_status = ?1, manual_status_until = {} WHERE id = ?2",
            until_expr
        );
        self.conn
            .execute(&sql, params![status, employee_id])
            .map_err(|e| e.to_string())?;

        self.get_employee(employee_id).ok_or_else(|| "Сотрудник не найден".to_string())
    }
    // Логика простая и намеренно без heartbeat: при успешном логине создаём
    // строку сессии (login_at = сейчас, logout_at = NULL — значит "в сети").
    // При явном выходе (кнопка "Выйти") или закрытии окна приложения
    // (см. Dashboard.tsx на фронтенде, слушает close-requested) закрываем
    // все открытые сессии этого сотрудника, проставляя logout_at.
    // Если приложение крашнется или будет завершено принудительно (диспетчер
    // задач) без штатного закрытия окна — сессия так и останется "открытой"
    // до следующего входа. Это осознанное упрощение для офлайн-версии.

    pub fn record_login(&self, employee_id: &str) -> Result<(), String> {
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO employee_sessions (id, employee_id, login_at) VALUES (?1, ?2, datetime('now'))",
                params![id, employee_id],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn record_logout(&self, employee_id: &str) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE employee_sessions SET logout_at = datetime('now') WHERE employee_id = ?1 AND logout_at IS NULL",
                params![employee_id],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_recent_sessions(&self, employee_id: &str, limit: i64) -> Vec<SessionRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT id, login_at, logout_at FROM employee_sessions
             WHERE employee_id = ?1 ORDER BY login_at DESC LIMIT ?2",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        let rows = stmt.query_map(params![employee_id, limit], |row| {
            Ok(SessionRecord {
                id: row.get(0)?,
                login_at: row.get(1)?,
                logout_at: row.get(2)?,
            })
        });
        match rows {
            Ok(r) => r.filter_map(|x| x.ok()).collect(),
            Err(_) => Vec::new(),
        }
    }

    // ---- Клиенты ----
    // Клиентская база доступна всем сотрудникам (как обычно и бывает в CRM —
    // менеджеры сами ведут своих клиентов), в отличие от подразделений/должностей,
    // которые администрирует только админ. Удаление клиента — единственное
    // действие, ограниченное админом (необратимо, стоит подстраховаться).

    const CLIENT_SELECT: &'static str = "SELECT
            c.id, c.client_number, c.name, c.contact_person, c.contact_position,
            c.phone, c.email, c.address, c.notes,
            c.created_by, e.full_name, c.created_at,
            c.partner_id, p.name, c.deal_value,
            c.service_id, sv.name,
            c.house_service_id, hsv.name,
            c.origin_partner_id, op.name
        FROM clients c
        LEFT JOIN employees e ON e.id = c.created_by
        LEFT JOIN partners p ON p.id = c.partner_id
        LEFT JOIN partner_services sv ON sv.id = c.service_id
        LEFT JOIN house_services hsv ON hsv.id = c.house_service_id
        LEFT JOIN partners op ON op.id = c.origin_partner_id";

    fn map_client_row(row: &rusqlite::Row) -> rusqlite::Result<ClientRecord> {
        Ok(ClientRecord {
            id: row.get(0)?,
            client_number: row.get(1)?,
            name: row.get(2)?,
            contact_person: row.get(3)?,
            contact_position: row.get(4)?,
            phone: row.get(5)?,
            email: row.get(6)?,
            address: row.get(7)?,
            notes: row.get(8)?,
            created_by: row.get(9)?,
            created_by_name: row.get(10)?,
            created_at: row.get(11)?,
            partner_id: row.get(12)?,
            partner_name: row.get(13)?,
            deal_value: row.get(14)?,
            service_id: row.get(15)?,
            service_name: row.get(16)?,
            house_service_id: row.get(17)?,
            house_service_name: row.get(18)?,
            origin_partner_id: row.get(19)?,
            origin_partner_name: row.get(20)?,
        })
    }

    fn next_client_number(&self) -> String {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0)).unwrap_or(0);
        format!("CLI-{:05}", count + 1)
    }

    // actor — партнёр: всегда только свои клиенты (partner_filter игнорируется,
    // подсунуть чужой id и увидеть чужих клиентов нельзя). actor — админ и
    // partner_filter задан: клиенты конкретного партнёра (просмотр из его
    // рабочего пространства). actor — рядовой сотрудник и partner_filter задан:
    // пусто (тихий отказ, как у list_my_partner_chats). Иначе — весь список без
    // фильтра, ровно как было раньше для обычной страницы Клиентов.
    pub fn list_clients(&self, actor_id: &str, partner_filter: Option<&str>) -> Vec<ClientRecord> {
        let employee = match self.get_employee(actor_id) {
            Some(e) => e,
            None => return Vec::new(),
        };
        let (sql, scoped_id): (String, Option<String>) = if employee.is_partner {
            match employee.partner_id.clone() {
                Some(pid) => (format!("{} WHERE c.partner_id = ?1 ORDER BY c.created_at DESC", Self::CLIENT_SELECT), Some(pid)),
                None => return Vec::new(),
            }
        } else if let Some(pid) = partner_filter {
            if !self.is_admin(actor_id) {
                return Vec::new();
            }
            (format!("{} WHERE c.partner_id = ?1 ORDER BY c.created_at DESC", Self::CLIENT_SELECT), Some(pid.to_string()))
        } else {
            (format!("{} ORDER BY c.created_at DESC", Self::CLIENT_SELECT), None)
        };
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        let rows = match scoped_id {
            Some(pid) => stmt.query_map(params![pid], Self::map_client_row),
            None => stmt.query_map([], Self::map_client_row),
        };
        rows.map(|r| r.filter_map(|x| x.ok()).collect()).unwrap_or_default()
    }

    // Для отчёта по партнёру (v0.7.0) — в отличие от list_clients, включает
    // ещё и клиентов, которых у партнёра больше нет (перенесены в общую базу
    // CRM через move_client_to_crm_base), но которые у него ИЗНАЧАЛЬНО были
    // — иначе перенос молча вычёркивал бы клиента и его сумму из отчёта.
    fn list_clients_for_partner_report(&self, partner_id: &str) -> Vec<ClientRecord> {
        let sql = format!(
            "{} WHERE c.partner_id = ?1 OR (c.origin_partner_id = ?1 AND c.partner_id IS NULL) ORDER BY c.created_at DESC",
            Self::CLIENT_SELECT
        );
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        let rows = stmt.query_map(params![partner_id], Self::map_client_row);
        rows.map(|r| r.filter_map(|x| x.ok()).collect()).unwrap_or_default()
    }

    pub fn get_client(&self, actor_id: &str, id: &str) -> Option<ClientRecord> {
        let employee = self.get_employee(actor_id)?;
        let sql = format!("{} WHERE c.id = ?1", Self::CLIENT_SELECT);
        let client = self.conn.query_row(&sql, params![id], Self::map_client_row).ok()?;
        if employee.is_partner && client.partner_id != employee.partner_id {
            return None;
        }
        Some(client)
    }

    pub fn create_client(
        &self,
        actor_id: &str,
        name: &str,
        contact_person: Option<&str>,
        contact_position: Option<&str>,
        phone: Option<&str>,
        email: Option<&str>,
        address: Option<&str>,
        notes: Option<&str>,
        partner_id: Option<&str>,
        deal_value: Option<&str>,
        service_id: Option<&str>,
        house_service_id: Option<&str>,
    ) -> Result<ClientRecord, String> {
        if name.trim().is_empty() {
            return Err("Укажите название/имя клиента".into());
        }
        let employee = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        // Партнёр не может выбрать чужого/пустого владельца — сервер сам
        // проставляет его собственную организацию, чем бы ни был передан
        // partner_id с фронта.
        let effective_partner_id: Option<String> = if employee.is_partner {
            Some(employee.partner_id.clone().ok_or_else(|| "У партнёра не задана организация".to_string())?)
        } else {
            partner_id.map(str::to_string)
        };
        // Услуга заменяет свободный ввод "Стоимости" (v0.4.0, расширено в
        // v0.7.0 общим каталогом "Наши услуги") — если задана, сервер сам
        // подставляет цену из каталога, а не доверяет deal_value с фронта;
        // без партнёра услугу партнёра выбрать нельзя, деньги остаются
        // свободным текстом как раньше.
        let (effective_deal_value, effective_service_id, effective_house_service_id) =
            self.resolve_client_service_selection(effective_partner_id.as_deref(), service_id, house_service_id, deal_value)?;
        let id = Uuid::new_v4().to_string();
        let client_number = self.next_client_number();
        self.conn
            .execute(
                "INSERT INTO clients (id, client_number, name, contact_person, contact_position, phone, email, address, notes, created_by, partner_id, deal_value, service_id, house_service_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
                params![id, client_number, name.trim(), contact_person, contact_position, phone, email, address, notes, actor_id, effective_partner_id, effective_deal_value, effective_service_id, effective_house_service_id],
            )
            .map_err(|e| e.to_string())?;
        self.get_client(actor_id, &id).ok_or_else(|| "Клиент не найден".to_string())
    }

    // Общая логика для create_client/update_client: service_id (каталог
    // конкретного партнёра) и house_service_id (общий каталог "Наши услуги",
    // v0.7.0) взаимно исключающие. Если задан любой из них — сервер сам
    // подставляет цену из каталога, а не доверяет deal_value с фронта.
    // house_service_id не гейтится по роли актора — это UX-решение фронтенда
    // (какой каталог показать), не вопрос прав: house_services общий, без
    // владельца, поэтому нечего проверять на принадлежность (в отличие от
    // service_id, который обязан совпадать с effective_partner_id).
    fn resolve_client_service_selection(
        &self,
        effective_partner_id: Option<&str>,
        service_id: Option<&str>,
        house_service_id: Option<&str>,
        deal_value: Option<&str>,
    ) -> Result<(Option<String>, Option<String>, Option<String>), String> {
        if service_id.is_some() && house_service_id.is_some() {
            return Err("Нельзя одновременно выбрать услугу партнёра и услугу из общего каталога".into());
        }
        if let Some(hsid) = house_service_id {
            let svc = self.get_house_service(hsid).ok_or_else(|| "Услуга не найдена".to_string())?;
            return Ok((svc.price.clone(), None, Some(hsid.to_string())));
        }
        if let Some(sid) = service_id {
            let svc = self.get_partner_service(sid).ok_or_else(|| "Услуга не найдена".to_string())?;
            let target = effective_partner_id.ok_or_else(|| "Услугу можно выбрать только для клиента партнёра".to_string())?;
            if svc.partner_id != target {
                return Err("Услуга принадлежит другому партнёру".into());
            }
            return Ok((svc.price.clone(), Some(sid.to_string()), None));
        }
        Ok((deal_value.map(str::to_string), None, None))
    }

    pub fn update_client(
        &self,
        actor_id: &str,
        id: &str,
        name: &str,
        contact_person: Option<&str>,
        contact_position: Option<&str>,
        phone: Option<&str>,
        email: Option<&str>,
        address: Option<&str>,
        notes: Option<&str>,
        partner_id: Option<&str>,
        deal_value: Option<&str>,
        service_id: Option<&str>,
        house_service_id: Option<&str>,
    ) -> Result<ClientRecord, String> {
        if name.trim().is_empty() {
            return Err("Укажите название/имя клиента".into());
        }
        let employee = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        let existing = self.get_client(actor_id, id).ok_or_else(|| "Клиент не найден или недоступен".to_string())?;
        let effective_partner_id: Option<String> = if employee.is_partner {
            if existing.partner_id != employee.partner_id {
                return Err("Недостаточно прав".into());
            }
            existing.partner_id.clone()
        } else {
            partner_id.map(str::to_string)
        };
        let (effective_deal_value, effective_service_id, effective_house_service_id) =
            self.resolve_client_service_selection(effective_partner_id.as_deref(), service_id, house_service_id, deal_value)?;
        self.conn
            .execute(
                "UPDATE clients SET name = ?1, contact_person = ?2, contact_position = ?3, phone = ?4, email = ?5, address = ?6, notes = ?7, partner_id = ?8, deal_value = ?9, service_id = ?10, house_service_id = ?11 WHERE id = ?12",
                params![name.trim(), contact_person, contact_position, phone, email, address, notes, effective_partner_id, effective_deal_value, effective_service_id, effective_house_service_id, id],
            )
            .map_err(|e| e.to_string())?;
        self.get_client(actor_id, id).ok_or_else(|| "Клиент не найден".to_string())
    }

    pub fn delete_client(&self, admin_id: &str, id: &str) -> Result<(), String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute("DELETE FROM client_history WHERE client_id = ?1", params![id]).map_err(|e| e.to_string())?;
        self.conn.execute("DELETE FROM clients WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // Перенос клиента партнёра в общую базу CRM (v0.7.0) — необратимо из UI:
    // partner_id обнуляется (клиент пропадает из личного кабинета партнёра),
    // origin_partner_id запоминает, откуда клиент пришёл (для пометки в
    // интерфейсе и учёта в отчёте партнёра, см. list_clients_for_partner_report).
    // service_id/house_service_id тоже обнуляются: деньги уже зафиксированы в
    // deal_value (снимок цены на момент выбора услуги), а держать ссылку на
    // каталог услуг партнёра, от которого клиент отвязан, не нужно — это же
    // предотвращает ошибку "Услугу можно выбрать только для клиента партнёра"
    // при следующем обычном update_client, если поле не передать явно как null.
    pub fn move_client_to_crm_base(&self, admin_id: &str, id: &str) -> Result<ClientRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        let existing = self.get_client(admin_id, id).ok_or_else(|| "Клиент не найден".to_string())?;
        let origin_partner_id = existing.partner_id.clone().ok_or_else(|| "Клиент уже в базе CRM".to_string())?;
        self.conn
            .execute(
                "UPDATE clients SET partner_id = NULL, service_id = NULL, house_service_id = NULL, origin_partner_id = ?1 WHERE id = ?2",
                params![origin_partner_id, id],
            )
            .map_err(|e| e.to_string())?;
        self.get_client(admin_id, id).ok_or_else(|| "Клиент не найден".to_string())
    }

    pub fn list_client_history(&self, actor_id: &str, client_id: &str) -> Vec<ClientHistoryRecord> {
        if self.get_client(actor_id, client_id).is_none() {
            return Vec::new();
        }
        let mut stmt = match self.conn.prepare(
            "SELECT h.id, h.client_id, h.description, h.created_by, e.full_name, h.created_at
             FROM client_history h
             LEFT JOIN employees e ON e.id = h.created_by
             WHERE h.client_id = ?1
             ORDER BY h.created_at DESC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![client_id], |row| {
            Ok(ClientHistoryRecord {
                id: row.get(0)?,
                client_id: row.get(1)?,
                description: row.get(2)?,
                created_by: row.get(3)?,
                created_by_name: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    pub fn add_client_history(&self, client_id: &str, actor_id: &str, description: &str) -> Result<ClientHistoryRecord, String> {
        self.get_client(actor_id, client_id).ok_or_else(|| "Клиент не найден или недоступен".to_string())?;
        if description.trim().is_empty() {
            return Err("Пустая запись".into());
        }
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO client_history (id, client_id, description, created_by) VALUES (?1, ?2, ?3, ?4)",
                params![id, client_id, description.trim(), actor_id],
            )
            .map_err(|e| e.to_string())?;

        let (created_by_name,): (Option<String>,) = self
            .conn
            .query_row("SELECT full_name FROM employees WHERE id = ?1", params![actor_id], |row| Ok((row.get(0)?,)))
            .unwrap_or((None,));

        Ok(ClientHistoryRecord {
            id,
            client_id: client_id.to_string(),
            description: description.trim().to_string(),
            created_by: Some(actor_id.to_string()),
            created_by_name,
            created_at: String::new(),
        })
    }

    // ---- Проекты ----
    // Владелец ("главный над проектом") хранится отдельным полем projects.owner_id
    // (можно передать другому — project_ownership_transfers ведёт историю передач),
    // но владелец также всегда состоит в project_members — чтобы не городить спецкейсы
    // на каждом шагу (отображение в составе, право писать в чат и т.д.).
    // Управлять проектом (редактировать, добавлять/убирать участников, передавать
    // главенство) может владелец или админ. Удаление — только админ.

    const PROJECT_SELECT: &'static str = "SELECT
            p.id, p.project_number, p.name, p.description, p.client_id, c.name,
            p.owner_id, o.full_name, p.status, p.created_by, cb.full_name,
            p.created_at, p.updated_at,
            (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id)
        FROM projects p
        LEFT JOIN clients c ON c.id = p.client_id
        LEFT JOIN employees o ON o.id = p.owner_id
        LEFT JOIN employees cb ON cb.id = p.created_by";

    fn map_project_row(row: &rusqlite::Row) -> rusqlite::Result<ProjectRecord> {
        Ok(ProjectRecord {
            id: row.get(0)?,
            project_number: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            client_id: row.get(4)?,
            client_name: row.get(5)?,
            owner_id: row.get(6)?,
            owner_name: row.get::<_, Option<String>>(7)?.unwrap_or_default(),
            status: row.get(8)?,
            created_by: row.get(9)?,
            created_by_name: row.get(10)?,
            created_at: row.get(11)?,
            updated_at: row.get(12)?,
            member_count: row.get(13)?,
        })
    }

    fn next_project_number(&self) -> String {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM projects", [], |row| row.get(0)).unwrap_or(0);
        format!("PRJ-{:05}", count + 1)
    }

    fn can_manage_project(&self, actor_id: &str, owner_id: &str) -> bool {
        self.is_admin(actor_id) || owner_id == actor_id
    }

    // Добавлять новых участников в проект может владелец (создатель) или
    // тот, кому владелец назначил роль "Помощник" — обычный "Участник"
    // добавлять других не может. По прямому запросу пользователя.
    fn can_add_project_members(&self, actor_id: &str, project: &ProjectRecord) -> bool {
        if self.is_admin(actor_id) || project.owner_id == actor_id {
            return true;
        }
        self.conn
            .query_row(
                "SELECT role_in_project FROM project_members WHERE project_id = ?1 AND employee_id = ?2",
                params![project.id, actor_id],
                |row| row.get::<_, String>(0),
            )
            .map(|role| role == "assistant")
            .unwrap_or(false)
    }

    fn is_project_participant(&self, actor_id: &str, project: &ProjectRecord) -> bool {
        if self.is_admin(actor_id) || project.owner_id == actor_id {
            return true;
        }
        self.conn
            .query_row(
                "SELECT 1 FROM project_members WHERE project_id = ?1 AND employee_id = ?2",
                params![project.id, actor_id],
                |_| Ok(()),
            )
            .is_ok()
    }

    pub fn list_projects(&self) -> Vec<ProjectRecord> {
        let sql = format!("{} ORDER BY p.created_at DESC", Self::PROJECT_SELECT);
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map([], Self::map_project_row)
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default()
    }

    pub fn get_project(&self, id: &str) -> Option<ProjectRecord> {
        let sql = format!("{} WHERE p.id = ?1", Self::PROJECT_SELECT);
        self.conn.query_row(&sql, params![id], Self::map_project_row).ok()
    }

    pub fn create_project(
        &self,
        actor_id: &str,
        name: &str,
        description: Option<&str>,
        client_id: Option<&str>,
        status: &str,
    ) -> Result<ProjectRecord, String> {
        if name.trim().is_empty() {
            return Err("Укажите название проекта".into());
        }
        if !["planning", "active", "on_hold", "completed", "cancelled"].contains(&status) {
            return Err("Некорректный статус проекта".into());
        }

        let id = Uuid::new_v4().to_string();
        let project_number = self.next_project_number();
        self.conn
            .execute(
                "INSERT INTO projects (id, project_number, name, description, client_id, owner_id, status, created_by)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![id, project_number, name.trim(), description, client_id, actor_id, status, actor_id],
            )
            .map_err(|e| e.to_string())?;

        self.conn
            .execute(
                "INSERT OR IGNORE INTO project_members (project_id, employee_id, role_in_project, added_by)
                 VALUES (?1, ?2, 'member', ?2)",
                params![id, actor_id],
            )
            .ok();

        if let Some(cid) = client_id {
            let title = format!("Создан проект «{}»", name.trim());
            let _ = self.add_client_history(cid, actor_id, &title);
        }

        self.get_project(&id).ok_or_else(|| "Проект не найден".to_string())
    }

    pub fn update_project(
        &self,
        actor_id: &str,
        id: &str,
        name: &str,
        description: Option<&str>,
        client_id: Option<&str>,
        status: &str,
    ) -> Result<ProjectRecord, String> {
        let project = self.get_project(id).ok_or_else(|| "Проект не найден".to_string())?;
        if !self.can_manage_project(actor_id, &project.owner_id) {
            return Err("Недостаточно прав для редактирования проекта".into());
        }
        if name.trim().is_empty() {
            return Err("Укажите название проекта".into());
        }
        if !["planning", "active", "on_hold", "completed", "cancelled"].contains(&status) {
            return Err("Некорректный статус проекта".into());
        }

        self.conn
            .execute(
                "UPDATE projects SET name = ?1, description = ?2, client_id = ?3, status = ?4, updated_at = datetime('now') WHERE id = ?5",
                params![name.trim(), description, client_id, status, id],
            )
            .map_err(|e| e.to_string())?;

        self.get_project(id).ok_or_else(|| "Проект не найден".to_string())
    }

    pub fn delete_project(&self, admin_id: &str, id: &str) -> Result<(), String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute("DELETE FROM project_chat_messages WHERE project_id = ?1", params![id]).ok();
        self.conn.execute("DELETE FROM project_ownership_transfers WHERE project_id = ?1", params![id]).ok();
        self.conn.execute("DELETE FROM project_members WHERE project_id = ?1", params![id]).ok();
        self.conn.execute("DELETE FROM projects WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_project_members(&self, project_id: &str) -> Vec<ProjectMemberRecord> {
        let owner_id: Option<String> = self
            .conn
            .query_row("SELECT owner_id FROM projects WHERE id = ?1", params![project_id], |row| row.get(0))
            .ok();
        let mut stmt = match self.conn.prepare(
            "SELECT pm.employee_id, e.full_name, pm.role_in_project, pm.added_at
             FROM project_members pm JOIN employees e ON e.id = pm.employee_id
             WHERE pm.project_id = ?1 ORDER BY pm.added_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![project_id], |row| {
            let employee_id: String = row.get(0)?;
            let is_owner = owner_id.as_deref() == Some(employee_id.as_str());
            Ok(ProjectMemberRecord {
                employee_id,
                employee_name: row.get(1)?,
                role_in_project: row.get(2)?,
                is_owner,
                added_at: row.get(3)?,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    pub fn add_project_member(&self, actor_id: &str, project_id: &str, employee_id: &str, role: &str) -> Result<(), String> {
        let project = self.get_project(project_id).ok_or_else(|| "Проект не найден".to_string())?;
        if !self.can_add_project_members(actor_id, &project) {
            return Err("Добавлять участников может только владелец проекта или помощник".into());
        }
        if !["member", "assistant"].contains(&role) {
            return Err("Некорректная роль".into());
        }
        // Партнёрские аккаунты работают только через свои отдельные
        // partner_regulations — у обычных проектов/регламентов CRM свой
        // состав участников, партнёра туда добавлять нельзя (см. также
        // add_regulation_member).
        let member = self.get_employee(employee_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        if member.is_partner {
            return Err("Партнёра нельзя добавить в проект — у партнёров свои отдельные регламенты".into());
        }
        self.conn
            .execute(
                "INSERT INTO project_members (project_id, employee_id, role_in_project, added_by)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(project_id, employee_id) DO UPDATE SET role_in_project = excluded.role_in_project",
                params![project_id, employee_id, role, actor_id],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn remove_project_member(&self, actor_id: &str, project_id: &str, employee_id: &str) -> Result<(), String> {
        let project = self.get_project(project_id).ok_or_else(|| "Проект не найден".to_string())?;
        if !self.can_manage_project(actor_id, &project.owner_id) {
            return Err("Недостаточно прав".into());
        }
        if project.owner_id == employee_id {
            return Err("Сначала передайте главенство над проектом другому участнику".into());
        }
        self.conn
            .execute("DELETE FROM project_members WHERE project_id = ?1 AND employee_id = ?2", params![project_id, employee_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn transfer_project_ownership(&self, actor_id: &str, project_id: &str, new_owner_id: &str) -> Result<ProjectRecord, String> {
        let project = self.get_project(project_id).ok_or_else(|| "Проект не найден".to_string())?;
        if !self.can_manage_project(actor_id, &project.owner_id) {
            return Err("Недостаточно прав".into());
        }
        if project.owner_id == new_owner_id {
            return Err("Этот сотрудник уже является владельцем проекта".into());
        }

        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO project_ownership_transfers (id, project_id, from_employee_id, to_employee_id) VALUES (?1, ?2, ?3, ?4)",
                params![id, project_id, project.owner_id, new_owner_id],
            )
            .map_err(|e| e.to_string())?;

        self.conn
            .execute(
                "UPDATE projects SET owner_id = ?1, updated_at = datetime('now') WHERE id = ?2",
                params![new_owner_id, project_id],
            )
            .map_err(|e| e.to_string())?;

        self.conn
            .execute(
                "INSERT OR IGNORE INTO project_members (project_id, employee_id, role_in_project, added_by) VALUES (?1, ?2, 'member', ?3)",
                params![project_id, new_owner_id, actor_id],
            )
            .ok();

        let title = format!("Вам передан проект «{}»", project.name);
        self.notify(new_owner_id, "project_ownership_transfer", &title, None, Some("project"), Some(project_id));

        self.get_project(project_id).ok_or_else(|| "Проект не найден".to_string())
    }

    pub fn list_project_chat(&self, project_id: &str) -> Vec<ProjectChatMessageRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT m.id, m.project_id, m.sender_id, e.full_name, m.target_employee_id, t.full_name,
                    m.content, m.attachment_data, m.attachment_name, m.deadline, m.status, m.created_at,
                    (SELECT COUNT(*) FROM project_chat_replies r WHERE r.message_id = m.id),
                    m.edited_at, m.is_deleted
             FROM project_chat_messages m
             JOIN employees e ON e.id = m.sender_id
             JOIN employees t ON t.id = m.target_employee_id
             WHERE m.project_id = ?1 ORDER BY m.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![project_id], |row| {
            let is_deleted: bool = row.get(14)?;
            Ok(ProjectChatMessageRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                sender_id: row.get(2)?,
                sender_name: row.get(3)?,
                target_employee_id: row.get(4)?,
                target_name: row.get(5)?,
                content: if is_deleted { String::new() } else { row.get(6)? },
                attachment_data: if is_deleted { None } else { row.get(7)? },
                attachment_name: if is_deleted { None } else { row.get(8)? },
                deadline: row.get(9)?,
                status: row.get(10)?,
                created_at: row.get(11)?,
                reply_count: row.get(12)?,
                edited_at: row.get(13)?,
                is_deleted,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    pub fn send_project_chat_message(
        &self,
        actor_id: &str,
        project_id: &str,
        target_employee_id: &str,
        content: &str,
        attachment_data: Option<&str>,
        attachment_name: Option<&str>,
        deadline: Option<&str>,
    ) -> Result<ProjectChatMessageRecord, String> {
        let project = self.get_project(project_id).ok_or_else(|| "Проект не найден".to_string())?;
        if !self.is_project_participant(actor_id, &project) {
            return Err("Вы не участник этого проекта".into());
        }
        let is_manager = self.can_manage_project(actor_id, &project.owner_id);
        if target_employee_id != actor_id && !is_manager {
            return Err("Только владелец проекта может ставить задачи другим участникам".into());
        }
        if content.trim().is_empty() {
            return Err("Пустое сообщение".into());
        }

        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO project_chat_messages (id, project_id, sender_id, target_employee_id, content, attachment_data, attachment_name, deadline)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![id, project_id, actor_id, target_employee_id, content.trim(), attachment_data, attachment_name, deadline],
            )
            .map_err(|e| e.to_string())?;

        if target_employee_id != actor_id {
            let title = format!("Вам поставили задачу в проекте «{}»", project.name);
            self.notify(target_employee_id, "project_message_assigned", &title, Some(content.trim()), Some("project"), Some(project_id));
        }

        let sender_name: Option<String> = self.conn
            .query_row("SELECT full_name FROM employees WHERE id = ?1", params![actor_id], |row| row.get(0))
            .ok();
        let target_name: Option<String> = self.conn
            .query_row("SELECT full_name FROM employees WHERE id = ?1", params![target_employee_id], |row| row.get(0))
            .ok();

        Ok(ProjectChatMessageRecord {
            id,
            project_id: project_id.to_string(),
            sender_id: actor_id.to_string(),
            sender_name: sender_name.unwrap_or_default(),
            target_employee_id: target_employee_id.to_string(),
            target_name: target_name.unwrap_or_default(),
            content: content.trim().to_string(),
            attachment_data: attachment_data.map(str::to_string),
            attachment_name: attachment_name.map(str::to_string),
            deadline: deadline.map(str::to_string),
            status: "open".to_string(),
            created_at: String::new(),
            reply_count: 0,
            edited_at: None,
            is_deleted: false,
        })
    }

    // Редактирование/удаление своего сообщения проекта — строго отправитель
    // (в отличие от assign_project_chat_message/update_project_chat_message_status
    // выше, где ещё и владелец проекта/админ могут управлять статусом/
    // исполнителем — тут именно "своё"). Правит только текст.
    pub fn edit_project_chat_message(&self, actor_id: &str, message_id: &str, content: &str) -> Result<ProjectChatMessageRecord, String> {
        let (sender_id, project_id, is_deleted): (String, String, bool) = self
            .conn
            .query_row(
                "SELECT sender_id, project_id, is_deleted FROM project_chat_messages WHERE id = ?1",
                params![message_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "Сообщение не найдено".to_string())?;
        if sender_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        if is_deleted {
            return Err("Сообщение удалено".into());
        }
        let content = content.trim();
        if content.is_empty() {
            return Err("Сообщение не может быть пустым".into());
        }
        self.conn
            .execute(
                "UPDATE project_chat_messages SET content = ?1, edited_at = datetime('now') WHERE id = ?2",
                params![content, message_id],
            )
            .map_err(|e| e.to_string())?;
        self.list_project_chat(&project_id)
            .into_iter()
            .find(|m| m.id == message_id)
            .ok_or_else(|| "Сообщение не найдено".to_string())
    }

    pub fn delete_project_chat_message(&self, actor_id: &str, message_id: &str) -> Result<(), String> {
        let sender_id: String = self
            .conn
            .query_row("SELECT sender_id FROM project_chat_messages WHERE id = ?1", params![message_id], |row| row.get(0))
            .map_err(|_| "Сообщение не найдено".to_string())?;
        if sender_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn
            .execute("UPDATE project_chat_messages SET is_deleted = 1 WHERE id = ?1", params![message_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Для Telegram-уведомления (v0.5.3) — см. get_regulation_entry, тот же приём.
    pub fn get_project_chat_message(&self, message_id: &str) -> Option<ProjectChatMessageRecord> {
        let project_id: String = self.conn.query_row("SELECT project_id FROM project_chat_messages WHERE id = ?1", params![message_id], |row| row.get(0)).ok()?;
        self.list_project_chat(&project_id).into_iter().find(|m| m.id == message_id)
    }

    pub fn assign_project_chat_message(&self, actor_id: &str, message_id: &str, target_employee_id: &str, deadline: Option<&str>) -> Result<(), String> {
        let (project_id, sender_id): (String, String) = self.conn
            .query_row("SELECT project_id, sender_id FROM project_chat_messages WHERE id = ?1", params![message_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|_| "Сообщение не найдено".to_string())?;
        let project = self.get_project(&project_id).ok_or_else(|| "Проект не найден".to_string())?;
        if !self.can_manage_project(actor_id, &project.owner_id) && sender_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        let is_target_member = project.owner_id == target_employee_id || self.conn
            .query_row("SELECT 1 FROM project_members WHERE project_id = ?1 AND employee_id = ?2", params![project_id, target_employee_id], |_| Ok(()))
            .is_ok();
        if !is_target_member {
            return Err("Получатель должен быть участником проекта".into());
        }
        self.conn.execute(
            "UPDATE project_chat_messages SET target_employee_id = ?1, deadline = ?2 WHERE id = ?3",
            params![target_employee_id, deadline, message_id],
        ).map_err(|e| e.to_string())?;

        if target_employee_id != actor_id {
            let title = format!("Вам передали задачу в проекте «{}»", project.name);
            self.notify(target_employee_id, "project_message_assigned", &title, None, Some("project"), Some(&project_id));
        }
        Ok(())
    }

    pub fn update_project_chat_message_status(&self, actor_id: &str, message_id: &str, new_status: &str) -> Result<(), String> {
        if !["open", "done", "cancelled"].contains(&new_status) {
            return Err("Некорректный статус задачи".into());
        }
        let (project_id, sender_id, target_employee_id): (String, String, String) = self.conn
            .query_row(
                "SELECT project_id, sender_id, target_employee_id FROM project_chat_messages WHERE id = ?1",
                params![message_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "Сообщение не найдено".to_string())?;
        let project = self.get_project(&project_id).ok_or_else(|| "Проект не найден".to_string())?;
        // Исполнитель (target_employee_id) тоже может закрыть СВОЮ задачу
        // (v0.5.3) — см. тот же комментарий в update_entry_status.
        if !self.can_manage_project(actor_id, &project.owner_id) && sender_id != actor_id && target_employee_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        // Задачу, порученную коллеге (target_employee_id != sender_id), после
        // выполнения возвращаем обратно в тред того, кто её поставил — иначе
        // она навсегда остаётся в треде исполнителя, и постановщик никак не
        // узнаёт о завершении, кроме как вручную заходя в чужой тред (см.
        // журнал v0.2.25 в docs/TZ.md). Ответы/комментарии никуда переносить
        // не нужно — они привязаны к message_id, а не к target_employee_id, и
        // "переезжают" вместе с записью автоматически.
        if new_status == "done" && target_employee_id != sender_id {
            self.conn
                .execute(
                    "UPDATE project_chat_messages SET status = ?1, target_employee_id = ?2 WHERE id = ?3",
                    params![new_status, sender_id, message_id],
                )
                .map_err(|e| e.to_string())?;
            if sender_id != actor_id {
                let title = format!("Задача выполнена и возвращена вам в проекте «{}»", project.name);
                self.notify(&sender_id, "project_message_assigned", &title, None, Some("project"), Some(&project_id));
            }
        } else {
            self.conn
                .execute("UPDATE project_chat_messages SET status = ?1 WHERE id = ?2", params![new_status, message_id])
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn list_project_chat_replies(&self, message_id: &str) -> Vec<ProjectChatReplyRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT r.id, r.message_id, r.author_id, e.full_name, r.content, r.created_at, r.edited_at, r.is_deleted
             FROM project_chat_replies r JOIN employees e ON e.id = r.author_id
             WHERE r.message_id = ?1 ORDER BY r.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![message_id], |row| {
            let is_deleted: bool = row.get(7)?;
            Ok(ProjectChatReplyRecord {
                id: row.get(0)?,
                message_id: row.get(1)?,
                author_id: row.get(2)?,
                author_name: row.get(3)?,
                content: if is_deleted { String::new() } else { row.get(4)? },
                created_at: row.get(5)?,
                edited_at: row.get(6)?,
                is_deleted,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    pub fn add_project_chat_reply(&self, actor_id: &str, message_id: &str, content: &str) -> Result<ProjectChatReplyRecord, String> {
        if content.trim().is_empty() {
            return Err("Ответ не может быть пустым".into());
        }
        let project_id: String = self.conn
            .query_row("SELECT project_id FROM project_chat_messages WHERE id = ?1", params![message_id], |row| row.get(0))
            .map_err(|_| "Сообщение не найдено".to_string())?;
        let project = self.get_project(&project_id).ok_or_else(|| "Проект не найден".to_string())?;
        if !self.is_project_participant(actor_id, &project) {
            return Err("Вы не участник этого проекта".into());
        }

        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO project_chat_replies (id, message_id, author_id, content) VALUES (?1, ?2, ?3, ?4)",
                params![id, message_id, actor_id, content.trim()],
            )
            .map_err(|e| e.to_string())?;

        let author_name: Option<String> = self.conn
            .query_row("SELECT full_name FROM employees WHERE id = ?1", params![actor_id], |row| row.get(0))
            .ok();

        Ok(ProjectChatReplyRecord {
            id,
            message_id: message_id.to_string(),
            author_id: actor_id.to_string(),
            author_name: author_name.unwrap_or_default(),
            content: content.trim().to_string(),
            created_at: String::new(),
            edited_at: None,
            is_deleted: false,
        })
    }

    pub fn edit_project_chat_reply(&self, actor_id: &str, reply_id: &str, content: &str) -> Result<ProjectChatReplyRecord, String> {
        let (author_id, message_id, is_deleted): (String, String, bool) = self
            .conn
            .query_row(
                "SELECT author_id, message_id, is_deleted FROM project_chat_replies WHERE id = ?1",
                params![reply_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "Ответ не найден".to_string())?;
        if author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        if is_deleted {
            return Err("Ответ удалён".into());
        }
        let content = content.trim();
        if content.is_empty() {
            return Err("Ответ не может быть пустым".into());
        }
        self.conn
            .execute(
                "UPDATE project_chat_replies SET content = ?1, edited_at = datetime('now') WHERE id = ?2",
                params![content, reply_id],
            )
            .map_err(|e| e.to_string())?;
        self.list_project_chat_replies(&message_id)
            .into_iter()
            .find(|r| r.id == reply_id)
            .ok_or_else(|| "Ответ не найден".to_string())
    }

    pub fn delete_project_chat_reply(&self, actor_id: &str, reply_id: &str) -> Result<(), String> {
        let author_id: String = self
            .conn
            .query_row("SELECT author_id FROM project_chat_replies WHERE id = ?1", params![reply_id], |row| row.get(0))
            .map_err(|_| "Ответ не найден".to_string())?;
        if author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn
            .execute("UPDATE project_chat_replies SET is_deleted = 1 WHERE id = ?1", params![reply_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // ---- Регламенты ----
    // Регламент — внутренний рабочий документ с лентой записей/задач, ответами
    // сотрудников, вложениями и сроками. Каждый регламент имеет:
    // — уникальный числовой номер REG-00001 для идентификации;
    // — slug (короткая текстовая метка) для ссылок между регламентами;
    // — ответственного (owner), участников с ролями, и опционально — привязку к клиенту.

    const REGULATION_SELECT: &'static str = "SELECT
            r.id, r.reg_number, r.slug, r.title, r.description,
            r.client_id, c.name,
            r.owner_id, o.full_name,
            r.status, r.deadline, r.closed_at,
            r.created_by, cb.full_name,
            r.created_at, r.updated_at,
            (SELECT COUNT(*) FROM regulation_members rm WHERE rm.regulation_id = r.id),
            (SELECT COUNT(*) FROM regulation_entries re WHERE re.regulation_id = r.id)
        FROM regulations r
        LEFT JOIN clients c ON c.id = r.client_id
        LEFT JOIN employees o ON o.id = r.owner_id
        LEFT JOIN employees cb ON cb.id = r.created_by";

    fn map_regulation_row(row: &rusqlite::Row) -> rusqlite::Result<RegulationRecord> {
        Ok(RegulationRecord {
            id: row.get(0)?,
            reg_number: row.get(1)?,
            slug: row.get(2)?,
            title: row.get(3)?,
            description: row.get(4)?,
            client_id: row.get(5)?,
            client_name: row.get(6)?,
            owner_id: row.get(7)?,
            owner_name: row.get::<_, Option<String>>(8)?.unwrap_or_default(),
            status: row.get(9)?,
            deadline: row.get(10)?,
            closed_at: row.get(11)?,
            created_by: row.get(12)?,
            created_by_name: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
            member_count: row.get(16)?,
            entry_count: row.get(17)?,
        })
    }

    fn next_reg_number(&self) -> String {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM regulations", [], |row| row.get(0)).unwrap_or(0);
        format!("REG-{:05}", count + 1)
    }

    fn make_slug(&self, title: &str, id: &str) -> String {
        // Slug из первых 6 символов id (уникально) + первые слова заголовка
        let short_id = &id[..6];
        let words: String = title
            .chars()
            .filter(|c| c.is_alphanumeric() || c.is_whitespace())
            .collect::<String>()
            .split_whitespace()
            .take(3)
            .collect::<Vec<_>>()
            .join("-")
            .to_lowercase();
        if words.is_empty() {
            short_id.to_string()
        } else {
            format!("{}-{}", short_id, words)
        }
    }

    pub fn list_regulations(&self) -> Vec<RegulationRecord> {
        let sql = format!("{} ORDER BY r.updated_at DESC", Self::REGULATION_SELECT);
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map([], Self::map_regulation_row)
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default()
    }

    pub fn get_regulation(&self, id: &str) -> Option<RegulationRecord> {
        let sql = format!("{} WHERE r.id = ?1 OR r.slug = ?1 OR r.reg_number = ?1", Self::REGULATION_SELECT);
        self.conn.query_row(&sql, params![id], Self::map_regulation_row).ok()
    }

    pub fn create_regulation(
        &self,
        actor_id: &str,
        title: &str,
        description: Option<&str>,
        client_id: Option<&str>,
        deadline: Option<&str>,
    ) -> Result<RegulationRecord, String> {
        if title.trim().is_empty() {
            return Err("Укажите название регламента".into());
        }
        let id = Uuid::new_v4().to_string();
        let reg_number = self.next_reg_number();
        let slug = self.make_slug(title.trim(), &id);

        self.conn
            .execute(
                "INSERT INTO regulations (id, reg_number, slug, title, description, client_id, owner_id, deadline, created_by)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![id, reg_number, slug, title.trim(), description, client_id, actor_id, deadline, actor_id],
            )
            .map_err(|e| e.to_string())?;

        self.conn
            .execute(
                "INSERT OR IGNORE INTO regulation_members (regulation_id, employee_id, role_in_reg, added_by) VALUES (?1, ?2, 'owner', ?2)",
                params![id, actor_id],
            )
            .ok();

        self.get_regulation(&id).ok_or_else(|| "Регламент не найден".to_string())
    }

    pub fn update_regulation(
        &self,
        actor_id: &str,
        id: &str,
        title: &str,
        description: Option<&str>,
        client_id: Option<&str>,
        deadline: Option<&str>,
        status: &str,
    ) -> Result<RegulationRecord, String> {
        let reg = self.get_regulation(id).ok_or_else(|| "Регламент не найден".to_string())?;
        if !self.is_admin(actor_id) && reg.owner_id != actor_id {
            return Err("Недостаточно прав для редактирования регламента".into());
        }
        if title.trim().is_empty() {
            return Err("Укажите название регламента".into());
        }
        if !["active", "closed"].contains(&status) {
            return Err("Некорректный статус".into());
        }

        let closed_at = if status == "closed" && reg.status != "closed" {
            "datetime('now')"
        } else if status == "active" {
            "NULL"
        } else {
            "closed_at"
        };

        let sql = format!(
            "UPDATE regulations SET title = ?1, description = ?2, client_id = ?3, deadline = ?4, status = ?5, closed_at = {}, updated_at = datetime('now') WHERE id = ?6",
            closed_at
        );
        self.conn.execute(&sql, params![title.trim(), description, client_id, deadline, status, id])
            .map_err(|e| e.to_string())?;

        self.get_regulation(id).ok_or_else(|| "Регламент не найден".to_string())
    }

    pub fn delete_regulation(&self, admin_id: &str, id: &str) -> Result<(), String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute("DELETE FROM regulation_replies WHERE entry_id IN (SELECT id FROM regulation_entries WHERE regulation_id = ?1)", params![id]).ok();
        self.conn.execute("DELETE FROM regulation_entries WHERE regulation_id = ?1", params![id]).ok();
        self.conn.execute("DELETE FROM regulation_members WHERE regulation_id = ?1", params![id]).ok();
        self.conn.execute("DELETE FROM regulations WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // Добавлять новых участников в регламент может владелец (создатель) или
    // тот, кому владелец назначил роль "Помощник" — обычный "Участник"
    // добавлять других не может. По прямому запросу пользователя, зеркально
    // такому же правилу для проектов (см. can_add_project_members).
    fn can_add_regulation_members(&self, actor_id: &str, reg: &RegulationRecord) -> bool {
        if self.is_admin(actor_id) || reg.owner_id == actor_id {
            return true;
        }
        self.conn
            .query_row(
                "SELECT role_in_reg FROM regulation_members WHERE regulation_id = ?1 AND employee_id = ?2",
                params![reg.id, actor_id],
                |row| row.get::<_, String>(0),
            )
            .map(|role| role == "assistant")
            .unwrap_or(false)
    }

    pub fn list_regulation_members(&self, regulation_id: &str) -> Vec<RegulationMemberRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT rm.employee_id, e.full_name, rm.role_in_reg, rm.added_at
             FROM regulation_members rm JOIN employees e ON e.id = rm.employee_id
             WHERE rm.regulation_id = ?1 ORDER BY rm.added_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![regulation_id], |row| {
            Ok(RegulationMemberRecord {
                employee_id: row.get(0)?,
                employee_name: row.get(1)?,
                role_in_reg: row.get(2)?,
                added_at: row.get(3)?,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    pub fn add_regulation_member(&self, actor_id: &str, regulation_id: &str, employee_id: &str, role: &str) -> Result<(), String> {
        let reg = self.get_regulation(regulation_id).ok_or_else(|| "Регламент не найден".to_string())?;
        if !self.can_add_regulation_members(actor_id, &reg) {
            return Err("Добавлять участников может только владелец регламента или помощник".into());
        }
        if !["member", "assistant"].contains(&role) {
            return Err("Некорректная роль".into());
        }
        // Партнёрские аккаунты работают только через свои отдельные
        // partner_regulations — у обычных регламентов CRM свой состав
        // участников, партнёра туда добавлять нельзя.
        let member = self.get_employee(employee_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        if member.is_partner {
            return Err("Партнёра нельзя добавить в регламент — у партнёров свои отдельные регламенты".into());
        }
        self.conn
            .execute(
                "INSERT INTO regulation_members (regulation_id, employee_id, role_in_reg, added_by)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(regulation_id, employee_id) DO UPDATE SET role_in_reg = excluded.role_in_reg",
                params![regulation_id, employee_id, role, actor_id],
            )
            .map_err(|e| e.to_string())?;

        // Уведомляем добавленного участника
        if employee_id != actor_id {
            let title = format!("Вас добавили в регламент «{}»", reg.title);
            self.notify(employee_id, "regulation_member_added", &title, None, Some("regulation"), Some(regulation_id));
        }

        Ok(())
    }

    pub fn remove_regulation_member(&self, actor_id: &str, regulation_id: &str, employee_id: &str) -> Result<(), String> {
        let reg = self.get_regulation(regulation_id).ok_or_else(|| "Регламент не найден".to_string())?;
        if !self.is_admin(actor_id) && reg.owner_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        if reg.owner_id == employee_id {
            return Err("Нельзя убрать ответственного из регламента".into());
        }
        self.conn
            .execute("DELETE FROM regulation_members WHERE regulation_id = ?1 AND employee_id = ?2", params![regulation_id, employee_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_regulation_entries(&self, regulation_id: &str) -> Vec<RegulationEntryRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT e.id, e.regulation_id, e.author_id, a.full_name, e.target_employee_id, t.full_name,
                    e.content, e.attachment_data, e.attachment_name, e.deadline, e.status,
                    e.created_at, e.updated_at,
                    (SELECT COUNT(*) FROM regulation_replies rr WHERE rr.entry_id = e.id),
                    e.edited_at, e.is_deleted
             FROM regulation_entries e
             JOIN employees a ON a.id = e.author_id
             JOIN employees t ON t.id = e.target_employee_id
             WHERE e.regulation_id = ?1 ORDER BY e.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![regulation_id], |row| {
            let is_deleted: bool = row.get(15)?;
            Ok(RegulationEntryRecord {
                id: row.get(0)?,
                regulation_id: row.get(1)?,
                author_id: row.get(2)?,
                author_name: row.get(3)?,
                target_employee_id: row.get(4)?,
                target_name: row.get(5)?,
                content: if is_deleted { String::new() } else { row.get(6)? },
                attachment_data: if is_deleted { None } else { row.get(7)? },
                attachment_name: if is_deleted { None } else { row.get(8)? },
                deadline: row.get(9)?,
                status: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                reply_count: row.get(13)?,
                edited_at: row.get(14)?,
                is_deleted,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    // Открытые задачи сотрудника по всем регламентам сразу — для виджета
    // "Мои срочные задачи" на дашборде. Сортировка: без дедлайна — в конец,
    // иначе ближайший дедлайн первым (просроченные тоже окажутся первыми,
    // т.к. их дата раньше текущей).
    pub fn list_my_open_tasks(&self, employee_id: &str) -> Vec<MyTaskRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT e.id, e.regulation_id, r.reg_number, r.title, r.slug, e.content, e.deadline, e.created_at
             FROM regulation_entries e
             JOIN regulations r ON r.id = e.regulation_id
             WHERE e.target_employee_id = ?1 AND e.status = 'open' AND r.status = 'active' AND e.is_deleted = 0
             ORDER BY CASE WHEN e.deadline IS NULL THEN 1 ELSE 0 END, e.deadline ASC, e.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![employee_id], |row| {
            Ok(MyTaskRecord {
                entry_id: row.get(0)?,
                regulation_id: row.get(1)?,
                reg_number: row.get(2)?,
                regulation_title: row.get(3)?,
                slug: row.get(4)?,
                content: row.get(5)?,
                deadline: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    // Тот же виджет "Мои задачи" на дашборде — теперь и по проектам, не
    // только по регламентам (раньше проектные задачи там вообще не
    // учитывались, хотя модель "target_employee_id + deadline + status"
    // у project_chat_messages зеркальна regulation_entries).
    pub fn list_my_open_project_tasks(&self, employee_id: &str) -> Vec<MyProjectTaskRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT m.id, m.project_id, p.project_number, p.name, m.content, m.deadline, m.created_at
             FROM project_chat_messages m
             JOIN projects p ON p.id = m.project_id
             WHERE m.target_employee_id = ?1 AND m.status = 'open' AND p.status = 'active' AND m.is_deleted = 0
             ORDER BY CASE WHEN m.deadline IS NULL THEN 1 ELSE 0 END, m.deadline ASC, m.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![employee_id], |row| {
            Ok(MyProjectTaskRecord {
                message_id: row.get(0)?,
                project_id: row.get(1)?,
                project_number: row.get(2)?,
                project_name: row.get(3)?,
                content: row.get(4)?,
                deadline: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    pub fn add_regulation_entry(
        &self,
        actor_id: &str,
        regulation_id: &str,
        target_employee_id: &str,
        content: &str,
        attachment_data: Option<&str>,
        attachment_name: Option<&str>,
        deadline: Option<&str>,
    ) -> Result<RegulationEntryRecord, String> {
        let reg = self.get_regulation(regulation_id).ok_or_else(|| "Регламент не найден".to_string())?;
        if reg.status == "closed" {
            return Err("Регламент закрыт — новые записи нельзя добавлять".into());
        }
        let is_manager = self.is_admin(actor_id) || reg.owner_id == actor_id;
        let is_participant = is_manager || self.conn
            .query_row("SELECT 1 FROM regulation_members WHERE regulation_id = ?1 AND employee_id = ?2", params![regulation_id, actor_id], |_| Ok(()))
            .is_ok();
        if !is_participant {
            return Err("Вы не участник этого регламента".into());
        }
        if target_employee_id != actor_id && !is_manager {
            return Err("Только ответственный может ставить задачи другим участникам".into());
        }
        if content.trim().is_empty() {
            return Err("Запись не может быть пустой".into());
        }

        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO regulation_entries (id, regulation_id, author_id, target_employee_id, content, attachment_data, attachment_name, deadline) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![id, regulation_id, actor_id, target_employee_id, content.trim(), attachment_data, attachment_name, deadline],
            )
            .map_err(|e| e.to_string())?;

        self.conn.execute("UPDATE regulations SET updated_at = datetime('now') WHERE id = ?1", params![regulation_id]).ok();

        if target_employee_id != actor_id {
            let title = format!("Вам поставили задачу в регламенте «{}»", reg.title);
            self.notify(target_employee_id, "regulation_entry_assigned", &title, Some(content.trim()), Some("regulation"), Some(regulation_id));
        }

        let author_name: Option<String> = self.conn
            .query_row("SELECT full_name FROM employees WHERE id = ?1", params![actor_id], |row| row.get(0))
            .ok();
        let target_name: Option<String> = self.conn
            .query_row("SELECT full_name FROM employees WHERE id = ?1", params![target_employee_id], |row| row.get(0))
            .ok();

        Ok(RegulationEntryRecord {
            id,
            regulation_id: regulation_id.to_string(),
            author_id: actor_id.to_string(),
            author_name: author_name.unwrap_or_default(),
            target_employee_id: target_employee_id.to_string(),
            target_name: target_name.unwrap_or_default(),
            content: content.trim().to_string(),
            attachment_data: attachment_data.map(str::to_string),
            attachment_name: attachment_name.map(str::to_string),
            deadline: deadline.map(str::to_string),
            status: "open".to_string(),
            created_at: String::new(),
            updated_at: String::new(),
            reply_count: 0,
            edited_at: None,
            is_deleted: false,
        })
    }

    // Редактирование/удаление своей записи — только автор (строже, чем
    // update_entry_status/assign_regulation_entry выше, где ещё и владелец
    // регламента/админ могут управлять статусом/исполнителем — тут именно
    // "своё", без переопределения). Правит только текст, не трогает
    // вложение/дедлайн/статус/исполнителя.
    pub fn edit_regulation_entry_content(&self, actor_id: &str, entry_id: &str, content: &str) -> Result<RegulationEntryRecord, String> {
        let (author_id, regulation_id, is_deleted): (String, String, bool) = self
            .conn
            .query_row(
                "SELECT author_id, regulation_id, is_deleted FROM regulation_entries WHERE id = ?1",
                params![entry_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "Запись не найдена".to_string())?;
        if author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        if is_deleted {
            return Err("Запись удалена".into());
        }
        let content = content.trim();
        if content.is_empty() {
            return Err("Запись не может быть пустой".into());
        }
        self.conn
            .execute(
                "UPDATE regulation_entries SET content = ?1, edited_at = datetime('now') WHERE id = ?2",
                params![content, entry_id],
            )
            .map_err(|e| e.to_string())?;
        self.list_regulation_entries(&regulation_id)
            .into_iter()
            .find(|e| e.id == entry_id)
            .ok_or_else(|| "Запись не найдена".to_string())
    }

    pub fn delete_regulation_entry(&self, actor_id: &str, entry_id: &str) -> Result<(), String> {
        let author_id: String = self
            .conn
            .query_row("SELECT author_id FROM regulation_entries WHERE id = ?1", params![entry_id], |row| row.get(0))
            .map_err(|_| "Запись не найдена".to_string())?;
        if author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn
            .execute("UPDATE regulation_entries SET is_deleted = 1 WHERE id = ?1", params![entry_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Для Telegram-уведомления (v0.5.3) — после assign_regulation_entry
    // (который сам ничего не возвращает) main.rs дозапрашивает запись целиком.
    pub fn get_regulation_entry(&self, entry_id: &str) -> Option<RegulationEntryRecord> {
        let regulation_id: String = self.conn.query_row("SELECT regulation_id FROM regulation_entries WHERE id = ?1", params![entry_id], |row| row.get(0)).ok()?;
        self.list_regulation_entries(&regulation_id).into_iter().find(|e| e.id == entry_id)
    }

    pub fn assign_regulation_entry(&self, actor_id: &str, entry_id: &str, target_employee_id: &str, deadline: Option<&str>) -> Result<(), String> {
        let (regulation_id, author_id): (String, String) = self.conn
            .query_row("SELECT regulation_id, author_id FROM regulation_entries WHERE id = ?1", params![entry_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|_| "Запись не найдена".to_string())?;
        let reg = self.get_regulation(&regulation_id).ok_or_else(|| "Регламент не найден".to_string())?;
        if !self.is_admin(actor_id) && reg.owner_id != actor_id && author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        let is_target_member = reg.owner_id == target_employee_id || self.conn
            .query_row("SELECT 1 FROM regulation_members WHERE regulation_id = ?1 AND employee_id = ?2", params![regulation_id, target_employee_id], |_| Ok(()))
            .is_ok();
        if !is_target_member {
            return Err("Получатель должен быть участником регламента".into());
        }
        self.conn.execute(
            "UPDATE regulation_entries SET target_employee_id = ?1, deadline = ?2, updated_at = datetime('now') WHERE id = ?3",
            params![target_employee_id, deadline, entry_id],
        ).map_err(|e| e.to_string())?;

        if target_employee_id != actor_id {
            let title = format!("Вам передали задачу в регламенте «{}»", reg.title);
            self.notify(target_employee_id, "regulation_entry_assigned", &title, None, Some("regulation"), Some(&regulation_id));
        }
        Ok(())
    }

    pub fn update_entry_status(&self, actor_id: &str, entry_id: &str, new_status: &str) -> Result<(), String> {
        if !["open", "done", "cancelled"].contains(&new_status) {
            return Err("Некорректный статус задачи".into());
        }
        let (regulation_id, author_id, target_employee_id): (String, String, String) = self.conn
            .query_row(
                "SELECT regulation_id, author_id, target_employee_id FROM regulation_entries WHERE id = ?1",
                params![entry_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "Запись не найдена".to_string())?;
        let reg = self.get_regulation(&regulation_id).ok_or_else(|| "Регламент не найден".to_string())?;
        // Исполнитель (target_employee_id) тоже может закрыть СВОЮ задачу
        // (v0.5.3, для кнопки «Готово» в Telegram-боте «Сотрудник → Закрыть
        // задачу») — раньше это мог только admin/владелец регламента/автор
        // записи (обычно постановщик, не исполнитель).
        if !self.is_admin(actor_id) && reg.owner_id != actor_id && author_id != actor_id && target_employee_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        // Задачу, порученную коллеге (target_employee_id != author_id), после
        // выполнения возвращаем обратно в тред автора — иначе она навсегда
        // остаётся в треде исполнителя, и постановщик никак не узнаёт о
        // завершении, кроме как вручную заходя в чужой тред (пользователь
        // явно жаловался на это — см. журнал v0.2.25 в docs/TZ.md). Ответы
        // никуда переносить не нужно — привязаны к entry_id, "переезжают"
        // вместе с записью автоматически.
        if new_status == "done" && target_employee_id != author_id {
            self.conn
                .execute(
                    "UPDATE regulation_entries SET status = ?1, target_employee_id = ?2, updated_at = datetime('now') WHERE id = ?3",
                    params![new_status, author_id, entry_id],
                )
                .map_err(|e| e.to_string())?;
            if author_id != actor_id {
                let title = format!("Задача выполнена и возвращена вам в регламенте «{}»", reg.title);
                self.notify(&author_id, "regulation_entry_assigned", &title, None, Some("regulation"), Some(&regulation_id));
            }
        } else {
            self.conn
                .execute("UPDATE regulation_entries SET status = ?1, updated_at = datetime('now') WHERE id = ?2", params![new_status, entry_id])
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn list_regulation_replies(&self, entry_id: &str) -> Vec<RegulationReplyRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT rr.id, rr.entry_id, rr.author_id, e.full_name, rr.content, rr.created_at, rr.edited_at, rr.is_deleted
             FROM regulation_replies rr JOIN employees e ON e.id = rr.author_id
             WHERE rr.entry_id = ?1 ORDER BY rr.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![entry_id], |row| {
            let is_deleted: bool = row.get(7)?;
            Ok(RegulationReplyRecord {
                id: row.get(0)?,
                entry_id: row.get(1)?,
                author_id: row.get(2)?,
                author_name: row.get(3)?,
                content: if is_deleted { String::new() } else { row.get(4)? },
                created_at: row.get(5)?,
                edited_at: row.get(6)?,
                is_deleted,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    pub fn add_regulation_reply(&self, actor_id: &str, entry_id: &str, content: &str) -> Result<RegulationReplyRecord, String> {
        if content.trim().is_empty() {
            return Err("Ответ не может быть пустым".into());
        }
        let regulation_id: String = self.conn
            .query_row("SELECT regulation_id FROM regulation_entries WHERE id = ?1", params![entry_id], |row| row.get(0))
            .map_err(|_| "Запись не найдена".to_string())?;
        let reg = self.get_regulation(&regulation_id).ok_or_else(|| "Регламент не найден".to_string())?;
        if reg.status == "closed" {
            return Err("Регламент закрыт — новые ответы нельзя добавлять".into());
        }
        let is_participant = self.is_admin(actor_id) || reg.owner_id == actor_id || self.conn
            .query_row("SELECT 1 FROM regulation_members WHERE regulation_id = ?1 AND employee_id = ?2", params![regulation_id, actor_id], |_| Ok(()))
            .is_ok();
        if !is_participant {
            return Err("Вы не участник этого регламента".into());
        }

        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO regulation_replies (id, entry_id, author_id, content) VALUES (?1, ?2, ?3, ?4)",
                params![id, entry_id, actor_id, content.trim()],
            )
            .map_err(|e| e.to_string())?;

        self.conn.execute("UPDATE regulations SET updated_at = datetime('now') WHERE id = ?1", params![regulation_id]).ok();

        let author_name: Option<String> = self.conn
            .query_row("SELECT full_name FROM employees WHERE id = ?1", params![actor_id], |row| row.get(0))
            .ok();

        Ok(RegulationReplyRecord {
            id,
            entry_id: entry_id.to_string(),
            author_id: actor_id.to_string(),
            author_name: author_name.unwrap_or_default(),
            content: content.trim().to_string(),
            created_at: String::new(),
            edited_at: None,
            is_deleted: false,
        })
    }

    pub fn edit_regulation_reply(&self, actor_id: &str, reply_id: &str, content: &str) -> Result<RegulationReplyRecord, String> {
        let (author_id, entry_id, is_deleted): (String, String, bool) = self
            .conn
            .query_row(
                "SELECT author_id, entry_id, is_deleted FROM regulation_replies WHERE id = ?1",
                params![reply_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "Ответ не найден".to_string())?;
        if author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        if is_deleted {
            return Err("Ответ удалён".into());
        }
        let content = content.trim();
        if content.is_empty() {
            return Err("Ответ не может быть пустым".into());
        }
        self.conn
            .execute(
                "UPDATE regulation_replies SET content = ?1, edited_at = datetime('now') WHERE id = ?2",
                params![content, reply_id],
            )
            .map_err(|e| e.to_string())?;
        self.list_regulation_replies(&entry_id)
            .into_iter()
            .find(|r| r.id == reply_id)
            .ok_or_else(|| "Ответ не найден".to_string())
    }

    pub fn delete_regulation_reply(&self, actor_id: &str, reply_id: &str) -> Result<(), String> {
        let author_id: String = self
            .conn
            .query_row("SELECT author_id FROM regulation_replies WHERE id = ?1", params![reply_id], |row| row.get(0))
            .map_err(|_| "Ответ не найден".to_string())?;
        if author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn
            .execute("UPDATE regulation_replies SET is_deleted = 1 WHERE id = ?1", params![reply_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // ---- Регламенты между админом и конкретным партнёром (v0.3.0) ----
    // Плоский тред — ровно "любой аккаунт этого партнёра" + "любой админ",
    // без regulation_members/target_employee_id (в отличие от обычных
    // регламентов). Доступ проверяется через can_access_partner_regulation
    // на каждый читающий/пишущий вызов — у обычных регламентов такой
    // проверки нет вовсе, поэтому это отдельные таблицы, а не общий партнёр
    // на существующих (см. docs/TZ.md, журнал v0.3.0).

    const PARTNER_REGULATION_SELECT: &'static str = "SELECT
            pr.id, pr.reg_number, pr.partner_id, p.name,
            pr.client_id, c.name,
            pr.title, pr.description, pr.status, pr.deadline, pr.closed_at,
            pr.created_by, cb.full_name,
            pr.created_at, pr.updated_at,
            (SELECT COUNT(*) FROM partner_regulation_entries pe WHERE pe.partner_regulation_id = pr.id),
            pr.assistant_id, asst.full_name
        FROM partner_regulations pr
        JOIN partners p ON p.id = pr.partner_id
        LEFT JOIN clients c ON c.id = pr.client_id
        LEFT JOIN employees cb ON cb.id = pr.created_by
        LEFT JOIN employees asst ON asst.id = pr.assistant_id";

    fn map_partner_regulation_row(row: &rusqlite::Row) -> rusqlite::Result<PartnerRegulationRecord> {
        Ok(PartnerRegulationRecord {
            id: row.get(0)?,
            reg_number: row.get(1)?,
            partner_id: row.get(2)?,
            partner_name: row.get(3)?,
            client_id: row.get(4)?,
            client_name: row.get(5)?,
            title: row.get(6)?,
            description: row.get(7)?,
            status: row.get(8)?,
            deadline: row.get(9)?,
            closed_at: row.get(10)?,
            created_by: row.get(11)?,
            created_by_name: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
            entry_count: row.get(15)?,
            assistant_id: row.get(16)?,
            assistant_name: row.get(17)?,
        })
    }

    fn next_partner_reg_number(&self) -> String {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM partner_regulations", [], |row| row.get(0)).unwrap_or(0);
        format!("PREG-{:05}", count + 1)
    }

    const PARTNER_SERVICE_SELECT: &'static str = "SELECT
            ps.id, ps.partner_id, ps.name, ps.description, ps.code, ps.price, ps.reward_percent,
            ps.created_by, cb.full_name, ps.created_at, ps.updated_at
        FROM partner_services ps
        LEFT JOIN employees cb ON cb.id = ps.created_by";

    fn map_partner_service_row(row: &rusqlite::Row) -> rusqlite::Result<PartnerServiceRecord> {
        Ok(PartnerServiceRecord {
            id: row.get(0)?,
            partner_id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            code: row.get(4)?,
            price: row.get(5)?,
            reward_percent: row.get(6)?,
            created_by: row.get(7)?,
            created_by_name: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    }

    pub fn get_partner_regulation(&self, id: &str) -> Option<PartnerRegulationRecord> {
        let sql = format!("{} WHERE pr.id = ?1", Self::PARTNER_REGULATION_SELECT);
        self.conn.query_row(&sql, params![id], Self::map_partner_regulation_row).ok()
    }

    // is_admin ИЛИ сотрудник этого же партнёра — единственная проверка
    // доступа для всей фичи, зеркало can_access_chat_channel'а для
    // партнёрского канала чата.
    fn can_access_partner_regulation(&self, actor_id: &str, partner_regulation_id: &str) -> Result<PartnerRegulationRecord, String> {
        let reg = self.get_partner_regulation(partner_regulation_id).ok_or_else(|| "Регламент не найден".to_string())?;
        let employee = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        if employee.is_partner {
            if employee.partner_id.as_deref() != Some(reg.partner_id.as_str()) {
                return Err("Недостаточно прав".into());
            }
        } else if !self.is_admin(actor_id) {
            return Err("Недостаточно прав".into());
        }
        Ok(reg)
    }

    fn can_access_partner_org(&self, actor_id: &str, partner_id: &str) -> Result<(), String> {
        let employee = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        if employee.is_partner {
            if employee.partner_id.as_deref() != Some(partner_id) {
                return Err("Недостаточно прав".into());
            }
        } else if !self.is_admin(actor_id) {
            return Err("Недостаточно прав".into());
        }
        Ok(())
    }

    // "Помощник" по регламенту партнёра (v0.4.0) — роль-зависимая проверка:
    // создаёт партнёр → помощником обязан быть админ; создаёт админ (из
    // рабочего пространства партнёра) → помощником обязан быть сотрудник
    // именно этого партнёра.
    fn validate_partner_regulation_assistant(&self, acting: &EmployeeRecord, partner_id: &str, assistant_id: Option<&str>) -> Result<Option<String>, String> {
        let Some(aid) = assistant_id else { return Ok(None) };
        let candidate = self.get_employee(aid).ok_or_else(|| "Сотрудник не найден".to_string())?;
        if acting.is_partner {
            if !candidate.is_admin {
                return Err("Помощником может быть только администратор".into());
            }
        } else if candidate.partner_id.as_deref() != Some(partner_id) {
            return Err("Помощник должен быть сотрудником этого партнёра".into());
        }
        Ok(Some(aid.to_string()))
    }

    pub fn list_partner_regulations(&self, actor_id: &str, partner_id: &str) -> Result<Vec<PartnerRegulationRecord>, String> {
        self.can_access_partner_org(actor_id, partner_id)?;
        let sql = format!("{} WHERE pr.partner_id = ?1 ORDER BY pr.updated_at DESC", Self::PARTNER_REGULATION_SELECT);
        let mut stmt = self.conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![partner_id], Self::map_partner_regulation_row).map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    // ---- Услуги партнёра (v0.4.0) ----
    // Общий каталог: и партнёр, и админ могут создавать/редактировать/удалять
    // (can_access_partner_org — тот же гейт, что у партнёрских регламентов).

    fn get_partner_service(&self, id: &str) -> Option<PartnerServiceRecord> {
        let sql = format!("{} WHERE ps.id = ?1", Self::PARTNER_SERVICE_SELECT);
        self.conn.query_row(&sql, params![id], Self::map_partner_service_row).ok()
    }

    pub fn list_partner_services(&self, actor_id: &str, partner_id: &str) -> Result<Vec<PartnerServiceRecord>, String> {
        self.can_access_partner_org(actor_id, partner_id)?;
        let sql = format!("{} WHERE ps.partner_id = ?1 ORDER BY ps.name ASC", Self::PARTNER_SERVICE_SELECT);
        let mut stmt = self.conn.prepare(&sql).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![partner_id], Self::map_partner_service_row).map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn create_partner_service(&self, actor_id: &str, partner_id: &str, name: &str, description: Option<&str>, code: Option<&str>, price: Option<&str>, reward_percent: Option<&str>) -> Result<PartnerServiceRecord, String> {
        self.can_access_partner_org(actor_id, partner_id)?;
        if name.trim().is_empty() {
            return Err("Укажите название услуги".into());
        }
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO partner_services (id, partner_id, name, description, code, price, reward_percent, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![id, partner_id, name.trim(), description, code, price, reward_percent, actor_id],
            )
            .map_err(|e| e.to_string())?;
        self.get_partner_service(&id).ok_or_else(|| "Услуга не найдена".to_string())
    }

    pub fn update_partner_service(&self, actor_id: &str, id: &str, name: &str, description: Option<&str>, code: Option<&str>, price: Option<&str>, reward_percent: Option<&str>) -> Result<PartnerServiceRecord, String> {
        let existing = self.get_partner_service(id).ok_or_else(|| "Услуга не найдена".to_string())?;
        self.can_access_partner_org(actor_id, &existing.partner_id)?;
        if name.trim().is_empty() {
            return Err("Укажите название услуги".into());
        }
        self.conn
            .execute(
                "UPDATE partner_services SET name = ?1, description = ?2, code = ?3, price = ?4, reward_percent = ?5, updated_at = datetime('now') WHERE id = ?6",
                params![name.trim(), description, code, price, reward_percent, id],
            )
            .map_err(|e| e.to_string())?;
        self.get_partner_service(id).ok_or_else(|| "Услуга не найдена".to_string())
    }

    pub fn delete_partner_service(&self, actor_id: &str, id: &str) -> Result<(), String> {
        let existing = self.get_partner_service(id).ok_or_else(|| "Услуга не найдена".to_string())?;
        self.can_access_partner_org(actor_id, &existing.partner_id)?;
        self.conn.execute("UPDATE clients SET service_id = NULL WHERE service_id = ?1", params![id]).map_err(|e| e.to_string())?;
        self.conn.execute("DELETE FROM partner_services WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // ---- "Наши услуги" (v0.7.0) ----
    // Общий каталог без владельца-партнёра. Читать может любой авторизованный
    // сотрудник (нужно партнёру для выбора при создании своего клиента),
    // писать — только админ (это каталог самой компании, а не партнёра).

    const HOUSE_SERVICE_SELECT: &'static str = "SELECT
            hs.id, hs.name, hs.description, hs.code, hs.price, hs.reward_percent,
            hs.created_by, cb.full_name, hs.created_at, hs.updated_at
        FROM house_services hs
        LEFT JOIN employees cb ON cb.id = hs.created_by";

    fn map_house_service_row(row: &rusqlite::Row) -> rusqlite::Result<HouseServiceRecord> {
        Ok(HouseServiceRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            code: row.get(3)?,
            price: row.get(4)?,
            reward_percent: row.get(5)?,
            created_by: row.get(6)?,
            created_by_name: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    }

    fn get_house_service(&self, id: &str) -> Option<HouseServiceRecord> {
        let sql = format!("{} WHERE hs.id = ?1", Self::HOUSE_SERVICE_SELECT);
        self.conn.query_row(&sql, params![id], Self::map_house_service_row).ok()
    }

    pub fn list_house_services(&self, actor_id: &str) -> Vec<HouseServiceRecord> {
        if self.get_employee(actor_id).is_none() {
            return Vec::new();
        }
        let sql = format!("{} ORDER BY hs.name ASC", Self::HOUSE_SERVICE_SELECT);
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        let rows = match stmt.query_map([], Self::map_house_service_row) {
            Ok(r) => r,
            Err(_) => return Vec::new(),
        };
        rows.filter_map(|r| r.ok()).collect()
    }

    pub fn create_house_service(&self, actor_id: &str, name: &str, description: Option<&str>, code: Option<&str>, price: Option<&str>, reward_percent: Option<&str>) -> Result<HouseServiceRecord, String> {
        if !self.is_admin(actor_id) {
            return Err("Недостаточно прав".into());
        }
        if name.trim().is_empty() {
            return Err("Укажите название услуги".into());
        }
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO house_services (id, name, description, code, price, reward_percent, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, name.trim(), description, code, price, reward_percent, actor_id],
            )
            .map_err(|e| e.to_string())?;
        self.get_house_service(&id).ok_or_else(|| "Услуга не найдена".to_string())
    }

    pub fn update_house_service(&self, actor_id: &str, id: &str, name: &str, description: Option<&str>, code: Option<&str>, price: Option<&str>, reward_percent: Option<&str>) -> Result<HouseServiceRecord, String> {
        if !self.is_admin(actor_id) {
            return Err("Недостаточно прав".into());
        }
        if name.trim().is_empty() {
            return Err("Укажите название услуги".into());
        }
        self.conn
            .execute(
                "UPDATE house_services SET name = ?1, description = ?2, code = ?3, price = ?4, reward_percent = ?5, updated_at = datetime('now') WHERE id = ?6",
                params![name.trim(), description, code, price, reward_percent, id],
            )
            .map_err(|e| e.to_string())?;
        self.get_house_service(id).ok_or_else(|| "Услуга не найдена".to_string())
    }

    pub fn delete_house_service(&self, actor_id: &str, id: &str) -> Result<(), String> {
        if !self.is_admin(actor_id) {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute("UPDATE clients SET house_service_id = NULL WHERE house_service_id = ?1", params![id]).map_err(|e| e.to_string())?;
        self.conn.execute("DELETE FROM house_services WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn create_partner_regulation(
        &self,
        actor_id: &str,
        partner_id: &str,
        title: &str,
        description: Option<&str>,
        client_id: Option<&str>,
        deadline: Option<&str>,
        assistant_id: Option<&str>,
    ) -> Result<PartnerRegulationRecord, String> {
        self.can_access_partner_org(actor_id, partner_id)?;
        if title.trim().is_empty() {
            return Err("Укажите название регламента".into());
        }
        let acting = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        let effective_assistant_id = self.validate_partner_regulation_assistant(&acting, partner_id, assistant_id)?;
        let id = Uuid::new_v4().to_string();
        let reg_number = self.next_partner_reg_number();
        self.conn
            .execute(
                "INSERT INTO partner_regulations (id, reg_number, partner_id, client_id, title, description, deadline, created_by, assistant_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![id, reg_number, partner_id, client_id, title.trim(), description, deadline, actor_id, effective_assistant_id],
            )
            .map_err(|e| e.to_string())?;
        let title_notif = format!("Новый регламент от {}", acting.full_name);
        if acting.is_partner {
            self.notify_all_admins("partner_regulation", &title_notif, Some(title.trim()), Some("partner_regulation"), Some(&id));
        } else {
            self.notify_partner_org(partner_id, "partner_regulation", &title_notif, Some(title.trim()), Some("partner_regulation"), Some(&id));
        }
        self.get_partner_regulation(&id).ok_or_else(|| "Регламент не найден".to_string())
    }

    pub fn update_partner_regulation(
        &self,
        actor_id: &str,
        id: &str,
        title: &str,
        description: Option<&str>,
        client_id: Option<&str>,
        deadline: Option<&str>,
        status: &str,
        assistant_id: Option<&str>,
    ) -> Result<PartnerRegulationRecord, String> {
        let reg = self.can_access_partner_regulation(actor_id, id)?;
        if title.trim().is_empty() {
            return Err("Укажите название регламента".into());
        }
        if !["active", "closed"].contains(&status) {
            return Err("Некорректный статус".into());
        }
        let acting = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        let effective_assistant_id = self.validate_partner_regulation_assistant(&acting, &reg.partner_id, assistant_id)?;
        let closed_at = if status == "closed" && reg.status != "closed" {
            "datetime('now')"
        } else if status == "active" {
            "NULL"
        } else {
            "closed_at"
        };
        let sql = format!(
            "UPDATE partner_regulations SET title = ?1, description = ?2, client_id = ?3, deadline = ?4, status = ?5, closed_at = {}, assistant_id = ?6, updated_at = datetime('now') WHERE id = ?7",
            closed_at
        );
        self.conn.execute(&sql, params![title.trim(), description, client_id, deadline, status, effective_assistant_id, id])
            .map_err(|e| e.to_string())?;
        self.get_partner_regulation(id).ok_or_else(|| "Регламент не найден".to_string())
    }

    pub fn delete_partner_regulation(&self, admin_id: &str, id: &str) -> Result<(), String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute("DELETE FROM partner_regulation_replies WHERE entry_id IN (SELECT id FROM partner_regulation_entries WHERE partner_regulation_id = ?1)", params![id]).ok();
        self.conn.execute("DELETE FROM partner_regulation_entries WHERE partner_regulation_id = ?1", params![id]).ok();
        self.conn.execute("DELETE FROM partner_regulations WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_partner_regulation_entries(&self, actor_id: &str, partner_regulation_id: &str) -> Result<Vec<PartnerRegulationEntryRecord>, String> {
        self.can_access_partner_regulation(actor_id, partner_regulation_id)?;
        let mut stmt = self.conn.prepare(
            "SELECT e.id, e.partner_regulation_id, e.author_id, a.full_name,
                    e.content, e.attachment_data, e.attachment_name, e.deadline, e.status,
                    e.created_at, e.updated_at,
                    (SELECT COUNT(*) FROM partner_regulation_replies pr WHERE pr.entry_id = e.id),
                    e.edited_at, e.is_deleted
             FROM partner_regulation_entries e
             JOIN employees a ON a.id = e.author_id
             WHERE e.partner_regulation_id = ?1 ORDER BY e.created_at ASC",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![partner_regulation_id], |row| {
            let is_deleted: bool = row.get(12)?;
            Ok(PartnerRegulationEntryRecord {
                id: row.get(0)?,
                partner_regulation_id: row.get(1)?,
                author_id: row.get(2)?,
                author_name: row.get(3)?,
                content: if is_deleted { String::new() } else { row.get(4)? },
                attachment_data: if is_deleted { None } else { row.get(5)? },
                attachment_name: if is_deleted { None } else { row.get(6)? },
                deadline: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                reply_count: row.get(11)?,
                edited_at: row.get(13)?,
                is_deleted,
            })
        }).map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn add_partner_regulation_entry(
        &self,
        actor_id: &str,
        partner_regulation_id: &str,
        content: &str,
        attachment_data: Option<&str>,
        attachment_name: Option<&str>,
        deadline: Option<&str>,
    ) -> Result<PartnerRegulationEntryRecord, String> {
        let reg = self.can_access_partner_regulation(actor_id, partner_regulation_id)?;
        if reg.status == "closed" {
            return Err("Регламент закрыт — новые записи нельзя добавлять".into());
        }
        if content.trim().is_empty() {
            return Err("Запись не может быть пустой".into());
        }
        let acting = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO partner_regulation_entries (id, partner_regulation_id, author_id, content, attachment_data, attachment_name, deadline) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, partner_regulation_id, actor_id, content.trim(), attachment_data, attachment_name, deadline],
            )
            .map_err(|e| e.to_string())?;
        self.conn.execute("UPDATE partner_regulations SET updated_at = datetime('now') WHERE id = ?1", params![partner_regulation_id]).ok();
        let title_notif = format!("Новая запись в регламенте от {}", acting.full_name);
        if acting.is_partner {
            self.notify_all_admins("partner_regulation", &title_notif, Some(content.trim()), Some("partner_regulation"), Some(partner_regulation_id));
        } else {
            self.notify_partner_org(&reg.partner_id, "partner_regulation", &title_notif, Some(content.trim()), Some("partner_regulation"), Some(partner_regulation_id));
        }
        self.list_partner_regulation_entries(actor_id, partner_regulation_id)?
            .into_iter()
            .find(|e| e.id == id)
            .ok_or_else(|| "Запись не найдена".to_string())
    }

    pub fn edit_partner_regulation_entry(&self, actor_id: &str, entry_id: &str, content: &str) -> Result<PartnerRegulationEntryRecord, String> {
        let (author_id, partner_regulation_id, is_deleted): (String, String, bool) = self
            .conn
            .query_row(
                "SELECT author_id, partner_regulation_id, is_deleted FROM partner_regulation_entries WHERE id = ?1",
                params![entry_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "Запись не найдена".to_string())?;
        if author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        if is_deleted {
            return Err("Запись удалена".into());
        }
        let content = content.trim();
        if content.is_empty() {
            return Err("Запись не может быть пустой".into());
        }
        self.conn
            .execute("UPDATE partner_regulation_entries SET content = ?1, edited_at = datetime('now') WHERE id = ?2", params![content, entry_id])
            .map_err(|e| e.to_string())?;
        self.list_partner_regulation_entries(actor_id, &partner_regulation_id)?
            .into_iter()
            .find(|e| e.id == entry_id)
            .ok_or_else(|| "Запись не найдена".to_string())
    }

    pub fn delete_partner_regulation_entry(&self, actor_id: &str, entry_id: &str) -> Result<(), String> {
        let author_id: String = self
            .conn
            .query_row("SELECT author_id FROM partner_regulation_entries WHERE id = ?1", params![entry_id], |row| row.get(0))
            .map_err(|_| "Запись не найдена".to_string())?;
        if author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn
            .execute("UPDATE partner_regulation_entries SET is_deleted = 1 WHERE id = ?1", params![entry_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Нет отдельной роли "автор/владелец" — регламент партнёра это плоский
    // тред без per-member ролей, поэтому статус меняет любой админ или любой
    // аккаунт этого же партнёра (а не только автор записи).
    pub fn update_partner_regulation_entry_status(&self, actor_id: &str, entry_id: &str, new_status: &str) -> Result<(), String> {
        if !["open", "done", "cancelled"].contains(&new_status) {
            return Err("Некорректный статус задачи".into());
        }
        let partner_regulation_id: String = self.conn
            .query_row("SELECT partner_regulation_id FROM partner_regulation_entries WHERE id = ?1", params![entry_id], |row| row.get(0))
            .map_err(|_| "Запись не найдена".to_string())?;
        self.can_access_partner_regulation(actor_id, &partner_regulation_id)?;
        self.conn
            .execute("UPDATE partner_regulation_entries SET status = ?1, updated_at = datetime('now') WHERE id = ?2", params![new_status, entry_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_partner_regulation_replies(&self, actor_id: &str, entry_id: &str) -> Result<Vec<PartnerRegulationReplyRecord>, String> {
        let partner_regulation_id: String = self.conn
            .query_row("SELECT partner_regulation_id FROM partner_regulation_entries WHERE id = ?1", params![entry_id], |row| row.get(0))
            .map_err(|_| "Запись не найдена".to_string())?;
        self.can_access_partner_regulation(actor_id, &partner_regulation_id)?;
        let mut stmt = self.conn.prepare(
            "SELECT rr.id, rr.entry_id, rr.author_id, e.full_name, rr.content, rr.created_at, rr.edited_at, rr.is_deleted
             FROM partner_regulation_replies rr JOIN employees e ON e.id = rr.author_id
             WHERE rr.entry_id = ?1 ORDER BY rr.created_at ASC",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![entry_id], |row| {
            let is_deleted: bool = row.get(7)?;
            Ok(PartnerRegulationReplyRecord {
                id: row.get(0)?,
                entry_id: row.get(1)?,
                author_id: row.get(2)?,
                author_name: row.get(3)?,
                content: if is_deleted { String::new() } else { row.get(4)? },
                created_at: row.get(5)?,
                edited_at: row.get(6)?,
                is_deleted,
            })
        }).map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn add_partner_regulation_reply(&self, actor_id: &str, entry_id: &str, content: &str) -> Result<PartnerRegulationReplyRecord, String> {
        if content.trim().is_empty() {
            return Err("Ответ не может быть пустым".into());
        }
        let partner_regulation_id: String = self.conn
            .query_row("SELECT partner_regulation_id FROM partner_regulation_entries WHERE id = ?1", params![entry_id], |row| row.get(0))
            .map_err(|_| "Запись не найдена".to_string())?;
        let reg = self.can_access_partner_regulation(actor_id, &partner_regulation_id)?;
        if reg.status == "closed" {
            return Err("Регламент закрыт — новые ответы нельзя добавлять".into());
        }
        let acting = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute("INSERT INTO partner_regulation_replies (id, entry_id, author_id, content) VALUES (?1, ?2, ?3, ?4)", params![id, entry_id, actor_id, content.trim()])
            .map_err(|e| e.to_string())?;
        self.conn.execute("UPDATE partner_regulations SET updated_at = datetime('now') WHERE id = ?1", params![partner_regulation_id]).ok();
        let title_notif = format!("Новый ответ в регламенте от {}", acting.full_name);
        if acting.is_partner {
            self.notify_all_admins("partner_regulation", &title_notif, Some(content.trim()), Some("partner_regulation"), Some(&partner_regulation_id));
        } else {
            self.notify_partner_org(&reg.partner_id, "partner_regulation", &title_notif, Some(content.trim()), Some("partner_regulation"), Some(&partner_regulation_id));
        }
        self.list_partner_regulation_replies(actor_id, entry_id)?
            .into_iter()
            .find(|r| r.id == id)
            .ok_or_else(|| "Ответ не найден".to_string())
    }

    pub fn edit_partner_regulation_reply(&self, actor_id: &str, reply_id: &str, content: &str) -> Result<PartnerRegulationReplyRecord, String> {
        let (author_id, entry_id, is_deleted): (String, String, bool) = self
            .conn
            .query_row(
                "SELECT author_id, entry_id, is_deleted FROM partner_regulation_replies WHERE id = ?1",
                params![reply_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| "Ответ не найден".to_string())?;
        if author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        if is_deleted {
            return Err("Ответ удалён".into());
        }
        let content = content.trim();
        if content.is_empty() {
            return Err("Ответ не может быть пустым".into());
        }
        self.conn
            .execute("UPDATE partner_regulation_replies SET content = ?1, edited_at = datetime('now') WHERE id = ?2", params![content, reply_id])
            .map_err(|e| e.to_string())?;
        self.list_partner_regulation_replies(actor_id, &entry_id)?
            .into_iter()
            .find(|r| r.id == reply_id)
            .ok_or_else(|| "Ответ не найден".to_string())
    }

    pub fn delete_partner_regulation_reply(&self, actor_id: &str, reply_id: &str) -> Result<(), String> {
        let author_id: String = self
            .conn
            .query_row("SELECT author_id FROM partner_regulation_replies WHERE id = ?1", params![reply_id], |row| row.get(0))
            .map_err(|_| "Ответ не найден".to_string())?;
        if author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn
            .execute("UPDATE partner_regulation_replies SET is_deleted = 1 WHERE id = ?1", params![reply_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // ---- Напоминания по задачам регламента ----

    pub fn add_regulation_reminder(
        &self,
        actor_id: &str,
        regulation_id: &str,
        entry_id: Option<&str>,
        target_employee_id: &str,
        remind_at: &str,
        note: &str,
    ) -> Result<RegulationReminderRecord, String> {
        if note.trim().is_empty() {
            return Err("Укажите текст напоминания".into());
        }

        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO regulation_reminders (id, regulation_id, entry_id, created_by, target_employee_id, remind_at, note)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, regulation_id, entry_id, actor_id, target_employee_id, remind_at, note.trim()],
            )
            .map_err(|e| e.to_string())?;

        // Создаём запись-ответ в регламенте о напоминании
        let (actor_name, target_name): (Option<String>, Option<String>) = (
            self.conn.query_row("SELECT full_name FROM employees WHERE id = ?1", params![actor_id], |r| r.get(0)).ok(),
            self.conn.query_row("SELECT full_name FROM employees WHERE id = ?1", params![target_employee_id], |r| r.get(0)).ok(),
        );
        let reg = self.get_regulation(regulation_id);
        let reg_title = reg.as_ref().map(|r| r.title.as_str()).unwrap_or("регламент");
        let msg = format!(
            "📅 Напоминание для {}: {} ({})",
            target_name.as_deref().unwrap_or("—"),
            note.trim(),
            remind_at
        );

        // Если есть конкретная запись — пишем ответ на неё, иначе — новую запись
        if let Some(eid) = entry_id {
            let _ = self.conn.execute(
                "INSERT INTO regulation_replies (id, entry_id, author_id, content) VALUES (?1, ?2, ?3, ?4)",
                params![Uuid::new_v4().to_string(), eid, actor_id, msg],
            );
        } else {
            let _ = self.add_regulation_entry(actor_id, regulation_id, target_employee_id, &msg, None, None, Some(remind_at));
        }

        // Уведомляем получателя
        let notif_title = format!("Напоминание по регламенту «{}»", reg_title);
        self.notify(target_employee_id, "regulation_reminder", &notif_title, Some(note.trim()), Some("regulation"), Some(regulation_id));

        Ok(RegulationReminderRecord {
            id,
            regulation_id: regulation_id.to_string(),
            entry_id: entry_id.map(str::to_string),
            created_by: actor_id.to_string(),
            created_by_name: actor_name.unwrap_or_default(),
            target_employee_id: target_employee_id.to_string(),
            target_name: target_name.unwrap_or_default(),
            remind_at: remind_at.to_string(),
            note: note.trim().to_string(),
            fired: false,
            created_at: String::new(),
        })
    }

    pub fn list_regulation_reminders(&self, regulation_id: &str, employee_id: &str) -> Vec<RegulationReminderRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT r.id, r.regulation_id, r.entry_id, r.created_by, cb.full_name,
                    r.target_employee_id, t.full_name, r.remind_at, r.note, r.fired, r.created_at
             FROM regulation_reminders r
             LEFT JOIN employees cb ON cb.id = r.created_by
             LEFT JOIN employees t ON t.id = r.target_employee_id
             WHERE r.regulation_id = ?1 AND (r.created_by = ?2 OR r.target_employee_id = ?2)
             ORDER BY r.remind_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![regulation_id, employee_id], |row| {
            Ok(RegulationReminderRecord {
                id: row.get(0)?,
                regulation_id: row.get(1)?,
                entry_id: row.get(2)?,
                created_by: row.get(3)?,
                created_by_name: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                target_employee_id: row.get(5)?,
                target_name: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
                remind_at: row.get(7)?,
                note: row.get(8)?,
                fired: row.get::<_, i64>(9)? != 0,
                created_at: row.get(10)?,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    pub fn update_regulation_entry_deadline(&self, actor_id: &str, entry_id: &str, new_deadline: Option<&str>) -> Result<(), String> {
        let (regulation_id, author_id): (String, String) = self.conn
            .query_row("SELECT regulation_id, author_id FROM regulation_entries WHERE id = ?1", params![entry_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|_| "Запись не найдена".to_string())?;
        let reg = self.get_regulation(&regulation_id).ok_or_else(|| "Регламент не найден".to_string())?;
        if !self.is_admin(actor_id) && reg.owner_id != actor_id && author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute(
            "UPDATE regulation_entries SET deadline = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![new_deadline, entry_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    // ---- Блог ----

    const BLOG_CATEGORIES: [&'static str; 5] = ["announcement", "discussion", "useful", "qna", "custom"];

    const BLOG_TOPIC_SELECT: &'static str = "SELECT t.id, t.category, t.title, t.content, t.created_by, e.full_name, t.pinned, t.created_at,
            (SELECT COUNT(*) FROM blog_comments c WHERE c.topic_id = t.id),
            t.partner_audience
        FROM blog_topics t JOIN employees e ON e.id = t.created_by";

    fn map_blog_topic_row(row: &rusqlite::Row) -> rusqlite::Result<BlogTopicRecord> {
        Ok(BlogTopicRecord {
            id: row.get(0)?,
            category: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            created_by: row.get(4)?,
            created_by_name: row.get(5)?,
            pinned: row.get::<_, i64>(6)? != 0,
            created_at: row.get(7)?,
            comment_count: row.get(8)?,
            partner_audience: row.get(9)?,
        })
    }

    // Сотрудник/админ — видит все темы без изменений (как и раньше). Партнёр
    // — только темы, адресованные ему: всем партнёрам ('*') или именно его
    // организации. Темы без аудитории (NULL, по умолчанию) партнёру не видны
    // вовсе — ровно поведение "если не выбрано, тема только для сотрудников".
    pub fn list_blog_topics(&self, actor_id: &str) -> Vec<BlogTopicRecord> {
        let employee = match self.get_employee(actor_id) {
            Some(e) => e,
            None => return Vec::new(),
        };
        if employee.is_partner {
            let Some(pid) = employee.partner_id else { return Vec::new(); };
            let sql = format!("{} WHERE t.partner_audience = '*' OR t.partner_audience = ?1 ORDER BY t.pinned DESC, t.created_at DESC", Self::BLOG_TOPIC_SELECT);
            let mut stmt = match self.conn.prepare(&sql) {
                Ok(s) => s,
                Err(_) => return Vec::new(),
            };
            return stmt.query_map(params![pid], Self::map_blog_topic_row)
                .map(|rows| rows.filter_map(|r| r.ok()).collect())
                .unwrap_or_default();
        }
        let sql = format!("{} ORDER BY t.pinned DESC, t.created_at DESC", Self::BLOG_TOPIC_SELECT);
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map([], Self::map_blog_topic_row)
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default()
    }

    fn get_blog_topic(&self, id: &str) -> Option<BlogTopicRecord> {
        let sql = format!("{} WHERE t.id = ?1", Self::BLOG_TOPIC_SELECT);
        self.conn.query_row(&sql, params![id], Self::map_blog_topic_row).ok()
    }

    pub fn create_blog_topic(&self, actor_id: &str, category: &str, title: &str, content: Option<&str>, partner_audience: Option<&str>) -> Result<BlogTopicRecord, String> {
        let employee = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        // Партнёр не создаёт и не редактирует темы блога — раздел "Блог" в
        // его панели только для чтения (жёстко на бэкенде, а не только
        // скрытием кнопки в UI).
        if employee.is_partner {
            return Err("Недостаточно прав".into());
        }
        // Адресовать тему партнёрам может только админ — обычный сотрудник
        // продолжает создавать темы как раньше, всегда только для сотрудников.
        let effective_audience = if employee.is_admin { partner_audience } else { None };
        if title.trim().is_empty() {
            return Err("Укажите заголовок темы".into());
        }
        if !Self::BLOG_CATEGORIES.contains(&category) {
            return Err("Некорректная категория".into());
        }
        let id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO blog_topics (id, category, title, content, created_by, partner_audience) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, category, title.trim(), content, actor_id, effective_audience],
        ).map_err(|e| e.to_string())?;
        self.get_blog_topic(&id).ok_or_else(|| "Тема не найдена".to_string())
    }

    pub fn update_blog_topic(&self, actor_id: &str, id: &str, category: &str, title: &str, content: Option<&str>, partner_audience: Option<&str>) -> Result<BlogTopicRecord, String> {
        let employee = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        if employee.is_partner {
            return Err("Недостаточно прав".into());
        }
        let topic = self.get_blog_topic(id).ok_or_else(|| "Тема не найдена".to_string())?;
        // Редактировать тему может только её создатель — даже админ не может
        // менять чужой текст (в отличие от закрепления/удаления, это осталось
        // админскими правами), по прямой просьбе пользователя.
        if topic.created_by != actor_id {
            return Err("Редактировать тему может только её автор".into());
        }
        if title.trim().is_empty() {
            return Err("Укажите заголовок темы".into());
        }
        if !Self::BLOG_CATEGORIES.contains(&category) {
            return Err("Некорректная категория".into());
        }
        let effective_audience = if employee.is_admin { partner_audience } else { None };
        self.conn.execute(
            "UPDATE blog_topics SET category = ?1, title = ?2, content = ?3, partner_audience = ?4 WHERE id = ?5",
            params![category, title.trim(), content, effective_audience, id],
        ).map_err(|e| e.to_string())?;
        self.get_blog_topic(id).ok_or_else(|| "Тема не найдена".to_string())
    }

    pub fn set_blog_topic_pinned(&self, admin_id: &str, id: &str, pinned: bool) -> Result<(), String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute(
            "UPDATE blog_topics SET pinned = ?1 WHERE id = ?2",
            params![pinned as i64, id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_blog_topic(&self, actor_id: &str, id: &str) -> Result<(), String> {
        let topic = self.get_blog_topic(id).ok_or_else(|| "Тема не найдена".to_string())?;
        // Удалять тему может её автор или админ — по прямому запросу
        // пользователя (раньше было только у админа).
        if !self.is_admin(actor_id) && topic.created_by != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute("DELETE FROM blog_comments WHERE topic_id = ?1", params![id]).ok();
        self.conn.execute("DELETE FROM blog_topics WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_blog_comments(&self, topic_id: &str) -> Vec<BlogCommentRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT c.id, c.topic_id, c.author_id, e.full_name, c.content, c.reply_to_id, c.created_at
             FROM blog_comments c JOIN employees e ON e.id = c.author_id
             WHERE c.topic_id = ?1 ORDER BY c.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![topic_id], |row| {
            Ok(BlogCommentRecord {
                id: row.get(0)?,
                topic_id: row.get(1)?,
                author_id: row.get(2)?,
                author_name: row.get(3)?,
                content: row.get(4)?,
                reply_to_id: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    pub fn add_blog_comment(&self, actor_id: &str, topic_id: &str, content: &str, reply_to_id: Option<&str>) -> Result<BlogCommentRecord, String> {
        let employee = self.get_employee(actor_id).ok_or_else(|| "Сотрудник не найден".to_string())?;
        // Блог партнёра — только для чтения; UI не даёт дойти до формы
        // комментария, но проверку нужно продублировать и на бэкенде, чтобы
        // партнёр не мог написать комментарий прямым вызовом команды.
        if employee.is_partner {
            return Err("Недостаточно прав".into());
        }
        if content.trim().is_empty() {
            return Err("Комментарий не может быть пустым".into());
        }
        self.get_blog_topic(topic_id).ok_or_else(|| "Тема не найдена".to_string())?;
        let id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO blog_comments (id, topic_id, author_id, content, reply_to_id) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, topic_id, actor_id, content.trim(), reply_to_id],
        ).map_err(|e| e.to_string())?;

        let author_name: Option<String> = self.conn
            .query_row("SELECT full_name FROM employees WHERE id = ?1", params![actor_id], |row| row.get(0))
            .ok();

        Ok(BlogCommentRecord {
            id,
            topic_id: topic_id.to_string(),
            author_id: actor_id.to_string(),
            author_name: author_name.unwrap_or_default(),
            content: content.trim().to_string(),
            reply_to_id: reply_to_id.map(str::to_string),
            created_at: String::new(),
        })
    }

    // ---- Режим сервера (v0.2.0) ----
    // Настройки хранятся в уже существующей app_meta (key/value) — тем же
    // паттерном, что last_birthday_notify_date: по умолчанию выключено,
    // порт 8778, если ключей ещё нет.

    pub fn get_server_settings(&self) -> ServerSettingsRecord {
        let enabled: Option<String> = self.conn
            .query_row("SELECT value FROM app_meta WHERE key = 'server_enabled'", [], |row| row.get(0))
            .ok();
        let port: Option<String> = self.conn
            .query_row("SELECT value FROM app_meta WHERE key = 'server_port'", [], |row| row.get(0))
            .ok();
        ServerSettingsRecord {
            enabled: enabled.as_deref() == Some("1"),
            port: port.and_then(|p| p.parse().ok()).unwrap_or(8778),
        }
    }

    pub fn set_server_settings(&self, admin_id: &str, enabled: bool, port: u16) -> Result<ServerSettingsRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        if port < 1024 {
            return Err("Порт должен быть не меньше 1024".into());
        }
        self.conn.execute(
            "INSERT INTO app_meta (key, value) VALUES ('server_enabled', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![if enabled { "1" } else { "0" }],
        ).map_err(|e| e.to_string())?;
        self.conn.execute(
            "INSERT INTO app_meta (key, value) VALUES ('server_port', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![port.to_string()],
        ).map_err(|e| e.to_string())?;
        Ok(self.get_server_settings())
    }

    // ---- Резервные копии базы (v0.2.26) ----
    // Снимаем копию через встроенный SQLite Online Backup API — безопасно
    // работает на живом, используемом соединении, не блокируя приложение.
    // Шифрование самих байт — уже на уровне вызывающего кода (backup.rs),
    // здесь только отдаём чистый снимок базы.
    pub fn export_backup_plain(&self, app_data_dir: &Path) -> Result<Vec<u8>, String> {
        let tmp_path = app_data_dir.join(format!("_export-tmp-{}.db", Uuid::new_v4()));
        {
            let mut dest = Connection::open(&tmp_path).map_err(|e| e.to_string())?;
            let backup = rusqlite::backup::Backup::new(&self.conn, &mut dest).map_err(|e| e.to_string())?;
            backup
                .run_to_completion(5, std::time::Duration::from_millis(250), None)
                .map_err(|e| e.to_string())?;
        }
        let bytes = std::fs::read(&tmp_path).map_err(|e| e.to_string())?;
        std::fs::remove_file(&tmp_path).ok();
        Ok(bytes)
    }

    // ---- Radmin (справочные данные для удалённого доступа, v0.2.26) ----
    // Это НЕ функциональная интеграция — у Radmin нет доступного нам API.
    // Просто храним ID/пароль VPN-сети и заметку админа, чтобы не диктовать
    // их по памяти удалённому сотруднику каждый раз. Тот же паттерн
    // key/value в app_meta, что и get_server_settings/set_server_settings.
    pub fn get_radmin_settings(&self) -> RadminSettingsRecord {
        let network_id: Option<String> = self.conn
            .query_row("SELECT value FROM app_meta WHERE key = 'radmin_network_id'", [], |row| row.get(0))
            .ok();
        let network_password: Option<String> = self.conn
            .query_row("SELECT value FROM app_meta WHERE key = 'radmin_network_password'", [], |row| row.get(0))
            .ok();
        let note: Option<String> = self.conn
            .query_row("SELECT value FROM app_meta WHERE key = 'radmin_note'", [], |row| row.get(0))
            .ok();
        RadminSettingsRecord {
            network_id: network_id.unwrap_or_default(),
            network_password: network_password.unwrap_or_default(),
            note: note.unwrap_or_default(),
        }
    }

    pub fn set_radmin_settings(&self, admin_id: &str, network_id: &str, network_password: &str, note: &str) -> Result<RadminSettingsRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        for (key, value) in [
            ("radmin_network_id", network_id),
            ("radmin_network_password", network_password),
            ("radmin_note", note),
        ] {
            self.conn.execute(
                "INSERT INTO app_meta (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, value],
            ).map_err(|e| e.to_string())?;
        }
        Ok(self.get_radmin_settings())
    }

    // ---- Логотип приложения (v0.3.1) ----
    // Позволяет любому другому пользователю CRM (другая компания, ставящая
    // это же приложение под своим брендом) заменить логотип во всём
    // интерфейсе одним действием — тот же app_meta key/value, что и у
    // Radmin/сервера выше. Храним как base64 data URL, тем же способом, что
    // и фото сотрудника (см. avatar_data) — для локального офлайн-режима
    // этого достаточно, отдельное файловое хранилище не нужно.
    pub fn get_app_logo(&self) -> Option<String> {
        self.conn
            .query_row("SELECT value FROM app_meta WHERE key = 'app_logo'", [], |row| row.get(0))
            .ok()
    }

    pub fn set_app_logo(&self, admin_id: &str, logo_data: Option<&str>) -> Result<Option<String>, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        match logo_data {
            Some(data) => {
                self.conn.execute(
                    "INSERT INTO app_meta (key, value) VALUES ('app_logo', ?1)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    params![data],
                ).map_err(|e| e.to_string())?;
            }
            None => {
                self.conn.execute("DELETE FROM app_meta WHERE key = 'app_logo'", []).map_err(|e| e.to_string())?;
            }
        }
        Ok(self.get_app_logo())
    }

    // ---- Telegram-бот (v0.4.1, консолидирован в один бот в v0.6.3) ----
    // Изначально было 3 отдельных бота (свой токен у каждого) — "Админ →
    // Задача", "Сотрудник → Закрыть задачу", "Админ → Партнёр". По просьбе
    // пользователя после первого живого теста оставлен ОДИН бот, который
    // делает и то, и другое (ставит задачу + принимает "Готово" на закрытие)
    // — так проще для пользователя, чем разбираться в трёх токенах, когда
    // реально нужен один. Функция "Админ → Партнёр" убрана целиком (не
    // нужна). Токен — секрет админа, в отличие от Radmin-данных читать
    // может только админ (не открыто всем, как get_radmin_settings). Тот же
    // app_meta key/value паттерн, что у Radmin/логотипа.
    pub fn get_telegram_bot_settings(&self, actor_id: &str) -> Result<TelegramBotSettingsRecord, String> {
        if !self.is_admin(actor_id) {
            return Err("Недостаточно прав".into());
        }
        Ok(self.get_telegram_bot_settings_internal())
    }

    pub fn set_telegram_bot_settings(&self, admin_id: &str, enabled: bool, token: Option<&str>) -> Result<TelegramBotSettingsRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        let set = |key: &str, value: &str| {
            self.conn.execute(
                "INSERT INTO app_meta (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, value],
            )
        };
        set("tg_bot_enabled", if enabled { "1" } else { "0" }).map_err(|e| e.to_string())?;
        set("tg_bot_token", token.unwrap_or("")).map_err(|e| e.to_string())?;
        Ok(self.get_telegram_bot_settings_internal())
    }

    // Без actor-гейта — читается фоновым polling-циклом и хук-поинтами
    // отправки в main.rs (v0.5.3), у которых нет "админа-актора" в контексте
    // (фоновый поток, не запрос от конкретного пользователя). Тот же
    // паттерн, что read_report_export_settings() у отчётов.
    pub fn get_telegram_bot_settings_internal(&self) -> TelegramBotSettingsRecord {
        let get = |key: &str| -> Option<String> {
            self.conn.query_row("SELECT value FROM app_meta WHERE key = ?1", params![key], |row| row.get(0)).ok()
        };
        TelegramBotSettingsRecord {
            enabled: get("tg_bot_enabled").as_deref() == Some("1"),
            token: get("tg_bot_token").filter(|v| !v.is_empty()),
        }
    }

    // ---- Telegram: курсор getUpdates и кэш username бота, по роли
    // ("admin_task"/"task_close"/"admin_partner") — app_meta, тот же
    // key/value паттерн, что у остальных настроек в этом файле.
    pub fn get_telegram_update_offset(&self, role: &str) -> i64 {
        self.conn
            .query_row("SELECT value FROM app_meta WHERE key = ?1", params![format!("tg_{role}_update_offset")], |row| row.get::<_, String>(0))
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0)
    }

    pub fn set_telegram_update_offset(&self, role: &str, offset: i64) {
        let _ = self.conn.execute(
            "INSERT INTO app_meta (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![format!("tg_{role}_update_offset"), offset.to_string()],
        );
    }

    pub fn get_telegram_bot_username(&self, role: &str) -> Option<String> {
        self.conn.query_row("SELECT value FROM app_meta WHERE key = ?1", params![format!("tg_{role}_bot_username")], |row| row.get(0)).ok()
    }

    pub fn set_telegram_bot_username(&self, role: &str, username: &str) {
        let _ = self.conn.execute(
            "INSERT INTO app_meta (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![format!("tg_{role}_bot_username"), username],
        );
    }

    // ---- Telegram: привязка личного чата по одноразовому коду (v0.5.3) ----
    // Код действует 15 минут, одноразовый (стирается сразу после успешной
    // привязки), хранится прямо на строке employees — см. комментарий у
    // add_column_if_missing выше.
    pub fn generate_telegram_link_code(&self, actor_id: &str, employee_id: &str) -> Result<String, String> {
        if actor_id != employee_id && !self.is_admin(actor_id) {
            return Err("Недостаточно прав".into());
        }
        let code = Uuid::new_v4().to_string().replace('-', "")[..8].to_uppercase();
        self.conn
            .execute(
                "UPDATE employees SET telegram_link_code = ?1, telegram_link_code_expires_at = datetime('now', '+15 minutes') WHERE id = ?2",
                params![code, employee_id],
            )
            .map_err(|e| e.to_string())?;
        Ok(code)
    }

    pub fn telegram_link_status(&self, employee_id: &str) -> bool {
        self.conn
            .query_row("SELECT telegram_chat_id FROM employees WHERE id = ?1", params![employee_id], |row| row.get::<_, Option<String>>(0))
            .ok()
            .flatten()
            .is_some()
    }

    pub fn unlink_telegram(&self, actor_id: &str, employee_id: &str) -> Result<(), String> {
        if actor_id != employee_id && !self.is_admin(actor_id) {
            return Err("Недостаточно прав".into());
        }
        self.conn
            .execute("UPDATE employees SET telegram_chat_id = NULL WHERE id = ?1", params![employee_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Вызывается из telegram.rs при входящем "/start <code>" — возвращает
    // employee_id при успехе, None если код неверный/просрочен (не 500-я
    // ошибка — обычный отрицательный исход, бот просто ответит текстом).
    pub fn link_telegram_chat_by_code(&self, code: &str, chat_id: &str) -> Option<String> {
        let employee_id: String = self.conn
            .query_row(
                "SELECT id FROM employees WHERE telegram_link_code = ?1 AND telegram_link_code_expires_at > datetime('now')",
                params![code],
                |row| row.get(0),
            )
            .ok()?;
        self.conn
            .execute(
                "UPDATE employees SET telegram_chat_id = ?1, telegram_link_code = NULL, telegram_link_code_expires_at = NULL WHERE id = ?2",
                params![chat_id, employee_id],
            )
            .ok()?;
        Some(employee_id)
    }

    pub fn get_employee_telegram_chat_id(&self, employee_id: &str) -> Option<String> {
        self.conn
            .query_row("SELECT telegram_chat_id FROM employees WHERE id = ?1", params![employee_id], |row| row.get::<_, Option<String>>(0))
            .ok()
            .flatten()
    }

    pub fn list_partner_telegram_chat_ids(&self, partner_id: &str) -> Vec<String> {
        let mut stmt = match self.conn.prepare("SELECT telegram_chat_id FROM employees WHERE partner_id = ?1 AND is_partner = 1 AND telegram_chat_id IS NOT NULL") {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![partner_id], |row| row.get::<_, String>(0))
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default()
    }

    pub fn find_employee_id_by_chat_id(&self, chat_id: &str) -> Option<String> {
        self.conn.query_row("SELECT id FROM employees WHERE telegram_chat_id = ?1", params![chat_id], |row| row.get(0)).ok()
    }

    // ---- Записная книжка (v0.6.0) ----
    // Строго личное — actor_id должен РАВНЯТЬСЯ employee_id, без обхода для
    // админа (сознательное отличие от Telegram-привязки выше, где админ
    // может править чужую) — заметки могут содержать пароли.
    fn require_notebook_owner(&self, actor_id: &str, employee_id: &str) -> Result<(), String> {
        if actor_id != employee_id {
            return Err("Недостаточно прав".into());
        }
        Ok(())
    }

    pub fn get_notebook_settings(&self, actor_id: &str, employee_id: &str) -> Result<NotebookSettingsRecord, String> {
        self.require_notebook_owner(actor_id, employee_id)?;
        self.conn
            .query_row(
                "SELECT notebook_enabled, notebook_name FROM employees WHERE id = ?1",
                params![employee_id],
                |row| Ok(NotebookSettingsRecord { enabled: row.get::<_, i64>(0)? != 0, name: row.get(1)? }),
            )
            .map_err(|e| e.to_string())
    }

    pub fn set_notebook_settings(&self, actor_id: &str, employee_id: &str, enabled: bool, name: Option<&str>) -> Result<NotebookSettingsRecord, String> {
        self.require_notebook_owner(actor_id, employee_id)?;
        let trimmed = name.map(str::trim).filter(|s| !s.is_empty());
        self.conn
            .execute(
                "UPDATE employees SET notebook_enabled = ?1, notebook_name = ?2 WHERE id = ?3",
                params![enabled as i64, trimmed, employee_id],
            )
            .map_err(|e| e.to_string())?;
        self.get_notebook_settings(actor_id, employee_id)
    }

    fn map_notebook_note_row(row: &rusqlite::Row) -> rusqlite::Result<NotebookNoteRecord> {
        Ok(NotebookNoteRecord {
            id: row.get(0)?,
            employee_id: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }

    fn get_notebook_note_internal(&self, id: &str) -> Option<NotebookNoteRecord> {
        self.conn
            .query_row(
                "SELECT id, employee_id, title, content, created_at, updated_at FROM notebook_notes WHERE id = ?1",
                params![id],
                Self::map_notebook_note_row,
            )
            .ok()
    }

    pub fn list_notebook_notes(&self, actor_id: &str, employee_id: &str) -> Result<Vec<NotebookNoteRecord>, String> {
        self.require_notebook_owner(actor_id, employee_id)?;
        let mut stmt = self.conn
            .prepare("SELECT id, employee_id, title, content, created_at, updated_at FROM notebook_notes WHERE employee_id = ?1 ORDER BY updated_at DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![employee_id], Self::map_notebook_note_row).map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }

    pub fn create_notebook_note(&self, actor_id: &str, employee_id: &str, title: &str, content: Option<&str>) -> Result<NotebookNoteRecord, String> {
        self.require_notebook_owner(actor_id, employee_id)?;
        if title.trim().is_empty() {
            return Err("Укажите заголовок заметки".into());
        }
        let id = Uuid::new_v4().to_string();
        self.conn
            .execute(
                "INSERT INTO notebook_notes (id, employee_id, title, content) VALUES (?1, ?2, ?3, ?4)",
                params![id, employee_id, title.trim(), content],
            )
            .map_err(|e| e.to_string())?;
        self.get_notebook_note_internal(&id).ok_or_else(|| "Заметка не найдена".to_string())
    }

    pub fn update_notebook_note(&self, actor_id: &str, id: &str, title: &str, content: Option<&str>) -> Result<NotebookNoteRecord, String> {
        let existing = self.get_notebook_note_internal(id).ok_or_else(|| "Заметка не найдена".to_string())?;
        self.require_notebook_owner(actor_id, &existing.employee_id)?;
        if title.trim().is_empty() {
            return Err("Укажите заголовок заметки".into());
        }
        self.conn
            .execute(
                "UPDATE notebook_notes SET title = ?1, content = ?2, updated_at = datetime('now') WHERE id = ?3",
                params![title.trim(), content, id],
            )
            .map_err(|e| e.to_string())?;
        self.get_notebook_note_internal(id).ok_or_else(|| "Заметка не найдена".to_string())
    }

    pub fn delete_notebook_note(&self, actor_id: &str, id: &str) -> Result<(), String> {
        let existing = self.get_notebook_note_internal(id).ok_or_else(|| "Заметка не найдена".to_string())?;
        self.require_notebook_owner(actor_id, &existing.employee_id)?;
        self.conn.execute("DELETE FROM notebook_notes WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // ---- Обучающий тур (v1.2.0) ----
    // Строго личное — actor_id должен РАВНЯТЬСЯ employee_id, без обхода для
    // админа (тот же гейт, что у записной книжки).
    fn require_onboarding_owner(&self, actor_id: &str, employee_id: &str) -> Result<(), String> {
        if actor_id != employee_id {
            return Err("Недостаточно прав".into());
        }
        Ok(())
    }

    pub fn get_onboarding_status(&self, actor_id: &str, employee_id: &str) -> Result<OnboardingStatusRecord, String> {
        self.require_onboarding_owner(actor_id, employee_id)?;
        self.conn
            .query_row(
                "SELECT onboarding_completed FROM employees WHERE id = ?1",
                params![employee_id],
                |row| Ok(OnboardingStatusRecord { completed: row.get::<_, i64>(0)? != 0 }),
            )
            .map_err(|e| e.to_string())
    }

    // Единственный осмысленный переход — "не пройден" → "пройден" (и Skip, и
    // Finish в туре зовут один и тот же сеттер) — без bool-параметра,
    // "показать тур заново" в интерфейсе не предусмотрено.
    pub fn set_onboarding_completed(&self, actor_id: &str, employee_id: &str) -> Result<OnboardingStatusRecord, String> {
        self.require_onboarding_owner(actor_id, employee_id)?;
        self.conn
            .execute("UPDATE employees SET onboarding_completed = 1 WHERE id = ?1", params![employee_id])
            .map_err(|e| e.to_string())?;
        self.get_onboarding_status(actor_id, employee_id)
    }

    // ---- Отчёты (v0.5.0) ----
    // period_start/period_end — простые даты "YYYY-MM-DD" (как из <input type="date">),
    // сами достраиваем границы суток при сравнении со строками datetime() в SQLite.

    fn parse_sqlite_datetime(raw: &str) -> Option<NaiveDateTime> {
        // SQLite datetime() отдаёт "YYYY-MM-DD HH:MM:SS"; login_at/logout_at всегда в этом
        // формате (DEFAULT (datetime('now')) везде в схеме) — второй формат на случай, если
        // где-то оказалась чистая дата без времени.
        NaiveDateTime::parse_from_str(raw, "%Y-%m-%d %H:%M:%S")
            .ok()
            .or_else(|| NaiveDateTime::parse_from_str(&format!("{raw} 00:00:00"), "%Y-%m-%d %H:%M:%S").ok())
    }

    pub fn list_employee_report_rows(&self, admin_id: &str, period_start: &str, period_end: &str) -> Result<Vec<EmployeeReportRow>, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        let range_start = format!("{period_start} 00:00:00");
        let range_end = format!("{period_end} 23:59:59");
        let period_start_dt = Self::parse_sqlite_datetime(&range_start).ok_or_else(|| "Некорректная дата начала периода".to_string())?;
        let period_end_dt = Self::parse_sqlite_datetime(&range_end).ok_or_else(|| "Некорректная дата конца периода".to_string())?;

        let sql = format!("{} WHERE e.is_partner = 0 ORDER BY e.full_name ASC", Self::EMPLOYEE_SELECT);
        let mut stmt = self.conn.prepare(&sql).map_err(|e| e.to_string())?;
        let employees: Vec<EmployeeRecord> = stmt
            .query_map([], Self::map_employee_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let mut rows = Vec::with_capacity(employees.len());
        for emp in employees {
            // Часы работы — сырые пары login_at/logout_at за период, клэмпинг к границам
            // периода и суммирование через chrono (строковая арифметика на границах ненадёжна,
            // особенно для ещё не закрытых сессий — logout_at IS NULL считаем "по сейчас").
            let mut sessions_stmt = self.conn.prepare(
                "SELECT login_at, logout_at FROM employee_sessions
                 WHERE employee_id = ?1 AND login_at <= ?2 AND COALESCE(logout_at, datetime('now')) >= ?3",
            ).map_err(|e| e.to_string())?;
            let sessions: Vec<(String, Option<String>)> = sessions_stmt
                .query_map(params![emp.id, range_end, range_start], |row| Ok((row.get(0)?, row.get(1)?)))
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();
            let mut hours_worked = 0.0f64;
            for (login_at, logout_at) in &sessions {
                let Some(login_dt) = Self::parse_sqlite_datetime(login_at) else { continue };
                let now = chrono::Local::now().naive_local();
                let logout_dt = logout_at.as_deref().and_then(Self::parse_sqlite_datetime).unwrap_or(now);
                let clamped_start = login_dt.max(period_start_dt);
                let clamped_end = logout_dt.min(period_end_dt);
                if clamped_end > clamped_start {
                    hours_worked += (clamped_end - clamped_start).num_seconds() as f64 / 3600.0;
                }
            }

            // Заявки на отсутствие за период, сгруппированные по типу.
            let mut absence_stmt = self.conn.prepare(
                "SELECT type, COUNT(*) FROM absence_requests
                 WHERE employee_id = ?1 AND start_date <= ?2 AND end_date >= ?3
                 GROUP BY type",
            ).map_err(|e| e.to_string())?;
            let absence_counts: Vec<(String, i64)> = absence_stmt
                .query_map(params![emp.id, period_end, period_start], |row| Ok((row.get(0)?, row.get(1)?)))
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .collect();

            let regulations_count: i64 = self.conn
                .query_row("SELECT COUNT(DISTINCT regulation_id) FROM regulation_members WHERE employee_id = ?1", params![emp.id], |row| row.get(0))
                .unwrap_or(0);
            let projects_count: i64 = self.conn
                .query_row("SELECT COUNT(DISTINCT project_id) FROM project_members WHERE employee_id = ?1", params![emp.id], |row| row.get(0))
                .unwrap_or(0);

            rows.push(EmployeeReportRow {
                employee_id: emp.id,
                full_name: emp.full_name,
                employee_number: emp.employee_number,
                department_name: emp.department_name,
                position_title: emp.position_title,
                hours_worked,
                absence_counts,
                regulations_count,
                projects_count,
            });
        }
        Ok(rows)
    }

    // Достаёт число из свободного текста ("5 000 000 сум" → 5000000.0, "10%" → 10.0,
    // "договорная" → None) — deal_value/price в схеме исторически TEXT, не число (см.
    // create_client/create_partner_service), парсинг всегда best-effort.
    fn parse_numeric_amount(raw: &str) -> Option<f64> {
        let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
        if digits.is_empty() {
            return None;
        }
        digits.parse::<f64>().ok()
    }

    pub fn list_partner_report_rows(
        &self,
        actor_id: &str,
        partner_id: Option<&str>,
        period_start: Option<&str>,
        period_end: Option<&str>,
    ) -> Result<Vec<PartnerReportRow>, String> {
        let partners: Vec<PartnerRecord> = match partner_id {
            Some(pid) => {
                self.can_access_partner_org(actor_id, pid)?;
                self.list_partners().into_iter().filter(|p| p.id == pid).collect()
            }
            None => {
                if !self.is_admin(actor_id) {
                    return Err("Недостаточно прав".into());
                }
                self.list_partners()
            }
        };

        let range_start = period_start.map(|s| format!("{s} 00:00:00"));
        let range_end = period_end.map(|s| format!("{s} 23:59:59"));

        let mut rows = Vec::with_capacity(partners.len());
        for partner in partners {
            let clients = self.list_clients_for_partner_report(&partner.id);
            let clients_in_period: Vec<&ClientRecord> = clients
                .iter()
                .filter(|c| {
                    match (&range_start, &range_end) {
                        (Some(s), Some(e)) => c.created_at.as_str() >= s.as_str() && c.created_at.as_str() <= e.as_str(),
                        _ => true,
                    }
                })
                .collect();

            let regulations = self.list_partner_regulations(actor_id, &partner.id).unwrap_or_default();
            let regulations_count = regulations
                .iter()
                .filter(|r| match (&range_start, &range_end) {
                    (Some(s), Some(e)) => r.updated_at.as_str() >= s.as_str() && r.updated_at.as_str() <= e.as_str(),
                    _ => true,
                })
                .count() as i64;

            let mut financial_total = 0.0f64;
            let mut any_parsed = false;
            let mut any_unparsed = false;
            let mut financial_raw_values = Vec::new();
            for c in &clients_in_period {
                if let Some(dv) = &c.deal_value {
                    financial_raw_values.push(dv.clone());
                    match Self::parse_numeric_amount(dv) {
                        Some(n) => {
                            financial_total += n;
                            any_parsed = true;
                        }
                        None => any_unparsed = true,
                    }
                }
            }

            rows.push(PartnerReportRow {
                partner_id: partner.id,
                partner_name: partner.name,
                clients_added_count: clients_in_period.len() as i64,
                regulations_count,
                financial_total: if any_parsed { Some(financial_total) } else { None },
                financial_total_partial: any_parsed && any_unparsed,
                financial_raw_values,
            });
        }
        Ok(rows)
    }

    // ---- Настройки авто-выгрузки отчётов (v0.5.0) ----
    // Тот же app_meta key/value паттерн, что у Radmin/Telegram-ботов — admin-only, и на чтение
    // тоже (путь к папке на диске админа — не то, что стоит открывать всем сотрудникам).

    // Без гейта — читается и из get_report_export_settings (после проверки прав там), и
    // напрямую планировщиком в main.rs (там нет actor_id, вызов не от лица пользователя).
    pub fn read_report_export_settings(&self) -> ReportExportSettingsRecord {
        let get = |key: &str| -> Option<String> {
            self.conn.query_row("SELECT value FROM app_meta WHERE key = ?1", params![key], |row| row.get(0)).ok()
        };
        ReportExportSettingsRecord {
            enabled: get("report_export_enabled").as_deref() == Some("1"),
            day_mode: get("report_export_day_mode").unwrap_or_else(|| "last_day".to_string()),
            fixed_day: get("report_export_fixed_day").and_then(|v| v.parse().ok()).unwrap_or(1),
            time_hhmm: get("report_export_time").unwrap_or_else(|| "20:00".to_string()),
            folder: get("report_export_folder").unwrap_or_default(),
        }
    }

    pub fn get_report_export_settings(&self, actor_id: &str) -> Result<ReportExportSettingsRecord, String> {
        if !self.is_admin(actor_id) {
            return Err("Недостаточно прав".into());
        }
        Ok(self.read_report_export_settings())
    }

    pub fn set_report_export_settings(
        &self,
        admin_id: &str,
        enabled: bool,
        day_mode: &str,
        fixed_day: i64,
        time_hhmm: &str,
        folder: &str,
    ) -> Result<ReportExportSettingsRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        if !["last_day", "fixed_day"].contains(&day_mode) {
            return Err("Некорректный режим дня".into());
        }
        let set = |key: &str, value: &str| {
            self.conn.execute(
                "INSERT INTO app_meta (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![key, value],
            )
        };
        set("report_export_enabled", if enabled { "1" } else { "0" }).map_err(|e| e.to_string())?;
        set("report_export_day_mode", day_mode).map_err(|e| e.to_string())?;
        set("report_export_fixed_day", &fixed_day.clamp(1, 31).to_string()).map_err(|e| e.to_string())?;
        set("report_export_time", time_hhmm).map_err(|e| e.to_string())?;
        set("report_export_folder", folder).map_err(|e| e.to_string())?;
        // Кто включил — от его имени планировщик будет дёргать гейтованные
        // list_employee_report_rows/list_partner_report_rows (там нет "системного" актора).
        if enabled {
            set("report_export_admin_id", admin_id).map_err(|e| e.to_string())?;
        }
        Ok(self.read_report_export_settings())
    }

    // Только для планировщика (main.rs) — без гейта, вызывается не от лица пользователя.
    pub fn report_export_admin_id(&self) -> Option<String> {
        self.conn.query_row("SELECT value FROM app_meta WHERE key = 'report_export_admin_id'", [], |row| row.get(0)).ok()
    }

    pub fn report_export_last_fired_date(&self) -> Option<String> {
        self.conn.query_row("SELECT value FROM app_meta WHERE key = 'report_export_last_fired_date'", [], |row| row.get(0)).ok()
    }

    pub fn set_report_export_last_fired_date(&self, date: &str) {
        let _ = self.conn.execute(
            "INSERT INTO app_meta (key, value) VALUES ('report_export_last_fired_date', ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![date],
        );
    }
}

pub struct ServerSettingsRecord {
    pub enabled: bool,
    pub port: u16,
}

pub struct RadminSettingsRecord {
    pub network_id: String,
    pub network_password: String,
    pub note: String,
}

pub struct TelegramBotSettingsRecord {
    pub enabled: bool,
    pub token: Option<String>,
}

pub struct EmployeeReportRow {
    pub employee_id: String,
    pub full_name: String,
    pub employee_number: String,
    pub department_name: Option<String>,
    pub position_title: Option<String>,
    pub hours_worked: f64,
    pub absence_counts: Vec<(String, i64)>,
    pub regulations_count: i64,
    pub projects_count: i64,
}

pub struct PartnerReportRow {
    pub partner_id: String,
    pub partner_name: String,
    pub clients_added_count: i64,
    pub regulations_count: i64,
    pub financial_total: Option<f64>,
    pub financial_total_partial: bool,
    pub financial_raw_values: Vec<String>,
}

pub struct ReportExportSettingsRecord {
    pub enabled: bool,
    pub day_mode: String,
    pub fixed_day: i64,
    pub time_hhmm: String,
    pub folder: String,
}

