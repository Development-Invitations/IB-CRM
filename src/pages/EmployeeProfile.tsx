import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Briefcase, Building2, UserCog, Users, Clock, Send, Calendar, History, CalendarPlus, Cake } from 'lucide-react';
import { api, type Employee, type Session, type AbsenceRequest } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { useToast } from '../lib/toast';
import { formatUzPhone } from '../lib/phone';
import { parseSqliteUtc, formatLocalDate } from '../lib/date';
import { ABSENCE_TYPE_LABEL_KEYS, formatDate } from '../lib/absenceTypes';
import { formatWorkDays } from '../lib/schedule';
import Avatar from '../components/Avatar';
import Checkbox from '../components/Checkbox';
import StatusBadge from '../components/StatusBadge';
import StatusPicker from '../components/StatusPicker';
import AbsenceRequestFormModal from '../components/AbsenceRequestFormModal';
import LoadingScreen from '../components/LoadingScreen';

export default function EmployeeProfile({ currentEmployee }: { currentEmployee: Employee }) {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [absenceFormOpen, setAbsenceFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getEmployee(id), api.listRecentSessions(id), api.listAbsenceRequestsForEmployee(id)]).then(
      ([emp, sess, absences]) => {
        setEmployee(emp);
        setSessions(sess);
        setAbsenceRequests(absences);
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isOwnProfile = currentEmployee.id === id;
  const selfEditActive = !!employee?.selfEditUntil && parseSqliteUtc(employee.selfEditUntil) > new Date();

  // ---- Режим "временный доступ выдан" — редактирование прямо тут ----
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingSelf, setSavingSelf] = useState(false);

  useEffect(() => {
    if (employee && selfEditActive) {
      setEditFullName(employee.fullName);
      setEditPhone(employee.phone ?? '');
    }
  }, [employee, selfEditActive]);

  const handleSelfSave = async () => {
    if (!employee) return;
    setSavingSelf(true);
    try {
      await api.selfUpdateEmployee({ employeeId: employee.id, fullName: editFullName.trim(), phone: editPhone.trim() || null });
      showToast('success', t('editRequest.selfSaved'));
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('employees.errorGeneric'));
    } finally {
      setSavingSelf(false);
    }
  };

  // ---- Режим "запросить изменение" ----
  const [requestOpen, setRequestOpen] = useState(false);
  const [wantName, setWantName] = useState(false);
  const [wantPhone, setWantPhone] = useState(false);
  const [reqFullName, setReqFullName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqNote, setReqNote] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const openRequestForm = () => {
    if (!employee) return;
    setWantName(false);
    setWantPhone(false);
    setReqFullName(employee.fullName);
    setReqPhone(employee.phone ?? '');
    setReqNote('');
    setRequestOpen(true);
  };

  const submitRequest = async () => {
    if (!employee) return;
    if (!wantName && !wantPhone) {
      showToast('error', t('editRequest.errorNoFields'));
      return;
    }
    setSendingRequest(true);
    try {
      await api.createEditRequest({
        employeeId: employee.id,
        requestedFullName: wantName ? reqFullName.trim() : null,
        requestedPhone: wantPhone ? reqPhone.trim() : null,
        note: reqNote.trim() || null,
      });
      showToast('success', t('editRequest.sent'));
      setRequestOpen(false);
      load();
    } catch (err: any) {
      showToast('error', typeof err === 'string' ? err : t('employees.errorGeneric'));
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="employee-profile-page">
      <button className="ghost-btn employee-profile-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> {t('employees.backBtn')}
      </button>

      {loading ? (
        <LoadingScreen compact />
      ) : !employee ? (
        <p className="settings-hint">{t('employees.notFound')}</p>
      ) : (
        <div className="profile-card">
          <div className="profile-card-banner" />
          <div className="profile-card-head">
            <Avatar name={employee.fullName || employee.login} size={84} src={employee.avatarData} />
            <div>
              <h1>{employee.fullName || employee.login}</h1>
              <p className="settings-hint">
                {employee.employeeNumber} · {employee.isAdmin ? t('sidebar.admin') : t('employees.roleEmployee')}
              </p>
              {(employee.headOfDepartmentName || employee.deputyOfDepartmentName) && (
                <div className="role-badges">
                  {employee.headOfDepartmentName && (
                    <span className="role-badge role-badge-head">
                      {t('employees.headOfDepartmentLabel')}: {employee.headOfDepartmentName}
                    </span>
                  )}
                  {employee.deputyOfDepartmentName && (
                    <span className="role-badge role-badge-deputy">
                      {t('employees.deputyOfDepartmentLabel')}: {employee.deputyOfDepartmentName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="profile-grid">
            <div className="profile-field">
              <span className="settings-hint">
                <Cake size={13} /> {t('employees.birthDateLabel')}
              </span>
              <span>{employee.birthDate ? formatLocalDate(employee.birthDate) : '—'}</span>
            </div>
            <div className="profile-field">
              <span className="settings-hint">
                <Phone size={13} /> {t('employees.phoneLabel')}
              </span>
              <span>{employee.phone || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="settings-hint">
                <Briefcase size={13} /> {t('employees.positionLabel')}
              </span>
              <span>{employee.positionTitle || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="settings-hint">
                <Building2 size={13} /> {t('employees.departmentLabel')}
              </span>
              <span>{employee.departmentName || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="settings-hint">
                <UserCog size={13} /> {t('employees.managerLabel')}
              </span>
              <span>{employee.managerName || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="settings-hint">
                <Users size={13} /> {t('employees.deputyLabel')}
              </span>
              <span>{employee.deputyName || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="settings-hint">
                <Calendar size={13} /> {t('employees.createdAtLabel')}
              </span>
              <span>{parseSqliteUtc(employee.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="profile-field">
              <span className="settings-hint">
                <Clock size={13} /> {t('schedule.title')}
              </span>
              <span>
                {employee.workDays
                  ? `${formatWorkDays(employee.workDays, t)}, ${employee.workStart ?? ''}–${employee.workEnd ?? ''}`
                  : t('schedule.notSet')}
              </span>
            </div>
            <div className="profile-field">
              <span className="settings-hint">{t('employees.statusLabel')}</span>
              <span className={`status-value ${employee.isOnline ? 'online' : 'offline'}`}>
                <span className="status-dot" />
                {employee.isOnline
                  ? t('employees.onlineNow')
                  : employee.lastSeenAt
                    ? t('employees.lastSeenLabel', { time: parseSqliteUtc(employee.lastSeenAt).toLocaleString() })
                    : t('employees.neverLoggedIn')}
              </span>
              <StatusBadge status={employee.manualStatus} until={employee.manualStatusUntil} />
            </div>
          </div>

          {isOwnProfile && <StatusPicker employee={employee} onChanged={setEmployee} />}

          <div className="profile-sessions-block">
            <div className="profile-edit-request-title">
              <CalendarPlus size={14} /> {t('absence.myTitle')}
              {isOwnProfile && (
                <button type="button" className="link-btn absence-new-btn" onClick={() => setAbsenceFormOpen(true)}>
                  {t('absence.newBtn')}
                </button>
              )}
            </div>
            {absenceRequests.length === 0 ? (
              <p className="settings-hint">{t('absence.empty')}</p>
            ) : (
              <ul className="sessions-list">
                {absenceRequests.map((r) => (
                  <li key={r.id}>
                    <span>{t(ABSENCE_TYPE_LABEL_KEYS[r.type])}</span>
                    <span>
                      {formatDate(r.startDate)} – {formatDate(r.endDate)}
                      {' · '}
                      <span className={`absence-status absence-status-${r.status}`}>
                        {t(r.status === 'pending' ? 'absence.statusPending' : r.status === 'approved' ? 'absence.statusApproved' : 'absence.statusRejected')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="profile-sessions-block">
            <div className="profile-edit-request-title">
              <History size={14} /> {t('employees.sessionsTitle')}
            </div>
            {sessions.length === 0 ? (
              <p className="settings-hint">{t('employees.sessionsEmpty')}</p>
            ) : (
              <ul className="sessions-list">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <span>{parseSqliteUtc(s.loginAt).toLocaleDateString()}</span>
                    <span>
                      {parseSqliteUtc(s.loginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' – '}
                      {s.logoutAt
                        ? parseSqliteUtc(s.logoutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : t('employees.sessionOnlineNow')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isOwnProfile && !currentEmployee.isAdmin && (
            <div className="profile-edit-request-block">
              {selfEditActive ? (
                <>
                  <div className="profile-edit-request-title">
                    <Clock size={14} /> {t('editRequest.selfEditActive', { time: parseSqliteUtc(employee.selfEditUntil!).toLocaleString() })}
                  </div>
                  <div className="field">
                    <label>{t('firstRun.fullNameLabel')}</label>
                    <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>{t('employees.phoneLabel')}</label>
                    <input value={editPhone} onChange={(e) => setEditPhone(formatUzPhone(e.target.value))} />
                  </div>
                  <button className="modal-btn danger" onClick={handleSelfSave} disabled={savingSelf}>
                    {savingSelf ? t('employees.savingBusy') : t('editRequest.saveOwn')}
                  </button>
                </>
              ) : employee.hasPendingEditRequest ? (
                <p className="settings-hint">{t('editRequest.pending')}</p>
              ) : !requestOpen ? (
                <button className="ghost-btn" onClick={openRequestForm}>
                  <Send size={14} /> {t('editRequest.openBtn')}
                </button>
              ) : (
                <div className="edit-request-form">
                  <div className="profile-edit-request-title">{t('editRequest.formTitle')}</div>

                  <Checkbox checked={wantName} onChange={setWantName} label={t('firstRun.fullNameLabel')} />
                  {wantName && <input value={reqFullName} onChange={(e) => setReqFullName(e.target.value)} />}

                  <Checkbox checked={wantPhone} onChange={setWantPhone} label={t('employees.phoneLabel')} />
                  {wantPhone && <input value={reqPhone} onChange={(e) => setReqPhone(formatUzPhone(e.target.value))} />}

                  <div className="field">
                    <label>{t('editRequest.noteLabel')}</label>
                    <textarea rows={2} value={reqNote} onChange={(e) => setReqNote(e.target.value)} />
                  </div>

                  <div className="edit-request-form-actions">
                    <button className="modal-btn" onClick={() => setRequestOpen(false)}>
                      {t('common.cancel')}
                    </button>
                    <button className="modal-btn danger" onClick={submitRequest} disabled={sendingRequest}>
                      {sendingRequest ? t('employees.savingBusy') : t('editRequest.submitBtn')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {employee && (
        <AbsenceRequestFormModal
          open={absenceFormOpen}
          onClose={() => setAbsenceFormOpen(false)}
          employee={employee}
          onSubmitted={load}
        />
      )}
    </div>
  );
}
