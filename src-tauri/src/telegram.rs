// Telegram Bot API — реальная отправка/приём сообщений (v0.5.3). До этой
// версии в Настройках был только "коннектор" (чекбокс + токен, см.
// db.rs::TelegramBotSettingsRecord) — сама интеграция не существовала.
//
// v0.6.3: изначально было 3 отдельных бота (свой токен у каждого) — после
// первого живого теста пользователь решил оставить ОДИН бот, который ставит
// задачи И принимает их закрытие тем же токеном (функция "Админ → Партнёр"
// убрана целиком). Это заодно устранило искусственную сложность
// "эффективного бота" — раньше кнопку "Готово" мог обработать только тот
// бот, который прислал сообщение, а с одним бот-токеном это больше не
// проблема в принципе.
//
// Весь сетевой код живёт здесь, а не в db.rs — db.rs синхронный и держит
// std::sync::Mutex<Db>, который нельзя держать через .await (см. main.rs —
// та же причина, почему report_export.rs не трогает Db напрямую). Функции
// здесь принимают только owned-значения (токен/chat_id/текст), либо
// Arc<Mutex<Db>> — если нужен, лочится КОРОТКО и СИНХРОННО, гвард дропается
// до следующего await.
use crate::db::Db;
use serde_json::json;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Emitter;

pub struct TelegramError(pub String);

fn api_url(token: &str, method: &str) -> String {
    format!("https://api.telegram.org/bot{token}/{method}")
}

async fn get_me(client: &reqwest::Client, token: &str) -> Result<String, TelegramError> {
    let resp = client.get(api_url(token, "getMe")).send().await.map_err(|e| TelegramError(e.to_string()))?;
    let body: serde_json::Value = resp.json().await.map_err(|e| TelegramError(e.to_string()))?;
    body.get("result")
        .and_then(|r| r.get("username"))
        .and_then(|u| u.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| TelegramError("getMe: username отсутствует в ответе".into()))
}

pub async fn send_message(
    client: &reqwest::Client,
    token: &str,
    chat_id: &str,
    text: &str,
    reply_button: Option<(&str, &str)>,
) -> Result<(), TelegramError> {
    // Без parse_mode (plain text) — текст задачи вводится пользователем
    // свободно, экранировать под MarkdownV2/HTML не пытаемся: спецсимволы
    // (_,*,[ и т.д.) в неэкранированном виде роняли бы sendMessage целиком.
    let mut body = json!({ "chat_id": chat_id, "text": text });
    if let Some((label, callback_data)) = reply_button {
        body["reply_markup"] = json!({ "inline_keyboard": [[{ "text": label, "callback_data": callback_data }]] });
    }
    let resp = client.post(api_url(token, "sendMessage")).json(&body).send().await.map_err(|e| TelegramError(e.to_string()))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(TelegramError(format!("sendMessage: {status} {text}")));
    }
    Ok(())
}

async fn answer_callback_query(client: &reqwest::Client, token: &str, callback_query_id: &str, text: Option<&str>) -> Result<(), TelegramError> {
    let mut body = json!({ "callback_query_id": callback_query_id });
    if let Some(t) = text {
        body["text"] = json!(t);
    }
    client.post(api_url(token, "answerCallbackQuery")).json(&body).send().await.map_err(|e| TelegramError(e.to_string()))?;
    Ok(())
}

async fn get_updates(client: &reqwest::Client, token: &str, offset: i64, timeout_secs: u64) -> Result<Vec<serde_json::Value>, TelegramError> {
    let body = json!({ "offset": offset, "timeout": timeout_secs, "allowed_updates": ["message", "callback_query"] });
    let resp = client.post(api_url(token, "getUpdates")).json(&body).send().await.map_err(|e| TelegramError(e.to_string()))?;
    let body: serde_json::Value = resp.json().await.map_err(|e| TelegramError(e.to_string()))?;
    body.get("result")
        .and_then(|r| r.as_array())
        .cloned()
        .ok_or_else(|| TelegramError("getUpdates: некорректный ответ".into()))
}

// ---- Высокоуровневый отправитель — вызывается fire-and-forget из main.rs
// (tauri::async_runtime::spawn), принимает только owned-значения. ----

