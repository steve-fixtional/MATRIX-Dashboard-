import { useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useSyncState } from '../../store/SyncContext';

export function SyncIndicator() {
  const { syncStatus, requestSync } = useSyncState();

  useEffect(() => {
    // Initial sync
    requestSync();
    
    const interval = setInterval(() => {
      requestSync();
    }, 60000); // Sync every minute

    return () => {
      clearInterval(interval);
    };
  }, [requestSync]);

  return (
    <div className="flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
      {(syncStatus === 'synced' || syncStatus === 'idle') && <><Cloud className="h-3 w-3 text-green-500" /> <span className="hidden sm:inline">Synced</span></>}
      {syncStatus === 'syncing' && <><RefreshCw className="h-3 w-3 text-blue-500 animate-spin" /> <span className="hidden sm:inline">Syncing</span></>}
      {syncStatus === 'offline' && <><CloudOff className="h-3 w-3 text-neutral-400" /> <span className="hidden sm:inline">Offline</span></>}
      {syncStatus === 'error' && <><AlertCircle className="h-3 w-3 text-red-500" /> <span className="hidden sm:inline">Sync Error</span></>}
    </div>
  );
}
