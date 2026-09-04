import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useLocale } from '../lib/i18n';
import { formatThousands } from '../lib/format';
import Modal from './Modal';

type PickableService = {
  id: string;
  name: string;
  code: string | null;
  price: string | null;
  description: string | null;
};

// Общая модалка выбора услуги (v1.9.6) — раньше в ClientFormModal и
// AddClientServiceModal услуга выбиралась обычным <Select> (плоский список
// названий, без поиска и без возможности прочитать описание перед выбором) —
// по просьбе пользователя вынесено в отдельный переиспользуемый компонент с
// тем же поиском по названию/коду и просмотром описания, что уже есть на
// странице "Наши услуги" (HouseServices.tsx). Работает и с "Наши услуги", и
// с каталогом партнёра — оба имеют одинаковую форму полей.
export default function ServicePickerModal({
  open,
  onClose,
  services,
  value,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  services: PickableService[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setExpandedId(null);
    }
  }, [open]);

  const filtered = search.trim()
    ? services.filter((s) => {
        const q = search.trim().toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.code ?? '').toLowerCase().includes(q);
      })
    : services;

  return (
    <Modal open={open} title={t('servicePicker.title')} onClose={onClose} size="lg">
      <div className="employees-search-row" style={{ marginBottom: 12 }}>
        <Search size={15} className="employees-search-icon" />
        <input
          className="employees-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('houseServices.searchPlaceholder')}
          autoFocus
        />
      </div>

      <ul className="client-history-list" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        <li
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={() => onSelect('')}
        >
          <span className={!value ? 'settings-hint' : undefined}>{t('clients.serviceNotSelected')}</span>
        </li>
        {filtered.length === 0 ? (
          <li className="settings-hint">{t('houseServices.searchEmpty')}</li>
        ) : (
          filtered.map((s) => {
            const isExpanded = expandedId === s.id;
            const isSelected = value === s.id;
            return (
              <li key={s.id} style={{ cursor: 'pointer', background: isSelected ? 'var(--color-accent-soft, var(--color-surface-2))' : undefined }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                >
                  <div>
                    <div>{s.name}</div>
                    {s.code && <div className="settings-hint">{t('houseServices.codeLabel')}: {s.code}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                    {s.price && <span className="settings-hint">{formatThousands(s.price)} сум</span>}
                    <button type="button" className="modal-btn" onClick={(e) => { e.stopPropagation(); onSelect(s.id); }}>
                      {t('servicePicker.selectBtn')}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="settings-hint" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                    {s.description || t('houseServices.noDescription')}
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </Modal>
  );
}
