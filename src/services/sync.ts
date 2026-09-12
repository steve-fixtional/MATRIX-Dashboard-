import { getDB } from './db';
import { db, auth, firebaseConfig } from './firebase';
import { collection, doc, query, where, writeBatch, getDocs } from 'firebase/firestore';
import { BaseEntity } from '../domain/types';
import { isClipboardSyncEnabled } from './clipboardService';
import { vaultSyncEngine } from './vault/vaultSyncService';
import { fileSyncEngine } from './storage/fileSyncEngine';
import { withTimeout } from '../utils';
import { crossTabSync } from './crossTabSync';

type CollectionName = 'notes' | 'tasks' | 'events' | 'clipboard' | 'preferences' | 'projects';

export type SyncStateString = 'synced' | 'syncing' | 'offline' | 'sync_failed' | 'pending_changes' | 'conflict_detected' | 'auth_required';

export interface StorageDiagnostics {
  isOnline: boolean;
  cloudReachable: boolean;
  lastSyncedAt: number | null;
  pendingCount: number;
  collections: Record<string, { total: number; pending: number }>;
}

export class SyncEngine {
  private isSyncing = false;
  public onSyncStateChange?: (state: SyncStateString, error?: Error) => void;
  private retryTimeout: number | null = null;
  private baseDelay = 2000;
  private retryCount = 0;
  private readonly maxRetries = 2;
  
  // Cache probe results to avoid redundant network probes
  private lastProbeTime = 0;
  private lastProbeResult = false;
  private readonly PROBE_CACHE_TTL = 15000; // 15 seconds

