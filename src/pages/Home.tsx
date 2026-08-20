import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, FolderKanban, Contact, AlertTriangle, Clock3, ArrowRight } from 'lucide-react';
import { api, type Employee, type MyTask, type MyProjectTask } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';

export default function Home({ employee }: { employee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [activeRegulationCount, setActiveRegulationCount] = useState<number | null>(null);
  const [activeProjectCount, setActiveProjectCount] = useState<number | null>(null);
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [myProjectTasks, setMyProjectTasks] = useState<MyProjectTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.listEmployees(),
      api.listRegulations(),
      api.listProjects(),
      api.listClients({ actorId: employee.id }),
      api.listMyOpenTasks(employee.id),
      api.listMyOpenProjectTasks(employee.id),
    ])
      .then(([employees, regulations, projects, clients, tasks, projectTasks]) => {
        setEmployeeCount(employees.length);
        setActiveRegulationCount(regulations.filter((r) => r.status === 'active').length);
        setActiveProjectCount(projects.filter((p) => p.status === 'active').length);
        setClientCount(clients.length);
        setMyTasks(tasks);
        setMyProjectTasks(projectTasks);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        showToast('error', t('common.loadError'));
      });
  }, [employee.id]);

  const now = Date.now();
  const isOverdue = (deadline: string | null) => !!deadline && new Date(deadline).getTime() < now;
  const isDueSoon = (deadline: string | null) => {
    if (!deadline) return false;
    const diff = (new Date(deadline).getTime() - now) / 86400000;
    return diff >= 0 && diff <= 3;
  };

  const openRegulation = (regulationId: string) => {
    navigate('/dashboard/regulations', { state: { openRegId: regulationId } });
  };

  const openProject = (projectId: string) => {
    navigate('/dashboard/projects', { state: { openProjectId: projectId } });
  };

  // Единый список задач из регламентов и проектов — раньше виджет учитывал
  // только регламенты, хотя у сообщений проекта та же модель
  // target_employee_id/deadline/status. Просроченные и близкие к сроку уже
  // идут первыми — сортировка по дедлайну совпадает в обоих источниках
  // (см. list_my_open_tasks/list_my_open_project_tasks в db.rs), здесь только
  // сливаем и досортировываем объединённый список тем же принципом: без
  // срока — в конец, иначе по возрастанию даты.
  type UnifiedTask = {
    id: string;
    kind: 'regulation' | 'project';
    label: string;
    content: string;
    deadline: string | null;
    openId: string;
  };
  const allTasks: UnifiedTask[] = [
    ...myTasks.map((task) => ({
      id: `reg-${task.entryId}`,
      kind: 'regulation' as const,
      label: `${task.regNumber} · ${task.regulationTitle}`,
      content: task.content,
      deadline: task.deadline,
      openId: task.regulationId,
    })),
    ...myProjectTasks.map((task) => ({
      id: `prj-${task.messageId}`,
      kind: 'project' as const,
      label: `${task.projectNumber} · ${task.projectName}`,
      content: task.content,
      deadline: task.deadline,
      openId: task.projectId,
    })),
  ].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  const stats = [
    { label: t('home.statEmployees'), value: employeeCount, icon: Users, path: 'employees' },
    { label: t('home.statActiveRegulations'), value: activeRegulationCount, icon: FileText, path: 'regulations' },
    { label: t('home.statActiveProjects'), value: activeProjectCount, icon: FolderKanban, path: 'projects' },
    { label: t('home.statClients'), value: clientCount, icon: Contact, path: 'clients' },
  ];

  return (
    <div className="home-dashboard">
      <div className="home-stats-row">
        {stats.map((s) => (
          <button key={s.label} type="button" className="home-stat-tile" onClick={() => navigate(s.path)}>
            <s.icon size={20} className="home-stat-icon" />
            <div className="home-stat-value">{s.value ?? '—'}</div>
            <div className="home-stat-label">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="home-tasks-card">
        <div className="home-tasks-header">
          <h2>
            {t('home.myTasksTitle')} {!loading && <span className="home-tasks-count">{allTasks.length}</span>}
          </h2>
          <button type="button" className="link-btn" onClick={() => navigate('regulations')}>
            {t('home.goToRegulations')} <ArrowRight size={13} />
          </button>
        </div>

        {loading ? (
          <p className="settings-hint">{t('common.loading')}</p>
        ) : allTasks.length === 0 ? (
          <p className="settings-hint">{t('home.myTasksEmpty')}</p>
        ) : (
          <ul className="home-tasks-list">
            {allTasks.slice(0, 6).map((task) => {
              const overdue = isOverdue(task.deadline);
              const dueSoon = !overdue && isDueSoon(task.deadline);
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    className="home-task-row"
                    onClick={() => (task.kind === 'regulation' ? openRegulation(task.openId) : openProject(task.openId))}
                  >
                    <div className="home-task-main">
                      <span className="home-task-reg">{task.label}</span>
                      <span className="home-task-content">{task.content}</span>
                    </div>
                    {task.deadline && (
                      <span
                        className={`home-task-deadline${overdue ? ' overdue' : dueSoon ? ' due-soon' : ''}`}
                        title={overdue ? t('regulations.overdueHint') : dueSoon ? t('regulations.dueSoonHint') : undefined}
                      >
                        {overdue ? <AlertTriangle size={12} /> : <Clock3 size={12} />} {task.deadline}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {allTasks.length > 6 && (
          <p className="settings-hint home-tasks-more">{t('home.myTasksMore', { count: allTasks.length - 6 })}</p>
        )}
      </div>
    </div>
  );
}