#[allow(clippy::too_many_arguments)]
pub async fn notify_task_assigned(
    db: Arc<Mutex<Db>>,
    client: reqwest::Client,
    token: String,
    chat_id: String,
    employee_name: String,
    title: String,
    body: String,
    deadline: Option<String>,
    entry_kind: &'static str, // "reg" | "proj"
    entry_id: String,
) {
    let mut text = format!("{title}\n\n{body}");
    if let Some(d) = deadline {
        text.push_str(&format!("\n\nСрок: {d}"));
    }
    let button_data = format!("close_{entry_kind}:{entry_id}");
    if send_message(&client, &token, &chat_id, &text, Some(("✅ Готово", &button_data))).await.is_err() {
        db.lock().unwrap().notify_telegram_send_failed(&employee_name);
    }
}

// ---- Long-polling супервизор — одна задача на единственный бот, поднимается
// один раз в main.rs::setup(), живёт всё время работы приложения. Настройки
// перечитываются на каждой итерации — включение бота/смена токена
// подхватывается без рестарта. ----

pub fn spawn_polling_tasks(db: Arc<Mutex<Db>>, app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(poll_loop(db, app_handle));
}

async fn poll_loop(db: Arc<Mutex<Db>>, app_handle: tauri::AppHandle) {
    // getUpdates держит соединение открытым до timeout_secs (~25с) —
    // клиенту нужен таймаут длиннее этого, иначе reqwest сам оборвёт запрос
    // раньше, чем ответит Telegram. Остальные методы — отдельный короткий
    // клиент, незачем ждать 35с на обычный sendMessage.
    let long_client = reqwest::Client::builder().timeout(Duration::from_secs(35)).build().expect("reqwest client");
    let short_client = reqwest::Client::builder().timeout(Duration::from_secs(10)).build().expect("reqwest client");

    loop {
        let settings = { db.lock().unwrap().get_telegram_bot_settings_internal() };
        let Some(token) = settings.token.filter(|t| !t.is_empty()).filter(|_| settings.enabled) else {
            tokio::time::sleep(Duration::from_secs(5)).await;
            continue;
        };

        let cached_username = db.lock().unwrap().get_telegram_bot_username("bot");
        if cached_username.is_none() {
            if let Ok(username) = get_me(&short_client, &token).await {
                db.lock().unwrap().set_telegram_bot_username("bot", &username);
            }
        }

        let offset = db.lock().unwrap().get_telegram_update_offset("bot");
        match get_updates(&long_client, &token, offset, 25).await {
            Ok(updates) => {
                let mut max_update_id = offset - 1;
                for update in &updates {
                    handle_update(&db, &short_client, &token, update, &app_handle).await;
                    if let Some(id) = update.get("update_id").and_then(|v| v.as_i64()) {
                        max_update_id = max_update_id.max(id);
                    }
                }
                if max_update_id >= offset {
                    db.lock().unwrap().set_telegram_update_offset("bot", max_update_id + 1);
                }
            }
            // Сеть моргнула / токен невалиден / getUpdates уже слушает
            // где-то ещё (409) — не паникуем, просто ждём и пробуем снова.
            // Текст ошибки — в stderr процесса (виден в консоли при
            // `cargo tauri dev`/логах установленного приложения), полезно
            // при живой отладке, почему бот "молчит".
            Err(e) => {
                eprintln!("[telegram] getUpdates error: {}", e.0);
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }
    }
}

async fn handle_update(db: &Arc<Mutex<Db>>, client: &reqwest::Client, token: &str, update: &serde_json::Value, app_handle: &tauri::AppHandle) {
    // Случай 1: текстовое сообщение — код привязки (либо "/start <код>" по
    // deep-ссылке, либо просто вписанный вручную код).
    if let Some(msg) = update.get("message") {
        let text = msg.get("text").and_then(|v| v.as_str());
        let chat_id = msg.get("chat").and_then(|c| c.get("id")).map(|v| v.to_string());
        if let (Some(text), Some(chat_id)) = (text, chat_id) {
            let trimmed = text.trim();
            // Голое "/start" (просто нажали кнопку в Telegram, без кода) —
            // раньше молча ничего не делал, из-за чего выглядело, будто бот
            // не отвечает вообще ничего. Теперь явно подсказывает, что делать.
            if trimmed == "/start" {
                let _ = send_message(
                    client,
                    token,
                    &chat_id,
                    "Здравствуйте! Чтобы привязать аккаунт, получите код в CRM (Настройки → «Telegram» → «Получить код») и отправьте его сюда.",
                    None,
                )
                .await;
            } else {
                let code = trimmed
                    .strip_prefix("/start ")
                    .map(|s| s.trim().to_string())
                    .or_else(|| (!trimmed.starts_with('/')).then(|| trimmed.to_string()));
                if let Some(code) = code.filter(|c| !c.is_empty()) {
                    let linked = db.lock().unwrap().link_telegram_chat_by_code(&code, &chat_id);
                    let reply = if linked.is_some() { "Аккаунт привязан ✅" } else { "Код неверен или истёк" };
                    let _ = send_message(client, token, &chat_id, reply, None).await;
                }
            }
        }
        return;
    }

    // Случай 2: нажатие инлайн-кнопки "Готово".
    if let Some(cb) = update.get("callback_query") {
        let cb_id = cb.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
        let data = cb.get("data").and_then(|v| v.as_str()).map(|s| s.to_string());
        let chat_id = cb.get("message").and_then(|m| m.get("chat")).and_then(|c| c.get("id")).map(|v| v.to_string());
        let (Some(cb_id), Some(data), Some(chat_id)) = (cb_id, data, chat_id) else { return };

        let actor_id = db.lock().unwrap().find_employee_id_by_chat_id(&chat_id);
        let Some(actor_id) = actor_id else {
            let _ = answer_callback_query(client, token, &cb_id, Some("Аккаунт не привязан")).await;
            return;
        };

        let result = if let Some(entry_id) = data.strip_prefix("close_reg:") {
            let db_guard = db.lock().unwrap();
            db_guard.update_entry_status(&actor_id, entry_id, "done")
        } else if let Some(message_id) = data.strip_prefix("close_proj:") {
            let db_guard = db.lock().unwrap();
            db_guard.update_project_chat_message_status(&actor_id, message_id, "done")
        } else {
            Ok(())
        };

        let reply_text = if result.is_ok() { "Задача закрыта ✅" } else { "Не удалось закрыть задачу" };
        let _ = answer_callback_query(client, token, &cb_id, Some(reply_text)).await;
        if result.is_ok() {
            // Перевызываем уже существующий тикер уведомлений — открытые
            // окна CRM сами перечитают свежие данные (см. useNotifications.ts).
            let _ = app_handle.emit("notification-tick", ());
            // Постановщику задачи — тоже в Telegram (best-effort, тем же
            // ботом; молча не сработает, если постановщик не привязал СВОЙ
            // Telegram).
            if let Some(entry_id) = data.strip_prefix("close_reg:") {
                notify_task_closed_to_assigner(db, client, token, &actor_id, "reg", entry_id).await;
            } else if let Some(message_id) = data.strip_prefix("close_proj:") {
                notify_task_closed_to_assigner(db, client, token, &actor_id, "proj", message_id).await;
            }
        }
    }
}

// Уведомление постановщику задачи, когда исполнитель закрыл её кнопкой
// "Готово" в Telegram (v0.6.2) — синхронный сбор данных короткий блок,
// дропаем лок ДО await, как и везде в этом файле.
async fn notify_task_closed_to_assigner(db: &Arc<Mutex<Db>>, client: &reqwest::Client, token: &str, closer_id: &str, kind: &str, id: &str) {
    let info = {
        let db_guard = db.lock().unwrap();
        let closer_name = db_guard.get_employee(closer_id).map(|e| e.full_name).unwrap_or_default();
        if kind == "reg" {
            db_guard.get_regulation_entry(id).and_then(|entry| {
                if entry.author_id == closer_id {
                    return None; // сам себе задачу поставил и сам закрыл — уведомлять некого
                }
                let chat_id = db_guard.get_employee_telegram_chat_id(&entry.author_id)?;
                let reg_title = db_guard.get_regulation(&entry.regulation_id).map(|r| r.title).unwrap_or_default();
                Some((chat_id, format!("✅ {closer_name} закрыл(а) задачу в регламенте «{reg_title}»:\n{}", entry.content)))
            })
        } else {
            db_guard.get_project_chat_message(id).and_then(|msg| {
                if msg.sender_id == closer_id {
                    return None;
                }
                let chat_id = db_guard.get_employee_telegram_chat_id(&msg.sender_id)?;
                let project_name = db_guard.get_project(&msg.project_id).map(|p| p.name).unwrap_or_default();
                Some((chat_id, format!("✅ {closer_name} закрыл(а) задачу в проекте «{project_name}»:\n{}", msg.content)))
            })
        }
    };
    if let Some((chat_id, text)) = info {
        let _ = send_message(client, token, &chat_id, &text, None).await;
    }
}
