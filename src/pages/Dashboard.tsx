import { useState, createContext, useContext, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';

// Контекст для полноэкранного режима — регламенты и проекты скрывают sidebar/topbar
export const FullscreenContext = createContext<{
  isFullscreen: boolean;
  enter: () => void;
  exit: () => void;
}>({ isFullscreen: false, enter: () => {}, exit: () => {} });
import {
  LayoutDashboard,
  Users,
  Building2,
  Contact,
  FolderKanban,
  FileText,
  MessageSquare,
  Cake,
  LogOut,
  ClipboardList,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Modal from '../components/Modal';
import UpdatesButton from '../components/UpdatesButton';
import UpdateNotifier from '../components/UpdateNotifier';
import Home from './Home';
import SettingsPage from './Settings';
import EmployeesPage from './Employees';
import EmployeeProfile from './EmployeeProfile';
import DepartmentsPage from './Departments';
import AbsenceRequestsPage from './AbsenceRequests';
import ClientsPage from './Clients';
import ProjectsPage from './Projects';
import RegulationsPage from './Regulations';
import BlogPage from './Blog';
import BirthdaysPage from './Birthdays';
import type { Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { APP_VERSION } from '../lib/changelog';

export default function Dashboard({ employee, onLogout }: { employee: Employee; onLogout: () => void }) {
  const { t } = useLocale();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const enter = useCallback(() => setIsFullscreen(true), []);
  const exit = useCallback(() => setIsFullscreen(false), []);

  const modules = [
    { label: t('sidebar.employees'), icon: Users, path: 'employees' },
    { label: t('sidebar.departments'), icon: Building2, path: 'departments' },
    { label: t('sidebar.clients'), icon: Contact, path: 'clients' },
    { label: t('sidebar.projects'), icon: FolderKanban, path: 'projects' },
    { label: t('sidebar.regulations'), icon: FileText, path: 'regulations' },
    { label: t('sidebar.blog'), icon: MessageSquare, path: 'blog' },
    { label: t('sidebar.birthdays'), icon: Cake, path: 'birthdays' },
  ];

  return (
    <FullscreenContext.Provider value={{ isFullscreen, enter, exit }}>
    <div className={`app-shell${isFullscreen ? ' app-shell-fullscreen' : ''}`}>
      <aside className="sidebar">
        <div className="brand">IB CRM</div>
        <nav>
          <NavLink to="." end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={16} className="nav-icon" />
            {t('sidebar.home')}
          </NavLink>
          {modules.map((m) =>
            m.path ? (
              <NavLink key={m.label} to={m.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <m.icon size={16} className="nav-icon" />
                {m.label}
              </NavLink>
            ) : (
              <span className="nav-disabled" key={m.label}>
                <m.icon size={16} className="nav-icon" />
                {m.label}
                <span className="badge-soon">{t('sidebar.soon')}</span>
              </span>
            )
          )}
          <NavLink to="absence-requests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ClipboardList size={16} className="nav-icon" />
            {t('sidebar.absenceRequests')}
          </NavLink>
        </nav>
        <div className="footer">
          <div>{employee.fullName || employee.login}</div>
          <div>
            {employee.employeeNumber}
            {employee.isAdmin ? ` · ${t('sidebar.admin')}` : ''}
          </div>
          <div className="app-version">IB CRM v{APP_VERSION}</div>
          <UpdatesButton />
          <button className="ghost-btn" onClick={() => setLogoutConfirmOpen(true)}>
            <LogOut size={16} /> {t('sidebar.logout')}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <Topbar employee={employee} />
        <main className="content">
          <Routes>
            <Route index element={<Home employee={employee} />} />
            <Route path="employees" element={<EmployeesPage currentEmployee={employee} />} />
            <Route path="employees/:id" element={<EmployeeProfile currentEmployee={employee} />} />
            <Route path="departments" element={<DepartmentsPage currentEmployee={employee} />} />
            <Route path="clients" element={<ClientsPage currentEmployee={employee} />} />
            <Route path="projects" element={<ProjectsPage currentEmployee={employee} />} />
            <Route path="regulations" element={<RegulationsPage currentEmployee={employee} />} />
            <Route path="blog" element={<BlogPage currentEmployee={employee} />} />
            <Route path="birthdays" element={<BirthdaysPage />} />
            <Route path="absence-requests" element={<AbsenceRequestsPage currentEmployee={employee} />} />
            <Route path="settings" element={<SettingsPage employee={employee} />} />
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

      <UpdateNotifier />
    </div>
    </FullscreenContext.Provider>
  );
}
