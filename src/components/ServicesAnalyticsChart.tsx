import type { ServiceMonthStat } from '../lib/api';
import { useLocale } from '../lib/i18n';

// Аналитика по услугам на Главной (v1.5.0) — один график вместо двух:
// сложенные столбцы по месяцам (динамика) + легенда с суммой по каждой
// услуге (популярность), см. docs/TZ.md и обсуждение с пользователем.
// Свой SVG, не сторонняя чарт-библиотека — в проекте её нет и ради одного
// графика подключать не стали (см. Plan). Категориальная палитра —
// провалидированный набор из скилла dataviz (6 прямых цветов + "Остальные"
// серым), проверен node scripts/validate_palette.js на фактических
// поверхностях приложения (светлая #F6F7FB и тёмная #0F1B3D) — обе прошли
// без provал по CVD-разделению; три светлых слота дают <3:1 контраста на
// светлой поверхности, поэтому подписи всегда видимые текстом (не только
// цветом) — "relief"-требование скилла.
const MAX_DIRECT_SERIES = 6;
const OTHER_LABEL_KEY = 'home.servicesChartOther';

const BAR_WIDTH = 22;
const GAP_BETWEEN_SEGMENTS = 2;
const CHART_HEIGHT = 160;
const AXIS_LABEL_HEIGHT = 20;

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return Math.ceil(value / magnitude) * magnitude;
}

function lastSixMonths(): { key: string; monthNum: number }[] {
  const months: { key: string; monthNum: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthNum = d.getMonth() + 1;
    const key = `${d.getFullYear()}-${String(monthNum).padStart(2, '0')}`;
    months.push({ key, monthNum });
  }
  return months;
}

export default function ServicesAnalyticsChart({ stats }: { stats: ServiceMonthStat[] }) {
  const { t } = useLocale();

  if (stats.length === 0) {
    return <p className="settings-hint">{t('home.servicesChartEmpty')}</p>;
  }

  const months = lastSixMonths();

  const totalsByService = new Map<string, number>();
  for (const s of stats) {
    totalsByService.set(s.serviceName, (totalsByService.get(s.serviceName) ?? 0) + s.count);
  }
  const orderedServices = [...totalsByService.entries()].sort((a, b) => b[1] - a[1]);
  const directServices = orderedServices.slice(0, MAX_DIRECT_SERIES).map(([name]) => name);
  const hasOther = orderedServices.length > MAX_DIRECT_SERIES;
  const seriesNames = hasOther ? [...directServices, t(OTHER_LABEL_KEY)] : directServices;

  // monthKey -> serviceName (или "Остальные") -> count
  const grid = new Map<string, Map<string, number>>();
  for (const month of months) grid.set(month.key, new Map());
  for (const s of stats) {
    const row = grid.get(s.month);
    if (!row) continue; // за пределами окна 6 месяцев — не должно случаться, но не падаем
    const bucket = directServices.includes(s.serviceName) ? s.serviceName : t(OTHER_LABEL_KEY);
    row.set(bucket, (row.get(bucket) ?? 0) + s.count);
  }

  const monthTotals = months.map((m) => {
    const row = grid.get(m.key)!;
    return [...row.values()].reduce((a, b) => a + b, 0);
  });
  const yMax = niceMax(Math.max(...monthTotals, 1));
  const yTicks = [0, yMax / 2, yMax];

  const plotWidth = months.length * (BAR_WIDTH + 24);
  const svgWidth = plotWidth + 40;
  const svgHeight = CHART_HEIGHT + AXIS_LABEL_HEIGHT;

  const legendTotals = hasOther
    ? [...directServices.map((name) => [name, totalsByService.get(name) ?? 0] as const), [t(OTHER_LABEL_KEY), orderedServices.slice(MAX_DIRECT_SERIES).reduce((a, [, c]) => a + c, 0)] as const]
    : directServices.map((name) => [name, totalsByService.get(name) ?? 0] as const);

  return (
    <div className="services-chart">
      <div className="services-chart-scroll">
        <svg width={svgWidth} height={svgHeight} role="img" aria-label={t('home.servicesChartTitle')}>
          {yTicks.map((tick, i) => {
            const y = CHART_HEIGHT - (tick / yMax) * (CHART_HEIGHT - AXIS_LABEL_HEIGHT) - AXIS_LABEL_HEIGHT / 2;
            return (
              <g key={i}>
                <line x1={30} y1={y} x2={svgWidth} y2={y} className="services-chart-gridline" />
                <text x={0} y={y + 4} className="services-chart-axis-label">
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}

          {months.map((month, mi) => {
            const row = grid.get(month.key)!;
            const x = 40 + mi * (BAR_WIDTH + 24);
            const baseline = CHART_HEIGHT - AXIS_LABEL_HEIGHT / 2;
            const usableHeight = CHART_HEIGHT - AXIS_LABEL_HEIGHT;
            let cumulative = 0;
            const segments = seriesNames
              .map((name) => ({ name, count: row.get(name) ?? 0 }))
              .filter((s) => s.count > 0);
            return (
              <g key={month.key}>
                {segments.map((seg, si) => {
                  const segHeight = (seg.count / yMax) * usableHeight;
                  const y = baseline - cumulative - segHeight;
                  cumulative += segHeight;
                  const isTop = si === segments.length - 1;
                  return (
                    <rect
                      key={seg.name}
                      x={x}
                      y={y + GAP_BETWEEN_SEGMENTS / 2}
                      width={BAR_WIDTH}
                      height={Math.max(segHeight - GAP_BETWEEN_SEGMENTS, 1)}
                      rx={isTop ? 4 : 0}
                      className="services-chart-segment"
                      data-series={seriesNames.indexOf(seg.name)}
                    >
                      <title>{`${seg.name}: ${seg.count}`}</title>
                    </rect>
                  );
                })}
                <text x={x + BAR_WIDTH / 2} y={svgHeight - 4} textAnchor="middle" className="services-chart-axis-label">
                  {t(`birthdays.month${month.monthNum}`).slice(0, 3)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="services-chart-legend">
        {legendTotals.map(([name, total], i) => (
          <li key={name}>
            <span className="services-chart-swatch" data-series={i} />
            <span className="services-chart-legend-name">{name}</span>
            <span className="services-chart-legend-count">{total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
