import { useState, useEffect, useCallback } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { WidgetLayout, DEFAULT_DASHBOARD_LAYOUT } from '../domain/dashboardTypes';
import { ClockWidget } from '../components/dashboard/ClockWidget';
import { WeatherWidget } from '../components/dashboard/WeatherWidget';
import { TasksWidget } from '../components/dashboard/TasksWidget';
import { EventsWidget } from '../components/dashboard/EventsWidget';
import { QuickNoteWidget } from '../components/dashboard/QuickNoteWidget';
import { RecentNotesWidget } from '../components/dashboard/RecentNotesWidget';
import { SyncIndicator } from '../components/ui/SyncIndicator';
import { getDashboardPreferences, migrateLegacyLayout, mergeLayoutWithPreferences } from '../services/dashboardService';
import { useSyncState } from '../store/SyncContext';

export function Dashboard() {
  const [layout, setLayout] = useState<WidgetLayout[]>(DEFAULT_DASHBOARD_LAYOUT);
  const { syncStatus } = useSyncState();

  const loadPreferences = useCallback(async () => {
    await migrateLegacyLayout();
    const pref = await getDashboardPreferences();
    setLayout(mergeLayoutWithPreferences(DEFAULT_DASHBOARD_LAYOUT, pref));
  }, []);

  useEffect(() => {
    loadPreferences().catch(console.error);
  }, [loadPreferences]);

  useEffect(() => {
    if (syncStatus === 'synced') {
      loadPreferences().catch(console.error);
    }
  }, [syncStatus, loadPreferences]);

  const renderWidget = (widget: WidgetLayout) => {
    switch (widget.type) {
      case 'clock': return <ClockWidget />;
      case 'weather': return <WeatherWidget />;
      case 'tasks': return <TasksWidget />;
      case 'events': return <EventsWidget />;
      case 'quick_note': return <QuickNoteWidget />;
      case 'recent_notes': return <RecentNotesWidget />;
      default: return null;
    }
  };

  const visibleLayout = layout.filter(w => w.visible).sort((a, b) => a.order - b.order);

  return (
    <PageWrapper className="space-y-6 sm:space-y-8">
      <div className="flex flex-row items-center justify-between px-1">
        <div className="flex flex-col gap-1">
          {/* We embed the clock widget cleanly within the layout grid instead of as a header, 
              but we could provide a specific header area. We'll leave the sync indicator here. */}
          <div className="flex items-center gap-4">
             <SyncIndicator />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 auto-rows-min">
        {visibleLayout.map(widget => {
          // Map the specific logical colSpans to Tailwind classes
          let spanClass = 'col-span-1';
          if (widget.colSpan === 2) spanClass = 'col-span-1 md:col-span-2 lg:col-span-2';
          if (widget.colSpan === 3) spanClass = 'col-span-1 md:col-span-2 lg:col-span-3';

          return (
            <div key={widget.id} className={spanClass}>
              {renderWidget(widget)}
            </div>
          );
        })}
      </div>
    </PageWrapper>
  );
}

