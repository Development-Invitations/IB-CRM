// Разрешённый HTML для контента блога (тема пишется через RichEditor, но текст
// можно и вставить из буфера — оттуда может прилететь что угодно). Белый список
// тегов/атрибутов вместо стороннего пакета (санитайзер небольшой и полностью
// под нашим контролем, не нужно тянуть внешнюю зависимость ради этого).

const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'BR', 'P', 'DIV', 'SPAN',
  'H2', 'H3', 'UL', 'OL', 'LI', 'A', 'IMG', 'VIDEO', 'DETAILS', 'SUMMARY', 'BLOCKQUOTE',
]);

const ALLOWED_ATTRS: Record<string, string[]> = {
  A: ['href', 'target', 'rel', 'download'],
  IMG: ['src', 'alt'],
  VIDEO: ['src', 'controls'],
  H2: ['id'],
  H3: ['id'],
  // 'style' здесь не значит "любой CSS" — см. проверку значения ниже, разрешён
  // только сам цвет (то, что вставляет execCommand('foreColor') в Chromium).
  SPAN: ['style'],
};

const SAFE_COLOR = /^\s*color\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([0-9.,\s%]+\))\s*;?\s*$/;

function sanitizeNode(node: Node): void {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      node.removeChild(child);
      continue;
    }
    const el = child as Element;
    if (!ALLOWED_TAGS.has(el.tagName)) {
      // Разворачиваем неизвестный тег — оставляем его содержимое на месте узла
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      }
      continue;
    }
    const allowedAttrs = ALLOWED_ATTRS[el.tagName] ?? [];
    for (const attr of Array.from(el.attributes)) {
      if (!allowedAttrs.includes(attr.name.toLowerCase())) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (attr.name === 'style') {
        if (!SAFE_COLOR.test(attr.value)) el.removeAttribute('style');
        continue;
      }
      if ((attr.name === 'href' || attr.name === 'src') && /^\s*javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noreferrer noopener');
    }
    sanitizeNode(el);
  }
}

export function sanitizeBlogHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

// contentEditable оставляет "пустой" HTML вида "<p><br></p>" — .trim() на такой
// строке ничего не даёт, нужно смотреть на реальный текст и медиа-теги.
export function isBlankHtml(html: string): boolean {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (doc.body.querySelector('img, video')) return false;
  return !(doc.body.textContent ?? '').trim();
}
