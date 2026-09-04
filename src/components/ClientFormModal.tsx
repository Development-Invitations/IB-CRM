import { useEffect, useState, FormEvent } from 'react';
import { api, type Client, type Employee, type Partner, type PartnerService, type HouseService } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { formatUzPhone } from '../lib/phone';
import Modal from './Modal';
import Select from './Select';
import ServicePickerModal from './ServicePickerModal';

export default function ClientFormModal({
  open,
  onClose,
  client,
  currentEmployee,
  lockedPartnerId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client?: Client;
  currentEmployee: Employee;
  // undefined — обычная неограниченная страница CRM, выбор партнёра свободный;
  // строка/null — форма открыта в контексте конкретного партнёра (его панель
  // или админский просмотр), селект партнёра скрыт/зафиксирован.
  lockedPartnerId?: string | null;
  onSaved: () => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPosition, setContactPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [services, setServices] = useState<PartnerService[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [houseServices, setHouseServices] = useState<HouseService[]>([]);
  const [houseServiceId, setHouseServiceId] = useState('');
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const showPartnerSelect = !currentEmployee.isPartner && lockedPartnerId === undefined;
  const effectivePartnerId = lockedPartnerId !== undefined ? (lockedPartnerId ?? null) : (partnerId || null);
  // Партнёр создающий/редактирующий своего клиента — всегда каталог "Наши
  // услуги" (общий, v0.7.0). Клиент БЕЗ партнёра (обычный клиент CRM) —
  // тоже всегда "Наши услуги" (v1.5.0: раньше без партнёра каталога вообще
  // не показывалось, только свободный "Стоимость" — хотя backend никогда не
  // требовал партнёра для house_service_id, это было чисто фронтендное
  // ограничение). Каталог конкретного партнёра (service_id) — только когда
  // админ работает с клиентом партнёра, КРОМЕ случая, когда открыт на
  // редактирование уже существующий клиент, у которого стоит houseServiceId
  // (без serviceId) — тогда сохраняем "родной" каталог, чтобы не потерять
  // привязку услуги при правке админом прочих полей.
  const catalogIsHouse = currentEmployee.isPartner || !effectivePartnerId || (!!client?.houseServiceId && !client?.serviceId);

  useEffect(() => {
    if (!showPartnerSelect) return;
    api.listPartners().then(setPartners).catch(() => {});
  }, [showPartnerSelect]);

  useEffect(() => {
    // Общий справочник, не зависит от партнёра — грузим всегда, каталог
    // "Наши услуги" теперь доступен любому клиенту (см. catalogIsHouse выше).
    api.listHouseServices({ actorId: currentEmployee.id }).then(setHouseServices).catch(() => setHouseServices([]));
  }, [currentEmployee.id]);

  useEffect(() => {
    if (catalogIsHouse || !effectivePartnerId) {
      setServices([]);
      return;
    }
    api.listPartnerServices({ actorId: currentEmployee.id, partnerId: effectivePartnerId }).then(setServices).catch(() => setServices([]));
  }, [catalogIsHouse, effectivePartnerId, currentEmployee.id]);

  useEffect(() => {
    if (!open) return;
    setName(client?.name ?? '');
    setContactPerson(client?.contactPerson ?? '');
    setContactPosition(client?.contactPosition ?? '');
    setPhone(client?.phone ?? '');
    setEmail(client?.email ?? '');
    setAddress(client?.address ?? '');
    setNotes(client?.notes ?? '');
    setDealValue(client?.dealValue ?? '');
    setServiceId(client?.serviceId ?? '');
    setHouseServiceId(client?.houseServiceId ?? '');
    setPartnerId(lockedPartnerId !== undefined ? (lockedPartnerId ?? '') : (client?.partnerId ?? ''));
    setError('');
  }, [open, client, lockedPartnerId]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!name.trim()) {
      setError(t('clients.errorRequired'));
      return;
    }
    setBusy(true);
    try {
      const shared = {
        name: name.trim(),
        contactPerson: contactPerson.trim() || null,
        contactPosition: contactPosition.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        partnerId: lockedPartnerId !== undefined ? lockedPartnerId : (partnerId || null),
        dealValue: catalogIsHouse ? (houseServiceId ? null : (dealValue.trim() || null)) : null,
        serviceId: !catalogIsHouse && effectivePartnerId ? (serviceId || null) : null,
        houseServiceId: catalogIsHouse ? (houseServiceId || null) : null,
      };
      if (client) {
        await api.updateClient({ actorId: currentEmployee.id, id: client.id, ...shared });
        showToast('success', t('clients.updated'));
      } else {
        await api.createClient({ actorId: currentEmployee.id, ...shared });
        showToast('success', t('clients.added'));
      }
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
      title={client ? t('clients.editTitle') : t('clients.addTitle')}
      onClose={onClose}
      actions={
        <>
          <button className="modal-btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="modal-btn danger" onClick={() => handleSubmit()} disabled={busy}>
            {busy ? t('employees.savingBusy') : client ? t('employees.saveConfirm') : t('employees.addConfirm')}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <div className="error-text">{error}</div>}

        <div className="field">
          <label>{t('clients.nameLabel')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('clients.namePlaceholder')} />
        </div>

        <div className="absence-form-dates">
          <div className="field">
            <label>{t('clients.contactPersonLabel')}</label>
            <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder={t('clients.contactPersonPlaceholder')} />
          </div>
          <div className="field">
            <label>{t('clients.contactPositionLabel')}</label>
            <input value={contactPosition} onChange={(e) => setContactPosition(e.target.value)} placeholder={t('clients.contactPositionPlaceholder')} />
          </div>
        </div>

        <div className="field">
          <label>{t('employees.phoneLabel')}</label>
          <input value={phone} onChange={(e) => setPhone(formatUzPhone(e.target.value))} placeholder="+998 90 123 45 67" />
        </div>

        <div className="field">
          <label>{t('clients.emailLabel')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
        </div>

        <div className="field">
          <label>{t('clients.addressLabel')}</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="field">
          <label>{t('clients.notesLabel')}</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('clients.notesPlaceholder')} />
        </div>

        <div className="field">
          <label>{t('clients.serviceLabel')}</label>
          <button type="button" className="modal-btn" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => setServicePickerOpen(true)}>
            {(catalogIsHouse ? houseServices.find((s) => s.id === houseServiceId) : services.find((s) => s.id === serviceId))?.name ?? t('clients.serviceNotSelected')}
          </button>
        </div>
        <ServicePickerModal
          open={servicePickerOpen}
          onClose={() => setServicePickerOpen(false)}
          services={catalogIsHouse ? houseServices : services}
          value={catalogIsHouse ? houseServiceId : serviceId}
          onSelect={(id) => {
            if (catalogIsHouse) setHouseServiceId(id); else setServiceId(id);
            setServicePickerOpen(false);
          }}
        />

        {catalogIsHouse && !houseServiceId && (
          <div className="field">
            <label>{t('clients.dealValueLabel')}</label>
            <input value={dealValue} onChange={(e) => setDealValue(e.target.value)} placeholder={t('clients.dealValuePlaceholder')} />
          </div>
        )}

        {showPartnerSelect && (
          <div className="field">
            <label>{t('clients.partnerLabel')}</label>
            <Select
              value={partnerId}
              options={[{ value: '', label: t('clients.originCrm') }, ...partners.map((p) => ({ value: p.id, label: p.name }))]}
              onChange={setPartnerId}
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
