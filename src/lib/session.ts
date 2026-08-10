const REMEMBERED_LOGIN_KEY = 'ib-crm-remembered-login';
const SESSION_KEY = 'ib-crm-session';

// Согласно ТЗ: "запомнить меня" сохраняет только логин, чтобы не набирать его
// каждый раз — пароль при этом спрашивается всегда, полноценная сессия
// в localStorage не хранится (это осознанно, из соображений безопасности).
export const rememberedLogin = {
  get: (): string => localStorage.getItem(REMEMBERED_LOGIN_KEY) ?? '',
  set: (login: string) => localStorage.setItem(REMEMBERED_LOGIN_KEY, login),
  clear: () => localStorage.removeItem(REMEMBERED_LOGIN_KEY),
};

// Сама сессия сотрудника (кто вошёл) хранится в sessionStorage, а не в
// localStorage. Разница принципиальна: sessionStorage переживает обновление
// страницы (F5 / reload внутри работающего приложения), но полностью
// очищается, когда закрывается окно/процесс приложения — то есть при
// следующем реальном запуске пароль всё равно спросится заново, как и
// задумано, а случайный reload больше не выкидывает на экран входа.
export const session = {
  get: <T,>(): T | null => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  set: (value: unknown) => sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)),
  clear: () => sessionStorage.removeItem(SESSION_KEY),
};
