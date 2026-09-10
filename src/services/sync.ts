import { getDB } from './db';
import { db, auth } from './firebase';
import { collection, doc, getDocs, setDoc, query, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { BaseEntity } from '../domain/types';
import { isClipboardSyncEnabled } from './clipboardService';

type CollectionName = 'notes' | 'tasks' | 'events' | 'clipboard';

export class SyncEngine {
  private isSyncing = false;
  public onSyncStateChange?: (state: 'synced' | 'syncing' | 'offline' | 'error') => void;
  private retryTimeout: number | null = null;
  private baseDelay = 1000;

  constructor(onSyncStateChange?: (state: 'synced' | 'syncing' | 'offline' | 'error') => void) {
    this.onSyncStateChange = onSyncStateChange;
    window.addEventListener('online', () => {
      this.baseDelay = 1000;
      this.syncAll();
    });
  }

  private notify(state: 'synced' | 'syncing' | 'offline' | 'error') {
    if (this.onSyncStateChange) {
      this.onSyncStateChange(state);
    }
  }

  private scheduleRetry() {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.retryTimeout = window.setTimeout(() => {
      this.syncAll();
    }, this.baseDelay);
    this.baseDelay = Math.min(this.baseDelay * 2, 60000); // Exponential backoff up to 1 min
  }

  async syncAll() {
    if (this.isSyncing) return;
    const user = auth.currentUser;
    if (!user) return; // offline or not logged in
    if (!navigator.onLine) {
      this.notify('offline');
      return;
    }

    this.isSyncing = true;
    this.notify('syncing');

    try {
      await this.syncCollection('notes');
      await this.syncCollection('tasks');
      await this.syncCollection('events');
      if (isClipboardSyncEnabled()) {
        await this.syncCollection('clipboard');
      }
      this.notify('synced');
      this.baseDelay = 1000; // Reset backoff on success
    } catch (error) {
      console.error('Sync error:', error);
      this.notify('error');
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
    for (const remote of remoteChanges) {
      const localPending = pendingMap.get(remote.id);
      
      if (localPending) {
        // CONFLICT DETECTED
        // Deterministic resolution: Remote Wins, Local appended to _conflicts
        const resolved: any = { ...remote };
        resolved._conflicts = [...(resolved._conflicts || []), localPending];
        resolved.syncStatus = 'pending_update'; // Need to sync the conflict back to remote eventually
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

    // 5. Push Local Operations
    // Some pending might have been resolved to conflicts above, push those too
    const batch = writeBatch(db);
    let hasRemoteWrites = false;
    
    // Only push if we still have pending items that need pushing
    const toPush = Array.from(pendingMap.values());
    
    for (const local of toPush) {
      // Create a clean object for remote (strip syncStatus, syncError)
      const { syncStatus, syncError, ...remoteObj } = local as any;
      const docRef = doc(db, `users/${userId}/${collectionName}/${local.id}`);
      
      batch.set(docRef, remoteObj);
      hasRemoteWrites = true;
      
      // Update local to synchronized (it will be saved below after commit)
      local.syncStatus = 'synchronized';
    }
    
    if (hasRemoteWrites) {
      await batch.commit();
      // After successful remote write, update local DB to 'synchronized'
      for (const local of toPush) {
        if (local.deletedAt && local.syncStatus === 'synchronized') {
            // We soft-deleted it, we can keep it as synchronized deleted, or hard delete it locally. 
            // We'll keep it soft-deleted for now.
        }
        await store.put(local as any);
      }
    }
    
    await tx.done;

    // 6. Update last sync time
    await localDb.put('syncMeta', { key: collectionName, lastSyncedAt: Date.now() });
  }
}

export const syncEngine = new SyncEngine();

export function requestSync() {
  syncEngine.syncAll().catch(console.error);
}
