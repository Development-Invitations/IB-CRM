import type { ReactNode } from 'react';
import type { NavigateFunction } from 'react-router-dom';

// "Ссылка на задачу" (кнопка со скрепкой-цепочкой у записи регламента и у
// сообщения проекта) раньше была самым обычным window.location.href — то
// есть просто мёртвым текстом, если её вставить в сообщение: кликнуть по
// ней было невозможно (текст записи рендерится как обычная строка, не HTML),
// а если бы и была настоящей ссылкой — переход по ней не смог бы открыть то
// же самое SPA-состояние (нужный регламент/проект + прокрутка к записи), т.к.
// это не настоящий веб-сервер с маршрутизацией. Формат сохранён похожим на
// URL для узнаваемости, но и регламент/проект, и сама запись закодированы
// прямо в пути — этого достаточно, чтобы открыть нужное состояние без
// дополнительного запроса к серверу.

export function buildRegulationEntryLink(regulationId: string, entryId: string): string {
  return `http://tauri.localhost/regulations/${regulationId}/entries/${entryId}`;
}

export function buildProjectMessageLink(projectId: string, messageId: string): string {
  return `http://tauri.localhost/projects/${projectId}/messages/${messageId}`;
}

const LINK_RE =
  /https?:\/\/\S*?\/regulations\/([a-f0-9-]{30,40})\/entries\/([a-f0-9-]{30,40})|https?:\/\/\S*?\/projects\/([a-f0-9-]{30,40})\/messages\/([a-f0-9-]{30,40})/g;

// Разбивает текст записи/сообщения на куски, превращая наши собственные
// ссылки на задачу в кликабельные элементы — клик сразу открывает нужный
// регламент/проект и прокручивает к нужной записи. Остальной текст рендерится
// как есть.
export function linkifyEntryContent(text: string, navigate: NavigateFunction): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  LINK_RE.lastIndex = 0;

  while ((match = LINK_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const [full, regId, entryId, projId, msgId] = match;
    if (regId && entryId) {
      parts.push(
        <button
          key={key++}
          type="button"
          className="inline-entry-link"
          onClick={() => navigate('/dashboard/regulations', { state: { openRegId: regId, openEntryId: entryId } })}
        >
          {full}
        </button>
      );
    } else if (projId && msgId) {
      parts.push(
        <button
          key={key++}
          type="button"
          className="inline-entry-link"
          onClick={() => navigate('/dashboard/projects', { state: { openProjectId: projId, openMessageId: msgId } })}
        >
          {full}
        </button>
      );
    }
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : [text];
}
