import { getDB } from './db';
import { db, auth } from './firebase';
import { collection, doc, getDocs, setDoc, query, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { BaseEntity } from '../domain/types';
import { isClipboardSyncEnabled } from './clipboardService';
import { vaultSyncEngine } from './vault/vaultSyncService';

type CollectionName = 'notes' | 'tasks' | 'events' | 'clipboard' | 'preferences' | 'projects';

export type SyncStateString = 'synced' | 'syncing' | 'offline' | 'sync_failed' | 'pending_changes' | 'conflict_detected' | 'auth_required';

export class SyncEngine {
  private isSyncing = false;
  public onSyncStateChange?: (state: SyncStateString, error?: Error) => void;
  private retryTimeout: number | null = null;
  private baseDelay = 1000;

  constructor(onSyncStateChange?: (state: SyncStateString, error?: Error) => void) {
    this.onSyncStateChange = onSyncStateChange;
    window.addEventListener('online', () => {
      this.baseDelay = 1000;
      this.syncAll();
    });
  }

  private notify(state: SyncStateString, error?: Error) {
    if (this.onSyncStateChange) {
      this.onSyncStateChange(state, error);
    }
  }

  private scheduleRetry() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.retryTimeout = window.setTimeout(() => {
      this.syncAll();
    }, this.baseDelay);
    this.baseDelay = Math.min(this.baseDelay * 2, 60000); // Exponential backoff up to 1 min
  }

  async getPendingCount(): Promise<number> {
    const localDb = await getDB();
    let count = 0;
    const collections: CollectionName[] = ['notes', 'tasks', 'events', 'clipboard', 'preferences', 'projects'];
    for (const c of collections) {
      const tx = localDb.transaction(c, 'readonly');
      const index = tx.store.index('by-syncStatus');
      const creates = await index.count('pending_create');
      const updates = await index.count('pending_update');
      const deletes = await index.count('pending_delete');
      count += creates + updates + deletes;
    }
    try {
      count += await vaultSyncEngine.getPendingCount();
    } catch {
      // Ignore if vault tables not ready
    }
    return count;
  }

  async getLastSyncedAt(): Promise<number | null> {
    const localDb = await getDB();
    let maxTime = 0;
    const collections: CollectionName[] = ['notes', 'tasks', 'events', 'clipboard', 'preferences', 'projects'];
    for (const c of collections) {
      const meta = await localDb.get('syncMeta', c);
      if (meta && meta.lastSyncedAt && meta.lastSyncedAt > maxTime) {
        maxTime = meta.lastSyncedAt;
      }
    }
    try {
      const vaultTime = await vaultSyncEngine.getLastSyncedAt();
      if (vaultTime && vaultTime > maxTime) {
        maxTime = vaultTime;
      }
    } catch {
      // Ignore
    }
    return maxTime === 0 ? null : maxTime;
  }

  async syncAll() {
    if (this.isSyncing) return;
    const user = auth.currentUser;
    if (!user) {
      this.notify('auth_required');
      return; 
    }
    if (!navigator.onLine) {
      this.notify('offline');
      return;
    }

    this.isSyncing = true;
    this.notify('syncing');

    try {
      await this.syncCollection('projects');
      await this.syncCollection('notes');
      await this.syncCollection('tasks');
      await this.syncCollection('events');
      await this.syncCollection('preferences');
      if (isClipboardSyncEnabled()) {
        await this.syncCollection('clipboard');
      }
      // Synchronize encrypted password vault
      await vaultSyncEngine.sync();
      
      const remainingPending = await this.getPendingCount();
      if (remainingPending > 0) {
        this.notify('pending_changes');
      } else {
        this.notify('synced');
      }
      
      this.baseDelay = 1000; // Reset backoff on success
    } catch (error: any) {
      console.error('Sync error:', error);
      this.notify('sync_failed', error instanceof Error ? error : new Error(String(error)));
      this.scheduleRetry();
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncCollection(collectionName: CollectionName) {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
    const localDb = await getDB();
    
    // 1. Get last sync time
    const syncMeta = await localDb.get('syncMeta', collectionName);
    const lastSyncedAt = syncMeta?.lastSyncedAt || 0;

    // 2. Fetch remote changes since last sync
    const remoteRef = collection(db, `users/${userId}/${collectionName}`);
    const q = query(remoteRef, where('updatedAt', '>', lastSyncedAt));
    const remoteSnapshot = await getDocs(q);
    
    const remoteChanges: BaseEntity[] = [];
    remoteSnapshot.forEach(docSnap => {
      remoteChanges.push(docSnap.data() as BaseEntity);
    });
    const remoteMap = new Map(remoteChanges.map(r => [r.id, r]));

    // 3. Get local pending operations
    const tx = localDb.transaction(collectionName, 'readwrite');
    const store = tx.objectStore(collectionName);
    const index = store.index('by-syncStatus');
    
    const pendingCreates = await index.getAll('pending_create');
    const pendingUpdates = await index.getAll('pending_update');
    const pendingDeletes = await index.getAll('pending_delete');
    
    const allPending = [...pendingCreates, ...pendingUpdates, ...pendingDeletes];
    const pendingMap = new Map(allPending.map(p => [p.id, p]));

    // 4. Process Remote Changes & Detect Conflicts
    let hasConflicts = false;
    for (const remote of remoteChanges) {
      const localPending = pendingMap.get(remote.id);
      
      if (localPending) {
        // CONFLICT DETECTED
        hasConflicts = true;
        this.notify('conflict_detected');
        
        // Deterministic resolution: Last write wins (based on updatedAt)
        // Store the loser in _conflicts array so we never silently destroy data
        let resolved: any;
        if (localPending.updatedAt > remote.updatedAt) {
          // Local wins
          resolved = { ...localPending };
          resolved._conflicts = [...(resolved._conflicts || []), remote].slice(-5);
        } else {
          // Remote wins
          resolved = { ...remote };
          resolved._conflicts = [...(resolved._conflicts || []), localPending].slice(-5);
        }
        
        resolved.syncStatus = 'pending_update'; // Need to sync the conflict resolution back to remote
        await store.put(resolved);
        // We update our pending map so we push the resolved conflict next
        pendingMap.set(resolved.id, resolved); 
      } else {
        // No conflict, just pull remote
        const local = await store.get(remote.id);
        if (!local || remote.version > local.version || remote.updatedAt > local.updatedAt) {
          const newLocal = { ...remote, syncStatus: 'synchronized' };
          await store.put(newLocal as any);
        }
      }
    }

    // Finish all local read/writes for the pending list and conflict resolution
    // We MUST close this IndexedDB transaction before awaiting a network call (batch.commit)
    // otherwise the IDB transaction will auto-close due to inactivity and throw TransactionInactiveError.
    await tx.done;

    // 5. Push Local Operations (Chunked for safety)
    // Some pending might have been resolved to conflicts above, push those too
    const toPush = Array.from(pendingMap.values());
    const CHUNK_SIZE = 400;

    for (let i = 0; i < toPush.length; i += CHUNK_SIZE) {
      const chunk = toPush.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      
      for (const local of chunk) {
        // Create a clean object for remote (strip syncStatus, syncError)
        const { syncStatus, syncError, ...remoteObj } = local as any;
        const docRef = doc(db, `users/${userId}/${collectionName}/${local.id}`);
        
        batch.set(docRef, remoteObj);
      }
      
      // Await network commit. If this fails, the error propagates up, the loop aborts,
      // and subsequent chunks are NOT processed. Failed chunks remain in 'pending_*' state.
      try {
        await batch.commit();
        
        // After successful remote write, update local DB to 'synchronized'
        // We use a fresh transaction since the original one is closed
        const updateTx = localDb.transaction(collectionName, 'readwrite');
        const updateStore = updateTx.objectStore(collectionName);
  
        for (const local of chunk) {
          local.syncStatus = 'synchronized';
          local.syncError = undefined;
          if (local.deletedAt && local.syncStatus === 'synchronized') {
              // We soft-deleted it, we can keep it as synchronized deleted, or hard delete it locally. 
              // We'll keep it soft-deleted for now.
          }
          await updateStore.put(local as any);
        }
        await updateTx.done;
      } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const errTx = localDb.transaction(collectionName, 'readwrite');
        const errStore = errTx.objectStore(collectionName);
        for (const local of chunk) {
          local.syncError = errorMsg;
          await errStore.put(local as any);
        }
        await errTx.done;
        throw err;
      }
    }

    // 6. Update last sync time
    await localDb.put('syncMeta', { key: collectionName, lastSyncedAt: Date.now() });
  }
}

export const syncEngine = new SyncEngine();

export function requestSync() {
  syncEngine.syncAll().catch(console.error);
}
