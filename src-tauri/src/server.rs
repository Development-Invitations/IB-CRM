// Встроенный HTTP-сервер режима "работать как сервер" (v0.2.0). Один
// универсальный бинарник — эта функция запускается фоновой задачей внутри
// того же Tauri-процесса, если админ включил тумблер в Настройках → Сервер
// (см. Db::get_server_settings/set_server_settings). Другие ПК подключаются
// к этому HTTP-эндпоинту вместо использования собственной локальной SQLite —
// см. src/lib/connection.ts и обёртку invoke() в src/lib/api.ts на фронтенде.

use crate::db::Db;
use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex, RwLock};
use tower_http::cors::CorsLayer;

#[derive(Clone)]
pub struct ServerState {
    pub db: Arc<Mutex<Db>>,
    // token -> employeeId. Живёт в памяти — перезапуск сервера разлогинивает
    // всех клиентов, это ожидаемо и безвредно (просто заново логинятся).
    pub sessions: Arc<RwLock<HashMap<String, String>>>,
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

// Поля, которые могут быть в теле запроса и означают "от чьего имени
// действие" — сверяем с владельцем токена, чтобы залогиненный сотрудник не
// мог подставить чужой id и действовать от его имени.
const ACTOR_FIELDS: &[&str] = &["actorId", "adminId", "employeeId"];

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
        for key in ACTOR_FIELDS {
            if let Some(v) = map.get(*key) {
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
        crate::dispatch::dispatch(&req.command, req.payload, &db)
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

pub async fn run(db: Arc<Mutex<Db>>, port: u16) {
    let state = ServerState { db, sessions: Arc::new(RwLock::new(HashMap::new())) };
    let app = Router::new()
        .route("/api/invoke", post(invoke_handler))
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
