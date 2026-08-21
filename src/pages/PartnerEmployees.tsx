import { useEffect, useState } from 'react';
import { api, type Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Drawer from '../components/Drawer';
import Avatar from '../components/Avatar';
import LoadingScreen from '../components/LoadingScreen';

// Страница "Сотрудники" в панели партнёра (v0.4.0) — свои коллеги (другие
// аккаунты этого же партнёра) плюс карточка Админа CRM (может быть несколько
// админов — показываем всех, см. list_admin_employees в db.rs). Только для
// чтения: список аккаунтов партнёра админ по-прежнему ведёт со своей стороны
// (Employees.tsx → вкладка "Партнёры").
export default function PartnerEmployees({ currentEmployee, partnerId }: { currentEmployee: Employee; partnerId: string }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [colleagues, setColleagues] = useState<Employee[]>([]);
  const [admins, setAdmins] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Employee | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.listPartnerOrgEmployees({ actorId: currentEmployee.id, partnerId }),
      api.listAdminEmployees(),
    ])
      .then(([cols, adm]) => {
        setColleagues(cols);
        setAdmins(adm);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        showToast('error', t('common.loadError'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployee.id, partnerId]);

  const renderRow = (e: Employee) => (
    <tr key={e.id} className="employees-row" onClick={() => setSelected(e)}>
      <td>
        <Avatar name={e.fullName || e.login} size={28} src={e.avatarData} />
      </td>
      <td>{e.fullName || e.login}</td>
      <td>{e.positionTitle || '—'}</td>
      <td>{e.isAdmin ? t('partnerEmployees.adminBadge') : t('partnerEmployees.partnerBadge')}</td>
    </tr>
  );

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('partnerEmployees.title')}</h1>
      </div>

      {loading ? (
        <LoadingScreen compact />
      ) : (
        <>
          <div className="department-members-title">{t('partnerEmployees.adminsTitle')}</div>
          {admins.length === 0 ? (
            <p className="settings-hint">{t('partnerEmployees.empty')}</p>
          ) : (
            <table className="employees-table">
              <thead>
                <tr>
                  <th />
                  <th>{t('employees.colName')}</th>
                  <th>{t('partnerEmployees.positionLabel')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>{admins.map(renderRow)}</tbody>
            </table>
          )}

          <div className="department-members-title" style={{ marginTop: 24 }}>{t('partnerEmployees.colleaguesTitle')}</div>
          {colleagues.length === 0 ? (
            <p className="settings-hint">{t('partnerEmployees.empty')}</p>
          ) : (
            <table className="employees-table">
              <thead>
                <tr>
                  <th />
                  <th>{t('employees.colName')}</th>
                  <th>{t('partnerEmployees.positionLabel')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>{colleagues.map(renderRow)}</tbody>
            </table>
          )}
        </>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={t('partnerEmployees.cardTitle')}>
        {selected && (
          <div className="employee-card">
            <div className="employee-card-head">
              <Avatar name={selected.fullName || selected.login} size={48} src={selected.avatarData} />
              <div>
                <div className="employee-card-name">{selected.fullName || selected.login}</div>
                <div className="settings-hint">{selected.isAdmin ? t('partnerEmployees.adminBadge') : t('partnerEmployees.partnerBadge')}</div>
              </div>
            </div>

            <div className="employee-card-row">
              <span className="settings-hint">{t('partnerEmployees.positionLabel')}</span>
              <span>{selected.positionTitle || '—'}</span>
            </div>
            <div className="employee-card-row">
              <span className="settings-hint">{t('employees.phoneLabel')}</span>
              <span>{selected.phone || '—'}</span>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
