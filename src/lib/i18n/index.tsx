import { createContext, useContext, useState, ReactNode } from 'react';
import { dictionaries } from './translations';

export type Locale = 'ru' | 'uz' | 'uz-cyrl';

const STORAGE_KEY = 'ib-crm-locale';

// Названия языков показываем всегда на их собственном письме — так принято
// в языковых переключателях, вне зависимости от текущего выбранного языка.
export const LOCALE_LABELS: Record<Locale, string> = {
  ru: 'Русский',
  uz: "Oʻzbekcha (lotin)",
  'uz-cyrl': 'Ўзбекча (кирилл)',
};

type Dict = (typeof dictionaries)[keyof typeof dictionaries];
type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

function getByPath(obj: unknown, path: string): string | undefined {
  return path.split('.').reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

const LocaleContext = createContext<{ locale: Locale; setLocale: (l: Locale) => void; t: TranslateFn } | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    return saved && saved in dictionaries ? saved : 'ru';
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t: TranslateFn = (key, vars) => {
    const dict: Dict = dictionaries[locale];
    let value = getByPath(dict, key) ?? getByPath(dictionaries.ru, key) ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  };

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale должен использоваться внутри LocaleProvider');
  return ctx;
}
