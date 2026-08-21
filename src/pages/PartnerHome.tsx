import { useEffect, useState } from 'react';
import { Contact, FileText, Wallet } from 'lucide-react';
import { api, type Employee, type PartnerReportRow } from '../lib/api';
import { useLocale } from '../lib/i18n';

// Главная страница панели партнёра (v0.4.0) — лёгкое приветствие с базовыми
// счётчиками; смена пароля переехала в Настройки (PartnerSettings.tsx),
// доступные теперь через иконку в топбаре, как и у сотрудников.
export default function PartnerHome({ employee, partnerId }: { employee: Employee; partnerId: string }) {
  const { t } = useLocale();
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [openRegCount, setOpenRegCount] = useState<number | null>(null);
  const [financialReport, setFinancialReport] = useState<PartnerReportRow | null>(null);

  useEffect(() => {
    api.listClients({ actorId: employee.id, partnerId }).then((list) => setClientCount(list.length)).catch(() => {});
    api.listPartnerRegulations({ actorId: employee.id, partnerId })
      .then((list) => setOpenRegCount(list.filter((r) => r.status === 'active').length))
      .catch(() => {});
    // Накопительная сводка за всё время (не месячная, как в Excel-отчёте) —
    // period не передаём.
    api.getPartnerReport({ actorId: employee.id, partnerId, periodStart: null, periodEnd: null })
      .then((rows) => setFinancialReport(rows[0] ?? null))
      .catch(() => {});
  }, [employee.id, partnerId]);

  return (
    <div className="home-dashboard">
      <div>
        <h1 style={{ margin: '0 0 6px' }}>{t('partnerPanel.title', { name: employee.fullName || employee.login })}</h1>
        <p className="settings-hint" style={{ margin: 0 }}>{t('partnerPanel.homeSubtitle')}</p>
      </div>

      <div className="home-stats-row partner-home-stats-row">
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

      {financialReport && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ margin: '0 0 12px' }}>{t('partnerPanel.financialSummaryTitle')}</h2>
          <div className="home-stats-row partner-home-stats-row">
            <div className="home-stat-tile">
              <Contact size={20} className="home-stat-icon" />
              <div className="home-stat-value">{financialReport.clientsAddedCount}</div>
              <div className="home-stat-label">{t('partnerPanel.financialSummaryClientsAdded')}</div>
            </div>
            <div className="home-stat-tile">
              <FileText size={20} className="home-stat-icon" />
              <div className="home-stat-value">{financialReport.regulationsCount}</div>
              <div className="home-stat-label">{t('partnerPanel.financialSummaryRegulationsWorked')}</div>
            </div>
            <div className="home-stat-tile">
              <Wallet size={20} className="home-stat-icon" />
              <div className="home-stat-value">{financialReport.financialTotal ?? '—'}</div>
              <div className="home-stat-label">{t('partnerPanel.financialSummaryTotal')}</div>
            </div>
          </div>
          {financialReport.financialTotalPartial && (
            <p className="settings-hint" style={{ marginTop: 8 }}>{t('partnerPanel.financialSummaryPartialHint')}</p>
          )}
        </div>
      )}
    </div>
  );
}
