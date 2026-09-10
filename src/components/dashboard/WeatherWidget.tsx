import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { CloudRain, Sun, Cloud, CloudLightning, Snowflake, CloudDrizzle, CloudFog, ChevronDown, Droplets } from 'lucide-react';
import { fetchWeather, WeatherData, getWeatherDescription } from '../../services/weatherService';
import { format, parseISO, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadWeather() {
      try {
        if (!navigator.onLine) {
          try {
            const data = await fetchWeather(40.7128, -74.0060);
            setWeather(data);
          } catch (e) {
            setError(true);
          }
          return;
        }

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
              try {
                const data = await fetchWeather(40.7128, -74.0060);
                setWeather(data);
              } catch (e) {
                setError(true);
              }
            }
          );
        } else {
          try {
            const data = await fetchWeather(40.7128, -74.0060);
            setWeather(data);
          } catch (e) {
            setError(true);
          }
        }
      } catch (err) {
        setError(true);
      }
    }
    loadWeather();
  }, []);

  const getWeatherIcon = (code: number, className: string = "h-6 w-6") => {
    if (code === 0) return <Sun className={`${className} text-amber-500`} />;
    if (code <= 3) return <Cloud className={`${className} text-neutral-400`} />;
    if (code === 45 || code === 48) return <CloudFog className={`${className} text-neutral-400`} />;
    if (code >= 51 && code <= 57) return <CloudDrizzle className={`${className} text-blue-400`} />;
    if (code >= 61 && code <= 67) return <CloudRain className={`${className} text-blue-500`} />;
    if (code >= 71 && code <= 77) return <Snowflake className={`${className} text-blue-300`} />;
    if (code >= 80 && code <= 82) return <CloudRain className={`${className} text-blue-500`} />;
    if (code >= 85 && code <= 86) return <Snowflake className={`${className} text-blue-300`} />;
    if (code >= 95) return <CloudLightning className={`${className} text-purple-500`} />;
    return <Cloud className={`${className} text-neutral-400`} />;
  };

  const formatAge = (timestamp?: number) => {
    if (!timestamp) return '';
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Updated just now';
    if (diffMins === 1) return 'Updated 1 minute ago';
    if (diffMins < 60) return `Updated ${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Updated 1 hour ago';
    return `Updated ${diffHours} hours ago`;
  };

  if (error) {
    const isOffline = !navigator.onLine;
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-2">
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 flex items-center justify-center text-neutral-400 text-sm">
            {isOffline ? 'Weather unavailable offline' : 'Unavailable'}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="shadow-sm border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-2">
            Weather
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
    <Card 
      className="shadow-sm flex flex-col justify-between cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
      onClick={() => setIsExpanded(!isExpanded)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Collapse weather forecast" : "Expand weather forecast"}
    >
      <CardHeader className="pb-0 pt-4">
        <CardTitle className="text-xs font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-2 m-0 justify-between">
          <span className="flex items-center gap-2">Weather</span>
          <div className="flex items-center gap-2">
            {weather.isCached && weather.timestamp && (
              <span className="text-[10px] font-normal lowercase text-neutral-400 tracking-normal hidden sm:inline">
                {formatAge(weather.timestamp)}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weather.conditionCode)}
            <div>
              <div className="text-2xl font-semibold">{weather.temperature}{weather.unit === 'fahrenheit' ? '°F' : '°C'}</div>
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
        
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-2 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex flex-col gap-3">
                  {weather.forecast.map((day, index) => {
                    const date = parseISO(day.time);
                    const isTodayDate = isToday(date);
                    
                    return (
                      <div key={day.time} className="flex items-center justify-between text-sm">
                        <div className="w-16 flex flex-col">
                          <span className={`font-medium ${isTodayDate ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-400'}`}>
                            {isTodayDate ? 'Today' : format(date, 'EEE')}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {format(date, 'MMM d')}
                          </span>
                        </div>
                        
                        <div className="flex flex-1 items-center justify-center gap-2">
                          {getWeatherIcon(day.conditionCode, "h-5 w-5")}
                          {day.precipitationProbability !== undefined && day.precipitationProbability > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-blue-500 font-medium w-10">
                              <Droplets className="h-3 w-3" />
                              {day.precipitationProbability}%
                            </span>
                          )}
                        </div>
                        
                        <div className="w-20 text-right flex items-center justify-end gap-2 text-neutral-600 dark:text-neutral-300">
                          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{day.high}°</span>
                          <span className="text-neutral-400 text-xs">{day.low}°</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
