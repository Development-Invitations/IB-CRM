import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { api, type Employee } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { clamp } from '../lib/clamp';
import { TOUR_STEPS, type TourRole } from '../lib/onboardingSteps';

const TOOLTIP_WIDTH = 320;
// Реальная высота карточки варьируется от длины текста — точный замер через
// ref добавил бы второй проход рендера ради разового элемента; берём с
// запасом для клэмпа в границы экрана, как NotebookPanel клэмпит по известным
// (не измеренным) width/height из состояния, а не через getBoundingClientRect
// самой панели.
const TOOLTIP_HEIGHT_ESTIMATE = 200;
const GAP = 16;

// Интерактивный обучающий тур (v1.2.0) — самодостаточный компонент (как
// UpdateNotifier): сам вычисляет роль по employee, сам запрашивает статус
// прохождения при монтировании и сам решает, показываться ли. Внешний код
// передаёт только employee — см. Dashboard.tsx/PartnerPanel.tsx.
export default function OnboardingTour({ employee }: { employee: Employee }) {
  const { t } = useLocale();
  const role: TourRole = employee.isPartner ? 'partner' : employee.isAdmin ? 'admin' : 'employee';
  const steps = TOUR_STEPS[role];

  const [status, setStatus] = useState<'loading' | 'hidden' | 'active'>('loading');
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    api.getOnboardingStatus({ actorId: employee.id, employeeId: employee.id })
      .then((s) => {
        setStatus(s.completed ? 'hidden' : 'active');
        setStepIndex(0);
      })
      .catch(() => setStatus('hidden'));
  }, [employee.id]);

  const finish = () => {
    setStatus('hidden');
    api.setOnboardingCompleted({ actorId: employee.id, employeeId: employee.id }).catch(() => {});
  };

  const goNext = () => {
    setStepIndex((i) => {
      if (i >= steps.length - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    if (status !== 'active') return;
    const step = steps[stepIndex];
    const recompute = () => {
      if (!step.targetTourId) {
        setRect(null);
        return;
      }
      const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetTourId}"]`);
      if (!el) {
        // Цель не найдена в DOM (роль не подходит/элемент условно скрыт) —
        // не застреваем на месте, идём дальше.
        goNext();
        return;
      }
      setRect(el.getBoundingClientRect());
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, stepIndex, steps]);

  useEffect(() => {
    if (status !== 'active') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status !== 'active') return null;

  const step = steps[stepIndex];
  const isWelcome = !step.targetTourId;
  const titleKey = isWelcome ? 'onboarding.welcome.title' : `onboarding.${role}.steps.${step.id}.title`;
  const bodyKey = isWelcome ? 'onboarding.welcome.body' : `onboarding.${role}.steps.${step.id}.body`;

  let tooltipStyle: CSSProperties;
  if (isWelcome || !rect) {
    tooltipStyle = {};
  } else if (step.placement === 'right') {
    tooltipStyle = {
      top: clamp(rect.top + rect.height / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2, GAP, window.innerHeight - TOOLTIP_HEIGHT_ESTIMATE - GAP),
      left: clamp(rect.right + GAP, GAP, window.innerWidth - TOOLTIP_WIDTH - GAP),
    };
  } else {
    tooltipStyle = {
      top: clamp(rect.bottom + GAP, GAP, window.innerHeight - TOOLTIP_HEIGHT_ESTIMATE - GAP),
      left: clamp(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, GAP, window.innerWidth - TOOLTIP_WIDTH - GAP),
    };
  }

  const spotlightStyle: CSSProperties | undefined = rect
    ? {
        top: rect.top - 6,
        left: rect.left - 6,
        width: rect.width + 12,
        height: rect.height + 12,
      }
    : undefined;

  return createPortal(
    <div className="tour-overlay">
      {spotlightStyle && <div className="tour-spotlight" style={spotlightStyle} />}
      <div
        key={stepIndex}
        className={`tour-tooltip${isWelcome ? ' tour-tooltip-welcome' : ''}`}
        style={tooltipStyle}
      >
        <div className="tour-tooltip-title">{t(titleKey)}</div>
        <div className="tour-tooltip-body">{t(bodyKey)}</div>
        <div className="tour-tooltip-footer">
          <span className="tour-step-counter">{t('onboarding.stepCounter', { current: stepIndex + 1, total: steps.length })}</span>
          <div className="tour-actions">
            <button type="button" className="modal-btn" onClick={finish}>
              {t('onboarding.skip')}
            </button>
            {stepIndex > 0 && (
              <button type="button" className="modal-btn" onClick={goBack}>
                {t('onboarding.back')}
              </button>
            )}
            <button type="button" className="modal-btn danger" onClick={goNext}>
              {stepIndex >= steps.length - 1 ? t('onboarding.finish') : t('onboarding.next')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
