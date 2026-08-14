// Вложения записей регламента храним как base64 data URL в SQLite (см.
// src-tauri/src/db.rs), как и фото сотрудников (src/lib/photo.ts). В отличие
// от аватара, вложение в чате не обрезаем в квадрат — просто ограничиваем
// максимальную сторону и перекодируем в JPEG, чтобы не раздувать базу и не
// вешать IPC-мост на огромных base64-блобах.

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20MB

export type AttachmentKind = 'image' | 'video' | 'file';

export function classifyAttachment(dataUrl: string | null | undefined): AttachmentKind {
  if (!dataUrl) return 'file';
  if (dataUrl.startsWith('data:image/')) return 'image';
  if (dataUrl.startsWith('data:video/')) return 'video';
  return 'file';
}

export function compressAttachmentImage(file: File, maxDim = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas недоступен')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// Готовит файл ко вложению: слишком большие файлы отклоняет, картинки сжимает,
// остальное (включая видео) читает как есть.
export async function prepareAttachment(file: File): Promise<{ data: string; name: string }> {
  if (file.type.startsWith('image/')) {
    const data = await compressAttachmentImage(file);
    return { data, name: file.name };
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('Файл слишком большой (максимум 20МБ)');
  }
  const data = await readAsDataUrl(file);
  return { data, name: file.name };
}
