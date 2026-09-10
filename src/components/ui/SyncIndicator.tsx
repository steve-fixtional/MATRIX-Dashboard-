import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { syncEngine } from '../../services/sync';

export function SyncIndicator() {
  const [state, setState] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');

  useEffect(() => {
    // Subscribe to state changes
    syncEngine.onSyncStateChange = setState;

    // Initial sync
    syncEngine.syncAll();
    
    const interval = setInterval(() => {
      syncEngine.syncAll();
    }, 60000); // Sync every minute

    return () => {
      clearInterval(interval);
      syncEngine.onSyncStateChange = undefined;
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400">
      {state === 'synced' && <><Cloud className="h-3 w-3 text-green-500" /> <span className="hidden sm:inline">Synced</span></>}
      {state === 'syncing' && <><RefreshCw className="h-3 w-3 text-blue-500 animate-spin" /> <span className="hidden sm:inline">Syncing</span></>}
      {state === 'offline' && <><CloudOff className="h-3 w-3 text-neutral-400" /> <span className="hidden sm:inline">Offline</span></>}
      {state === 'error' && <><AlertCircle className="h-3 w-3 text-red-500" /> <span className="hidden sm:inline">Sync Error</span></>}
    </div>
  );
}
