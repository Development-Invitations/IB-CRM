import { useState, FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { api, type Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { ABSENCE_TYPES, ABSENCE_TYPE_LABEL_KEYS, todayIso, serializeMakeupSlots, type MakeupSlot } from '../lib/absenceTypes';
import Modal from './Modal';
import Select from './Select';

export default function AbsenceRequestFormModal({
  open,
  onClose,
  employee,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  onSubmitted: () => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();

  const [type, setType] = useState(ABSENCE_TYPES[0]);
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [makeupSlots, setMakeupSlots] = useState<MakeupSlot[]>([{ date: todayIso(), start: '', end: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const typeOptions = ABSENCE_TYPES.map((v) => ({ value: v, label: t(ABSENCE_TYPE_LABEL_KEYS[v]) }));
  const isWorkedDayoff = type === 'dayoff_worked';

  const addMakeupSlot = () => setMakeupSlots((prev) => [...prev, { date: todayIso(), start: '', end: '' }]);
  const removeMakeupSlot = (index: number) => setMakeupSlots((prev) => prev.filter((_, i) => i !== index));
  const updateMakeupSlot = (index: number, patch: Partial<MakeupSlot>) =>
    setMakeupSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (endDate < startDate) {
      setError(t('absence.errorDates'));
      return;
    }

    setBusy(true);
    try {
      await api.createAbsenceRequest({
        employeeId: employee.id,
        type,
        startDate,
        endDate,
        reason: reason.trim() || null,
        makeupSlots: isWorkedDayoff ? serializeMakeupSlots(makeupSlots) : null,
      });
      showToast('success', t('absence.sent'));
      setReason('');
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : t('absence.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} title={t('absence.formTitle')} onClose={onClose}>
      <form className="absence-form" onSubmit={handleSubmit}>
        {error && <div className="error-text">{error}</div>}

        <div className="field">
          <label>{t('absence.typeLabel')}</label>
          <Select value={type} options={typeOptions} onChange={(v) => setType(v as typeof type)} />
        </div>

        <div className="absence-form-dates">
          <div className="field">
            <label>{t('absence.startDateLabel')}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('absence.endDateLabel')}</label>
            <input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>{t('absence.reasonLabel')}</label>
          <textarea rows={3} placeholder={t('absence.reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        {isWorkedDayoff && (
          <div className="absence-makeup-block">
            <p className="settings-hint">{t('absence.makeupHint')}</p>

            {makeupSlots.map((slot, index) => (
              <div className="absence-makeup-slot" key={index}>
                <div className="field">
                  <label>{t('absence.makeupDateLabel')}</label>
                  <input type="date" value={slot.date} onChange={(e) => updateMakeupSlot(index, { date: e.target.value })} />
                </div>
                <div className="absence-form-dates">
                  <div className="field">
                    <label>{t('absence.makeupStartLabel')}</label>
                    <input type="time" value={slot.start} onChange={(e) => updateMakeupSlot(index, { start: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>{t('absence.makeupEndLabel')}</label>
                    <input type="time" value={slot.end} onChange={(e) => updateMakeupSlot(index, { end: e.target.value })} />
                  </div>
                </div>
                {makeupSlots.length > 1 && (
                  <button type="button" className="absence-makeup-remove" onClick={() => removeMakeupSlot(index)}>
                    <X size={13} /> {t('absence.makeupRemoveBtn')}
                  </button>
                )}
              </div>
            ))}

            <button type="button" className="link-btn" onClick={addMakeupSlot}>
              <Plus size={13} /> {t('absence.makeupAddBtn')}
            </button>
          </div>
        )}

        <div className="edit-request-form-actions">
          <button type="button" className="modal-btn" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="modal-btn danger" disabled={busy}>
            {busy ? t('absence.submitBusy') : t('absence.submitBtn')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
