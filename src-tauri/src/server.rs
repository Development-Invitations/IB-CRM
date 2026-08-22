// Встроенный HTTP-сервер режима "работать как сервер" (v0.2.0). Один
// универсальный бинарник — эта функция запускается фоновой задачей внутри
// того же Tauri-процесса, если админ включил тумблер в Настройках → Сервер
// (см. Db::get_server_settings/set_server_settings). Другие ПК подключаются
// к этому HTTP-эндпоинту вместо использования собственной локальной SQLite —
// см. src/lib/connection.ts и обёртку invoke() в src/lib/api.ts на фронтенде.

use crate::db::Db;
use axum::{
    body::Bytes,
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, RwLock};
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct ServerState {
    pub db: Arc<Mutex<Db>>,
    // token -> employeeId. Живёт в памяти — перезапуск сервера разлогинивает
    // всех клиентов, это ожидаемо и безвредно (просто заново логинятся).
    pub sessions: Arc<RwLock<HashMap<String, String>>>,
    // Для раздачи файла установщика клиентам (см. download_installer_handler)
    // — практичная замена настоящему подписанному автообновителю, см. журнал
    // v0.2.9 в docs/TZ.md.
    pub app_data_dir: PathBuf,
}

#[derive(Deserialize)]
struct InvokeRequest {
    command: String,
    #[serde(default)]
    payload: Value,
}

#[derive(Serialize)]
struct InvokeResponse {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    // Проставляется только в ответе на успешный login/create_admin.
    #[serde(skip_serializing_if = "Option::is_none")]
    token: Option<String>,
}

// Команды, доступные без токена сессии — по определению именно они и
// устанавливают сессию (или проверяют, есть ли вообще администратор).
const PUBLIC_COMMANDS: &[&str] = &["has_admin", "create_admin", "login"];

// Поля, которые всегда означают "от чьего имени действие" — сверяем с
// владельцем токена, чтобы залогиненный сотрудник не мог подставить чужой id
// и действовать от его имени. Именно эти два имени по всей кодовой базе
// последовательно означают "актёр", а не цель действия.
const ACTOR_FIELDS: &[&str] = &["actorId", "adminId"];

// В отличие от actorId/adminId, поле employeeId в разных командах означает
// РАЗНОЕ: иногда это сам вызывающий (self-service — сменить своё фото,
// подать заявку на отсутствие за себя), а иногда — цель чужого действия
// (например, кого добавить в регламент/проект, кому админ правит профиль).
// Единая проверка "employeeId всегда = вызывающий" ломала все админские
// действия над ДРУГИМИ сотрудниками (нельзя было добавить коллегу в
// регламент/проект — 403, потому что employeeId коллеги ≠ id админа).
// Поэтому сверяем employeeId с владельцем токена только для команд, где
// это поле действительно означает "сам вызывающий".
const SELF_EMPLOYEE_ID_COMMANDS: &[&str] = &[
    "self_update_employee",
    "update_own_avatar",
    "create_absence_request",
    "create_edit_request",
];

fn unauthorized(msg: &str) -> (StatusCode, Json<InvokeResponse>) {
    (
        StatusCode::UNAUTHORIZED,
        Json(InvokeResponse { ok: false, data: None, error: Some(msg.to_string()), token: None }),
    )
}

