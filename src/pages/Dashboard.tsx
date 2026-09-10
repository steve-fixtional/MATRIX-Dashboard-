import { useState, useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { WidgetLayout, DEFAULT_DASHBOARD_LAYOUT } from '../domain/dashboardTypes';
import { ClockWidget } from '../components/dashboard/ClockWidget';
import { WeatherWidget } from '../components/dashboard/WeatherWidget';
import { TasksWidget } from '../components/dashboard/TasksWidget';
import { EventsWidget } from '../components/dashboard/EventsWidget';
import { QuickNoteWidget } from '../components/dashboard/QuickNoteWidget';
import { RecentNotesWidget } from '../components/dashboard/RecentNotesWidget';
import { QuickActionsWidget } from '../components/dashboard/QuickActionsWidget';
import { SyncIndicator } from '../components/ui/SyncIndicator';

export function Dashboard() {
  const [layout, setLayout] = useState<WidgetLayout[]>([]);

  useEffect(() => {
    // In the future, this would load from IndexedDB or remote config
    // For now, load default or local storage
    const savedLayout = localStorage.getItem('matrix_dashboard_layout');
    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout));
      } catch (e) {
        setLayout(DEFAULT_DASHBOARD_LAYOUT);
      }
    } else {
      setLayout(DEFAULT_DASHBOARD_LAYOUT);
    }
  }, []);

  const renderWidget = (widget: WidgetLayout) => {
    switch (widget.type) {
      case 'clock': return <ClockWidget />;
      case 'weather': return <WeatherWidget />;
      case 'tasks': return <TasksWidget />;
      case 'events': return <EventsWidget />;
      case 'quick_note': return <QuickNoteWidget />;
      case 'recent_notes': return <RecentNotesWidget />;
      case 'quick_actions': return <QuickActionsWidget />;
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

