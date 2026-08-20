// Фото сотрудника храним как base64 data URL прямо в SQLite (см. src-tauri/src/db.rs).
// Чтобы не раздувать локальную базу оригиналами в несколько мегабайт, перед
// отправкой сжимаем на клиенте: приводим к квадрату, уменьшаем до maxSize px
// и перекодируем в JPEG с умеренным качеством.

export function compressImageFile(file: File, maxSize = 320, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;

        const size = Math.min(maxSize, side);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas недоступен'));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Логотип — в отличие от фото сотрудника, НЕ обрезаем в квадрат (лого обычно
// прямоугольное) и кодируем в PNG, а не JPEG — у многих логотипов прозрачный
// фон, JPEG его закрасит белым/чёрным.
export function compressLogoFile(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas недоступен'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Для системной иконки окна/панели задач (Tauri Window.setIcon) — приводит
// произвольный логотип к квадрату 256×256 (вписан по центру, прозрачные поля
// вокруг, если пропорции не 1:1) и отдаёт сырые RGBA-байты. Именно сырой
// RGBA, а не PNG/ICO — так setIcon работает без декодирования на стороне
// Rust, а значит без включения фич image-png/image-ico в Cargo.toml.
export function extractIconRgba(dataUrl: string, size = 256): Promise<{ rgba: number[]; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
    img.onload = () => {
      const scale = Math.min(size / img.width, size / img.height);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas недоступен'));
        return;
      }
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      const { data } = ctx.getImageData(0, 0, size, size);
      resolve({ rgba: Array.from(data), width: size, height: size });
    };
    img.src = dataUrl;
  });
}
