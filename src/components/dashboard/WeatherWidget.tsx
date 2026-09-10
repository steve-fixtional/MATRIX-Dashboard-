import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { CloudRain, Sun, Cloud, CloudLightning, Snowflake, CloudDrizzle, CloudFog } from 'lucide-react';
import { fetchWeather, WeatherData, getWeatherDescription } from '../../services/weatherService';

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadWeather() {
      try {
        // We'll use a default fallback (e.g. SF or New York) if geolocation fails or is denied.
        // For a more robust app we'd prompt, but here we try geolocation then fallback quietly.
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const data = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
                setWeather(data);
              } catch (e) {
                setError(true);
              }
            },
            async () => {
              // Fallback to New York coordinates if denied
              try {
                const data = await fetchWeather(40.7128, -74.0060);
                setWeather(data);
              } catch (e) {
                setError(true);
              }
            }
          );
        }
      } catch (err) {
        setError(true);
      }
    }
    loadWeather();
  }, []);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="h-6 w-6 text-amber-500" />;
    if (code <= 3) return <Cloud className="h-6 w-6 text-neutral-400" />;
    if (code === 45 || code === 48) return <CloudFog className="h-6 w-6 text-neutral-400" />;
    if (code >= 51 && code <= 57) return <CloudDrizzle className="h-6 w-6 text-blue-400" />;
    if (code >= 61 && code <= 67) return <CloudRain className="h-6 w-6 text-blue-500" />;
    if (code >= 71 && code <= 77) return <Snowflake className="h-6 w-6 text-blue-300" />;
    if (code >= 80 && code <= 82) return <CloudRain className="h-6 w-6 text-blue-500" />;
    if (code >= 85 && code <= 86) return <Snowflake className="h-6 w-6 text-blue-300" />;
    if (code >= 95) return <CloudLightning className="h-6 w-6 text-purple-500" />;
    return <Cloud className="h-6 w-6 text-neutral-400" />;
  };

  if (error) {
    return (
      <Card className="h-full shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-2">
            <CloudRain className="h-4 w-4" /> Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 flex items-center justify-center text-neutral-400 text-sm">
            Unavailable
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="h-full shadow-sm border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-2">
            <CloudRain className="h-4 w-4" /> Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 flex items-center justify-center text-neutral-400 text-sm font-medium animate-pulse">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full shadow-sm flex flex-col justify-between">
      <CardHeader className="pb-0 pt-4">
        <CardTitle className="text-xs font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-2 m-0">
          <span className="flex items-center gap-2">Weather</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weather.conditionCode)}
            <div>
              <div className="text-2xl font-semibold">{weather.temperature}°C</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {getWeatherDescription(weather.conditionCode)}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-neutral-500 font-medium flex flex-col gap-1">
            <span>H: {weather.high}°</span>
            <span>L: {weather.low}°</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
