import { useSettings } from '../../hooks/useSettings';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { cn } from '../../utils';
import { CalendarDays, Calendar as CalendarIcon, AlignJustify, GripHorizontal } from 'lucide-react';

export function CalendarSettings() {
  const { settings, saveSettings, loading } = useSettings();

  if (loading || !settings) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">Calendar</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure your default calendar views and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default View</CardTitle>
          <CardDescription>Choose the view that opens by default.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'month', name: 'Month', icon: CalendarDays },
              { id: 'week', name: 'Week', icon: GripHorizontal },
              { id: 'day', name: 'Day', icon: CalendarIcon },
              { id: 'agenda', name: 'Agenda', icon: AlignJustify },
            ].map((viewOpt) => {
              const isSelected = settings.calendarDefaultView === viewOpt.id;
              return (
                <button
                  key={viewOpt.id}
                  onClick={() => saveSettings({ calendarDefaultView: viewOpt.id as any })}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                    isSelected
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700"
                  )}
                >
                  <viewOpt.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{viewOpt.name}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Week Starts On</CardTitle>
          <CardDescription>Select the first day of the week.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[
              { id: 'sunday', name: 'Sunday' },
              { id: 'monday', name: 'Monday' },
            ].map((dayOpt) => {
              const isSelected = settings.calendarWeekStart === dayOpt.id;
              return (
                <button
                  key={dayOpt.id}
                  onClick={() => saveSettings({ calendarWeekStart: dayOpt.id as any })}
                  className={cn(
                    "flex-1 flex items-center justify-center py-2.5 rounded-lg border font-medium text-sm transition-all",
                    isSelected
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700"
                  )}
                >
                  {dayOpt.name}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
