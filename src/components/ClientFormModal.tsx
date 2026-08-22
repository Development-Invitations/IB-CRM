import { useEffect, useState, FormEvent } from 'react';
import { api, type Client, type Employee, type Partner, type PartnerService } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { formatUzPhone } from '../lib/phone';
import Modal from './Modal';
import Select from './Select';

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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const showPartnerSelect = !currentEmployee.isPartner && lockedPartnerId === undefined;
  // Услуга доступна только когда у клиента есть партнёр (свой у lockedPartnerId,
  // либо выбранный в свободном селекте на общей странице Клиентов) — без
  // партнёра каталога услуг не существует, остаётся свободное поле "Стоимость".
  const effectivePartnerId = lockedPartnerId !== undefined ? (lockedPartnerId ?? null) : (partnerId || null);

  useEffect(() => {
    if (!showPartnerSelect) return;
    api.listPartners().then(setPartners).catch(() => {});
  }, [showPartnerSelect]);

  useEffect(() => {
    if (!effectivePartnerId) {
      setServices([]);
      return;
    }
    api.listPartnerServices({ actorId: currentEmployee.id, partnerId: effectivePartnerId }).then(setServices).catch(() => setServices([]));
  }, [effectivePartnerId, currentEmployee.id]);

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
        dealValue: effectivePartnerId ? null : (dealValue.trim() || null),
        serviceId: effectivePartnerId ? (serviceId || null) : null,
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

        {effectivePartnerId ? (
          <div className="field">
            <label>{t('clients.serviceLabel')}</label>
            <Select
              value={serviceId}
              options={[{ value: '', label: t('clients.serviceNotSelected') }, ...services.map((s) => ({ value: s.id, label: s.name }))]}
              onChange={setServiceId}
            />
          </div>
        ) : (
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
