import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Handshake } from 'lucide-react';
import { api, type Partner } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import LoadingScreen from '../components/LoadingScreen';

// Точка входа админа в рабочее пространство конкретного партнёра (его
// клиенты + регламенты) — отдельная кнопка в топбаре (см. Topbar.tsx), не
// вкладка в Employees.tsx: там управляют партнёрскими аккаунтами/учётками,
// здесь — работают с содержимым конкретного партнёра, как это делает он сам
// в своей панели.
export default function AdminPartners() {
  const { t } = useLocale();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.listPartners()
      .then((list) => { setPartners(list); setLoading(false); })
      .catch(() => { setLoading(false); showToast('error', t('common.loadError')); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = search.trim()
    ? partners.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : partners;

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('partners.workspaceTitle')}</h1>
      </div>

      <div className="employees-search-row">
        <Search size={15} className="employees-search-icon" />
        <input className="employees-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('partners.searchPlaceholder')} />
      </div>

      {loading ? (
        <LoadingScreen compact />
      ) : filtered.length === 0 ? (
        <p className="settings-hint">{t('partners.empty')}</p>
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('partners.colName')}</th>
              <th>{t('partners.colAccounts')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="employees-row" onClick={() => navigate(`/dashboard/partners/${p.id}/clients`)}>
                <td><Handshake size={13} style={{ marginRight: 6, opacity: 0.5 }} />{p.name}</td>
                <td>{t('partners.accountsCount', { count: p.accountCount })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
