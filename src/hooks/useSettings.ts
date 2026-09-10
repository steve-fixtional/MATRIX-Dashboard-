import { useState, useEffect } from 'react';
import { AppSettings } from '../domain/types';
import { getAppSettings, saveAppSettings as saveSettingsService } from '../services/settingsService';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getAppSettings().then(s => {
      if (mounted) {
        setSettings(s);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const saveSettings = async (newSettings: Partial<AppSettings>) => {
    await saveSettingsService(newSettings);
    setSettings(prev => prev ? { ...prev, ...newSettings } : null);
  };

  return { settings, loading, saveSettings };
}
