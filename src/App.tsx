import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';
import FirstRunSetup from './pages/FirstRunSetup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PartnerPanel from './pages/PartnerPanel';
import ToastWindow from './pages/ToastWindow';
import LoadingScreen from './components/LoadingScreen';
import { api, type Employee } from './lib/api';
import { session } from './lib/session';
import { useLocale } from './lib/i18n';
import { onSessionExpired } from './lib/sessionExpiry';
import { saveReturnPath, consumeReturnPath } from './lib/returnPath';
import { applyRuntimeIcon } from './lib/appLogo';

export default function App() {
  const { t } = useLocale();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  // Сессия читается из sessionStorage (не localStorage!) — переживает reload
  // страницы, но полностью сбрасывается при закрытии приложения, так что
  // пароль всё равно спросится заново при следующем реальном запуске.
  // См. подробный комментарий в src/lib/session.ts.
  const [currentEmployee, setCurrentEmployeeState] = useState<Employee | null>(() => session.get<Employee>());
  // true — пользователя выкинуло принудительно (сервер перезапустили, токен
  // сессии стал недействителен), а не он сам вышел — Login.tsx показывает
  // отдельное объяснение вместо обычного экрана входа.
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [returnPath, setReturnPath] = useState<string | null>(null);

  const setCurrentEmployee = (emp: Employee | null) => {
    setCurrentEmployeeState(emp);
    if (emp) {
      session.set(emp);
      setSessionExpiredNotice(false);
      setReturnPath(consumeReturnPath());
      // Фиксируем реальный новый вход (не срабатывает при восстановлении
      // сессии из sessionStorage при обычном reload страницы — там employee
      // читается напрямую из session.get() в инициализаторе useState выше,
      // минуя setCurrentEmployee).
      api.recordLogin(emp.id).catch(() => {});
    } else {
      session.clear();
    }
  };

  // Сервер перезапустили (токены сессий живут только в памяти сервера) —
  // клиент узнаёт об этом не сразу, а только на первом сетевом вызове после
  // рестарта (см. sessionExpiry.ts/api.ts). Запоминаем, где именно был
  // пользователь, чтобы после повторного входа вернуть его туда же, а не на
  // дашборд с нуля.
  useEffect(() => {
    return onSessionExpired(() => {
      setCurrentEmployeeState((prev) => {
        if (!prev) return prev;
        saveReturnPath(location.pathname);
        session.clear();
        setSessionExpiredNotice(true);
        return null;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = () => {
    if (currentEmployee) {
      api.recordLogout(currentEmployee.id).catch(() => {});
    }
    setCurrentEmployee(null);
  };

  // Окно уведомления (см. src/pages/ToastWindow.tsx) — отдельное лёгкое OS-окно
  // без авторизации и без обращений к БД, поэтому весь блок ниже (проверка
  // администратора, слежение за закрытием окна и т.д.) ему не нужен и даже
  // вреден (лишний сетевой запрос при каждом показе уведомления).
  const isToastWindow = location.pathname === '/toast';

  useEffect(() => {
    if (isToastWindow) {
      setLoading(false);
      return;
    }
    api.hasAdmin().then((res) => {
      setAdminExists(res);
      setLoading(false);
    });
    // Если админ заменил логотип (см. Настройки → Логотип) — применяем его
    // к окну/панели задач сразу при запуске, не дожидаясь входа. Тихо
    // игнорируем ошибку — свежая база без заданного лого вернёт null, а
    // окружения без поддержки set_icon не должны ронять загрузку приложения.
    api.getAppLogo().then((logo) => { if (logo) applyRuntimeIcon(logo).catch(() => {}); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToastWindow]);

  // Лучшая попытка зафиксировать выход и при закрытии окна приложения (крестик),
  // а не только по кнопке "Выйти" — иначе статус "в сети" завис бы навсегда,
  // если сотрудник просто закрыл окно. Не защищает от принудительного завершения
  // процесса через диспетчер задач — это осознанное упрощение офлайн-версии.
  useEffect(() => {
    if (!currentEmployee) return;
    const employeeId = currentEmployee.id;
    let unlisten: (() => void) | undefined;

    getCurrentWindow()
      .onCloseRequested(async (event) => {
        event.preventDefault();
        try {
          // Не даём записи выхода заблокировать закрытие окна дольше чем на
          // секунду — если Rust-команда зависла или сеть/БД тормозят, ждать
          // ответа неограниченно нельзя: закрыть окно важнее.
          await Promise.race([
            api.recordLogout(employeeId),
            new Promise((resolve) => setTimeout(resolve, 1000)),
          ]);
        } catch {
          // Игнорируем ошибку записи выхода — она не должна мешать закрытию.
        } finally {
          // exit() из tauri-plugin-process гарантированно завершает весь
          // процесс приложения — в отличие от window.destroy(), который
          // иногда лишь скрывает окно, оставляя процесс висеть в фоне.
          await exit(0);
        }
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, [currentEmployee?.id]);

  if (isToastWindow) return <ToastWindow />;
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route
        path="/setup"
        element={
          adminExists ? (
            <Navigate to="/login" />
          ) : (
            <FirstRunSetup
              onCreated={(emp) => {
                setAdminExists(true);
                setCurrentEmployee(emp);
              }}
              onConnected={(hasAdminAlready) => {
                if (hasAdminAlready) setAdminExists(true);
              }}
            />
          )
        }
      />
      <Route
        path="/login"
        element={
          currentEmployee ? (
            <Navigate to={returnPath ?? '/dashboard'} replace />
          ) : !adminExists ? (
            <Navigate to="/setup" />
          ) : (
            <Login onLogin={setCurrentEmployee} sessionExpired={sessionExpiredNotice} />
          )
        }
      />
      <Route
        path="/dashboard/*"
        element={
          currentEmployee ? (
            currentEmployee.isPartner ? (
              <PartnerPanel employee={currentEmployee} onLogout={handleLogout} />
            ) : (
              <Dashboard employee={currentEmployee} onLogout={handleLogout} />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="*" element={<Navigate to={adminExists ? '/login' : '/setup'} />} />
    </Routes>
  );
}
