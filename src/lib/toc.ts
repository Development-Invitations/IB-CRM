// Извлекает заголовки (h2/h3) из уже санитизированного HTML темы блога, чтобы
// построить "путь чтения" — колонку ссылок-якорей справа от текста.

export type TocItem = { id: string; text: string; level: 2 | 3 };

let counter = 0;
function slugify(text: string): string {
  const base = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  counter += 1;
  return `${base || 'section'}-${counter}`;
}

// Возвращает и список заголовков, и HTML с проставленными id (у заголовков без
// id) — используем один и тот же вызов перед рендером через dangerouslySetInnerHTML.
export function extractToc(html: string): { items: TocItem[]; html: string } {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const items: TocItem[] = [];
  doc.body.querySelectorAll('h2, h3').forEach((el) => {
    const text = el.textContent?.trim() ?? '';
    if (!text) return;
    let id = el.id;
    if (!id) {
      id = slugify(text);
      el.id = id;
    }
    items.push({ id, text, level: el.tagName === 'H2' ? 2 : 3 });
  });
  return { items, html: doc.body.innerHTML };
}
