import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getDashboardPreferences, saveDashboardPreferences } from '../../services/dashboardService';
import { DashboardPreference } from '../../domain/types';
import { LayoutDashboard, RotateCcw } from 'lucide-react';
import { cn } from '../../utils';

const AVAILABLE_WIDGETS = [
  { id: 'clock', name: 'Clock' },
  { id: 'weather', name: 'Weather' },
  { id: 'quick-actions', name: 'Quick Actions' },
  { id: 'tasks', name: 'Recent Tasks' },
  { id: 'notes', name: 'Recent Notes' },
  { id: 'calendar', name: 'Upcoming Events' },
];

export function DashboardSettings() {
  const [pref, setPref] = useState<DashboardPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    getDashboardPreferences().then(p => {
      setPref(p);
      setLoading(false);
    });
  }, []);

  const toggleWidget = async (id: string, currentVisible: boolean) => {
    const newVisibility = {
      ...(pref?.widgetVisibility || {}),
      [id]: !currentVisible
    };
    await saveDashboardPreferences({ widgetVisibility: newVisibility });
    const updated = await getDashboardPreferences();
    setPref(updated);
  };

  const resetLayout = async () => {
    // Explicitly overwrite the maps with empty objects, which forces mergeLayoutWithPreferences 
    // to fall back entirely to DEFAULT_DASHBOARD_LAYOUT values.
    await saveDashboardPreferences({ widgetVisibility: {}, widgetOrder: {} });
    const updated = await getDashboardPreferences();
    setPref(updated);
    setConfirmReset(false);
  };

  if (loading) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">Dashboard</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure your home screen modules and layout.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Widgets</CardTitle>
          <CardDescription>Select which modules appear on your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {AVAILABLE_WIDGETS.map(widget => {
              // By default, assume visible if not explicitly false
              const isVisible = pref?.widgetVisibility[widget.id] !== false;
              
              return (
                <div key={widget.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="h-4 w-4 text-neutral-400" />
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{widget.name}</span>
                  </div>
                  <button
                    onClick={() => toggleWidget(widget.id, isVisible)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 dark:focus:ring-neutral-100 dark:focus:ring-offset-neutral-950 transition-colors",
                      isVisible ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-200 dark:bg-neutral-700"
                    )}
                    role="switch"
                    aria-checked={isVisible}
                  >
                    <span aria-hidden="true" className={cn(
                      "pointer-events-none absolute left-0 inline-block h-4 w-4 transform rounded-full bg-white dark:bg-neutral-900 shadow ring-0 transition-transform duration-200 ease-in-out",
                      isVisible ? "translate-x-4" : "translate-x-1"
                    )} />
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset Layout</CardTitle>
          <CardDescription>Restore the dashboard layout to its default state.</CardDescription>
        </CardHeader>
        <CardContent>
          {!confirmReset ? (
            <Button variant="outline" onClick={() => setConfirmReset(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Dashboard
            </Button>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-200">
              <div className="flex-1 text-sm font-medium">Are you sure? This cannot be undone.</div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={resetLayout} className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">Confirm Reset</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
