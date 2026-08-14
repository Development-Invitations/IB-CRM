import { useEffect, useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { api, type Employee, type AbsenceRequest } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { ABSENCE_TYPE_LABEL_KEYS, formatDate, todayIso, resolvedByRoleLabel } from '../lib/absenceTypes';
import { exportAbsenceRequestsToExcel } from '../lib/exportAbsence';
import AbsenceRequestFormModal from '../components/AbsenceRequestFormModal';
import LoadingScreen from '../components/LoadingScreen';

const STATUS_LABEL_KEYS: Record<AbsenceRequest['status'], string> = {
  pending: 'absence.statusPending',
  approved: 'absence.statusApproved',
  rejected: 'absence.statusRejected',
};

export default function AbsenceRequestsPage({ currentEmployee }: { currentEmployee: Employee }) {
  const { t } = useLocale();
  const { showToast } = useToast();

  const [myRequests, setMyRequests] = useState<AbsenceRequest[]>([]);
  const [pending, setPending] = useState<AbsenceRequest[]>([]);
  const [allRequests, setAllRequests] = useState<AbsenceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [month, setMonth] = useState(() => todayIso().slice(0, 7));
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const calls: [Promise<AbsenceRequest[]>, Promise<AbsenceRequest[]>, Promise<AbsenceRequest[]>?] = [
      api.listAbsenceRequestsForEmployee(currentEmployee.id),
      api.listPendingApprovals(currentEmployee.id),
    ];
    if (currentEmployee.isAdmin) calls.push(api.listAllAbsenceRequests(currentEmployee.id));

    Promise.all(calls).then((results) => {
      setMyRequests(results[0]);
      setPending(results[1]);
      if (currentEmployee.isAdmin && results[2]) setAllRequests(results[2]);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployee.id]);

  const handleResolve = async (id: string, approve: boolean) => {
    setResolvingId(id);
    try {
      await api.resolveAbsenceRequest({ actorId: currentEmployee.id, requestId: id, approve });
      showToast('success', t('absence.resolved'));
      load();
    } catch (err: unknown) {
      showToast('error', typeof err === 'string' ? err : t('employees.errorGeneric'));
    } finally {
      setResolvingId(null);
    }
  };

  const statusLabel = (r: AbsenceRequest) => t(STATUS_LABEL_KEYS[r.status]);

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{t('sidebar.absenceRequests')}</h1>
        <button className="primary employees-add-btn" onClick={() => setFormOpen(true)}>
          <Plus size={16} /> {t('absence.newBtn')}
        </button>
      </div>

      {loading ? (
        <LoadingScreen compact />
      ) : (
        <>
          {pending.length > 0 && (
            <div className="absence-section">
              <div className="absence-section-header">
                <h2>{t('absence.myPendingTitle')}</h2>
              </div>
              <div className="absence-pending-list">
                {pending.map((r) => (
                  <div className="absence-pending-item" key={r.id}>
                    <div className="absence-pending-item-info">
                      <strong>{r.employeeName}</strong>
                      {t(ABSENCE_TYPE_LABEL_KEYS[r.type])} · {formatDate(r.startDate)} – {formatDate(r.endDate)}
                      {r.reason ? ` · «${r.reason}»` : ''}
                    </div>
                    <div className="absence-pending-item-actions">
                      <button className="modal-btn" onClick={() => handleResolve(r.id, true)} disabled={resolvingId === r.id}>
                        {t('absence.approveBtn')}
                      </button>
                      <button className="modal-btn danger" onClick={() => handleResolve(r.id, false)} disabled={resolvingId === r.id}>
                        {t('absence.rejectBtn')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="absence-section">
            <div className="absence-section-header">
              <h2>{t('absence.myTitle')}</h2>
            </div>
            {myRequests.length === 0 ? (
              <p className="settings-hint">{t('absence.empty')}</p>
            ) : (
              <table className="employees-table">
                <thead>
                  <tr>
                    <th>{t('absence.colType')}</th>
                    <th>{t('absence.colPeriod')}</th>
                    <th>{t('absence.colStatus')}</th>
                    <th>{t('absence.colReason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((r) => (
                    <tr key={r.id}>
                      <td>{t(ABSENCE_TYPE_LABEL_KEYS[r.type])}</td>
                      <td>
                        {formatDate(r.startDate)} – {formatDate(r.endDate)}
                      </td>
                      <td>
                        <span className={`absence-status absence-status-${r.status}`}>{statusLabel(r)}</span>
                      </td>
                      <td>{r.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {currentEmployee.isAdmin && (
            <div className="absence-section">
              <div className="absence-section-header">
                <h2>{t('absence.allTitle')}</h2>
                <div className="absence-export-row">
                  <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                  <button className="modal-btn" onClick={() => exportAbsenceRequestsToExcel(allRequests, month, t)}>
                    <Download size={14} /> {t('absence.exportBtn')}
                  </button>
                </div>
              </div>
              {allRequests.length === 0 ? (
                <p className="settings-hint">{t('absence.empty')}</p>
              ) : (
                <table className="employees-table">
                  <thead>
                    <tr>
                      <th>{t('absence.colEmployee')}</th>
                      <th>{t('absence.colType')}</th>
                      <th>{t('absence.colPeriod')}</th>
                      <th>{t('absence.colStatus')}</th>
                      <th>{t('absence.colReason')}</th>
                      <th>{t('absence.resolvedByLabel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRequests.map((r) => (
                      <tr key={r.id}>
                        <td>{r.employeeName}</td>
                        <td>{t(ABSENCE_TYPE_LABEL_KEYS[r.type])}</td>
                        <td>
                          {formatDate(r.startDate)} – {formatDate(r.endDate)}
                        </td>
                        <td>
                          <span className={`absence-status absence-status-${r.status}`}>{statusLabel(r)}</span>
                        </td>
                        <td>{r.reason || '—'}</td>
                        <td>{r.resolvedByName ? `${r.resolvedByName} (${resolvedByRoleLabel(r, t)})` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      <AbsenceRequestFormModal open={formOpen} onClose={() => setFormOpen(false)} employee={currentEmployee} onSubmitted={load} />
    </div>
  );
}

