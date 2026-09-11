import { useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, AlertTriangle, FileWarning, UploadCloud } from 'lucide-react';
import { useSyncState } from '../../store/SyncContext';

export function SyncIndicator() {
  const { syncStatus, requestSync, error, pendingCount, isOnline } = useSyncState();

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
    <button
      onClick={requestSync}
      disabled={syncStatus === 'syncing'}
      title={
        error
          ? `Sync Notice: ${error.message} (Click to refresh)`
          : syncStatus === 'syncing'
          ? 'Synchronizing...'
          : 'Click to synchronize now'
      }
      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer outline-none select-none"
    >
      {(syncStatus === 'synced' || syncStatus === 'idle') && pendingCount === 0 && (
        <>
          <Cloud className="h-3.5 w-3.5 text-emerald-500" />
          <span className="hidden sm:inline">Synced</span>
        </>
      )}

      {(syncStatus === 'synced' || syncStatus === 'idle' || syncStatus === 'pending_changes') && pendingCount > 0 && (
        <>
          <UploadCloud className="h-3.5 w-3.5 text-blue-500" />
          <span className="hidden sm:inline">Pending ({pendingCount})</span>
        </>
      )}

      {syncStatus === 'syncing' && (
        <>
          <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />
          <span className="hidden sm:inline">Syncing...</span>
        </>
      )}

      {(!isOnline || syncStatus === 'offline') && (
        <>
          <CloudOff className="h-3.5 w-3.5 text-neutral-400" />
          <span className="hidden sm:inline">Offline {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
        </>
      )}

      {syncStatus === 'conflict_detected' && (
        <>
          <FileWarning className="h-3.5 w-3.5 text-amber-500" />
          <span className="hidden sm:inline">Conflict Resolved</span>
        </>
      )}

      {syncStatus === 'auth_required' && (
        <>
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span className="hidden sm:inline">Local Mode</span>
        </>
      )}

      {syncStatus === 'sync_failed' && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          <span className="hidden sm:inline">Sync (Retry)</span>
        </>
      )}
    </button>
  );
}
