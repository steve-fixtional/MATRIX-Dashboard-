/**
 * Cross-Tab Synchronization Service
 * Coordinates real-time updates and synchronization events across browser tabs
 * using BroadcastChannel with graceful fallback.
 */

export interface DataChangeEvent {
  storeName: string;
  id: string;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
}

export interface SyncBroadcastEvent {
  status: string;
  lastSyncedAt: number | null;
  pendingCount?: number;
  timestamp: number;
}

type DataChangeCallback = (event: DataChangeEvent) => void;
type SyncCallback = (event: SyncBroadcastEvent) => void;

class CrossTabSyncService {
  private channel: BroadcastChannel | null = null;
  private dataChangeListeners: Set<DataChangeCallback> = new Set();
  private syncListeners: Set<SyncCallback> = new Set();
  private isSupported = typeof window !== 'undefined' && 'BroadcastChannel' in window;

  constructor() {
    if (this.isSupported) {
      try {
        this.channel = new BroadcastChannel('matrix-cross-tab-sync');
        this.channel.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (err) {
        console.warn('[CrossTabSync] BroadcastChannel init failed:', err);
      }
    }

    // Fallback using storage events if BroadcastChannel is not active
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'matrix-sync-event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.handleMessage(data);
          } catch {
            // Ignore malformed storage events
          }
        }
      });
    }
  }

  private handleMessage(data: any) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'DATA_CHANGE') {
      const event: DataChangeEvent = {
        storeName: data.storeName,
        id: data.id,
        action: data.action,
        timestamp: data.timestamp || Date.now()
      };
      this.dataChangeListeners.forEach(cb => {
        try { cb(event); } catch (e) { console.error('[CrossTabSync] Callback error:', e); }
      });
    } else if (data.type === 'SYNC_STATE') {
      const event: SyncBroadcastEvent = {
        status: data.status,
        lastSyncedAt: data.lastSyncedAt,
        pendingCount: data.pendingCount,
        timestamp: data.timestamp || Date.now()
      };
      this.syncListeners.forEach(cb => {
        try { cb(event); } catch (e) { console.error('[CrossTabSync] Sync callback error:', e); }
      });
    }
  }

  /**
   * Broadcasts a data change event to all other open tabs.
   */
  broadcastDataChange(storeName: string, id: string, action: 'create' | 'update' | 'delete') {
    const payload = {
      type: 'DATA_CHANGE',
      storeName,
      id,
      action,
      timestamp: Date.now()
    };

    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (e) {
        console.warn('[CrossTabSync] postMessage error:', e);
      }
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('matrix-sync-event', JSON.stringify(payload));
      } catch {
        // Ignore quota errors
      }
    }
  }

  /**
   * Broadcasts sync state update to all open tabs.
   */
  broadcastSyncState(status: string, lastSyncedAt: number | null, pendingCount?: number) {
    const payload = {
      type: 'SYNC_STATE',
      status,
      lastSyncedAt,
      pendingCount,
      timestamp: Date.now()
    };

    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (e) {
        console.warn('[CrossTabSync] postMessage error:', e);
      }
    }
  }

  /**
   * Subscribes to data change events across tabs.
   */
  onDataChange(callback: DataChangeCallback): () => void {
    this.dataChangeListeners.add(callback);
    return () => {
      this.dataChangeListeners.delete(callback);
    };
  }

  /**
   * Subscribes to sync state events across tabs.
   */
  onSyncState(callback: SyncCallback): () => void {
    this.syncListeners.add(callback);
    return () => {
      this.syncListeners.delete(callback);
    };
  }
}

export const crossTabSync = new CrossTabSyncService();
