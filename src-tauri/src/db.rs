use rusqlite::{params, Connection};
use std::path::Path;
use uuid::Uuid;

// В v0.1.x работаем полностью локально (SQLite-файл в app data dir).
// Когда появится подключение к серверу (v0.2.0), эта схема станет "зеркалом"
// основной PostgreSQL-схемы (см. docs/db/schema.sql).

pub struct Db {
    conn: Connection,
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
}

pub struct ProjectChatReplyRecord {
    pub id: String,
    pub message_id: String,
    pub author_id: String,
    pub author_name: String,
    pub content: String,
    pub created_at: String,
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

pub struct RegulationReplyRecord {
    pub id: String,
    pub entry_id: String,
    pub author_id: String,
    pub author_name: String,
    pub content: String,
    pub created_at: String,
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

        let db = Db { conn };
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

    fn is_admin(&self, employee_id: &str) -> bool {
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
                "INSERT INTO employees (id, employee_number, login, password_hash, full_name, is_admin)
                 VALUES (?1, ?2, ?3, ?4, ?5, 1)",
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
                "INSERT INTO employees (id, employee_number, login, password_hash, full_name, is_admin, phone, position_id, manager_id, deputy_id, department_id, avatar_data, birth_date, is_partner, partner_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
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
    // а не только через клик по уведомлению.
    pub fn list_pending_approvals(&self, actor_id: &str) -> Vec<AbsenceRequestRecord> {
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
            c.created_by, e.full_name, c.created_at
        FROM clients c
        LEFT JOIN employees e ON e.id = c.created_by";

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
        })
    }

    fn next_client_number(&self) -> String {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM clients", [], |row| row.get(0)).unwrap_or(0);
        format!("CLI-{:05}", count + 1)
    }

    pub fn list_clients(&self) -> Vec<ClientRecord> {
        let sql = format!("{} ORDER BY c.created_at DESC", Self::CLIENT_SELECT);
        let mut stmt = match self.conn.prepare(&sql) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map([], Self::map_client_row)
            .map(|rows| rows.filter_map(|r| r.ok()).collect())
            .unwrap_or_default()
    }

    pub fn get_client(&self, id: &str) -> Option<ClientRecord> {
        let sql = format!("{} WHERE c.id = ?1", Self::CLIENT_SELECT);
        self.conn.query_row(&sql, params![id], Self::map_client_row).ok()
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
    ) -> Result<ClientRecord, String> {
        if name.trim().is_empty() {
            return Err("Укажите название/имя клиента".into());
        }
        let id = Uuid::new_v4().to_string();
        let client_number = self.next_client_number();
        self.conn
            .execute(
                "INSERT INTO clients (id, client_number, name, contact_person, contact_position, phone, email, address, notes, created_by)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![id, client_number, name.trim(), contact_person, contact_position, phone, email, address, notes, actor_id],
            )
            .map_err(|e| e.to_string())?;
        self.get_client(&id).ok_or_else(|| "Клиент не найден".to_string())
    }

    pub fn update_client(
        &self,
        id: &str,
        name: &str,
        contact_person: Option<&str>,
        contact_position: Option<&str>,
        phone: Option<&str>,
        email: Option<&str>,
        address: Option<&str>,
        notes: Option<&str>,
    ) -> Result<ClientRecord, String> {
        if name.trim().is_empty() {
            return Err("Укажите название/имя клиента".into());
        }
        self.conn
            .execute(
                "UPDATE clients SET name = ?1, contact_person = ?2, contact_position = ?3, phone = ?4, email = ?5, address = ?6, notes = ?7 WHERE id = ?8",
                params![name.trim(), contact_person, contact_position, phone, email, address, notes, id],
            )
            .map_err(|e| e.to_string())?;
        self.get_client(id).ok_or_else(|| "Клиент не найден".to_string())
    }

