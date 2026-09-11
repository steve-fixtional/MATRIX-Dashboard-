import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { CloudRain, Sun, Cloud, CloudLightning, Snowflake, CloudDrizzle, CloudFog, ChevronDown, Droplets, MapPin, RefreshCw, Wind, SunDim, Eye, Gauge } from 'lucide-react';
import { fetchWeather, WeatherData, getWeatherDescription } from '../../services/weatherService';
import { getAppSettings } from '../../services/settingsService';
import { format, parseISO, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [errorType, setErrorType] = useState<'location' | 'api' | 'offline' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadWeather = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setErrorType(null);
    try {
      const settings = await getAppSettings();
      
      // 1. Manual saved location
      if (typeof settings.manualLat === 'number' && typeof settings.manualLon === 'number') {
         try {
           const data = await fetchWeather(settings.manualLat, settings.manualLon, forceRefresh);
           setWeather(data);
         } catch (e) {
           setErrorType('api');
         }
         setIsLoading(false);
         return;
      }

      if (!navigator.onLine) {
        // If offline and no manual coordinates, try to pull the entire cached object directly
        // rather than failing because we can't get geolocation coords to pass to fetchWeather.
        const cachedStr = localStorage.getItem('matrix_weather_cache');
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr);
            setWeather({ ...cached, isCached: true });
            setIsLoading(false);
            return;
          } catch (e) {}
        }
        setErrorType('offline');
        setIsLoading(false);
        return;
      }

      // 3. Browser/device geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const data = await fetchWeather(pos.coords.latitude, pos.coords.longitude, forceRefresh);
              setWeather(data);
            } catch (e) {
              setErrorType('api');
            }
            setIsLoading(false);
          },
          () => {
            setErrorType('location');
            setIsLoading(false);
          }
        );
      } else {
        setErrorType('location');
        setIsLoading(false);
      }
    } catch (err) {
      setErrorType('api');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  const getWeatherIcon = (code: number, className: string = "h-6 w-6") => {
    if (code === 0) return <Sun className={`${className} text-neutral-700 dark:text-neutral-300`} />;
    if (code <= 3) return <Cloud className={`${className} text-neutral-500 dark:text-neutral-400`} />;
    if (code === 45 || code === 48) return <CloudFog className={`${className} text-neutral-400`} />;
    if (code >= 51 && code <= 57) return <CloudDrizzle className={`${className} text-neutral-500 dark:text-neutral-400`} />;
    if (code >= 61 && code <= 67) return <CloudRain className={`${className} text-blue-500 dark:text-blue-400`} />;
    if (code >= 71 && code <= 77) return <Snowflake className={`${className} text-sky-500 dark:text-sky-400`} />;
    if (code >= 80 && code <= 82) return <CloudRain className={`${className} text-blue-500 dark:text-blue-400`} />;
    if (code >= 85 && code <= 86) return <Snowflake className={`${className} text-sky-500 dark:text-sky-400`} />;
    if (code >= 95) return <CloudLightning className={`${className} text-indigo-500 dark:text-indigo-400`} />;
    return <Cloud className={`${className} text-neutral-400`} />;
  };

  const formatAge = (timestamp?: number) => {
    if (!timestamp) return '';
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  if (errorType && !weather) {
    const getErrorContent = () => {
      switch (errorType) {
        case 'offline':
          return { title: 'Weather unavailable offline', desc: 'Check your connection.' };
        case 'location':
          return { title: 'Location unavailable', desc: 'Enable location access or set a manual location in Settings.' };
        case 'api':
          return { title: 'Weather API unavailable', desc: 'Failed to retrieve weather data.' };
        default:
          return { title: 'Weather unavailable', desc: 'An unknown error occurred.' };
      }
    };
    
    const { title, desc } = getErrorContent();

    return (
      <Card className="@container shadow-sm border border-neutral-200/50 dark:border-neutral-800/50">
      <CardContent className="p-4 flex flex-col justify-center items-center text-center min-h-[160px] text-neutral-500 dark:text-neutral-400">
          <MapPin className="h-6 w-6 mb-3 text-neutral-400 dark:text-neutral-500" />
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {title}
          </span>
          <span className="text-xs mt-1 max-w-[200px]">
            {desc}
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); loadWeather(); }} 
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 rounded-md mt-4 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && !weather) {
    return (
      <Card className="@container shadow-sm border border-neutral-200/50 dark:border-neutral-800/50">
      <CardContent className="p-4 flex flex-col justify-between min-h-[160px]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between mt-4">
            <div className="h-14 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="space-y-2 flex flex-col items-end">
               <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
               <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  return (
    <Card 
      className="@container shadow-sm border border-neutral-200/50 dark:border-neutral-800/50 flex flex-col justify-between"
    >
      <CardContent className="p-4 flex flex-col h-full min-h-[160px] justify-between">
        {/* Top: Location & Condition */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {getWeatherIcon(weather.conditionCode, "h-7 w-7 shrink-0")}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate" title={weather.locationName}>
                {weather.locationName || 'Local Weather'}
              </span>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                {getWeatherDescription(weather.conditionCode)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-neutral-400 shrink-0">
            {weather.isCached && weather.timestamp && (
              <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/50 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700 hidden @[12rem]:flex mr-1">
                {Date.now() - weather.timestamp > 15 * 60 * 1000 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Stale Data" />
                )}
                <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 tracking-wide uppercase whitespace-nowrap hidden @[16rem]:inline">
                  {formatAge(weather.timestamp)}
                </span>
              </div>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                loadWeather(true);
              }}
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 motion-reduce:transition-none"
              disabled={isLoading}
              title="Refresh weather"
              aria-label="Refresh weather"
            >
              <RefreshCw className={`h-4 w-4 text-neutral-500 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 flex items-center justify-center -mr-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse weather forecast" : "Expand weather forecast"}
            >
              <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform duration-300 motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bottom: Large Temperature & High/Low Details */}
        <div className="flex flex-col @xs:flex-row @xs:items-end justify-between mt-4 gap-4">
          {/* Primary Temp & Meta */}
          <div className="flex items-end justify-between @xs:justify-start w-full @xs:w-auto gap-2 @sm:gap-4 flex-wrap">
            <div className="text-[3.5rem] leading-[1] font-light tracking-tighter text-neutral-900 dark:text-neutral-50">
              {weather.temperature}°
            </div>
            <div className="flex flex-col items-end @xs:items-start gap-1 text-xs text-neutral-500 dark:text-neutral-400 font-medium mb-1.5">
              {weather.feelsLike !== undefined && (
                <span className="hidden @[14rem]:block whitespace-nowrap">Feels like {weather.feelsLike}°</span>
              )}
              <div className="flex gap-2.5 whitespace-nowrap font-medium">
                <span className="text-neutral-700 dark:text-neutral-300">H {weather.high}°</span>
                <span className="text-neutral-500 dark:text-neutral-500">L {weather.low}°</span>
              </div>
            </div>
          </div>
          
          {/* LARGE: Forecast Preview (Only shown when collapsed and sufficient space) */}
          {!isExpanded && (
            <div className="hidden @2xl:flex items-center gap-6 mb-1 overflow-hidden shrink-0">
              {/* Optional secondary metric */}
              {weather.humidity !== undefined && (
                 <div className="hidden @3xl:flex flex-col shrink-0">
                    <span className="text-[10px] uppercase text-neutral-400 font-semibold mb-0.5 tracking-wider">Humidity</span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{weather.humidity}%</span>
                 </div>
              )}
              {weather.windSpeed !== undefined && (
                 <div className="hidden @4xl:flex flex-col shrink-0">
                    <span className="text-[10px] uppercase text-neutral-400 font-semibold mb-0.5 tracking-wider">Wind</span>
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{weather.windSpeed} km/h</span>
                 </div>
              )}
              
              {/* Divider */}
              <div className="hidden @3xl:block w-px h-8 bg-neutral-200 dark:bg-neutral-800 shrink-0" />
              
              {/* Next 3 days preview */}
              <div className="flex gap-5 shrink-0">
                {weather.forecast.slice(1, 4).map(day => (
                    <div key={day.time} className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{format(parseISO(day.time), 'EEE')}</span>
                      {getWeatherIcon(day.conditionCode, "h-4 w-4 my-0.5")}
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{day.high}°</span>
                    </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Expanded State */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="flex flex-col @[40rem]:flex-row gap-6 pt-5 mt-4 border-t border-neutral-200 dark:border-neutral-800">
                {/* Secondary Metrics */}
                <div className="grid grid-cols-2 gap-y-5 gap-x-3 @[40rem]:w-2/5 content-start">
                  {weather.humidity !== undefined && (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold mb-1">
                        <Droplets className="h-3.5 w-3.5 text-neutral-400" />
                        Humidity
                      </div>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{weather.humidity}%</span>
                    </div>
                  )}
                  {weather.windSpeed !== undefined && (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold mb-1">
                        <Wind className="h-3.5 w-3.5 text-neutral-400" />
                        Wind
                      </div>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{weather.windSpeed} km/h</span>
                    </div>
                  )}
                  {weather.uvIndex !== undefined && (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold mb-1">
                        <SunDim className="h-3.5 w-3.5 text-neutral-400" />
                        UV Index
                      </div>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{weather.uvIndex}</span>
                    </div>
                  )}
                  {weather.visibility !== undefined && (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold mb-1">
                        <Eye className="h-3.5 w-3.5 text-neutral-400" />
                        Visibility
                      </div>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{weather.visibility} km</span>
                    </div>
                  )}
                  {weather.pressure !== undefined && (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400 font-semibold mb-1">
                        <Gauge className="h-3.5 w-3.5 text-neutral-400" />
                        Pressure
                      </div>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{weather.pressure} hPa</span>
                    </div>
                  )}
                </div>

                {/* 7-Day Forecast */}
                <div className="flex-1 border-t @[40rem]:border-t-0 @[40rem]:border-l border-neutral-200 dark:border-neutral-800 pt-5 @[40rem]:pt-0 @[40rem]:pl-6">
                  <div className="text-[11px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 uppercase mb-3">7-Day Forecast</div>
                  <div className="flex flex-col gap-1">
                    {weather.forecast.map((day, index) => {
                      const date = parseISO(day.time);
                      const isTodayDate = isToday(date);
                      
                      return (
                        <div key={day.time} className={`flex items-center justify-between p-2 rounded-md ${isTodayDate ? 'bg-neutral-100 dark:bg-neutral-800/50' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors'}`}>
                          <div className="w-12 text-sm shrink-0">
                            <span className={`font-semibold ${isTodayDate ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-400'}`}>
                              {isTodayDate ? 'Today' : format(date, 'EEE')}
                            </span>
                          </div>
                          
                          <div className="flex flex-1 items-center gap-3 min-w-0">
                            {getWeatherIcon(day.conditionCode, "h-5 w-5 shrink-0")}
                            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate hidden @[20rem]:inline">
                              {getWeatherDescription(day.conditionCode)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-end gap-3 shrink-0">
                            {day.precipitationProbability !== undefined && day.precipitationProbability > 0 ? (
                              <span className="flex items-center gap-0.5 text-[11px] text-blue-500 font-semibold w-10 justify-end">
                                <Droplets className="h-2.5 w-2.5 shrink-0" />
                                {day.precipitationProbability}%
                              </span>
                            ) : <span className="w-10"></span>}
                            <div className="flex items-center justify-end gap-1.5 text-sm w-16">
                              <span className="font-bold text-neutral-900 dark:text-neutral-100 w-6 text-right">{day.high}°</span>
                              <span className="text-neutral-400 text-xs font-semibold w-5 text-right">{day.low}°</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
