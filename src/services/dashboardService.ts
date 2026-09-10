import { getDB } from './db';
import { DashboardPreference } from '../domain/types';
import { WidgetLayout } from '../domain/dashboardTypes';
import { syncEngine } from './sync';

export async function getDashboardPreferences(): Promise<DashboardPreference | null> {
  const db = await getDB();
  const pref = await db.get('preferences', 'dashboard');
  return pref || null;
}

export async function saveDashboardPreferences(pref: Partial<DashboardPreference>): Promise<void> {
  const db = await getDB();
  const existing = await db.get('preferences', 'dashboard');
  
  const now = Date.now();
  const newPref: DashboardPreference = {
    id: 'dashboard',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deletedAt: null,
    version: (existing?.version || 0) + 1,
    syncStatus: 'pending_update',
    widgetVisibility: existing?.widgetVisibility || {},
    widgetOrder: existing?.widgetOrder || {},
    ...pref,
  };
  
  if (!existing) {
    newPref.syncStatus = 'pending_create';
  }

  await db.put('preferences', newPref);
  syncEngine.syncAll().catch(console.error);
}

export async function migrateLegacyLayout(): Promise<void> {
  const legacyStr = localStorage.getItem('matrix_dashboard_layout');
  if (legacyStr) {
    try {
      const parsed = JSON.parse(legacyStr) as WidgetLayout[];
      const visibility: Record<string, boolean> = {};
      const order: Record<string, number> = {};
      
      parsed.forEach(w => {
        visibility[w.id] = w.visible;
        order[w.id] = w.order;
      });

      await saveDashboardPreferences({
        widgetVisibility: visibility,
        widgetOrder: order,
      });

      // Remove after successful migration
      localStorage.removeItem('matrix_dashboard_layout');
    } catch (err) {
      console.error('Failed to migrate legacy layout', err);
    }
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
