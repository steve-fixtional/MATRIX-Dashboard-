export type WidgetType = 'clock' | 'weather' | 'tasks' | 'events' | 'recent_notes' | 'quick_note' | 'quick_actions' | 'sync_status';

export interface WidgetLayout {
  id: string;
  type: WidgetType;
  visible: boolean;
  order: number;
  colSpan: 1 | 2 | 3;
}

export const DEFAULT_DASHBOARD_LAYOUT: WidgetLayout[] = [
  { id: 'w-clock', type: 'clock', visible: true, order: 1, colSpan: 1 },
  { id: 'w-weather', type: 'weather', visible: true, order: 2, colSpan: 1 },
  { id: 'w-actions', type: 'quick_actions', visible: true, order: 3, colSpan: 1 },
  { id: 'w-quick-note', type: 'quick_note', visible: true, order: 4, colSpan: 2 },
  { id: 'w-tasks', type: 'tasks', visible: true, order: 5, colSpan: 2 },
  { id: 'w-events', type: 'events', visible: true, order: 6, colSpan: 1 },
  { id: 'w-recent-notes', type: 'recent_notes', visible: true, order: 7, colSpan: 1 },
];
