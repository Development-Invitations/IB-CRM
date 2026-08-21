import { useState, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Contact, FileText, Users, Briefcase, LogOut } from 'lucide-react';
import { FullscreenContext } from './Dashboard';
import Modal from '../components/Modal';
import UpdatesButton from '../components/UpdatesButton';
import PartnerTopbar from '../components/PartnerTopbar';
import ClientsPage from './Clients';
import PartnerRegulationsPage from './PartnerRegulations';
import PartnerServicesPage from './PartnerServices';
import PartnerEmployeesPage from './PartnerEmployees';
import PartnerSettingsPage from './PartnerSettings';
import PartnerHome from './PartnerHome';
import ChatPage from './Chat';
import type { Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { APP_VERSION } from '../lib/changelog';

// Панель партнёра (v0.3.0, расширена в v0.4.0) — настоящий роутинг + сайдбар
// в стиле основной CRM (см. Dashboard.tsx — те же классы .sidebar/.brand/
// nav a/.footer/.ghost-btn). С v0.4.0 добавлен топбар (PartnerTopbar.tsx —
// Чат/Главная/Уведомления/Настройки, зеркалит основной Topbar.tsx) — "Главная"
// поэтому убрана из сайдбара, доступна только через иконку в топбаре, как и
// в основной CRM. IB Чат переиспользуется как есть (Chat.tsx уже
// самоконфигурируется для is_partner-сотрудников). Свой FullscreenContext.
// Provider нужен, т.к. регламенты партнёра и чат используют его через
// useContext, как и обычные регламенты/блог/чат в Dashboard.
export default function PartnerPanel({ employee, onLogout }: { employee: Employee; onLogout: () => void }) {
  const { t } = useLocale();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const enter = useCallback(() => setIsFullscreen(true), []);
  const exit = useCallback(() => setIsFullscreen(false), []);

  const partnerId = employee.partnerId ?? '';

  const modules = [
    { label: t('sidebar.clients'), icon: Contact, path: 'clients' },
    { label: t('partnerPanel.navRegulations'), icon: FileText, path: 'regulations' },
    { label: t('partnerPanel.navEmployees'), icon: Users, path: 'employees' },
    { label: t('partnerPanel.navServices'), icon: Briefcase, path: 'services' },
  ];

  return (
    <FullscreenContext.Provider value={{ isFullscreen, enter, exit }}>
      <div className={`app-shell${isFullscreen ? ' app-shell-fullscreen' : ''}`}>
        <aside className="sidebar">
          <div className="brand">IB CRM</div>
          <nav>
            {modules.map((m) => (
              <NavLink key={m.label} to={m.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
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
          <PartnerTopbar employee={employee} />
          <main className="content">
            <Routes>
              <Route index element={<PartnerHome employee={employee} partnerId={partnerId} />} />
              <Route path="clients" element={<ClientsPage currentEmployee={employee} scopedPartnerId={partnerId} />} />
              <Route path="regulations" element={<PartnerRegulationsPage currentEmployee={employee} partnerId={partnerId} />} />
              <Route path="services" element={<PartnerServicesPage currentEmployee={employee} partnerId={partnerId} />} />
              <Route path="employees" element={<PartnerEmployeesPage currentEmployee={employee} partnerId={partnerId} />} />
              <Route path="chat" element={<ChatPage currentEmployee={employee} />} />
              <Route path="settings" element={<PartnerSettingsPage employee={employee} />} />
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