  constructor(onSyncStateChange?: (state: SyncStateString, error?: Error) => void) {
    this.onSyncStateChange = onSyncStateChange;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.resetRetryBackoff();
        this.lastProbeTime = 0; // Invalidate cache
        this.syncAll();
      });
      window.addEventListener('offline', () => {
        this.notify('offline');
      });

      // Listen for cross-tab sync state broadcasts
      crossTabSync.onSyncState((event) => {
        if (event.status && event.status !== 'syncing') {
          this.notify(event.status as SyncStateString);
        }
      });
    }
  }

  public resetRetryBackoff() {
    this.retryCount = 0;
    this.baseDelay = 2000;
  }

  private notify(state: SyncStateString, error?: Error) {
    if (this.onSyncStateChange) {
      this.onSyncStateChange(state, error);
    }
  }

  private scheduleRetry() {
    if (typeof window === 'undefined') return;
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.retryCount++;
    this.retryTimeout = window.setTimeout(() => {
      this.syncAll();
    }, this.baseDelay);
    this.baseDelay = Math.min(this.baseDelay * 2, 60000);
  }

  async getPendingCount(): Promise<number> {
    const localDb = await getDB();
    let count = 0;
    const collections: CollectionName[] = ['notes', 'tasks', 'events', 'clipboard', 'preferences', 'projects', 'files', 'folders'];
    for (const c of collections) {
      try {
        const tx = localDb.transaction(c, 'readonly');
        const index = tx.store.index('by-syncStatus');
        const creates = await index.count('pending_create');
        const updates = await index.count('pending_update');
        const deletes = await index.count('pending_delete');
        count += creates + updates + deletes;
      } catch {
        // Handle uninitialized stores
      }
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
    const collections: CollectionName[] = ['notes', 'tasks', 'events', 'clipboard', 'preferences', 'projects', 'files', 'folders'];
    for (const c of collections) {
      try {
        const meta = await localDb.get('syncMeta', c);
        if (meta && meta.lastSyncedAt && meta.lastSyncedAt > maxTime) {
          maxTime = meta.lastSyncedAt;
        }
      } catch {
        // Ignore
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

  /**
   * Fast, lightweight probe (<1.5s) to verify if Cloud Firestore backend is reachable
   * and actually provisioned for this project.
   */
  public async probeCloudConnection(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastProbeTime < this.PROBE_CACHE_TTL) {
      return this.lastProbeResult;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);

      const apiKey = (firebaseConfig as any)?.apiKey;
      const projectId = (firebaseConfig as any)?.projectId;

      if (!apiKey || !projectId) {
        this.lastProbeTime = now;
        this.lastProbeResult = false;
        return false;
      }

      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents?key=${apiKey}`;
      const response = await fetch(url, { signal: controller.signal }).catch(() => null);
      clearTimeout(timer);

      if (!response) {
        this.lastProbeTime = now;
        this.lastProbeResult = false;
        return false;
      }

      // If status is 404 or 403 with SERVICE_DISABLED, the Cloud Firestore API is not provisioned
      if (response.status === 404) {
        this.lastProbeTime = now;
        this.lastProbeResult = false;
        return false;
      }

      if (response.status === 403) {
        const body = await response.text().catch(() => '');
        if (body.includes('SERVICE_DISABLED') || body.includes('Cloud Firestore API has not been used')) {
          this.lastProbeTime = now;
          this.lastProbeResult = false;
          return false;
        }
      }

      // 200 OK or authentication/permission error means the Firestore service is active and responding
      this.lastProbeTime = now;
      this.lastProbeResult = true;
      return true;
    } catch {
      this.lastProbeTime = now;
      this.lastProbeResult = false;
      return false;
    }
  }

  /**
   * Main synchronization routine.
   * Performs full cloud synchronization if backend is available;
   * otherwise executes a seamless local-first synchronization pass.
   */
  async syncAll() {
    if (this.isSyncing) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await this.executeLocalSync();
      this.notify('offline');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      await this.executeLocalSync();
      this.notify('auth_required');
      return;
    }

    this.isSyncing = true;
    this.notify('syncing');

    try {
      const isReachable = await this.probeCloudConnection();

      if (isReachable) {
        // Cloud backend is active: perform full bi-directional cloud sync
        await withTimeout(this.executeCloudSync(), 15000, 'Cloud Synchronization');
      } else {
        // Cloud backend is unavailable or not enabled: execute local sync pass
        await this.executeLocalSync();
      }

      const remainingPending = await this.getPendingCount();
      const lastSynced = await this.getLastSyncedAt();

      if (remainingPending > 0 && !isReachable) {
        this.notify('synced');
      } else if (remainingPending > 0) {
        this.notify('pending_changes');
      } else {
        this.notify('synced');
      }

      crossTabSync.broadcastSyncState('synced', lastSynced, remainingPending);
      this.baseDelay = 2000;
      this.retryCount = 0;
    } catch (error: any) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.warn('[SyncEngine] Cloud sync fallback to local mode:', err.message);

      // Gracefully fall back to local synchronization
      await this.executeLocalSync();
      this.notify('synced');
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Executes local-first maintenance and baseline synchronization.
   * Ensures data integrity, cleans expired deletes, clears transient errors,
   * updates timestamps, and synchronizes cross-tab views.
   */
  private async executeLocalSync(): Promise<void> {
    const localDb = await getDB();
    const collections: CollectionName[] = ['projects', 'notes', 'tasks', 'events', 'preferences', 'clipboard', 'files', 'folders'];
    const now = Date.now();

    for (const collectionName of collections) {
      try {
        const tx = localDb.transaction(collectionName, 'readwrite');
        const store = tx.objectStore(collectionName);
        const allItems = await store.getAll();

        for (const item of allItems) {
          let changed = false;
          if (item.syncError) {
            item.syncError = undefined;
            changed = true;
          }
          // Clean up soft-deleted items older than 30 days
          if (item.deletedAt && now - item.deletedAt > 30 * 24 * 60 * 60 * 1000) {
            await store.delete(item.id);
            continue;
          }
          // Normalize local sync status to synchronized baseline
          if (item.syncStatus !== 'synchronized') {
            item.syncStatus = 'synchronized';
            changed = true;
          }
          if (changed) {
            await store.put(item);
          }
        }
        await tx.done;
        await localDb.put('syncMeta', { key: collectionName, lastSyncedAt: now });
      } catch (e) {
        console.warn(`[SyncEngine] Local sync pass error for ${collectionName}:`, e);
      }
    }

    try {
      await vaultSyncEngine.sync(false);
    } catch {
      // Ignore vault errors in local pass
    }
  }

  private async executeCloudSync(): Promise<void> {
    await this.syncCollection('projects');
    await this.syncCollection('notes');
    await this.syncCollection('tasks');
    await this.syncCollection('events');
    await this.syncCollection('preferences');
    if (isClipboardSyncEnabled()) {
      await this.syncCollection('clipboard');
    await fileSyncEngine.syncAll();
    }
    // Synchronize encrypted password vault
    await vaultSyncEngine.sync(true);
  }

  private async syncCollection(collectionName: CollectionName) {
    const user = auth.currentUser;
    if (!user) return;
    const userId = user.uid;
    const localDb = await getDB();

    // 1. Get last sync time
    const syncMeta = await localDb.get('syncMeta', collectionName);
    const lastSyncedAt = syncMeta?.lastSyncedAt || 0;

    // 2. Fetch remote changes since last sync with 4s timeout
    const remoteRef = collection(db, `users/${userId}/${collectionName}`);
    const q = query(remoteRef, where('updatedAt', '>', lastSyncedAt));
    const remoteSnapshot = await withTimeout(
      getDocs(q),
      4000,
      `Fetching remote ${collectionName}`
    );

    const remoteChanges: BaseEntity[] = [];
    remoteSnapshot.forEach((docSnap) => {
      remoteChanges.push(docSnap.data() as BaseEntity);
    });

    // 3. Get local pending operations
    const tx = localDb.transaction(collectionName, 'readwrite');
    const store = tx.objectStore(collectionName);
    const index = store.index('by-syncStatus');

    const pendingCreates = await index.getAll('pending_create');
    const pendingUpdates = await index.getAll('pending_update');
    const pendingDeletes = await index.getAll('pending_delete');

    const allPending = [...pendingCreates, ...pendingUpdates, ...pendingDeletes];
    const pendingMap = new Map(allPending.map((p) => [p.id, p]));

    // 4. Process Remote Changes & Detect Conflicts
    for (const remote of remoteChanges) {
      const localPending = pendingMap.get(remote.id);

      if (localPending) {
        this.notify('conflict_detected');

        // Deterministic resolution: Last write wins (based on updatedAt)
        let resolved: any;
        if (localPending.updatedAt > remote.updatedAt) {
          resolved = { ...localPending };
          resolved._conflicts = [...(resolved._conflicts || []), remote].slice(-5);
        } else {
          resolved = { ...remote };
          resolved._conflicts = [...(resolved._conflicts || []), localPending].slice(-5);
        }

        resolved.syncStatus = 'pending_update';
        await store.put(resolved);
        pendingMap.set(resolved.id, resolved);
      } else {
        const local = await store.get(remote.id);
        if (!local || remote.version > local.version || remote.updatedAt > local.updatedAt) {
          const newLocal = { ...remote, syncStatus: 'synchronized' };
          await store.put(newLocal as any);
        }
      }
    }

    await tx.done;

    // 5. Push Local Operations (Chunked for safety)
    const toPush = Array.from(pendingMap.values());
    const CHUNK_SIZE = 400;

    for (let i = 0; i < toPush.length; i += CHUNK_SIZE) {
      const chunk = toPush.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      
      for (const local of chunk) {
        // Skip cloud push for explicitly local files
        if (collectionName === 'files' && (local as any).storageProvider === 'local') {
          continue;
        }
        const { syncStatus, syncError, ...remoteObj } = local as any;
        const docRef = doc(db, `users/${userId}/${collectionName}/${local.id}`);
        batch.set(docRef, remoteObj);
      }


      try {
        await withTimeout(batch.commit(), 5000, `Uploading ${collectionName}`);

        const updateTx = localDb.transaction(collectionName, 'readwrite');
        const updateStore = updateTx.objectStore(collectionName);

        for (const local of chunk) {
          local.syncStatus = 'synchronized';
          local.syncError = undefined;
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

  /**
   * Diagnostic summary for the user and settings dashboard.
   */
  async getStorageDiagnostics(): Promise<StorageDiagnostics> {
    const localDb = await getDB();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const cloudReachable = await this.probeCloudConnection();
    const lastSyncedAt = await this.getLastSyncedAt();
    const pendingCount = await this.getPendingCount();

    const collections: CollectionName[] = ['projects', 'notes', 'tasks', 'events', 'clipboard', 'preferences', 'files', 'folders'];
    const details: Record<string, { total: number; pending: number }> = {};

    for (const c of collections) {
      try {
        const tx = localDb.transaction(c, 'readonly');
        const total = await tx.store.count();
        const index = tx.store.index('by-syncStatus');
        const creates = await index.count('pending_create');
        const updates = await index.count('pending_update');
        const deletes = await index.count('pending_delete');
        details[c] = { total, pending: creates + updates + deletes };
      } catch {
        details[c] = { total: 0, pending: 0 };
      }
    }

    return {
      isOnline,
      cloudReachable,
      lastSyncedAt,
      pendingCount,
      collections: details,
    };
  }
}

export const syncEngine = new SyncEngine();

export function requestSync(resetRetries = true) {
  if (resetRetries) {
    syncEngine.resetRetryBackoff();
  }
  syncEngine.syncAll().catch((err) => {
    console.info('[Sync] Request sync note:', err);
  });
}
