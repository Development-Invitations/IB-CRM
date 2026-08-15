import { LogOut } from 'lucide-react';
import { type Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';

// Панель партнёра — пока заглушка. Что конкретно партнёр должен видеть и
// делать здесь ещё не определено (см. docs/TZ.md, раздел "Партнёры") —
// первый этап был только про создание самих аккаунтов партнёров админом.
export default function PartnerPanel({ employee, onLogout }: { employee: Employee; onLogout: () => void }) {
  const { t } = useLocale();

  return (
    <div className="partner-panel">
      <div className="partner-panel-card">
        <h1>{t('partnerPanel.title', { name: employee.fullName || employee.login })}</h1>
        <p className="settings-hint">{t('partnerPanel.body')}</p>
        <button className="modal-btn" onClick={onLogout}>
          <LogOut size={14} /> {t('sidebar.logout')}
        </button>
      </div>
    </div>
  );
}
