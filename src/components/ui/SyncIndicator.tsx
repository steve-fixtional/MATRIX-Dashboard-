import { useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, AlertTriangle, FileWarning, UploadCloud } from 'lucide-react';
import { useSyncState } from '../../store/SyncContext';

export function SyncIndicator() {
  const { syncStatus, requestSync, error, pendingCount } = useSyncState();

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
    <div className="flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 transition-colors">
      {(syncStatus === 'synced' || syncStatus === 'idle') && pendingCount === 0 && (
        <><Cloud className="h-3 w-3 text-green-500" /> <span className="hidden sm:inline">Synced</span></>
      )}
      {(syncStatus === 'synced' || syncStatus === 'idle' || syncStatus === 'pending_changes') && pendingCount > 0 && (
        <><UploadCloud className="h-3 w-3 text-blue-400" /> <span className="hidden sm:inline">Pending ({pendingCount})</span></>
      )}
      {syncStatus === 'syncing' && (
        <><RefreshCw className="h-3 w-3 text-blue-500 animate-spin" /> <span className="hidden sm:inline">Syncing</span></>
      )}
      {syncStatus === 'offline' && (
        <><CloudOff className="h-3 w-3 text-neutral-400" /> <span className="hidden sm:inline">Offline {pendingCount > 0 && `(${pendingCount} pending)`}</span></>
      )}
      {syncStatus === 'conflict_detected' && (
        <><FileWarning className="h-3 w-3 text-amber-500" /> <span className="hidden sm:inline">Conflict Resolved</span></>
      )}
      {syncStatus === 'auth_required' && (
        <><AlertTriangle className="h-3 w-3 text-amber-500" /> <span className="hidden sm:inline">Sign In Required</span></>
      )}
      {syncStatus === 'sync_failed' && (
        <button 
          onClick={requestSync}
          className="flex items-center gap-1.5 hover:text-red-600 dark:hover:text-red-400 transition-colors group outline-none"
          title={error ? error.message : 'Sync Failed. Click to retry.'}
        >
          <AlertCircle className="h-3 w-3 text-red-500 group-hover:scale-110 transition-transform" /> 
          <span className="hidden sm:inline">Sync Failed (Retry)</span>
        </button>
      )}
    </div>
  );
}