    pub fn delete_client(&self, admin_id: &str, id: &str) -> Result<(), String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute("DELETE FROM client_history WHERE client_id = ?1", params![id]).map_err(|e| e.to_string())?;
        self.conn.execute("DELETE FROM clients WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_client_history(&self, client_id: &str) -> Vec<ClientHistoryRecord> {
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
                    (SELECT COUNT(*) FROM project_chat_replies r WHERE r.message_id = m.id)
             FROM project_chat_messages m
             JOIN employees e ON e.id = m.sender_id
             JOIN employees t ON t.id = m.target_employee_id
             WHERE m.project_id = ?1 ORDER BY m.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![project_id], |row| {
            Ok(ProjectChatMessageRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                sender_id: row.get(2)?,
                sender_name: row.get(3)?,
                target_employee_id: row.get(4)?,
                target_name: row.get(5)?,
                content: row.get(6)?,
                attachment_data: row.get(7)?,
                attachment_name: row.get(8)?,
                deadline: row.get(9)?,
                status: row.get(10)?,
                created_at: row.get(11)?,
                reply_count: row.get(12)?,
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
        })
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
        let (project_id, sender_id): (String, String) = self.conn
            .query_row("SELECT project_id, sender_id FROM project_chat_messages WHERE id = ?1", params![message_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|_| "Сообщение не найдено".to_string())?;
        let project = self.get_project(&project_id).ok_or_else(|| "Проект не найден".to_string())?;
        if !self.can_manage_project(actor_id, &project.owner_id) && sender_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute("UPDATE project_chat_messages SET status = ?1 WHERE id = ?2", params![new_status, message_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_project_chat_replies(&self, message_id: &str) -> Vec<ProjectChatReplyRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT r.id, r.message_id, r.author_id, e.full_name, r.content, r.created_at
             FROM project_chat_replies r JOIN employees e ON e.id = r.author_id
             WHERE r.message_id = ?1 ORDER BY r.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![message_id], |row| {
            Ok(ProjectChatReplyRecord {
                id: row.get(0)?,
                message_id: row.get(1)?,
                author_id: row.get(2)?,
                author_name: row.get(3)?,
                content: row.get(4)?,
                created_at: row.get(5)?,
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
        })
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
                    (SELECT COUNT(*) FROM regulation_replies rr WHERE rr.entry_id = e.id)
             FROM regulation_entries e
             JOIN employees a ON a.id = e.author_id
             JOIN employees t ON t.id = e.target_employee_id
             WHERE e.regulation_id = ?1 ORDER BY e.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![regulation_id], |row| {
            Ok(RegulationEntryRecord {
                id: row.get(0)?,
                regulation_id: row.get(1)?,
                author_id: row.get(2)?,
                author_name: row.get(3)?,
                target_employee_id: row.get(4)?,
                target_name: row.get(5)?,
                content: row.get(6)?,
                attachment_data: row.get(7)?,
                attachment_name: row.get(8)?,
                deadline: row.get(9)?,
                status: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
                reply_count: row.get(13)?,
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
             WHERE e.target_employee_id = ?1 AND e.status = 'open' AND r.status = 'active'
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
        })
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
        let (regulation_id, author_id): (String, String) = self.conn
            .query_row("SELECT regulation_id, author_id FROM regulation_entries WHERE id = ?1", params![entry_id], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|_| "Запись не найдена".to_string())?;
        let reg = self.get_regulation(&regulation_id).ok_or_else(|| "Регламент не найден".to_string())?;
        if !self.is_admin(actor_id) && reg.owner_id != actor_id && author_id != actor_id {
            return Err("Недостаточно прав".into());
        }
        self.conn.execute("UPDATE regulation_entries SET status = ?1, updated_at = datetime('now') WHERE id = ?2", params![new_status, entry_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_regulation_replies(&self, entry_id: &str) -> Vec<RegulationReplyRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT rr.id, rr.entry_id, rr.author_id, e.full_name, rr.content, rr.created_at
             FROM regulation_replies rr JOIN employees e ON e.id = rr.author_id
             WHERE rr.entry_id = ?1 ORDER BY rr.created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map(params![entry_id], |row| {
            Ok(RegulationReplyRecord {
                id: row.get(0)?,
                entry_id: row.get(1)?,
                author_id: row.get(2)?,
                author_name: row.get(3)?,
                content: row.get(4)?,
                created_at: row.get(5)?,
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
        })
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

    pub fn list_blog_topics(&self) -> Vec<BlogTopicRecord> {
        let mut stmt = match self.conn.prepare(
            "SELECT t.id, t.category, t.title, t.content, t.created_by, e.full_name, t.pinned, t.created_at,
                    (SELECT COUNT(*) FROM blog_comments c WHERE c.topic_id = t.id)
             FROM blog_topics t JOIN employees e ON e.id = t.created_by
             ORDER BY t.pinned DESC, t.created_at DESC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };
        stmt.query_map([], |row| {
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
            })
        })
        .map(|rows| rows.filter_map(|r| r.ok()).collect())
        .unwrap_or_default()
    }

    fn get_blog_topic(&self, id: &str) -> Option<BlogTopicRecord> {
        self.conn.query_row(
            "SELECT t.id, t.category, t.title, t.content, t.created_by, e.full_name, t.pinned, t.created_at,
                    (SELECT COUNT(*) FROM blog_comments c WHERE c.topic_id = t.id)
             FROM blog_topics t JOIN employees e ON e.id = t.created_by
             WHERE t.id = ?1",
            params![id],
            |row| {
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
                })
            },
        ).ok()
    }

    pub fn create_blog_topic(&self, actor_id: &str, category: &str, title: &str, content: Option<&str>) -> Result<BlogTopicRecord, String> {
        if title.trim().is_empty() {
            return Err("Укажите заголовок темы".into());
        }
        if !Self::BLOG_CATEGORIES.contains(&category) {
            return Err("Некорректная категория".into());
        }
        let id = Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO blog_topics (id, category, title, content, created_by) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, category, title.trim(), content, actor_id],
        ).map_err(|e| e.to_string())?;
        self.get_blog_topic(&id).ok_or_else(|| "Тема не найдена".to_string())
    }

    pub fn update_blog_topic(&self, actor_id: &str, id: &str, category: &str, title: &str, content: Option<&str>) -> Result<BlogTopicRecord, String> {
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
        self.conn.execute(
            "UPDATE blog_topics SET category = ?1, title = ?2, content = ?3 WHERE id = ?4",
            params![category, title.trim(), content, id],
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
}

pub struct ServerSettingsRecord {
    pub enabled: bool,
    pub port: u16,
}

