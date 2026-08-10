-- ============================================================================
-- CRM SCHEMA — IB OOO "ISHONCHLI BOSH BUXGALTER"
-- PostgreSQL 15+
-- ============================================================================
-- Разделы:
--   1. Расширения
--   2. Сотрудники, авторизация, авто-вход
--   3. Должности и права (RBAC с делегированием)
--   4. Подразделения (департаменты)
--   5. Клиенты и история клиента
--   6. Проекты, участники, чат проекта
--   7. Регламенты
--   8. Задачи и авто/ручное распределение
--   9. Уведомления
--  10. Блог
--  11. Настройки пользователя (тема/язык)
--  12. Админ: сервер, версии приложения, обновления
--  13. Аудит (журнал первого создания и изменений)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- ============================================================================
-- 2. СОТРУДНИКИ, АВТОРИЗАЦИЯ, АВТО-ВХОД
-- ============================================================================

CREATE TYPE employee_status AS ENUM ('active', 'suspended', 'fired');

CREATE TABLE employees (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_number      VARCHAR(20) UNIQUE NOT NULL,        -- человекочитаемый ID, напр. EMP-00042
    login                VARCHAR(100) UNIQUE NOT NULL,
    password_hash        TEXT NOT NULL,
    password_changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    password_expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '60 days'), -- авто-ротация раз в 2 мес
    must_change_password BOOLEAN NOT NULL DEFAULT false,

    full_name            VARCHAR(255),
    phone                VARCHAR(50),
    email                VARCHAR(255),
    birth_date           DATE,                                -- используется календарём ДР
    avatar_url            TEXT,
    bio                  TEXT,

    position_id          UUID REFERENCES positions(id) ON DELETE SET NULL,
    status                employee_status NOT NULL DEFAULT 'active',

    profile_completed     BOOLEAN NOT NULL DEFAULT false,       -- дозаполнение после регистрации login+password

    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Сессии для "авто-входа" (remember me): при повторном входе достаточно пароля,
-- логин подставляется по сохранённому device-токену
CREATE TABLE auth_sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id          UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    refresh_token_hash   TEXT NOT NULL,
    device_name          VARCHAR(255),
    device_fingerprint   VARCHAR(255),
    ip_address           INET,
    remember_login       BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at           TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_auth_sessions_employee ON auth_sessions(employee_id);

-- ============================================================================
-- 3. ДОЛЖНОСТИ И ПРАВА (RBAC с делегированием)
-- ============================================================================

