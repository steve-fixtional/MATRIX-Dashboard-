import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MapPin, X, Search, Check, Loader2, Navigation } from 'lucide-react';
import { cn } from '../../utils';

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // state/province
}

export function WeatherSettings() {
  const { settings, saveSettings, loading } = useSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  
  // Debounce search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
        } else {
          setSearchResults([]);
          setSearchError('No locations found. Check spelling.');
        }
      } catch (err) {
        setSearchError('Failed to search locations. Try again later.');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (result: GeocodingResult) => {
    const locationName = result.admin1 
      ? `${result.name}, ${result.admin1}, ${result.country}` 
      : `${result.name}, ${result.country}`;

    saveSettings({ 
      manualLat: result.latitude, 
      manualLon: result.longitude,
      manualLocationName: locationName
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleUseCurrentLocation = () => {
    saveSettings({ manualLat: null, manualLon: null, manualLocationName: null });
  };

  if (loading || !settings) return null;

  const hasManualLocation = typeof settings.manualLat === 'number' && typeof settings.manualLon === 'number';

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
                    "flex-1 flex items-center justify-center py-2.5 rounded-lg border font-medium text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
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
          <CardTitle>Weather Location</CardTitle>
          <CardDescription>Choose how MATRIX determines your location for weather updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4">
            {/* Automatic Location Option */}
            <button 
              onClick={handleUseCurrentLocation}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                !hasManualLocation 
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 dark:border-blue-500/50" 
                  : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
              )}
            >
              <div className="mt-0.5 flex items-center justify-center">
                <div className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full border",
                  !hasManualLocation ? "border-blue-500" : "border-neutral-300 dark:border-neutral-600"
                )}>
                  {!hasManualLocation && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                </div>
              </div>
              <div className="flex flex-col">
                <span className={cn("text-sm font-medium", !hasManualLocation ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300")}>
                  Use current location
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Automatically detects your location via device sensors
                </span>
              </div>
            </button>

            {/* Manual Location Option */}
            <div className={cn(
                "flex flex-col gap-4 p-4 rounded-xl border transition-all",
                hasManualLocation 
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 dark:border-blue-500/50" 
                  : "border-neutral-200 dark:border-neutral-800"
              )}>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex items-center justify-center">
                    <div className={cn(
                      "flex items-center justify-center w-5 h-5 rounded-full border",
                      hasManualLocation ? "border-blue-500" : "border-neutral-300 dark:border-neutral-600"
                    )}>
                      {hasManualLocation && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-medium", hasManualLocation ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300")}>
                      Choose a city
                    </span>
                    {hasManualLocation ? (
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mt-1 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        {settings.manualLocationName || `Lat: ${settings.manualLat}, Lon: ${settings.manualLon}`}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Search and set a manual location
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Search Field (Always visible to allow easy changing even if one is selected) */}
              <div className="ml-9 relative">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 text-neutral-400 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 text-neutral-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Search for a city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown Results */}
                {searchQuery.trim().length >= 2 && (searchResults.length > 0 || searchError) && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden z-10">
                    {searchError ? (
                      <div className="p-4 text-sm text-neutral-500 dark:text-neutral-400 text-center">
                        {searchError}
                      </div>
                    ) : (
                      <ul className="max-h-60 overflow-y-auto">
                        {searchResults.map((result) => (
                          <li key={result.id}>
                            <button
                              onClick={() => handleSelectLocation(result)}
                              className="w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 flex flex-col focus:outline-none focus:bg-neutral-50 dark:focus:bg-neutral-800/50 transition-colors"
                            >
                              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                                {result.name}
                              </span>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {result.admin1 ? `${result.admin1}, ` : ''}{result.country}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
