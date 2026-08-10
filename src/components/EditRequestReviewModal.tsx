import { useEffect, useState } from 'react';
import { api, type EditRequest } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import Modal from './Modal';

export default function EditRequestReviewModal({
  open,
  onClose,
  requestId,
  adminId,
  onResolved,
}: {
  open: boolean;
  onClose: () => void;
  requestId: string;
  adminId: string;
  onResolved: () => void;
}) {
  const { t } = useLocale();
  const { showToast } = useToast();
  const [request, setRequest] = useState<EditRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.listEditRequests(adminId).then((list) => {
      setRequest(list.find((r) => r.id === requestId) ?? null);
      setLoading(false);
    });
  }, [open, requestId, adminId]);

  const resolve = async (action: 'apply' | 'grant_access' | 'reject') => {
    setBusy(true);
    try {
      await api.resolveEditRequest({ adminId, requestId, action });
      showToast('success', t('editRequest.resolved'));
      onResolved();
      onClose();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('employees.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t('editRequest.reviewTitle')}
      onClose={onClose}
      actions={
        <button className="modal-btn" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      {loading ? (
        <p className="settings-hint">{t('common.loading')}</p>
      ) : !request ? (
        <p className="settings-hint">{t('editRequest.alreadyResolved')}</p>
      ) : (
        <div className="edit-request-review">
          <p className="settings-hint">{request.employeeName}</p>

          {request.requestedFullName && (
            <div className="employee-card-row">
              <span className="settings-hint">{t('firstRun.fullNameLabel')}</span>
              <span>{request.requestedFullName}</span>
            </div>
          )}
          {request.requestedPhone && (
            <div className="employee-card-row">
              <span className="settings-hint">{t('employees.phoneLabel')}</span>
              <span>{request.requestedPhone}</span>
            </div>
          )}
          {request.note && <p className="settings-hint edit-request-note">«{request.note}»</p>}

          <div className="edit-request-review-actions">
            <button className="modal-btn" onClick={() => resolve('apply')} disabled={busy}>
              {t('editRequest.applyBtn')}
            </button>
            <button className="modal-btn" onClick={() => resolve('grant_access')} disabled={busy}>
              {t('editRequest.grantBtn')}
            </button>
            <button className="modal-btn danger" onClick={() => resolve('reject')} disabled={busy}>
              {t('editRequest.rejectBtn')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
