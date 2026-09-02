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

// Меню из нескольких кнопок, каждая на своей строке (v1.6.0, агентский бот)
// — send_message выше остаётся как есть (одна опциональная кнопка, уже
// используется существующим ботом сотрудников), это отдельные функции, а не
// расширение сигнатуры send_message, чтобы не трогать текущие вызовы.
// BtnAction::Url — для ссылки на групповой чат агентов: такая кнопка
// обрабатывается самим Telegram-клиентом (просто открывает ссылку), боту
// никакой callback_query по ней не приходит.
pub enum BtnAction {
    Cb(String),
    Url(String),
}

pub async fn send_menu(client: &reqwest::Client, token: &str, chat_id: &str, text: &str, buttons: Vec<(String, BtnAction)>) -> Result<(), TelegramError> {
    let mut body = json!({ "chat_id": chat_id, "text": text });
    if !buttons.is_empty() {
        let rows: Vec<Vec<serde_json::Value>> = buttons
            .into_iter()
            .map(|(label, action)| {
                let btn = match action {
                    BtnAction::Cb(data) => json!({ "text": label, "callback_data": data }),
                    BtnAction::Url(url) => json!({ "text": label, "url": url }),
                };
                vec![btn]
            })
            .collect();
        body["reply_markup"] = json!({ "inline_keyboard": rows });
    }
    let resp = client.post(api_url(token, "sendMessage")).json(&body).send().await.map_err(|e| TelegramError(e.to_string()))?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(TelegramError(format!("sendMessage: {status} {text}")));
    }
    Ok(())
}

