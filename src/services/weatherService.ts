import { Note } from '../domain/types';

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
  }[];
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,is_day,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch weather');
  }
  
  const data = await response.json();
  
  return {
    temperature: Math.round(data.current.temperature_2m),
    conditionCode: data.current.weather_code,
    high: Math.round(data.daily.temperature_2m_max[0]),
    low: Math.round(data.daily.temperature_2m_min[0]),
    isDay: data.current.is_day === 1,
    forecast: data.daily.time.slice(1, 3).map((time: string, index: number) => ({
      time,
      conditionCode: data.daily.weather_code[index + 1],
      high: Math.round(data.daily.temperature_2m_max[index + 1]),
      low: Math.round(data.daily.temperature_2m_min[index + 1]),
    }))
  };
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
