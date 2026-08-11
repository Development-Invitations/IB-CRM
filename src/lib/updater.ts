import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

// ============================================================================
// ВАЖНО — прочитать перед тем как полагаться на автообновление:
//
// Код ниже использует официальный плагин Tauri (`tauri-plugin-updater` на
// Rust-стороне + `@tauri-apps/plugin-updater` на фронтенде) — это не заглушка,
// механизм рабочий. НО он не может ничего найти/установить, пока не выполнены
// два условия на вашей стороне:
//
//   1. Сгенерирована пара ключей подписи обновлений:
//        npx tauri signer generate -w ~/.tauri/ib-crm-updater.key
//      Публичный ключ из вывода команды нужно вставить в
//      src-tauri/tauri.conf.json → plugins.updater.pubkey (сейчас там
//      временная заглушка "REPLACE_WITH_YOUR_PUBLIC_KEY").
//
//   2. В GitHub Actions (или вручную) при каждом релизе публикуется
//      подписанный билд + файл latest.json в GitHub Releases репозитория
//      IB-CRM — `tauri-action` (официальный GitHub Action от Tauri) делает
//      это автоматически при наличии переменных TAURI_SIGNING_PRIVATE_KEY /
//      TAURI_SIGNING_PRIVATE_KEY_PASSWORD в секретах репозитория.
//
// До этого момента checkForAppUpdate() ниже будет стабильно возвращать
// { status: 'error' } (сеть/эндпоинт не настроены) — это ожидаемо и
// безопасно, приложение просто продолжает работать офлайн. Актуальную
// схему конфига обязательно сверьте с официальной документацией перед
// продакшеном: https://v2.tauri.app/plugin/updater/
// ============================================================================

export type UpdateProgress = { downloaded: number; total: number | null };

export type UpdateCheckResult =
  | { status: 'up-to-date' }
  | { status: 'available'; version: string; notes?: string; install: (onProgress?: (p: UpdateProgress) => void) => Promise<void> }
  | { status: 'error'; message: string };

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  try {
    const update = await check();
    if (update?.available) {
      return {
        status: 'available',
        version: update.version,
        notes: update.body,
        install: async (onProgress) => {
          let downloaded = 0;
          let total: number | null = null;

          await update.downloadAndInstall((event) => {
            switch (event.event) {
              case 'Started':
                total = event.data.contentLength ?? null;
                onProgress?.({ downloaded, total });
                break;
              case 'Progress':
                downloaded += event.data.chunkLength;
                onProgress?.({ downloaded, total });
                break;
              case 'Finished':
                onProgress?.({ downloaded: total ?? downloaded, total: total ?? downloaded });
                break;
            }
          });

          await relaunch();
        },
      };
    }
    return { status: 'up-to-date' };
  } catch (err: any) {
    return { status: 'error', message: err?.message ?? String(err) };
  }
}
