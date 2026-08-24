import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, type Employee, type HouseService } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Modal from '../components/Modal';
import LoadingScreen from '../components/LoadingScreen';
import { formatThousands, formatPercentInput } from '../lib/format';

// Общий каталог "Наши услуги" (v0.7.0) — в отличие от PartnerServices.tsx, не
// привязан к партнёру: один каталог на всю CRM, ведёт только админ (страница
// доступна только ему — гейт на уровне роута в Dashboard.tsx). Выбирает
// партнёр при создании СВОЕГО клиента (см. ClientFormModal.tsx).
export default function HouseServices({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [services, setServices] = useState<HouseService[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HouseService | undefined>(undefined);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [rewardPercent, setRewardPercent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<HouseService | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.listHouseServices({ actorId: currentEmployee.id })
      .then((list) => {
        setServices(list);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        showToast('error', t('common.loadError'));
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(undefined);
    setName('');
    setDescription('');
    setPrice('');
    setRewardPercent('');
    setError('');
    setFormOpen(true);
  };

  const openEdit = (s: HouseService) => {
    setEditing(s);
    setName(s.name);
    setDescription(s.description ?? '');
    setPrice(s.price ?? '');
    setRewardPercent(s.rewardPercent ?? '');
    setError('');
    setFormOpen(true);
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError(t('houseServices.errorRequired'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const shared = { name: name.trim(), description: description.trim() || null, price: price.trim() || null, rewardPercent: rewardPercent.trim() || null };
      if (editing) {
        await api.updateHouseService({ actorId: currentEmployee.id, id: editing.id, ...shared });
        showToast('success', t('houseServices.updated'));
      } else {
        await api.createHouseService({ actorId: currentEmployee.id, ...shared });
        showToast('success', t('houseServices.added'));
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : t('houseServices.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.deleteHouseService({ actorId: currentEmployee.id, id: deleteTarget.id });
      showToast('success', t('houseServices.deleted'));
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('houseServices.errorGeneric'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('houseServices.title')}</h1>
        <button className="primary employees-add-btn" onClick={openCreate}>
          <Plus size={16} /> {t('houseServices.addBtn')}
        </button>
      </div>

      {loading ? (
        <LoadingScreen compact />
      ) : services.length === 0 ? (
        <p className="settings-hint">{t('houseServices.empty')}</p>
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('houseServices.colName')}</th>
              <th>{t('houseServices.colPrice')}</th>
              <th>{t('houseServices.colReward')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="employees-row">
                <td>
                  <div>{s.name}</div>
                  {s.description && <div className="settings-hint">{s.description}</div>}
                </td>
                <td>{s.price ? `${formatThousands(s.price)} сум` : '—'}</td>
                <td>{s.rewardPercent ? `${s.rewardPercent}%` : '—'}</td>
                <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" onClick={() => openEdit(s)} aria-label={t('employees.editBtn')}>
                    <Pencil size={14} />
                  </button>
                  <button className="icon-btn" onClick={() => setDeleteTarget(s)} aria-label={t('houseServices.deleteBtn')}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        open={formOpen}
        title={editing ? t('houseServices.editTitle') : t('houseServices.addTitle')}
        onClose={() => setFormOpen(false)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setFormOpen(false)}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={() => handleSubmit()} disabled={busy}>
              {busy ? t('employees.savingBusy') : editing ? t('employees.saveConfirm') : t('employees.addConfirm')}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          {error && <div className="error-text">{error}</div>}
          <div className="field">
            <label>{t('houseServices.nameLabel')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('houseServices.namePlaceholder')} />
          </div>
          <div className="field">
            <label>{t('houseServices.descriptionLabel')}</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('houseServices.descriptionPlaceholder')} />
          </div>
          <div className="field">
            <label>{t('houseServices.priceLabel')}</label>
            <input value={price} onChange={(e) => setPrice(formatThousands(e.target.value))} placeholder={t('houseServices.pricePlaceholder')} />
          </div>
          <div className="field">
            <label>{t('houseServices.rewardPercentLabel')}</label>
            <input value={rewardPercent} onChange={(e) => setRewardPercent(formatPercentInput(e.target.value))} placeholder={t('houseServices.rewardPercentPlaceholder')} />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title={t('houseServices.deleteConfirmTitle')}
        onClose={() => setDeleteTarget(null)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? t('employees.savingBusy') : t('houseServices.deleteBtn')}
            </button>
          </>
        }
      >
        <p>{t('houseServices.deleteConfirmBody')}</p>
      </Modal>
    </div>
  );
}
