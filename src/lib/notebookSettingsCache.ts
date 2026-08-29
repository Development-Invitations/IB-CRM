import { useEffect, useState } from 'react';
import { api, type NotebookSettings } from './api';

// Настройки записной книжки (v1.5.0) — раньше Topbar.tsx запрашивал их
// ровно один раз при монтировании (useEffect по employee.id, который не
// меняется в течение сессии), поэтому включение блокнота в Settings.tsx
// (отдельный компонент со своим собственным состоянием) требовало
// перезахода в приложение, чтобы кнопка в шапке появилась/исчезла. Тот же
// приём, что уже есть в lib/appLogo.ts — модульный кеш + подписчики,
// setCachedNotebookSettings зовётся сразу после успешного сохранения и
// обновляет всех подписанных компонентов этой сессии без перезахода.
const DEFAULT: NotebookSettings = { enabled: false, name: null };

let cachedEmployeeId: string | null = null;
let cached: NotebookSettings | undefined;
let pending: Promise<NotebookSettings> | null = null;
const listeners = new Set<(s: NotebookSettings) => void>();

function notify() {
  if (!cached) return;
  const value = cached;
  listeners.forEach((fn) => fn(value));
}

function load(employeeId: string): Promise<NotebookSettings> {
  if (pending) return pending;
  pending = api
    .getNotebookSettings({ actorId: employeeId, employeeId })
    .then((s) => {
      cached = s;
      cachedEmployeeId = employeeId;
      notify();
      return s;
    })
    .catch(() => DEFAULT)
    .finally(() => {
      pending = null;
    });
  return pending;
}

// Вызывается из Settings.tsx после успешного сохранения — обновляет кеш
// сразу у всех открытых компонентов этой сессии (в первую очередь Topbar).
export function setCachedNotebookSettings(s: NotebookSettings) {
  cached = s;
  notify();
}

export function useNotebookSettings(employeeId: string): NotebookSettings {
  const [settings, setSettings] = useState<NotebookSettings>(() => (cachedEmployeeId === employeeId && cached ? cached : DEFAULT));

  useEffect(() => {
    listeners.add(setSettings);
    if (cachedEmployeeId !== employeeId || cached === undefined) load(employeeId);
    else setSettings(cached);
    return () => {
      listeners.delete(setSettings);
    };
  }, [employeeId]);

  return settings;
}
