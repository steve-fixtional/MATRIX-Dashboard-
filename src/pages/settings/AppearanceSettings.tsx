import { useSettings } from '../../hooks/useSettings';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '../../utils';

export function AppearanceSettings() {
  const { settings, saveSettings, loading } = useSettings();

  if (loading) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">Appearance</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Customize the look and feel of your command center.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Select your preferred color mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[
              { id: 'system', name: 'System', icon: Monitor },
              { id: 'light', name: 'Light', icon: Sun },
              { id: 'dark', name: 'Dark', icon: Moon },
            ].map((themeOpt) => {
              const isSelected = settings?.theme === themeOpt.id;
              return (
                <button
                  key={themeOpt.id}
                  onClick={() => saveSettings({ theme: themeOpt.id as any })}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                    isSelected
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700"
                  )}
                >
                  <themeOpt.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{themeOpt.name}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
