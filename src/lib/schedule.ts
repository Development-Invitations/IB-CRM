const DAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'];

export function formatWorkDays(workDays: string | null, t: (key: string) => string): string {
  if (!workDays) return '';
  const nums = workDays
    .split(',')
    .map(Number)
    .filter((n) => n >= 1 && n <= 7)
    .sort((a, b) => a - b);
  return nums.map((n) => t(`schedule.${DAY_KEYS[n - 1]}`)).join(', ');
}

export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7];
export const WEEK_DAY_KEYS = DAY_KEYS;
