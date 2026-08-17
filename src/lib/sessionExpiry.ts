// Небольшая шина событий "сессия на сервере стала недействительной" (v0.2.9)
// — сервер перезапустили (токены сессий живут только в памяти, см.
// server.rs::ServerState.sessions), и клиент это узнаёт не сразу, а только
// на первом же следующем сетевом вызове API. api.ts (низкоуровневая обёртка
// invoke()) не может сам решить, что показать пользователю и куда его
// перенаправить — это дело App.tsx, поэтому просто оповещаем через шину.
type Listener = () => void;
let listeners: Listener[] = [];

export function notifySessionExpired() {
  listeners.forEach((l) => l());
}

export function onSessionExpired(cb: Listener): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
