// Структура шагов обучающего тура (v1.2.0) — только цели/порядок, без текста
// (тексты — в translations.ts, namespace "onboarding"). Разделено намеренно,
// как переводы отделены от компонентов везде в проекте.

export type TourRole = 'admin' | 'employee' | 'partner';
export type TourPlacement = 'right' | 'bottom';

export type TourStep = {
  // Совпадает с ключом в onboarding.<role>.steps.<id> (кроме 'welcome',
  // у него отдельный namespace onboarding.welcome).
  id: string;
  // Совпадает с data-tour-id реального элемента; null — центральный
  // приветственный шаг без цели/спотлайта.
  targetTourId: string | null;
  placement: TourPlacement;
};

export const TOUR_STEPS: Record<TourRole, TourStep[]> = {
  admin: [
    { id: 'welcome', targetTourId: null, placement: 'bottom' },
    { id: 'employees', targetTourId: 'nav-employees', placement: 'right' },
    { id: 'partnerAccounts', targetTourId: 'nav-partner-accounts', placement: 'right' },
    { id: 'departments', targetTourId: 'nav-departments', placement: 'right' },
    { id: 'clients', targetTourId: 'nav-clients', placement: 'right' },
    { id: 'regulations', targetTourId: 'nav-regulations', placement: 'right' },
    { id: 'topbarPartners', targetTourId: 'topbar-partners', placement: 'bottom' },
    { id: 'topbarNotifications', targetTourId: 'topbar-notifications', placement: 'bottom' },
    { id: 'topbarSettings', targetTourId: 'topbar-settings', placement: 'bottom' },
  ],
  employee: [
    { id: 'welcome', targetTourId: null, placement: 'bottom' },
    { id: 'employees', targetTourId: 'nav-employees', placement: 'right' },
    { id: 'clients', targetTourId: 'nav-clients', placement: 'right' },
    { id: 'projects', targetTourId: 'nav-projects', placement: 'right' },
    { id: 'regulations', targetTourId: 'nav-regulations', placement: 'right' },
    { id: 'absenceRequests', targetTourId: 'nav-absence-requests', placement: 'right' },
    { id: 'topbarCabinet', targetTourId: 'topbar-cabinet', placement: 'bottom' },
    { id: 'topbarNotifications', targetTourId: 'topbar-notifications', placement: 'bottom' },
  ],
  partner: [
    { id: 'welcome', targetTourId: null, placement: 'bottom' },
    { id: 'clients', targetTourId: 'nav-clients', placement: 'right' },
    { id: 'regulations', targetTourId: 'nav-regulations', placement: 'right' },
    { id: 'employees', targetTourId: 'nav-employees', placement: 'right' },
    { id: 'services', targetTourId: 'nav-services', placement: 'right' },
    { id: 'topbarChat', targetTourId: 'topbar-chat', placement: 'bottom' },
    { id: 'topbarNotifications', targetTourId: 'topbar-notifications', placement: 'bottom' },
  ],
};