// Скачивание фото/файла паспорта — сохраняем как data: URL (тот же формат,
// что вложения на фронтенде, см. src/lib/attachment.ts), просто получаем
// байты через Rust, а не JS. getFile → относительный file_path → отдельный
// URL на файловом хосте Telegram (не тот же api.telegram.org/bot{token}/METHOD).
async fn get_file_path(client: &reqwest::Client, token: &str, file_id: &str) -> Result<String, TelegramError> {
    let resp = client
        .get(api_url(token, "getFile"))
        .query(&[("file_id", file_id)])
        .send()
        .await
        .map_err(|e| TelegramError(e.to_string()))?;
    let body: serde_json::Value = resp.json().await.map_err(|e| TelegramError(e.to_string()))?;
    body.get("result")
        .and_then(|r| r.get("file_path"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| TelegramError("getFile: file_path отсутствует".into()))
}

async fn download_telegram_file_as_data_url(client: &reqwest::Client, token: &str, file_id: &str, mime: &str) -> Result<String, TelegramError> {
    use base64::Engine;
    let file_path = get_file_path(client, token, file_id).await?;
    let url = format!("https://api.telegram.org/file/bot{token}/{file_path}");
    let resp = client.get(&url).send().await.map_err(|e| TelegramError(e.to_string()))?;
    if !resp.status().is_success() {
        return Err(TelegramError(format!("file download: {}", resp.status())));
    }
    let bytes = resp.bytes().await.map_err(|e| TelegramError(e.to_string()))?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}

// Фото (message.photo — всегда сжато Telegram в JPEG, берём последний =
// самый крупный размер) либо документ (message.document — сохраняет
// оригинальный mime_type, для присланного как файл, не как "photo").
fn extract_photo_file_id(msg: &serde_json::Value) -> Option<(String, String)> {
    if let Some(photos) = msg.get("photo").and_then(|v| v.as_array()) {
        if let Some(largest) = photos.last() {
            if let Some(file_id) = largest.get("file_id").and_then(|v| v.as_str()) {
                return Some((file_id.to_string(), "image/jpeg".to_string()));
            }
        }
    }
    if let Some(doc) = msg.get("document") {
        if let Some(file_id) = doc.get("file_id").and_then(|v| v.as_str()) {
            let mime = doc.get("mime_type").and_then(|v| v.as_str()).unwrap_or("application/octet-stream").to_string();
            return Some((file_id.to_string(), mime));
        }
    }
    None
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
    tauri::async_runtime::spawn(poll_loop(db.clone(), app_handle.clone()));
    // Второй, полностью независимый бот для агентов (v1.6.0) — свой токен,
    // своя роль для offset/username кеша ("agents_bot"), свой обработчик
    // диалогов (handle_agents_bot_update — логика регистрации/лидов не имеет
    // ничего общего с задачно-закрывающим ботом сотрудников, смешивать в
    // одном handle_update нельзя). Тело цикла один в один как у poll_loop —
    // не стали обобщать через generic/fn-pointer ради ровно двух
    // инстансов, разница только в role и обработчике.
    tauri::async_runtime::spawn(agents_poll_loop(db, app_handle));
}

async fn poll_loop(db: Arc<Mutex<Db>>, app_handle: tauri::AppHandle) {
    // getUpdates держит соединение открытым до timeout_secs (~25с) —
    // клиенту нужен таймаут длиннее этого, иначе reqwest сам оборвёт запрос
    // раньше, чем ответит Telegram. Остальные методы — отдельный короткий
    // клиент, незачем ждать 35с на обычный sendMessage.
    let long_client = reqwest::Client::builder().timeout(Duration::from_secs(35)).build().expect("reqwest client");
    let short_client = reqwest::Client::builder().timeout(Duration::from_secs(10)).build().expect("reqwest client");

    loop {
        let settings = { db.lock().unwrap().get_telegram_bot_settings_internal("bot") };
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

async fn agents_poll_loop(db: Arc<Mutex<Db>>, app_handle: tauri::AppHandle) {
    let long_client = reqwest::Client::builder().timeout(Duration::from_secs(35)).build().expect("reqwest client");
    let short_client = reqwest::Client::builder().timeout(Duration::from_secs(10)).build().expect("reqwest client");
    let _ = &app_handle; // зарезервировано на будущее (единообразие с poll_loop), сейчас не используется

    loop {
        let settings = { db.lock().unwrap().get_telegram_bot_settings_internal("agents_bot") };
        let Some(token) = settings.token.filter(|t| !t.is_empty()).filter(|_| settings.enabled) else {
            tokio::time::sleep(Duration::from_secs(5)).await;
            continue;
        };

        let cached_username = db.lock().unwrap().get_telegram_bot_username("agents_bot");
        if cached_username.is_none() {
            if let Ok(username) = get_me(&short_client, &token).await {
                db.lock().unwrap().set_telegram_bot_username("agents_bot", &username);
            }
        }

        let offset = db.lock().unwrap().get_telegram_update_offset("agents_bot");
        match get_updates(&long_client, &token, offset, 25).await {
            Ok(updates) => {
                let mut max_update_id = offset - 1;
                for update in &updates {
                    handle_agents_bot_update(&db, &short_client, &token, update).await;
                    if let Some(id) = update.get("update_id").and_then(|v| v.as_i64()) {
                        max_update_id = max_update_id.max(id);
                    }
                }
                if max_update_id >= offset {
                    db.lock().unwrap().set_telegram_update_offset("agents_bot", max_update_id + 1);
                }
            }
            Err(e) => {
                eprintln!("[telegram/agents] getUpdates error: {}", e.0);
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

// ---- Агентский бот (v1.6.0) ----
// Полностью отдельная диалоговая логика от handle_update выше — регистрация
// агента требует выбора языка, согласия на обработку данных и МНОГОШАГОВОЙ
// формы (ФИО → телефон → адрес → эл. почта → фото паспорта), для которой
// заведён agent_bot_state (db.rs) — конечный автомат по chat_id, переживающий
// перезапуск приложения между шагами. Весь текст бота — на 3 языках CRM
// (ru/uz/uz-cyrl), язык выбирается агентом при первом /start и хранится на
// самой записи agents.locale — дальше меню/подсказки идут на нём без
// повторного выбора.

fn stage_label<'a>(locale: &str, stage: &'a str) -> &'a str {
    match (locale, stage) {
        ("uz", "new") => "Yangi",
        ("uz", "thinking") => "O'ylamoqda",
        ("uz", "agreed") => "Rozi",
        ("uz", "rejected") => "Rad etildi",
        ("uz", "converted") => "Rasmiylashtirildi",
        ("uz-cyrl", "new") => "Янги",
        ("uz-cyrl", "thinking") => "Ўйламоқда",
        ("uz-cyrl", "agreed") => "Рози",
        ("uz-cyrl", "rejected") => "Рад этилди",
        ("uz-cyrl", "converted") => "Расмийлаштирилди",
        (_, "new") => "Новый",
        (_, "thinking") => "Думает",
        (_, "agreed") => "Согласен",
        (_, "rejected") => "Отказ",
        (_, "converted") => "Оформлен",
        _ => stage,
    }
}

fn bot_text<'a>(locale: &str, key: &'a str) -> &'a str {
    match locale {
        "uz" => match key {
            "ask_name" => "Ismingiz kim? To'liq ismingizni kiriting.",
            "ask_phone" => "Bog'lanish uchun telefon raqamingizni kiriting.",
            "ask_address" => "Yashash manzilingizni kiriting.",
            "ask_email" => "Elektron pochtangizni kiriting.",
            "ask_passport" => "Pasportning birinchi sahifasi fotosini yuboring (oddiy suratga olsangiz ham bo'ladi).",
            "passport_invalid" => "Pasport surati yoki fayli kerak — iltimos, rasm yuboring.",
            "registration_sent" => "Ariza yuborildi ✅ Administrator tasdiqlashini kuting.",
            "registration_failed" => "Arizani yuborib bo'lmadi, /start orqali qayta urinib ko'ring.",
            "status_pending" => "Arizangiz ko'rib chiqilmoqda, administrator tasdiqlashini kuting.",
            "status_rejected" => "Arizangiz rad etildi. Administratorga murojaat qiling.",
            "menu_prompt" => "Asosiy menyu:",
            "btn_sale" => "💰 Sotuvni yozish",
            "btn_materials" => "📚 Foydali ma'lumot",
            "btn_my_leads" => "📊 Mijozlarim",
            "btn_chat" => "💬 Agentlar chati",
            "consent_agree_btn" => "✅ Roziman",
            "consent_reminder" => "Davom etish uchun rozilik tugmasini bosing.",
            "sale_ask_name" => "Mijozning F.I.O.?",
            "sale_ask_inn" => "Mijozning STIR (INN) raqami?",
            "sale_inn_duplicate" => "Bu STIR bilan mijoz allaqachon ro'yxatga olingan — yozib bo'lmaydi.",
            "sale_ask_phone" => "Mijozning telefon raqami?",
            "sale_ask_company" => "Mijoz kompaniyasining nomi? (yo'q bo'lsa \"-\" yuboring)",
            "sale_done" => "Mijoz qo'shildi ✅ Bitim qanday rivojlanishi haqida xabar beramiz.",
            "sale_failed" => "Mijozni qo'shib bo'lmadi.",
            "no_materials" => "Hozircha materiallar yo'q.",
            "no_leads" => "Siz hali birorta mijoz qo'shmagansiz.",
            "not_available" => "Mavjud emas.",
            "start_hint" => "Boshlash uchun /start yuboring.",
            _ => key,
        },
        "uz-cyrl" => match key {
            "ask_name" => "Исмингиз ким? Тўлиқ исмингизни киритинг.",
            "ask_phone" => "Боғланиш учун телефон рақамингизни киритинг.",
            "ask_address" => "Яшаш манзилингизни киритинг.",
            "ask_email" => "Электрон почтангизни киритинг.",
            "ask_passport" => "Паспортнинг биринчи саҳифаси фотосини юборинг (оддий суратга олсангиз ҳам бўлади).",
            "passport_invalid" => "Паспорт сурати ёки файли керак — илтимос, расм юборинг.",
            "registration_sent" => "Ариза юборилди ✅ Администратор тасдиқлашини кутинг.",
            "registration_failed" => "Аризани юбориб бўлмади, /start орқали қайта уриниб кўринг.",
            "status_pending" => "Аризангиз кўриб чиқилмоқда, администратор тасдиқлашини кутинг.",
            "status_rejected" => "Аризангиз рад этилди. Администраторга мурожаат қилинг.",
            "menu_prompt" => "Асосий меню:",
            "btn_sale" => "💰 Сотувни ёзиш",
            "btn_materials" => "📚 Фойдали маълумот",
            "btn_my_leads" => "📊 Мижозларим",
            "btn_chat" => "💬 Агентлар чати",
            "consent_agree_btn" => "✅ Розиман",
            "consent_reminder" => "Давом этиш учун розилик тугмасини босинг.",
            "sale_ask_name" => "Мижознинг Ф.И.Ш.?",
            "sale_ask_inn" => "Мижознинг СТИР (ИНН) рақами?",
            "sale_inn_duplicate" => "Бу СТИР билан мижоз аллақачон рўйхатга олинган — ёзиб бўлмайди.",
            "sale_ask_phone" => "Мижознинг телефон рақами?",
            "sale_ask_company" => "Мижоз компаниясининг номи? (йўқ бўлса \"-\" юборинг)",
            "sale_done" => "Мижоз қўшилди ✅ Битим қандай ривожланиши ҳақида хабар берамиз.",
            "sale_failed" => "Мижозни қўшиб бўлмади.",
            "no_materials" => "Ҳозирча материаллар йўқ.",
            "no_leads" => "Сиз ҳали бирорта мижоз қўшмагансиз.",
            "not_available" => "Мавжуд эмас.",
            "start_hint" => "Бошлаш учун /start юборинг.",
            _ => key,
        },
        _ => match key {
            "ask_name" => "Как вас зовут? Введите ФИО.",
            "ask_phone" => "Укажите номер телефона для связи.",
            "ask_address" => "Укажите ваш адрес проживания.",
            "ask_email" => "Укажите вашу электронную почту.",
            "ask_passport" => "Пришлите фото первой страницы паспорта (можно просто сфотографировать).",
            "passport_invalid" => "Нужно фото или файл паспорта — пришлите, пожалуйста, изображение.",
            "registration_sent" => "Заявка отправлена ✅ Ждите подтверждения администратора.",
            "registration_failed" => "Не удалось отправить заявку, попробуйте ещё раз через /start.",
            "status_pending" => "Ваша заявка на рассмотрении, ожидайте подтверждения администратора.",
            "status_rejected" => "Ваша заявка отклонена. Обратитесь к администратору.",
            "menu_prompt" => "Главное меню:",
            "btn_sale" => "💰 Записать продажу",
            "btn_materials" => "📚 Полезная информация",
            "btn_my_leads" => "📊 Мои клиенты",
            "btn_chat" => "💬 Чат агентов",
            "consent_agree_btn" => "✅ Согласен",
            "consent_reminder" => "Чтобы продолжить, нажмите кнопку согласия.",
            "sale_ask_name" => "ФИО клиента?",
            "sale_ask_inn" => "ИНН клиента?",
            "sale_inn_duplicate" => "Клиент с таким ИНН уже зарегистрирован — записать нельзя.",
            "sale_ask_phone" => "Телефон клиента?",
            "sale_ask_company" => "Название компании клиента? (если нет — отправьте «-»)",
            "sale_done" => "Клиент добавлен ✅ Мы сообщим, как продвинется сделка.",
            "sale_failed" => "Не удалось добавить клиента.",
            "no_materials" => "Пока нет материалов.",
            "no_leads" => "Вы пока не добавили ни одного клиента.",
            "not_available" => "Недоступно.",
            "start_hint" => "Отправьте /start, чтобы начать.",
            _ => key,
        },
    }
}

async fn send_agents_menu(db: &Arc<Mutex<Db>>, client: &reqwest::Client, token: &str, chat_id: &str, locale: &str) {
    let chat_link = db.lock().unwrap().get_agent_consent_settings_internal().chat_link;
    let mut buttons = vec![
        (bot_text(locale, "btn_sale").to_string(), BtnAction::Cb("agent:new_lead".to_string())),
        (bot_text(locale, "btn_materials").to_string(), BtnAction::Cb("agent:materials".to_string())),
        (bot_text(locale, "btn_my_leads").to_string(), BtnAction::Cb("agent:my_leads".to_string())),
    ];
    if let Some(link) = chat_link {
        buttons.push((bot_text(locale, "btn_chat").to_string(), BtnAction::Url(link)));
    }
    let _ = send_menu(client, token, chat_id, bot_text(locale, "menu_prompt"), buttons).await;
}

async fn send_consent_prompt(db: &Arc<Mutex<Db>>, client: &reqwest::Client, token: &str, chat_id: &str, locale: &str) {
    let settings = db.lock().unwrap().get_agent_consent_settings_internal();
    let text = match locale {
        "uz" => settings.text_uz,
        "uz-cyrl" => settings.text_uz_cyrl,
        _ => settings.text_ru,
    };
    let _ = send_menu(
        client,
        token,
        chat_id,
        &text,
        vec![(bot_text(locale, "consent_agree_btn").to_string(), BtnAction::Cb("consent:agree".to_string()))],
    )
    .await;
}

async fn handle_agents_bot_update(db: &Arc<Mutex<Db>>, client: &reqwest::Client, token: &str, update: &serde_json::Value) {
    if let Some(msg) = update.get("message") {
        let chat_id = msg.get("chat").and_then(|c| c.get("id")).map(|v| v.to_string());
        let Some(chat_id) = chat_id else { return };
        let text = msg.get("text").and_then(|v| v.as_str()).map(|s| s.trim().to_string());

        if text.as_deref() == Some("/start") {
            db.lock().unwrap().clear_agent_bot_state(&chat_id);
            let agent = db.lock().unwrap().get_agent_by_chat_id(&chat_id);
            match agent {
                None => {
                    db.lock().unwrap().set_agent_bot_state(&chat_id, "register", "lang", "{}");
                    let _ = send_menu(
                        client,
                        token,
                        &chat_id,
                        "Выберите язык / Tilni tanlang / Тилни танланг",
                        vec![
                            ("🇷🇺 Русский".to_string(), BtnAction::Cb("lang:ru".to_string())),
                            ("🇺🇿 O'zbekcha".to_string(), BtnAction::Cb("lang:uz".to_string())),
                            ("🇺🇿 Ўзбекча".to_string(), BtnAction::Cb("lang:uz-cyrl".to_string())),
                        ],
                    )
                    .await;
                }
                Some(a) if a.status == "pending" => {
                    let _ = send_message(client, token, &chat_id, bot_text(&a.locale, "status_pending"), None).await;
                }
                Some(a) if a.status == "rejected" => {
                    let _ = send_message(client, token, &chat_id, bot_text(&a.locale, "status_rejected"), None).await;
                }
                Some(a) => {
                    send_agents_menu(db, client, token, &chat_id, &a.locale).await;
                }
            }
            return;
        }

        let state = db.lock().unwrap().get_agent_bot_state(&chat_id);
        let Some((flow, step, draft_json)) = state else {
            let _ = send_message(client, token, &chat_id, bot_text("ru", "start_hint"), None).await;
            return;
        };
        let mut draft: serde_json::Value = serde_json::from_str(&draft_json).unwrap_or_else(|_| json!({}));
        let locale = draft.get("locale").and_then(|v| v.as_str()).unwrap_or("ru").to_string();

        if flow == "register" {
            match step.as_str() {
                // "lang"/"consent" продвигаются кнопками (callback_query ниже) —
                // текстовое сообщение здесь означает, что агент не нажал кнопку.
                "lang" => {}
                "consent" => {
                    let _ = send_message(client, token, &chat_id, bot_text(&locale, "consent_reminder"), None).await;
                }
                "name" => {
                    let Some(text) = text else { return };
                    draft["full_name"] = json!(text);
                    db.lock().unwrap().set_agent_bot_state(&chat_id, "register", "phone", &draft.to_string());
                    let _ = send_message(client, token, &chat_id, bot_text(&locale, "ask_phone"), None).await;
                }
                "phone" => {
                    let Some(text) = text else { return };
                    draft["phone"] = json!(text);
                    db.lock().unwrap().set_agent_bot_state(&chat_id, "register", "address", &draft.to_string());
                    let _ = send_message(client, token, &chat_id, bot_text(&locale, "ask_address"), None).await;
                }
                "address" => {
                    let Some(text) = text else { return };
                    draft["address"] = json!(text);
                    db.lock().unwrap().set_agent_bot_state(&chat_id, "register", "email", &draft.to_string());
                    let _ = send_message(client, token, &chat_id, bot_text(&locale, "ask_email"), None).await;
                }
                "email" => {
                    let Some(text) = text else { return };
                    draft["email"] = json!(text);
                    db.lock().unwrap().set_agent_bot_state(&chat_id, "register", "passport", &draft.to_string());
                    let _ = send_message(client, token, &chat_id, bot_text(&locale, "ask_passport"), None).await;
                }
                "passport" => {
                    // Самый важный шаг регистрации — фото/файл паспорта
                    // обязателен, текстом его пропустить нельзя (в отличие от
                    // необязательных полей в других формах бота).
                    let Some((file_id, mime)) = extract_photo_file_id(msg) else {
                        let _ = send_message(client, token, &chat_id, bot_text(&locale, "passport_invalid"), None).await;
                        return;
                    };
                    let photo_data = match download_telegram_file_as_data_url(client, token, &file_id, &mime).await {
                        Ok(data) => data,
                        Err(_) => {
                            let _ = send_message(client, token, &chat_id, bot_text(&locale, "registration_failed"), None).await;
                            return;
                        }
                    };
                    let full_name = draft.get("full_name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                    let phone = draft.get("phone").and_then(|v| v.as_str()).map(|s| s.to_string());
                    let address = draft.get("address").and_then(|v| v.as_str()).map(|s| s.to_string());
                    let email = draft.get("email").and_then(|v| v.as_str()).map(|s| s.to_string());
                    let consent_given = draft.get("consent").and_then(|v| v.as_bool()).unwrap_or(false);
                    db.lock().unwrap().clear_agent_bot_state(&chat_id);
                    let result = db.lock().unwrap().create_agent_application(
                        &chat_id,
                        &full_name,
                        phone.as_deref(),
                        address.as_deref(),
                        email.as_deref(),
                        Some(&photo_data),
                        Some("passport.jpg"),
                        consent_given,
                        &locale,
                    );
                    let reply = if result.is_ok() { bot_text(&locale, "registration_sent") } else { bot_text(&locale, "registration_failed") };
                    let _ = send_message(client, token, &chat_id, reply, None).await;
                }
                _ => {}
            }
        } else if flow == "new_lead" {
            let Some(text) = text else { return };
            match step.as_str() {
                "name" => {
                    draft["client_name"] = json!(text);
                    db.lock().unwrap().set_agent_bot_state(&chat_id, "new_lead", "inn", &draft.to_string());
                    let _ = send_message(client, token, &chat_id, bot_text(&locale, "sale_ask_inn"), None).await;
                }
                "inn" => {
                    draft["client_inn"] = json!(text);
                    db.lock().unwrap().set_agent_bot_state(&chat_id, "new_lead", "phone", &draft.to_string());
                    let _ = send_message(client, token, &chat_id, bot_text(&locale, "sale_ask_phone"), None).await;
                }
                "phone" => {
                    draft["client_phone"] = json!(text);
                    db.lock().unwrap().set_agent_bot_state(&chat_id, "new_lead", "company", &draft.to_string());
                    let _ = send_message(client, token, &chat_id, bot_text(&locale, "sale_ask_company"), None).await;
                }
                "company" => {
                    let agent_id = draft.get("agent_id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                    let client_name = draft.get("client_name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                    let client_inn = draft.get("client_inn").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                    let client_phone = draft.get("client_phone").and_then(|v| v.as_str()).map(|s| s.to_string());
                    let company_name = if text == "-" { None } else { Some(text.clone()) };
                    db.lock().unwrap().clear_agent_bot_state(&chat_id);
                    let result = db.lock().unwrap().create_agent_lead(&agent_id, &client_name, &client_inn, client_phone.as_deref(), company_name.as_deref());
                    let reply = match result {
                        Ok(_) => bot_text(&locale, "sale_done"),
                        Err(e) if e.contains("ИНН") => bot_text(&locale, "sale_inn_duplicate"),
                        Err(_) => bot_text(&locale, "sale_failed"),
                    };
                    let _ = send_message(client, token, &chat_id, reply, None).await;
                }
                _ => {}
            }
        }
        return;
    }

    if let Some(cb) = update.get("callback_query") {
        let cb_id = cb.get("id").and_then(|v| v.as_str()).map(|s| s.to_string());
        let data = cb.get("data").and_then(|v| v.as_str()).map(|s| s.to_string());
        let chat_id = cb.get("message").and_then(|m| m.get("chat")).and_then(|c| c.get("id")).map(|v| v.to_string());
        let (Some(cb_id), Some(data), Some(chat_id)) = (cb_id, data, chat_id) else { return };

        // "lang:*"/"consent:agree" — часть регистрации, до появления строки
        // в agents, обрабатываются раньше проверки "агент подтверждён".
        if let Some(locale) = data.strip_prefix("lang:") {
            let _ = answer_callback_query(client, token, &cb_id, None).await;
            let consent_enabled = db.lock().unwrap().get_agent_consent_settings_internal().enabled;
            let draft = json!({ "locale": locale });
            if consent_enabled {
                db.lock().unwrap().set_agent_bot_state(&chat_id, "register", "consent", &draft.to_string());
                send_consent_prompt(db, client, token, &chat_id, locale).await;
            } else {
                db.lock().unwrap().set_agent_bot_state(&chat_id, "register", "name", &draft.to_string());
                let _ = send_message(client, token, &chat_id, bot_text(locale, "ask_name"), None).await;
            }
            return;
        }
        if data == "consent:agree" {
            let _ = answer_callback_query(client, token, &cb_id, None).await;
            let state = db.lock().unwrap().get_agent_bot_state(&chat_id);
            let Some((_, _, draft_json)) = state else { return };
            let mut draft: serde_json::Value = serde_json::from_str(&draft_json).unwrap_or_else(|_| json!({}));
            let locale = draft.get("locale").and_then(|v| v.as_str()).unwrap_or("ru").to_string();
            draft["consent"] = json!(true);
            db.lock().unwrap().set_agent_bot_state(&chat_id, "register", "name", &draft.to_string());
            let _ = send_message(client, token, &chat_id, bot_text(&locale, "ask_name"), None).await;
            return;
        }

        let agent = db.lock().unwrap().get_agent_by_chat_id(&chat_id);
        let Some(agent) = agent.filter(|a| a.status == "approved") else {
            let _ = answer_callback_query(client, token, &cb_id, Some(bot_text("ru", "not_available"))).await;
            return;
        };
        let locale = agent.locale.clone();

        match data.as_str() {
            "agent:new_lead" => {
                let draft = json!({ "agent_id": agent.id, "locale": locale });
                db.lock().unwrap().set_agent_bot_state(&chat_id, "new_lead", "name", &draft.to_string());
                let _ = answer_callback_query(client, token, &cb_id, None).await;
                let _ = send_message(client, token, &chat_id, bot_text(&locale, "sale_ask_name"), None).await;
            }
            "agent:materials" => {
                let posts = db.lock().unwrap().list_agent_training_posts();
                let _ = answer_callback_query(client, token, &cb_id, None).await;
                if posts.is_empty() {
                    let _ = send_message(client, token, &chat_id, bot_text(&locale, "no_materials"), None).await;
                } else {
                    let text = posts.iter().take(5).map(|p| format!("📌 {}\n{}", p.title, p.body)).collect::<Vec<_>>().join("\n\n---\n\n");
                    let _ = send_message(client, token, &chat_id, &text, None).await;
                }
            }
            "agent:my_leads" => {
                let leads: Vec<_> = db.lock().unwrap().list_agent_leads().into_iter().filter(|l| l.agent_id == agent.id).collect();
                let _ = answer_callback_query(client, token, &cb_id, None).await;
                if leads.is_empty() {
                    let _ = send_message(client, token, &chat_id, bot_text(&locale, "no_leads"), None).await;
                } else {
                    let text = leads.iter().map(|l| format!("{} — {}", l.client_name, stage_label(&locale, &l.stage))).collect::<Vec<_>>().join("\n");
                    let _ = send_message(client, token, &chat_id, &text, None).await;
                }
            }
            _ => {
                let _ = answer_callback_query(client, token, &cb_id, None).await;
            }
        }
    }
}
