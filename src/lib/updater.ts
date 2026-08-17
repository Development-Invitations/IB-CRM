import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { writeFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { exit } from '@tauri-apps/plugin-process';
import { connection, sessionToken } from './connection';
import { api } from './api';
import { APP_VERSION } from './changelog';

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
  // Режим клиента: настоящий подписанный автообновитель не настроен (см.
  // комментарий выше), сервер знает свою версию — если она новее, чем у
  // клиента, сообщаем об этом. Если админ положил на сервер файл установщика
  // (см. Настройки → Сервер), install заполнен — тогда можно скачать и
  // запустить его прямо отсюда (см. server.rs::download_installer_handler);
  // если файла нет — install отсутствует, просто показываем текст.
  | {
      status: 'server-newer';
      version: string;
      install?: (onProgress?: (p: UpdateProgress) => void) => Promise<void>;
    }
  | { status: 'error'; message: string };

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Перезапуск вынесен отдельной функцией и НЕ вызывается автоматически внутри
// install() — раньше приложение перезапускалось мгновенно сразу после
// загрузки, без единого сообщения об успехе, что выглядело как будто оно
// просто вылетело. Теперь компонент сам показывает "Готово!" на пару секунд
// и вызывает restartApp() уже после этого — красиво, а не резко.
export async function restartApp() {
  await relaunch();
}

// Для скачанного с сервера установщика — не перезапуск того же бинарника
// (relaunch), а полный выход: установщик сейчас же попробует перезаписать
// текущий .exe, что невозможно, пока он ещё запущен.
export async function quitApp() {
  await exit(0);
}

// Скачивает установщик с сервера (см. server.rs::download_installer_handler),
// сохраняет в $APPDATA/updates/downloaded-installer.exe (тот же путь, что
// вычисляет update_installer_path() в main.rs) и запускает его — тот же
// файл, что раньше только "лежал на сервере", теперь реально доставляется
// клиенту одной кнопкой. Подписи/проверки нет (см. комментарий в начале
// файла) — осознанный компромисс для доверенной офисной LAN, не интернета.
async function downloadAndLaunchServerInstaller(onProgress?: (p: UpdateProgress) => void): Promise<void> {
  const serverUrl = connection.getServerUrl();
  const token = sessionToken.get();
  const headers: Record<string, string> = {};
  if (token) headers['X-Session-Token'] = token;

  const response = await tauriFetch(`${serverUrl}/api/update-installer`, { method: 'GET', headers });
  if (!response.ok) throw new Error('Не удалось скачать установщик с сервера');

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : null;
  onProgress?.({ downloaded: 0, total });

  const bytes = new Uint8Array(await response.arrayBuffer());
  onProgress?.({ downloaded: bytes.length, total: total ?? bytes.length });

  await mkdir('updates', { baseDir: BaseDirectory.AppData, recursive: true });
  await writeFile('updates/downloaded-installer.exe', bytes, { baseDir: BaseDirectory.AppData });

  const installerPath = await api.getUpdateInstallerPath();
  await shellOpen(installerPath);
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  if (connection.isClient()) {
    try {
      const serverVersion = await api.getAppVersion();
      if (compareVersions(serverVersion, APP_VERSION) > 0) {
        let install: ((onProgress?: (p: UpdateProgress) => void) => Promise<void>) | undefined;
        try {
          const installerInfo = await api.getUpdateInstallerInfo();
          if (installerInfo.available) {
            install = downloadAndLaunchServerInstaller;
          }
        } catch {
          // Нет установщика на сервере — просто сообщаем о новой версии без кнопки.
        }
        return { status: 'server-newer', version: serverVersion, install };
      }
      return { status: 'up-to-date' };
    } catch (err: any) {
      return { status: 'error', message: typeof err === 'string' ? err : (err?.message ?? String(err)) };
    }
  }

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
        },
      };
    }
    return { status: 'up-to-date' };
  } catch (err: any) {
    return { status: 'error', message: err?.message ?? String(err) };
  }
}
