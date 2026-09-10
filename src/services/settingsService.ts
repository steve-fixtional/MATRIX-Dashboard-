import { getDB } from './db';
import { AppSettings } from '../domain/types';
import { syncEngine } from './sync';

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDB();
  const pref = await db.get('preferences', 'app_settings');
  
  const defaultSettings: AppSettings = {
    id: 'app_settings',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    version: 1,
    syncStatus: 'pending_create',
    theme: 'system',
    weatherUnit: 'celsius',
    calendarDefaultView: 'month',
    calendarWeekStart: 'sunday'
  };

  if (pref) {
    return pref as AppSettings;
  }
  return defaultSettings;
}

export async function saveAppSettings(pref: Partial<AppSettings>): Promise<void> {
  const db = await getDB();
  const existing = await db.get('preferences', 'app_settings') as AppSettings | undefined;
  
  const now = Date.now();
  const newPref: AppSettings = {
    id: 'app_settings',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: null,
    version: (existing?.version || 0) + 1,
    syncStatus: 'pending_update',
    theme: existing?.theme || 'system',
    weatherUnit: existing?.weatherUnit || 'celsius',
    calendarDefaultView: existing?.calendarDefaultView || 'month',
    calendarWeekStart: existing?.calendarWeekStart || 'sunday',
    ...pref,
  };
  
  if (!existing) {
    newPref.syncStatus = 'pending_create';
  }

  await db.put('preferences', newPref);
  syncEngine.syncAll().catch(console.error);

  // Apply non-react state changes immediately if necessary (e.g., Theme)
  if (pref.theme !== undefined) {
    applyTheme(pref.theme);
  }
}

export function applyTheme(theme: string) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // system
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