async fn invoke_handler(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Json(req): Json<InvokeRequest>,
) -> (StatusCode, Json<InvokeResponse>) {
    let is_public = PUBLIC_COMMANDS.contains(&req.command.as_str());
    let header_token = headers.get("x-session-token").and_then(|v| v.to_str().ok()).map(str::to_string);

    let mut authed_employee_id: Option<String> = None;
    if !is_public {
        let owner = header_token.as_deref().and_then(|t| state.sessions.read().unwrap().get(t).cloned());
        match owner {
            Some(id) => authed_employee_id = Some(id),
            None => return unauthorized("Не авторизован — войдите заново"),
        }
    }

    if let (Some(emp_id), Value::Object(map)) = (&authed_employee_id, &req.payload) {
        let mut fields_to_check: Vec<&str> = ACTOR_FIELDS.to_vec();
        if SELF_EMPLOYEE_ID_COMMANDS.contains(&req.command.as_str()) {
            fields_to_check.push("employeeId");
        }
        for key in fields_to_check {
            if let Some(v) = map.get(key) {
                if v.as_str() != Some(emp_id.as_str()) {
                    return (
                        StatusCode::FORBIDDEN,
                        Json(InvokeResponse { ok: false, data: None, error: Some("Несоответствие идентификатора вызывающего".into()), token: None }),
                    );
                }
            }
        }
    }

    let dispatch_result = {
        let db = state.db.lock().unwrap();
        crate::dispatch::dispatch(&req.command, req.payload, &db, &state.db, &state.app_data_dir)
    };

    match dispatch_result {
        Ok(data) => {
            let mut token = None;

            if req.command == "login" {
                let is_success = data.get("success").and_then(Value::as_bool).unwrap_or(false);
                if is_success {
                    if let Some(id) = data.get("employee").and_then(|e| e.get("id")).and_then(Value::as_str) {
                        let t = uuid::Uuid::new_v4().to_string();
                        state.sessions.write().unwrap().insert(t.clone(), id.to_string());
                        token = Some(t);
                    }
                }
            } else if req.command == "create_admin" {
                if let Some(id) = data.get("id").and_then(Value::as_str) {
                    let t = uuid::Uuid::new_v4().to_string();
                    state.sessions.write().unwrap().insert(t.clone(), id.to_string());
                    token = Some(t);
                }
            } else if req.command == "record_logout" {
                if let Some(t) = header_token {
                    state.sessions.write().unwrap().remove(&t);
                }
            }

            (StatusCode::OK, Json(InvokeResponse { ok: true, data: Some(data), error: None, token }))
        }
        Err(err) => (
            StatusCode::BAD_REQUEST,
            Json(InvokeResponse { ok: false, data: None, error: Some(err), token: None }),
        ),
    }
}

// Раздаёт сырые байты установщика клиенту — не через /api/invoke (JSON),
// т.к. установщик весит несколько мегабайт и base64-в-JSON для такого объёма
// не имеет смысла. Тот же токен сессии, что и у обычных команд — просто
// проверяется вручную, а не через общую ветку invoke_handler.
async fn download_installer_handler(State(state): State<ServerState>, headers: HeaderMap) -> Response {
    let header_token = headers.get("x-session-token").and_then(|v| v.to_str().ok());
    let authed = header_token
        .map(|t| state.sessions.read().unwrap().contains_key(t))
        .unwrap_or(false);
    if !authed {
        return unauthorized("Не авторизован — войдите заново").into_response();
    }

    let path = crate::update_installer_path(&state.app_data_dir);
    match tokio::fs::read(&path).await {
        Ok(bytes) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "application/octet-stream".to_string()),
                (header::CONTENT_DISPOSITION, "attachment; filename=\"IB-CRM-Setup.exe\"".to_string()),
            ],
            Bytes::from(bytes),
        )
            .into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "Файл обновления не найден на сервере").into_response(),
    }
}

pub async fn run(db: Arc<Mutex<Db>>, port: u16, app_data_dir: PathBuf) {
    let state = ServerState { db, sessions: Arc::new(RwLock::new(HashMap::new())), app_data_dir };
    let app = Router::new()
        .route("/api/invoke", post(invoke_handler))
        .route("/api/update-installer", get(download_installer_handler))
        // Доверенная локальная сеть (офис) — разрешаем любой origin, чтобы не
        // гадать, как именно вебвью Tauri представляется на разных платформах.
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = format!("0.0.0.0:{port}");
    match tokio::net::TcpListener::bind(&addr).await {
        Ok(listener) => {
            if let Err(e) = axum::serve(listener, app).await {
                eprintln!("HTTP-сервер IB CRM остановился с ошибкой: {e}");
            }
        }
        Err(e) => {
            eprintln!("Не удалось запустить HTTP-сервер IB CRM на {addr}: {e}");
        }
    }
}
