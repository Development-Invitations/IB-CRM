import { useEffect, useState } from 'react';
import { api, type AbsenceRequest } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { ABSENCE_TYPE_LABEL_KEYS, formatDate, parseMakeupSlots } from '../lib/absenceTypes';
import Modal from './Modal';

export default function AbsenceRequestReviewModal({
  open,
  onClose,
  requestId,
  actorId,
  onResolved,
}: {
  open: boolean;
  onClose: () => void;
  requestId: string;
  actorId: string;
  onResolved: () => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [request, setRequest] = useState<AbsenceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .getAbsenceRequest({ actorId, requestId })
      .then(setRequest)
      .catch(() => setRequest(null))
      .finally(() => setLoading(false));
  }, [open, requestId, actorId]);

  const resolve = async (approve: boolean) => {
    setBusy(true);
    try {
      await api.resolveAbsenceRequest({ actorId, requestId, approve });
      showToast('success', t('absence.resolved'));
      onResolved();
      onClose();
    } catch (err: unknown) {
      showToast('error', typeof err === 'string' ? err : t('employees.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('absence.reviewTitle')}
      onClose={onClose}
      actions={
        <button className="modal-btn" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      {loading ? (
        <p className="settings-hint">{t('common.loading')}</p>
      ) : !request || request.status !== 'pending' ? (
        <p className="settings-hint">{t('editRequest.alreadyResolved')}</p>
      ) : (
        <div className="edit-request-review">
          <p className="settings-hint">{request.employeeName}</p>

          <div className="employee-card-row">
            <span className="settings-hint">{t('absence.typeLabel')}</span>
            <span>{t(ABSENCE_TYPE_LABEL_KEYS[request.type])}</span>
          </div>
          <div className="employee-card-row">
            <span className="settings-hint">{t('absence.colPeriod')}</span>
            <span>{formatDate(request.startDate)} – {formatDate(request.endDate)}</span>
          </div>
          {request.reason && <p className="settings-hint edit-request-note">«{request.reason}»</p>}

          {request.type === 'dayoff_worked' && request.makeupSlots && parseMakeupSlots(request.makeupSlots).length > 0 && (
            <div className="employee-card-row">
              <span className="settings-hint">{t('absence.makeupDateLabel')}</span>
              <span>
                {parseMakeupSlots(request.makeupSlots).map((slot, i) => (
                  <div key={i}>
                    {formatDate(slot.date)}
                    {slot.start && slot.end ? ` · ${slot.start}–${slot.end}` : ''}
                  </div>
                ))}
              </span>
            </div>
          )}

          <div className="edit-request-review-actions">
            <button className="modal-btn" onClick={() => resolve(true)} disabled={busy}>
              {t('absence.approveBtn')}
            </button>
            <button className="modal-btn danger" onClick={() => resolve(false)} disabled={busy}>
              {t('absence.rejectBtn')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

