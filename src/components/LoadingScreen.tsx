import { useAppLogo } from '../lib/appLogo';

export default function LoadingScreen({ compact }: { compact?: boolean }) {
  const logo = useAppLogo();

  if (compact) {
    return (
      <div className="loading-inline">
        <img src={logo} alt="" className="loading-logo-sm" />
      </div>
    );
  }
  // Полноэкранный вариант — только при запуске приложения (App.tsx, пока не
  // отработал api.hasAdmin()) — оформлен наряднее, чем компактный (тот
  // переиспользуется повсеместно внутри списков/панелей, где пышность была
  // бы неуместна): свечение вокруг логотипа + название + бегущие точки.
  return (
    <div className="loading-screen">
      <div className="loading-screen-content">
        <div className="loading-glow">
          <img src={logo} alt="" className="loading-logo" />
        </div>
        <div className="loading-screen-brand">IB CRM</div>
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
