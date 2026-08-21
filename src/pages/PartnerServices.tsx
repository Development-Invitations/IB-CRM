import { useEffect, useState, FormEvent } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, type Employee, type PartnerService } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Modal from '../components/Modal';
import LoadingScreen from '../components/LoadingScreen';

// Каталог услуг партнёра (v0.4.0) — общий, редактируется и партнёром (в
// своей панели), и админом (в AdminPartnerWorkspace, та же страница). Выбор
// услуги при создании клиента заменяет свободный ввод "Стоимости" — цена
// подставляется сервером из price этой услуги (см. ClientFormModal.tsx).
export default function PartnerServices({ currentEmployee, partnerId }: { currentEmployee: Employee; partnerId: string }) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [services, setServices] = useState<PartnerService[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PartnerService | undefined>(undefined);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [rewardPercent, setRewardPercent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PartnerService | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.listPartnerServices({ actorId: currentEmployee.id, partnerId })
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
  }, [partnerId]);

  const openCreate = () => {
    setEditing(undefined);
    setName('');
    setDescription('');
    setPrice('');
    setRewardPercent('');
    setError('');
    setFormOpen(true);
  };

  const openEdit = (s: PartnerService) => {
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
      setError(t('partnerServices.errorRequired'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const shared = { name: name.trim(), description: description.trim() || null, price: price.trim() || null, rewardPercent: rewardPercent.trim() || null };
      if (editing) {
        await api.updatePartnerService({ actorId: currentEmployee.id, id: editing.id, ...shared });
        showToast('success', t('partnerServices.updated'));
      } else {
        await api.createPartnerService({ actorId: currentEmployee.id, partnerId, ...shared });
        showToast('success', t('partnerServices.added'));
      }
      setFormOpen(false);
      load();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : t('partnerServices.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.deletePartnerService({ actorId: currentEmployee.id, id: deleteTarget.id });
      showToast('success', t('partnerServices.deleted'));
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('partnerServices.errorGeneric'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('partnerServices.title')}</h1>
        <button className="primary employees-add-btn" onClick={openCreate}>
          <Plus size={16} /> {t('partnerServices.addBtn')}
        </button>
      </div>

      {loading ? (
        <LoadingScreen compact />
      ) : services.length === 0 ? (
        <p className="settings-hint">{t('partnerServices.empty')}</p>
      ) : (
        <table className="employees-table">
          <thead>
            <tr>
              <th>{t('partnerServices.colName')}</th>
              <th>{t('partnerServices.colPrice')}</th>
              <th>{t('partnerServices.colReward')}</th>
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
                <td>{s.price || '—'}</td>
                <td>{s.rewardPercent || '—'}</td>
                <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" onClick={() => openEdit(s)} aria-label={t('employees.editBtn')}>
                    <Pencil size={14} />
                  </button>
                  <button className="icon-btn" onClick={() => setDeleteTarget(s)} aria-label={t('partnerServices.deleteBtn')}>
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
        title={editing ? t('partnerServices.editTitle') : t('partnerServices.addTitle')}
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
            <label>{t('partnerServices.nameLabel')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('partnerServices.namePlaceholder')} />
          </div>
          <div className="field">
            <label>{t('partnerServices.descriptionLabel')}</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('partnerServices.descriptionPlaceholder')} />
          </div>
          <div className="field">
            <label>{t('partnerServices.priceLabel')}</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('partnerServices.pricePlaceholder')} />
          </div>
          <div className="field">
            <label>{t('partnerServices.rewardPercentLabel')}</label>
            <input value={rewardPercent} onChange={(e) => setRewardPercent(e.target.value)} placeholder={t('partnerServices.rewardPercentPlaceholder')} />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title={t('partnerServices.deleteConfirmTitle')}
        onClose={() => setDeleteTarget(null)}
        actions={
          <>
            <button className="modal-btn" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </button>
            <button className="modal-btn danger" onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? t('employees.savingBusy') : t('partnerServices.deleteBtn')}
            </button>
          </>
        }
      >
        <p>{t('partnerServices.deleteConfirmBody')}</p>
      </Modal>
    </div>
  );
}
