// Канал личной переписки — 'dm:<id1>:<id2>', id отсортированы лексикографически
// (та же сортировка, что и в Rust — оба языка сравнивают UUID-строки байт/
// код-юнит за код-юнитом одинаково), поэтому оба собеседника всегда получают
// один и тот же канал независимо от того, кто из них его вычисляет.
export function dmChannelId(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `dm:${x}:${y}`;
}

// Обратная операция — из строки канала достать id собеседника (не себя).
// Возвращает null, если это не личный канал.
export function dmOtherParticipant(channel: string, selfId: string): string | null {
  if (!channel.startsWith('dm:')) return null;
  const [a, b] = channel.slice(3).split(':');
  if (!a || !b) return null;
  return a === selfId ? b : a;
}
