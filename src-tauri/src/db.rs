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

pub struct PositionRecord {
    pub id: String,
    pub title: String,
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
            );",
        )
        .expect("не удалось инициализировать схему");

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

        Db { conn }
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
            (SELECT MAX(COALESCE(s.logout_at, s.login_at)) FROM employee_sessions s WHERE s.employee_id = e.id)
        FROM employees e
        LEFT JOIN positions p ON p.id = e.position_id
        LEFT JOIN employees m ON m.id = e.manager_id
        LEFT JOIN employees d ON d.id = e.deputy_id
        LEFT JOIN departments dep ON dep.id = e.department_id";

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
    ) -> Result<EmployeeRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав для добавления сотрудников".into());
        }
        if password.len() < 6 {
            return Err("Пароль должен быть не короче 6 символов".into());
        }

        let resolved_manager_id = self.resolve_manager(manager_id, department_id)?;

        let id = Uuid::new_v4().to_string();
        let password_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;
        let employee_number = self.next_employee_number();

        self.conn
            .execute(
                "INSERT INTO employees (id, employee_number, login, password_hash, full_name, is_admin, phone, position_id, manager_id, deputy_id, department_id, avatar_data)
                 VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?9, ?10, ?11)",
                params![id, employee_number, login, password_hash, full_name, phone, position_id, resolved_manager_id, deputy_id, department_id, avatar_data],
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
                "UPDATE employees SET full_name = ?1, phone = ?2, position_id = ?3, manager_id = ?4, deputy_id = ?5, department_id = ?6, avatar_data = ?7
                 WHERE id = ?8",
                params![full_name, phone, position_id, resolved_manager_id, deputy_id, department_id, avatar_data, employee_id],
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

    // ---- Подразделения ----

    const DEPARTMENT_SELECT: &'static str = "SELECT
            dep.id, dep.name, dep.head_employee_id, h.full_name,
            (SELECT COUNT(*) FROM employees e WHERE e.department_id = dep.id)
        FROM departments dep
        LEFT JOIN employees h ON h.id = dep.head_employee_id";

    fn map_department_row(row: &rusqlite::Row) -> rusqlite::Result<DepartmentRecord> {
        Ok(DepartmentRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            head_employee_id: row.get(2)?,
            head_name: row.get(3)?,
            member_count: row.get(4)?,
        })
    }

    pub fn list_departments(&self) -> Vec<DepartmentRecord> {
        let sql = format!("{} ORDER BY dep.name ASC", Self::DEPARTMENT_SELECT);
        let mut stmt = self.conn.prepare(&sql).expect("не удалось подготовить запрос");
        let rows = stmt.query_map([], Self::map_department_row).expect("не удалось выполнить запрос");
        rows.filter_map(|r| r.ok()).collect()
    }

    pub fn create_department(&self, admin_id: &str, name: &str, head_employee_id: Option<&str>) -> Result<DepartmentRecord, String> {
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
                "INSERT INTO departments (id, name, head_employee_id) VALUES (?1, ?2, ?3)",
                params![id, name, head_employee_id],
            )
            .map_err(|e| {
                if e.to_string().contains("UNIQUE") {
                    "Такое подразделение уже есть".to_string()
                } else {
                    e.to_string()
                }
            })?;

        let sql = format!("{} WHERE dep.id = ?1", Self::DEPARTMENT_SELECT);
        self.conn
            .query_row(&sql, params![id], Self::map_department_row)
            .map_err(|e| e.to_string())
    }

    pub fn update_department(&self, admin_id: &str, id: &str, name: &str, head_employee_id: Option<&str>) -> Result<DepartmentRecord, String> {
        if !self.is_admin(admin_id) {
            return Err("Недостаточно прав для управления подразделениями".into());
        }
        let name = name.trim();
        if name.is_empty() {
            return Err("Название подразделения не может быть пустым".into());
        }
        self.conn
            .execute(
                "UPDATE departments SET name = ?1, head_employee_id = ?2 WHERE id = ?3",
                params![name, head_employee_id, id],
            )
            .map_err(|e| e.to_string())?;

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

    // ---- Учёт входов/выходов и статус "в сети" ----
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
}
