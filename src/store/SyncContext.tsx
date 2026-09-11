import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { syncEngine, SyncStateString } from '../services/sync';
import { crossTabSync } from '../services/crossTabSync';
import { useAuth } from './AuthContext';

interface SyncContextType {
  isOnline: boolean;
  syncStatus: SyncStateString | 'idle';
  pendingCount: number;
  lastSyncedAt: number | null;
  error: Error | null;
  requestSync: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStateString | 'idle'>('idle');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Save existing listener to restore if needed
    const prevListener = syncEngine.onSyncStateChange;

    const handleStateChange = (state: SyncStateString, err?: Error) => {
      setSyncStatus(state);
      if (err) {
        setError(err);
      } else if (state === 'synced') {
        setError(null);
      }
      
      // Update pending count and lastSyncedAt
      syncEngine.getPendingCount().then(setPendingCount).catch(console.error);
      syncEngine.getLastSyncedAt().then(setLastSyncedAt).catch(console.error);
    };

    // Override the syncEngine listener
    syncEngine.onSyncStateChange = handleStateChange;
    
    // Initial fetch
    syncEngine.getPendingCount().then(setPendingCount).catch(console.error);
    syncEngine.getLastSyncedAt().then(setLastSyncedAt).catch(console.error);

    // Cross-tab data change listener to update counts
    const unsubscribeData = crossTabSync.onDataChange(() => {
      syncEngine.getPendingCount().then(setPendingCount).catch(console.error);
      syncEngine.getLastSyncedAt().then(setLastSyncedAt).catch(console.error);
    });

    const unsubscribeSync = crossTabSync.onSyncState((event) => {
      if (event.lastSyncedAt) setLastSyncedAt(event.lastSyncedAt);
      if (typeof event.pendingCount === 'number') setPendingCount(event.pendingCount);
      if (event.status && event.status !== 'syncing') setSyncStatus(event.status as SyncStateString);
    });

    return () => {
      if (syncEngine.onSyncStateChange === handleStateChange) {
        syncEngine.onSyncStateChange = prevListener;
      }
      unsubscribeData();
      unsubscribeSync();
    };
  }, []);

  useEffect(() => {
    if (user && isOnline) {
      syncEngine.syncAll().catch(err => {
        console.warn('[SyncContext] Background sync notice:', err?.message || err);
      });
    }
  }, [user, isOnline]);

  const requestSync = useCallback(() => {
    setError(null);
    syncEngine.resetRetryBackoff();
    syncEngine.syncAll().catch(err => {
      console.warn('[SyncContext] Manual sync notice:', err?.message || err);
    });
  }, []);

  const value = useMemo(() => ({
    isOnline,
    syncStatus,
    pendingCount,
    lastSyncedAt,
    error,
    requestSync
  }), [isOnline, syncStatus, pendingCount, lastSyncedAt, error, requestSync]);

  return (
    <SyncContext.Provider value={value}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncState() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSyncState must be used within a SyncProvider');
  }
  return context;
}
