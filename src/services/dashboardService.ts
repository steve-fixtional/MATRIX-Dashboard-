import { getDB } from './db';
import { DashboardPreference } from '../domain/types';
import { WidgetLayout } from '../domain/dashboardTypes';
import { syncEngine } from './sync';

export async function getDashboardPreferences(): Promise<DashboardPreference | null> {
  const localStr = localStorage.getItem('matrix_dashboard_pref');
  if (localStr) {
    try {
      return JSON.parse(localStr) as DashboardPreference;
    } catch (e) {
      console.error(e);
    }
  }
  return null;
}

export async function saveDashboardPreferences(pref: Partial<DashboardPreference>): Promise<void> {
  const existing = await getDashboardPreferences();
  
  const now = Date.now();
  const newPref: DashboardPreference = {
    id: 'dashboard',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: null,
    version: (existing?.version || 0) + 1,
    syncStatus: 'synchronized',
    widgetVisibility: existing?.widgetVisibility || {},
    widgetOrder: existing?.widgetOrder || {},
    ...pref,
  };
  
  localStorage.setItem('matrix_dashboard_pref', JSON.stringify(newPref));
}

export async function migrateLegacyLayout(): Promise<void> {
  // Legacy migration no longer pushes to IDB, but we might want to migrate from IDB back to local
  const db = await getDB();
  const pref = await db.get('preferences', 'dashboard');
  if (pref && !localStorage.getItem('matrix_dashboard_pref')) {
    localStorage.setItem('matrix_dashboard_pref', JSON.stringify(pref));
  }
}

export function mergeLayoutWithPreferences(
  defaultLayout: WidgetLayout[],
  pref: DashboardPreference | null
): WidgetLayout[] {
  if (!pref) return defaultLayout;

  return defaultLayout.map(w => ({
    ...w,
    visible: pref.widgetVisibility[w.id] ?? w.visible,
    order: pref.widgetOrder[w.id] ?? w.order,
  }));
}
