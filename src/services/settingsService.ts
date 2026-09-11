import { getDB } from './db';
import { AppSettings } from '../domain/types';
import { requestSync } from './sync';

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDB();
  const pref = await db.get('preferences', 'app_settings');
  
  const localTheme = (localStorage.getItem('matrix_theme_bootstrap') as any) || 'system';
  const localCalendarView = (localStorage.getItem('matrix_calendar_default_view') as any) || 'month';
  
  const defaultSettings: AppSettings = {
    id: 'app_settings',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    version: 1,
    syncStatus: 'pending_create',
    theme: localTheme,
    weatherUnit: 'celsius',
    calendarDefaultView: localCalendarView,
    calendarWeekStart: 'sunday',
    notificationsEnabled: true,
    tasksNotificationsEnabled: true,
    eventsNotificationsEnabled: true
  };

  if (pref) {
    return {
      ...defaultSettings,
      ...(pref as AppSettings),
      theme: localTheme,
      calendarDefaultView: localCalendarView
    };
  }
  return defaultSettings;
}

export async function saveAppSettings(pref: Partial<AppSettings>): Promise<void> {
  if (!pref || typeof pref !== 'object' || 'nativeEvent' in pref || 'pointerId' in pref || typeof (pref as any).preventDefault === 'function') {
    return;
  }
  const db = await getDB();
  const existing = await db.get('preferences', 'app_settings') as AppSettings | undefined;
  
  // Handle local-only settings
  if (pref.theme !== undefined) {
    applyTheme(pref.theme);
  }
  if (pref.calendarDefaultView !== undefined) {
    localStorage.setItem('matrix_calendar_default_view', pref.calendarDefaultView);
  }

  const now = Date.now();
  const newPref: AppSettings = {
    id: 'app_settings',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: null,
    version: (existing?.version || 0) + 1,
    syncStatus: 'pending_update',
    // Always keep local settings out of the synced object so they don't leak, 
    // or just preserve the existing value for schema compatibility without changing it
    theme: 'system', 
    weatherUnit: existing?.weatherUnit || 'celsius',
    calendarDefaultView: 'month',
    calendarWeekStart: existing?.calendarWeekStart || 'sunday',
    manualLat: existing?.manualLat,
    manualLon: existing?.manualLon,
    ...pref,
    // Restore local values after spread to ensure they don't overwrite synced base values in IDB
    // Wait, we don't want to save them to IDB.
  };
  
  // Clean up device-specific keys from the object bound for IndexedDB
  newPref.theme = 'system';
  newPref.calendarDefaultView = 'month';

  if (!existing) {
    newPref.syncStatus = 'pending_create';
  }

  await db.put('preferences', newPref);
  requestSync();
}

export function applyTheme(theme: string) {
  try {
    localStorage.setItem('matrix_theme_bootstrap', theme);
  } catch (e) {
    // Ignore localStorage errors (e.g., in incognito mode)
  }

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
