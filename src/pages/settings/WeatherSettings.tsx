import { useSettings } from '../../hooks/useSettings';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { cn } from '../../utils';

export function WeatherSettings() {
  const { settings, saveSettings, loading } = useSettings();

  if (loading || !settings) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1">Weather</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Configure your weather and location preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Temperature Unit</CardTitle>
          <CardDescription>Select your preferred unit for temperature.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[
              { id: 'celsius', name: 'Celsius (°C)' },
              { id: 'fahrenheit', name: 'Fahrenheit (°F)' },
            ].map((unitOpt) => {
              const isSelected = settings.weatherUnit === unitOpt.id;
              return (
                <button
                  key={unitOpt.id}
                  onClick={() => saveSettings({ weatherUnit: unitOpt.id as any })}
                  className={cn(
                    "flex-1 flex items-center justify-center py-2.5 rounded-lg border font-medium text-sm transition-all",
                    isSelected
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 shadow-sm"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700"
                  )}
                >
                  {unitOpt.name}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>Location is automatically detected via your device sensors.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
            MATRIX currently uses automatic geolocation to provide local weather forecasts. Make sure your browser has location permissions enabled.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
