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
