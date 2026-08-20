import { useEffect, useState } from 'react';
import { Image } from '@tauri-apps/api/image';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { api } from './api';
import { extractIconRgba } from './photo';

// Логотип приложения (v0.3.1) — по умолчанию статичный файл в public/brand,
// но админ может заменить его на свой (см. Settings.tsx). Хранится в
// app_meta на сервере/локальной базе (см. db.rs::get_app_logo), поэтому
// применяется сразу для всех пользователей этой установки, а не только у
// того, кто его загрузил.
export const DEFAULT_LOGO = '/brand/logo-mark.png';

let cached: string | null | undefined; // undefined = ещё не запрашивали
let pending: Promise<string | null> | null = null;
const listeners = new Set<(logo: string) => void>();

function resolve(v: string | null) {
  return v ?? DEFAULT_LOGO;
}

function notify() {
  const value = resolve(cached ?? null);
  listeners.forEach((fn) => fn(value));
}

function load(): Promise<string | null> {
  if (pending) return pending;
  pending = api.getAppLogo()
    .then((v) => {
      cached = v;
      notify();
      return v;
    })
    .catch(() => null)
    .finally(() => { pending = null; });
  return pending;
}

// Вызывается из Settings.tsx после успешного сохранения/сброса — обновляет
// кеш сразу у всех открытых компонентов этой сессии, без перезагрузки.
export function setCachedAppLogo(v: string | null) {
  cached = v;
  notify();
}

export function useAppLogo(): string {
  const [logo, setLogo] = useState(() => resolve(cached ?? null));

  useEffect(() => {
    listeners.add(setLogo);
    if (cached === undefined) load();
    return () => { listeners.delete(setLogo); };
  }, []);

  return logo;
}

// Системная иконка окна/панели задач — берётся сырыми RGBA-байтами (без
// декодирования PNG на стороне Rust, значит без фич image-png/image-ico в
// Cargo.toml, см. журнал v0.3.1 в docs/TZ.md). Действует только для уже
// запущенного окна — ярлык/иконка exe до запуска приложения не меняется.
export async function applyRuntimeIcon(dataUrl: string): Promise<void> {
  const { rgba, width, height } = await extractIconRgba(dataUrl);
  const icon = await Image.new(new Uint8Array(rgba), width, height);
  await getCurrentWindow().setIcon(icon);
}
