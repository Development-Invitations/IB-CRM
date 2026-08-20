import { useState, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Home as HomeIcon, Contact, FileText, LogOut } from 'lucide-react';
import { FullscreenContext } from './Dashboard';
import Modal from '../components/Modal';
import UpdatesButton from '../components/UpdatesButton';
import ClientsPage from './Clients';
import PartnerRegulationsPage from './PartnerRegulations';
import PartnerHome from './PartnerHome';
import type { Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { APP_VERSION } from '../lib/changelog';

// Панель партнёра (v0.3.0) — настоящий роутинг + сайдбар в стиле основной
// CRM (см. Dashboard.tsx — те же классы .sidebar/.brand/nav a/.footer/
// .ghost-btn), вместо прежней заглушки на одну карточку (v0.2.8-0.2.9, см.
// docs/TZ.md). Возможности партнёра ограничены явно: свои клиенты
// (ClientsPage со scopedPartnerId), свои регламенты с админом
// (PartnerRegulationsPage), и своя "Главная" со сменой пароля. Чат убран
// отсюда полностью — его роль теперь берут на себя регламенты партнёра, см.
// журнал v0.3.0. Свой FullscreenContext.Provider нужен, т.к. регламенты
// партнёра используют его через useContext, как и обычные регламенты/блог.
// Topbar.tsx по-прежнему НЕ импортируем — он завязан на Dashboard-специфичные
// вещи (кабинет-ссылку, колокольчик с модалками рассмотрения заявок,
// Настройки), которых у партнёра нет.
export default function PartnerPanel({ employee, onLogout }: { employee: Employee; onLogout: () => void }) {
  const { t } = useLocale();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const enter = useCallback(() => setIsFullscreen(true), []);
  const exit = useCallback(() => setIsFullscreen(false), []);

  const partnerId = employee.partnerId ?? '';

  const modules = [
    { label: t('partnerPanel.navHome'), icon: HomeIcon, path: '' },
    { label: t('sidebar.clients'), icon: Contact, path: 'clients' },
    { label: t('partnerPanel.navRegulations'), icon: FileText, path: 'regulations' },
  ];

  return (
    <FullscreenContext.Provider value={{ isFullscreen, enter, exit }}>
      <div className={`app-shell${isFullscreen ? ' app-shell-fullscreen' : ''}`}>
        <aside className="sidebar">
          <div className="brand">IB CRM</div>
          <nav>
            {modules.map((m) => (
              <NavLink key={m.label} to={m.path} end={m.path === ''} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <m.icon size={16} className="nav-icon" />
                {m.label}
              </NavLink>
            ))}
          </nav>
          <div className="footer">
            <div>{employee.fullName || employee.login}</div>
            <div>{employee.partnerName ?? ''}</div>
            <div className="app-version">IB CRM v{APP_VERSION}</div>
            <UpdatesButton />
            <button className="ghost-btn" onClick={() => setLogoutConfirmOpen(true)}>
              <LogOut size={16} /> {t('sidebar.logout')}
            </button>
          </div>
        </aside>

        <div className="main-area">
          <main className="content">
            <Routes>
              <Route index element={<PartnerHome employee={employee} />} />
              <Route path="clients" element={<ClientsPage currentEmployee={employee} scopedPartnerId={partnerId} />} />
              <Route path="regulations" element={<PartnerRegulationsPage currentEmployee={employee} partnerId={partnerId} />} />
            </Routes>
          </main>
        </div>

        <Modal
          open={logoutConfirmOpen}
          title={t('sidebar.logoutConfirmTitle')}
          onClose={() => setLogoutConfirmOpen(false)}
          actions={
            <>
              <button className="modal-btn" onClick={() => setLogoutConfirmOpen(false)}>
                {t('common.cancel')}
              </button>
              <button className="modal-btn danger" onClick={onLogout}>
                {t('sidebar.logoutConfirmBtn')}
              </button>
            </>
          }
        >
          {t('sidebar.logoutConfirmBody')}
        </Modal>
      </div>
    </FullscreenContext.Provider>
  );
}
