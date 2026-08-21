import { useEffect, useState } from 'react';
import { Contact, FileText } from 'lucide-react';
import { api, type Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';

// Главная страница панели партнёра (v0.4.0) — лёгкое приветствие с базовыми
// счётчиками; смена пароля переехала в Настройки (PartnerSettings.tsx),
// доступные теперь через иконку в топбаре, как и у сотрудников.
export default function PartnerHome({ employee, partnerId }: { employee: Employee; partnerId: string }) {
  const { t } = useLocale();
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [openRegCount, setOpenRegCount] = useState<number | null>(null);

  useEffect(() => {
    api.listClients({ actorId: employee.id, partnerId }).then((list) => setClientCount(list.length)).catch(() => {});
    api.listPartnerRegulations({ actorId: employee.id, partnerId })
      .then((list) => setOpenRegCount(list.filter((r) => r.status === 'active').length))
      .catch(() => {});
  }, [employee.id, partnerId]);

  return (
    <div className="settings-page">
      <h1>{t('partnerPanel.title', { name: employee.fullName || employee.login })}</h1>
      <p className="settings-hint">{t('partnerPanel.homeSubtitle')}</p>

      <div className="home-stats-row">
        <div className="home-stat-tile">
          <Contact size={20} className="home-stat-icon" />
          <div className="home-stat-value">{clientCount ?? '—'}</div>
          <div className="home-stat-label">{t('sidebar.clients')}</div>
        </div>
        <div className="home-stat-tile">
          <FileText size={20} className="home-stat-icon" />
          <div className="home-stat-value">{openRegCount ?? '—'}</div>
          <div className="home-stat-label">{t('partnerPanel.openRegulationsLabel')}</div>
        </div>
      </div>
    </div>
  );
}
