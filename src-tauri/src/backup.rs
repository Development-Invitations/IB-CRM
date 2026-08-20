// Формат зашифрованного файла резервной копии (.ibcbak, v1):
//   [0..8)   magic   = b"IBCRMBK1"
//   [8..24)  salt    = 16 случайных байт (PBKDF2-HMAC-SHA256)
//   [24..36) nonce   = 12 случайных байт (AES-256-GCM)
//   [36..)   ciphertext (с GCM-тегом в хвосте — как отдаёт seal_in_place_append_tag)
//
// Пароль — единственный ключ; нигде не сохраняется (ни сам, ни хеш). Неверный
// пароль при восстановлении даёт ошибку уже на этапе проверки AEAD-тега.

use ring::aead::{Aad, LessSafeKey, Nonce, UnboundKey, AES_256_GCM, NONCE_LEN};
use ring::pbkdf2;
use ring::rand::{SecureRandom, SystemRandom};
use std::num::NonZeroU32;

const MAGIC: &[u8; 8] = b"IBCRMBK1";
const SALT_LEN: usize = 16;
const PBKDF2_ITERATIONS: u32 = 600_000;
const SQLITE_HEADER: &[u8; 16] = b"SQLite format 3\0";
const KEY_LEN: usize = 32;

fn derive_key(password: &str, salt: &[u8]) -> [u8; KEY_LEN] {
    let mut key = [0u8; KEY_LEN];
    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA256,
        NonZeroU32::new(PBKDF2_ITERATIONS).unwrap(),
        salt,
        password.as_bytes(),
        &mut key,
    );
    key
}

pub fn encrypt(plain: &[u8], password: &str) -> Result<Vec<u8>, String> {
    let rng = SystemRandom::new();

    let mut salt = [0u8; SALT_LEN];
    rng.fill(&mut salt).map_err(|_| "Не удалось сгенерировать соль".to_string())?;

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rng.fill(&mut nonce_bytes).map_err(|_| "Не удалось сгенерировать nonce".to_string())?;

    let key_bytes = derive_key(password, &salt);
    let unbound = UnboundKey::new(&AES_256_GCM, &key_bytes).map_err(|_| "Ошибка ключа шифрования".to_string())?;
    let key = LessSafeKey::new(unbound);
    let nonce = Nonce::assume_unique_for_key(nonce_bytes);

    let mut in_out = plain.to_vec();
    key
        .seal_in_place_append_tag(nonce, Aad::empty(), &mut in_out)
        .map_err(|_| "Ошибка шифрования резервной копии".to_string())?;

    let mut out = Vec::with_capacity(8 + SALT_LEN + NONCE_LEN + in_out.len());
    out.extend_from_slice(MAGIC);
    out.extend_from_slice(&salt);
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&in_out);
    Ok(out)
}

pub fn decrypt(data: &[u8], password: &str) -> Result<Vec<u8>, String> {
    let header_len = 8 + SALT_LEN + NONCE_LEN;
    if data.len() < header_len || &data[0..8] != MAGIC {
        return Err("Файл резервной копии повреждён или это не бэкап IB CRM".to_string());
    }
    let salt = &data[8..8 + SALT_LEN];
    let nonce_bytes: [u8; NONCE_LEN] = data[8 + SALT_LEN..header_len]
        .try_into()
        .map_err(|_| "Файл резервной копии повреждён".to_string())?;
    let ciphertext = &data[header_len..];

    let key_bytes = derive_key(password, salt);
    let unbound = UnboundKey::new(&AES_256_GCM, &key_bytes).map_err(|_| "Ошибка ключа шифрования".to_string())?;
    let key = LessSafeKey::new(unbound);
    let nonce = Nonce::assume_unique_for_key(nonce_bytes);

    let mut in_out = ciphertext.to_vec();
    let plain = key
        .open_in_place(nonce, Aad::empty(), &mut in_out)
        .map_err(|_| "Неверный пароль или повреждённый файл резервной копии".to_string())?;

    if plain.len() < SQLITE_HEADER.len() || &plain[0..SQLITE_HEADER.len()] != SQLITE_HEADER {
        return Err("Расшифрованный файл не похож на базу данных IB CRM".to_string());
    }

    Ok(plain.to_vec())
}
