import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeName = 'light' | 'dark' | 'graphite' | 'pastel' | 'classicBlue';

export const THEME_NAMES: ThemeName[] = ['light', 'dark', 'graphite', 'pastel', 'classicBlue'];

const STORAGE_KEY = 'ib-crm-theme';

const ThemeContext = createContext<{ theme: ThemeName; setTheme: (t: ThemeName) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
    return saved && THEME_NAMES.includes(saved) ? saved : 'light';
  });

  // Тема — настройка устройства, а не сессии: применяется сразу на <html>, в том
  // числе на экранах входа/первого запуска, и не сбрасывается при выходе из аккаунта.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme);
  }, [theme]);

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme должен использоваться внутри ThemeProvider');
  return ctx;
}
