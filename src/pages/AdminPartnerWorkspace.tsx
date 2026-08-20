import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, type Employee, type Partner } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { FullscreenContext } from './Dashboard';
import ClientsPage from './Clients';
import PartnerRegulationsPage from './PartnerRegulations';

// Рабочее пространство конкретного партнёра со стороны админа — те же
// Клиенты/Регламенты, что видит сам партнёр в своей панели, просто в
// контексте основной CRM (с обычным сайдбаром/топбаром вокруг). Доступ
// UX-уровня (кнопка в топбаре видна только админу, см. Topbar.tsx) — реальная
// защита уже на бэкенде через partner_filter/can_access_partner_regulation.
export default function AdminPartnerWorkspace({ employee, tab }: { employee: Employee; tab: 'clients' | 'regulations' }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { partnerId } = useParams<{ partnerId: string }>();
  const [partner, setPartner] = useState<Partner | null>(null);
  const { isFullscreen } = useContext(FullscreenContext);

  useEffect(() => {
    if (!partnerId) return;
    api.listPartners().then((list) => setPartner(list.find((p) => p.id === partnerId) ?? null)).catch(() => {});
  }, [partnerId]);

  if (!partnerId) return null;

  return (
    <div>
      {/* Скрываем шапку/табы в полноэкранном режиме открытого регламента —
          та же логика, что прячет .sidebar/.topbar у Dashboard.tsx (общий
          FullscreenContext), иначе они бы торчали над реgламентом. */}
      {!isFullscreen && (
        <>
          <div className="employees-header">
            <button className="reg-back-btn" onClick={() => navigate('/dashboard/partners')}>
              <ArrowLeft size={16} /> {t('partners.workspaceTitle')}
            </button>
          </div>
          {partner && <h1 style={{ marginTop: 8 }}>{partner.name}</h1>}

          <div className="employees-tabs">
            <button className={`employees-tab-btn${tab === 'clients' ? ' active' : ''}`} onClick={() => navigate(`/dashboard/partners/${partnerId}/clients`)}>
              {t('sidebar.clients')}
            </button>
            <button className={`employees-tab-btn${tab === 'regulations' ? ' active' : ''}`} onClick={() => navigate(`/dashboard/partners/${partnerId}/regulations`)}>
              {t('partnerPanel.navRegulations')}
            </button>
          </div>
        </>
      )}

      {tab === 'clients' ? (
        <ClientsPage currentEmployee={employee} scopedPartnerId={partnerId} regulationsBasePath={`/dashboard/partners/${partnerId}/regulations`} />
      ) : (
        <PartnerRegulationsPage currentEmployee={employee} partnerId={partnerId} basePath={`/dashboard/partners/${partnerId}/regulations`} />
      )}
    </div>
  );
}
