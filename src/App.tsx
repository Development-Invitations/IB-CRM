import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import FirstRunSetup from './pages/FirstRunSetup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LoadingScreen from './components/LoadingScreen';
import { api, type Employee } from './lib/api';
import { session } from './lib/session';
import { useLocale } from './lib/i18n';

export default function App() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  // Сессия читается из sessionStorage (не localStorage!) — переживает reload
  // страницы, но полностью сбрасывается при закрытии приложения, так что
  // пароль всё равно спросится заново при следующем реальном запуске.
  // См. подробный комментарий в src/lib/session.ts.
  const [currentEmployee, setCurrentEmployeeState] = useState<Employee | null>(() => session.get<Employee>());

  const setCurrentEmployee = (emp: Employee | null) => {
    setCurrentEmployeeState(emp);
    if (emp) {
      session.set(emp);
      // Фиксируем реальный новый вход (не срабатывает при восстановлении
      // сессии из sessionStorage при обычном reload страницы — там employee
      // читается напрямую из session.get() в инициализаторе useState выше,
      // минуя setCurrentEmployee).
      api.recordLogin(emp.id).catch(() => {});
    } else {
      session.clear();
    }
  };

  const handleLogout = () => {
    if (currentEmployee) {
      api.recordLogout(currentEmployee.id).catch(() => {});
    }
    setCurrentEmployee(null);
  };

  useEffect(() => {
    api.hasAdmin().then((res) => {
      setAdminExists(res);
      setLoading(false);
    });
  }, []);

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
          await api.recordLogout(employeeId);
        } finally {
          await getCurrentWindow().destroy();
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
            />
          )
        }
      />
      <Route
        path="/login"
        element={
          currentEmployee ? (
            <Navigate to="/dashboard" />
          ) : !adminExists ? (
            <Navigate to="/setup" />
          ) : (
            <Login onLogin={setCurrentEmployee} />
          )
        }
      />
      <Route
        path="/dashboard/*"
        element={
          currentEmployee ? (
            <Dashboard employee={currentEmployee} onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="*" element={<Navigate to={adminExists ? '/login' : '/setup'} />} />
    </Routes>
  );
}
