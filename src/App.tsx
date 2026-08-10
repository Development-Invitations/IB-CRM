import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import FirstRunSetup from './pages/FirstRunSetup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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
    } else {
      session.clear();
    }
  };

  useEffect(() => {
    api.hasAdmin().then((res) => {
      setAdminExists(res);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading-screen">{t('common.loading')}</div>;

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
            <Dashboard employee={currentEmployee} onLogout={() => setCurrentEmployee(null)} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="*" element={<Navigate to={adminExists ? '/login' : '/setup'} />} />
    </Routes>
  );
}
