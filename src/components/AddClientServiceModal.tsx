import { useEffect, useState } from 'react';
import { api, type Client, type Employee, type PartnerService, type HouseService } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Modal from './Modal';
import Select from './Select';

// Добавление ЕЩЁ ОДНОЙ услуги уже существующему клиенту (v1.5.0) — в отличие
// от ClientFormModal (первая/текущая услуга клиента), эта модалка только
// пополняет историю (client_services), см. Clients.tsx::handleAddServiceSaved.
// Выбор каталога зеркалит ClientFormModal: "Наши услуги" всегда доступны,
// каталог конкретного партнёра — только если у клиента есть партнёр.
export default function AddClientServiceModal({
  open,
  onClose,
  client,
  currentEmployee,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client: Client;
  currentEmployee: Employee;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [houseServices, setHouseServices] = useState<HouseService[]>([]);
  const [houseServiceId, setHouseServiceId] = useState('');
  const [services, setServices] = useState<PartnerService[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [catalogIsHouse, setCatalogIsHouse] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    api.listHouseServices({ actorId: currentEmployee.id }).then(setHouseServices).catch(() => setHouseServices([]));
    if (client.partnerId) {
      api.listPartnerServices({ actorId: currentEmployee.id, partnerId: client.partnerId }).then(setServices).catch(() => setServices([]));
    } else {
      setServices([]);
    }
    setHouseServiceId('');
    setServiceId('');
    setCatalogIsHouse(true);
    setError('');
  }, [open, client.id, client.partnerId, currentEmployee.id]);

  const handleSubmit = async () => {
    setError('');
    if (catalogIsHouse ? !houseServiceId : !serviceId) {
      setError(t('clients.errorServiceRequired'));
      return;
    }
    setBusy(true);
    try {
      await api.addClientService({
        actorId: currentEmployee.id,
        clientId: client.id,
        houseServiceId: catalogIsHouse ? houseServiceId : null,
        serviceId: catalogIsHouse ? null : serviceId,
      });
      showToast('success', t('clients.serviceAdded'));
      onSaved();
      onClose();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : t('clients.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('clients.addServiceModalTitle')}
      onClose={onClose}
      actions={
        <>
          <button className="modal-btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="modal-btn danger" onClick={handleSubmit} disabled={busy}>
            {busy ? t('employees.savingBusy') : t('employees.addConfirm')}
          </button>
        </>
      }
    >
      {error && <div className="error-text">{error}</div>}

      {client.partnerId && (
        <div className="field">
          <label>{t('clients.serviceCatalogLabel')}</label>
          <Select
            value={catalogIsHouse ? 'house' : 'partner'}
            options={[
              { value: 'house', label: t('houseServices.navLabel') },
              { value: 'partner', label: t('partnerServices.title') },
            ]}
            onChange={(v) => setCatalogIsHouse(v === 'house')}
          />
        </div>
      )}

      <div className="field">
        <label>{t('clients.serviceLabel')}</label>
        <Select
          value={catalogIsHouse ? houseServiceId : serviceId}
          options={[
            { value: '', label: t('clients.serviceNotSelected') },
            ...(catalogIsHouse ? houseServices : services).map((s) => ({ value: s.id, label: s.name })),
          ]}
          onChange={catalogIsHouse ? setHouseServiceId : setServiceId}
        />
      </div>
    </Modal>
  );
}
