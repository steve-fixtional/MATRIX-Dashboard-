import { Note } from '../domain/types';
import { getAppSettings } from './settingsService';

export interface WeatherData {
  temperature: number;
  conditionCode: number;
  high: number;
  low: number;
  isDay: boolean;
  forecast: {
    time: string;
    conditionCode: number;
    high: number;
    low: number;
    precipitationProbability?: number;
  }[];
  timestamp?: number;
  isCached?: boolean;
  lat?: number;
  lon?: number;
  unit?: string;
}

const WEATHER_CACHE_KEY = 'matrix_weather_cache';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCachedWeather(): WeatherData | null {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as WeatherData;
    }
  } catch (e) {
    console.error('Failed to parse weather cache', e);
  }
  return null;
}

function saveCachedWeather(data: WeatherData) {
  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save weather cache', e);
  }
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const cached = getCachedWeather();
  const settings = await getAppSettings();
  const unit = settings.weatherUnit;

  if (cached && cached.timestamp && cached.unit === unit) {
    const age = Date.now() - cached.timestamp;
    // Return cache if offline, or if the cache is still fresh
    if (!navigator.onLine || age < CACHE_TTL_MS) {
      return { ...cached, isCached: true };
    }
  } else if (!navigator.onLine) {
    // If offline and no cache is available, fail immediately
    throw new Error('Offline and no cache available');
  }

  try {
    let url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
    
    if (unit === 'fahrenheit') {
      url += '&temperature_unit=fahrenheit';
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch weather');
    }
    
    const data = await response.json();
    
    const weatherData: WeatherData = {
      temperature: Math.round(data.current.temperature_2m),
      conditionCode: data.current.weather_code,
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      isDay: data.current.is_day === 1,
      timestamp: Date.now(),
      isCached: false,
      lat,
      lon,
      unit,
      forecast: data.daily.time.map((time: string, index: number) => ({
        time,
        conditionCode: data.daily.weather_code[index],
        high: Math.round(data.daily.temperature_2m_max[index]),
        low: Math.round(data.daily.temperature_2m_min[index]),
        precipitationProbability: data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[index] : undefined
      }))
    };

    saveCachedWeather(weatherData);
    return weatherData;
  } catch (error) {
    // Graceful fallback to cache on API failure
    if (cached) {
      return { ...cached, isCached: true };
    }
    throw error;
  }
}

export function getWeatherDescription(code: number): string {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return 'Clear sky';
  if (code === 1 || code === 2 || code === 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
}
