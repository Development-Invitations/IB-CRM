import { useEffect, useState } from 'react';
import { Cake, PartyPopper } from 'lucide-react';
import { api, type Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Avatar from '../components/Avatar';
import LoadingScreen from '../components/LoadingScreen';

const MONTH_KEYS = [
  'birthdays.month1', 'birthdays.month2', 'birthdays.month3', 'birthdays.month4',
  'birthdays.month5', 'birthdays.month6', 'birthdays.month7', 'birthdays.month8',
  'birthdays.month9', 'birthdays.month10', 'birthdays.month11', 'birthdays.month12',
];

const CONGRATS_KEYS = ['birthdays.congrats1', 'birthdays.congrats2', 'birthdays.congrats3', 'birthdays.congrats4', 'birthdays.congrats5'];

// Детерминированный выбор поздравления по id сотрудника — чтобы текст не
// прыгал при каждом ре-рендере, но и не был одинаковым у всех.
function congratsKeyFor(employeeId: string): string {
  let hash = 0;
  for (let i = 0; i < employeeId.length; i++) hash = (hash * 31 + employeeId.charCodeAt(i)) >>> 0;
  return CONGRATS_KEYS[hash % CONGRATS_KEYS.length];
}

type UpcomingBirthday = {
  employee: Employee;
  day: number;
  month: number; // 1-12
  turningAge: number;
  daysUntil: number;
};

function computeUpcoming(employees: Employee[]): UpcomingBirthday[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const list: UpcomingBirthday[] = [];

  for (const employee of employees) {
    // Заблокированный сотрудник нигде не должен "светиться" для остальных —
    // включая календарь дней рождений (пользователь: "если заблокирован то
    // нигде его быть не должно в Календаре").
    if (employee.isBlocked) continue;
    if (!employee.birthDate) continue;
    const [birthYear, month, day] = employee.birthDate.split('-').map(Number);
    if (!birthYear || !month || !day) continue;

    let next = new Date(today.getFullYear(), month - 1, day);
    next.setHours(0, 0, 0, 0);
    if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);

    const daysUntil = Math.round((next.getTime() - today.getTime()) / 86400000);
    list.push({ employee, day, month, turningAge: next.getFullYear() - birthYear, daysUntil });
  }

  return list.sort((a, b) => a.daysUntil - b.daysUntil);
}

export default function Birthdays() {
  const { t } = useLocale();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listEmployees().then((list) => {
      setEmployees(list);
      setLoading(false);
    });
  }, []);

  const upcoming = computeUpcoming(employees);
  const today = upcoming.filter((u) => u.daysUntil === 0);
  const rest = upcoming.filter((u) => u.daysUntil > 0);

  let lastMonth = -1;

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('sidebar.birthdays')}</h1>
      </div>

      {loading ? (
        <LoadingScreen compact />
      ) : upcoming.length === 0 ? (
        <p className="settings-hint">{t('birthdays.empty')}</p>
      ) : (
        <div className="birthdays-list">
          {today.length > 0 && (
            <div className="birthdays-today-section">
              <div className="birthdays-today-title"><PartyPopper size={16} /> {t('birthdays.todayTitle')}</div>
              {today.map((u) => (
                <div key={u.employee.id} className="birthdays-today-card">
                  <Avatar name={u.employee.fullName || u.employee.login} size={48} src={u.employee.avatarData} />
                  <div className="birthdays-today-card-info">
                    <strong>{u.employee.fullName || u.employee.login}</strong>
                    <span className="settings-hint">{t('birthdays.turningAge', { age: u.turningAge })}</span>
                    <p className="birthdays-congrats">{t(congratsKeyFor(u.employee.id))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rest.map((u) => {
            const showMonthHeader = u.month !== lastMonth;
            lastMonth = u.month;
            return (
              <div key={u.employee.id}>
                {showMonthHeader && <div className="birthdays-month-header">{t(MONTH_KEYS[u.month - 1])}</div>}
                <div className="birthdays-row">
                  <Avatar name={u.employee.fullName || u.employee.login} size={40} src={u.employee.avatarData} />
                  <div className="birthdays-row-info">
                    <strong>{u.employee.fullName || u.employee.login}</strong>
                    <span className="settings-hint">
                      {u.employee.positionTitle || u.employee.departmentName || ''}
                    </span>
                  </div>
                  <div className="birthdays-row-date">
                    <span className="birthdays-day">{u.day}</span>
                    <span className="settings-hint">{t('birthdays.turningAge', { age: u.turningAge })}</span>
                  </div>
                  <span className="birthdays-days-until">
                    <Cake size={12} />
                    {u.daysUntil === 1 ? t('birthdays.tomorrow') : t('birthdays.inDays', { days: u.daysUntil })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
