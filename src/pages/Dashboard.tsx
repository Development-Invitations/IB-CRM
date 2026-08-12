import { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import {
  Users,
  Building2,
  Contact,
  FolderKanban,
  FileText,
  MessageSquare,
  Cake,
  Server,
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
import type { Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { APP_VERSION } from '../lib/changelog';

export default function Dashboard({ employee, onLogout }: { employee: Employee; onLogout: () => void }) {
  const { t } = useLocale();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const modules = [
    { label: t('sidebar.employees'), icon: Users, path: 'employees' },
    { label: t('sidebar.departments'), icon: Building2, path: 'departments' },
    { label: t('sidebar.clients'), icon: Contact, path: 'clients' },
    { label: t('sidebar.projects'), icon: FolderKanban, path: 'projects' },
    { label: t('sidebar.regulations'), icon: FileText },
    { label: t('sidebar.blog'), icon: MessageSquare },
    { label: t('sidebar.birthdays'), icon: Cake },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">IB CRM</div>
        <nav>
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
          {employee.isAdmin && (
            <span className="nav-disabled">
              <Server size={16} className="nav-icon" />
              {t('sidebar.serverConnect')}
              <span className="badge-soon">v0.2.0</span>
            </span>
          )}
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
            <Route index element={<Home />} />
            <Route path="employees" element={<EmployeesPage currentEmployee={employee} />} />
            <Route path="employees/:id" element={<EmployeeProfile currentEmployee={employee} />} />
            <Route path="departments" element={<DepartmentsPage currentEmployee={employee} />} />
            <Route path="clients" element={<ClientsPage currentEmployee={employee} />} />
            <Route path="projects" element={<ProjectsPage currentEmployee={employee} />} />
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
  );
}