CREATE TABLE positions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR(150) NOT NULL,
    description  TEXT,
    created_by   UUID REFERENCES employees(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Справочник прав в системе. Примеры кодов:
-- 'manage_positions'   — может назначать/менять должности другим
-- 'manage_departments' — может создавать подразделения
-- 'manage_employees'   — может редактировать карточки сотрудников
-- 'manage_server'      — доступ к вкладке "подключение к серверу"
-- 'manage_updates'     — может публиковать/подтягивать новую версию приложения
CREATE TABLE permissions (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code  VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL
);

-- Кому какое право выдано (админ может выдать 1 или нескольким сотрудникам)
CREATE TABLE employee_permissions (
    employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    permission_id  UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by     UUID REFERENCES employees(id),
    granted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (employee_id, permission_id)
);

-- ============================================================================
-- 4. ПОДРАЗДЕЛЕНИЯ (ДЕПАРТАМЕНТЫ)
-- ============================================================================

CREATE TABLE departments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    head_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- руководитель
    created_by     UUID REFERENCES employees(id),                       -- админ / "левая рука"
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Сотрудник в кабинете видит "состоит в команде: X, руководитель: Y"
CREATE TABLE department_members (
    department_id  UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (department_id, employee_id)
);

CREATE INDEX idx_department_members_employee ON department_members(employee_id);

-- ============================================================================
-- 5. КЛИЕНТЫ И ИСТОРИЯ КЛИЕНТА
-- ============================================================================

CREATE TABLE clients (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_number  VARCHAR(20) UNIQUE NOT NULL,   -- ID клиента для поиска
    name           VARCHAR(255) NOT NULL,
    contact_info   JSONB,                          -- телефон, email, адрес и т.д.
    notes          TEXT,
    created_by     UUID REFERENCES employees(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Лента событий по клиенту: что делали, какие регламенты/проекты активны
CREATE TABLE client_history (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    event_type         VARCHAR(50) NOT NULL,        -- regulation_created, project_started, note, status_change...
    description        TEXT,
    related_entity_type VARCHAR(50),                -- 'regulation' | 'project'
    related_entity_id  UUID,
    created_by         UUID REFERENCES employees(id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_history_client ON client_history(client_id);

-- ============================================================================
-- 6. ПРОЕКТЫ, УЧАСТНИКИ, ЧАТ ПРОЕКТА
-- ============================================================================

CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE project_member_role AS ENUM ('owner', 'assistant', 'member');

CREATE TABLE projects (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number VARCHAR(20) UNIQUE NOT NULL,     -- ID проекта для поиска
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    client_id      UUID REFERENCES clients(id) ON DELETE SET NULL,
    owner_id       UUID NOT NULL REFERENCES employees(id), -- "главный над проектом", можно передать
    status         project_status NOT NULL DEFAULT 'planning',
    created_by     UUID REFERENCES employees(id),   -- фиксация первого создания
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_members (
    project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role_in_project project_member_role NOT NULL DEFAULT 'member',
    added_by       UUID REFERENCES employees(id),
    added_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, employee_id)
);

-- История передачи "главенства" над проектом
CREATE TABLE project_ownership_transfers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_employee_id UUID REFERENCES employees(id),
    to_employee_id  UUID NOT NULL REFERENCES employees(id),
    transferred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Общий чат проекта: сообщения могут быть обычными или превращаться в задачу
CREATE TABLE project_chat_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sender_id     UUID NOT NULL REFERENCES employees(id),
    content       TEXT NOT NULL,
    attachment_url TEXT,
    is_task       BOOLEAN NOT NULL DEFAULT false,   -- сообщение = поставленная задача
    reply_to_id   UUID REFERENCES project_chat_messages(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_chat_project ON project_chat_messages(project_id);

-- ============================================================================
-- 7. РЕГЛАМЕНТЫ
-- ============================================================================

CREATE TYPE regulation_status AS ENUM ('draft', 'active', 'in_progress', 'completed', 'archived');

CREATE TABLE regulations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_number VARCHAR(20) UNIQUE NOT NULL,   -- ID регламента для поиска
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
    project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
    status            regulation_status NOT NULL DEFAULT 'draft',
    priority          SMALLINT NOT NULL DEFAULT 3,     -- 1 (высокий) .. 5 (низкий)
    created_by        UUID REFERENCES employees(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_regulations_client ON regulations(client_id);
CREATE INDEX idx_regulations_project ON regulations(project_id);

-- ============================================================================
-- 8. ЗАДАЧИ И АВТО/РУЧНОЕ РАСПРЕДЕЛЕНИЕ
-- ============================================================================

CREATE TYPE assignment_type AS ENUM ('auto', 'manual');
CREATE TYPE assignment_status AS ENUM ('assigned', 'in_progress', 'done', 'rejected');

CREATE TABLE task_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    regulation_id   UUID REFERENCES regulations(id) ON DELETE CASCADE,
    project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,   -- задача может быть от проекта, а не регламента
    assigned_to     UUID NOT NULL REFERENCES employees(id),
    assignment_type assignment_type NOT NULL DEFAULT 'manual',
    assigned_by     UUID REFERENCES employees(id),                     -- NULL если авто
    workload_score  NUMERIC(6,2),                                      -- показатель загрузки на момент назначения
    status          assignment_status NOT NULL DEFAULT 'assigned',
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,

    CONSTRAINT chk_assignment_source CHECK (regulation_id IS NOT NULL OR project_id IS NOT NULL)
);

CREATE INDEX idx_task_assignments_employee ON task_assignments(assigned_to);

-- ============================================================================
-- 9. УВЕДОМЛЕНИЯ
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
    'task_assigned', 'regulation_update', 'project_mention',
    'project_reply', 'ownership_transfer', 'system'
);

CREATE TABLE notifications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type                notification_type NOT NULL,
    title               VARCHAR(255) NOT NULL,
    body                TEXT,
    source_employee_id  UUID REFERENCES employees(id),    -- "от кого"
    related_entity_type VARCHAR(50),                       -- 'regulation' | 'project' | 'chat_message'
    related_entity_id   UUID,                              -- используется кнопкой "Открыть"
    is_read             BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_employee_unread ON notifications(employee_id, is_read);

-- ============================================================================
-- 10. БЛОГ
-- ============================================================================

CREATE TYPE blog_category AS ENUM ('announcement', 'discussion', 'useful', 'qna', 'custom');

CREATE TABLE blog_topics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category    blog_category NOT NULL DEFAULT 'discussion',
    title       VARCHAR(255) NOT NULL,
    content     TEXT,
    created_by  UUID NOT NULL REFERENCES employees(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    pinned      BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE blog_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id    UUID NOT NULL REFERENCES blog_topics(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES employees(id),
    content     TEXT NOT NULL,
    reply_to_id UUID REFERENCES blog_comments(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_comments_topic ON blog_comments(topic_id);

-- ============================================================================
-- 11. НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ (ТЕМА / ЯЗЫК)
-- ============================================================================

CREATE TABLE employee_settings (
    employee_id  UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
    theme        VARCHAR(50) NOT NULL DEFAULT 'default',   -- default, dark, light, gold, pastel...
    language     VARCHAR(10) NOT NULL DEFAULT 'ru',
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 12. АДМИН: СЕРВЕР, ВЕРСИИ ПРИЛОЖЕНИЯ, ОБНОВЛЕНИЯ
-- ============================================================================

-- Параметры подключения приложения к серверу (доступно только тем, у кого есть 'manage_server')
CREATE TABLE server_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(100) UNIQUE NOT NULL,   -- напр. 'server_host', 'server_port', 'db_connection', 'git_repo_url'
    value       TEXT,
    is_secret   BOOLEAN NOT NULL DEFAULT false, -- если true — хранить value зашифрованным на уровне приложения
    updated_by  UUID REFERENCES employees(id),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Реестр версий приложения — то, что "подтягивается" из Git при обновлении
CREATE TABLE app_versions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version        VARCHAR(30) NOT NULL,           -- semver, напр. 1.4.2
    git_commit     VARCHAR(100),
    release_notes  TEXT,
    download_url   TEXT NOT NULL,                  -- ссылка на артефакт сборки
    is_current     BOOLEAN NOT NULL DEFAULT false,  -- какая версия сейчас "боевая" на сервере
    released_by    UUID REFERENCES employees(id),   -- админ, который выкатил
    released_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Лог применения обновлений у сотрудников (для контроля, что клиент реально обновился)
CREATE TABLE employee_app_updates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    app_version_id UUID NOT NULL REFERENCES app_versions(id),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 13. АУДИТ (журнал первого создания и последующих изменений)
-- ============================================================================

CREATE TABLE audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type   VARCHAR(50) NOT NULL,   -- 'employee' | 'project' | 'regulation' | 'department' | 'client' ...
    entity_id     UUID NOT NULL,
    action        VARCHAR(50) NOT NULL,   -- 'created' | 'updated' | 'deleted' | 'ownership_transferred' ...
    performed_by  UUID REFERENCES employees(id),
    details       JSONB,                   -- произвольный снапшот изменений
    performed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============================================================================
-- КОММЕНТАРИЙ: employees.position_id ссылается на positions, которая объявлена
-- ниже employees в этом файле — в PostgreSQL порядок объявления таблиц с FK
-- вперёд не важен ТОЛЬКО в рамках одной транзакции миграции (CREATE TABLE ...
-- все внутри одной migration-транзакции). При использовании Prisma/TypeORM
-- эта проблема решается автоматически генератором миграций.
-- ============================================================================
