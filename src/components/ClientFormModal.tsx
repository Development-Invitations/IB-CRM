import { useEffect, useState, FormEvent } from 'react';
import { api, type Client } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { formatUzPhone } from '../lib/phone';
import Modal from './Modal';

export default function ClientFormModal({
  open,
  onClose,
  client,
  currentEmployeeId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  client?: Client;
  currentEmployeeId: string;
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(client?.name ?? '');
    setContactPerson(client?.contactPerson ?? '');
    setContactPosition(client?.contactPosition ?? '');
    setPhone(client?.phone ?? '');
    setEmail(client?.email ?? '');
    setAddress(client?.address ?? '');
    setNotes(client?.notes ?? '');
    setError('');
  }, [open, client]);

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
      };
      if (client) {
        await api.updateClient({ id: client.id, ...shared });
        showToast('success', t('clients.updated'));
      } else {
        await api.createClient({ actorId: currentEmployeeId, ...shared });
        showToast('success', t('clients.added'));
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
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
      </form>
    </Modal>
  );
}

