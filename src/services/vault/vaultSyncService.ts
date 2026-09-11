/**
 * MATRIX Password Vault - Encrypted Synchronization Service
 * 
 * STRICT ZERO-KNOWLEDGE SPECIFICATION:
 * - Firebase/Firestore acts solely as an encrypted blob store.
 * - Firebase NEVER receives Master Password, Master Key, plaintext Vault Key,
 *   plaintext passwords, plaintext usernames, notes, URLs, or decrypted payloads.
 * - All synchronization operations transmit ONLY encrypted ciphertext, IVs,
 *   cryptographic salt, iteration count, version numbers, and record IDs.
 * - Never silently overwrite newer data with stale data.
 * - Corrupted records (bad ciphertext, invalid IV, tampered AAD) are rejected.
 * - Conflict detection preserves data history without silent loss.
 * - No server-side decryption endpoints, backend password verifiers, or recovery keys.
 */

import { collection, doc, getDocFromServer, getDocs, getDocsFromServer, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getDB } from '../db';
import {
  CURRENT_VAULT_VERSION,
  CURRENT_RECORD_SCHEMA_VERSION,
  GCM_IV_BYTE_LENGTH,
  StoredVaultRecord,
  StoredVaultMeta,
  CorruptedRecordError,
  CorruptedEVKError,
  VaultError,
} from '../../domain/vaultTypes';
import {
  PRIMARY_VAULT_META_ID,
  validateVaultMetaStructure,
  getStoredVaultMeta,
} from './vaultStorageService';
import { base64ToBytes } from './crypto';
import { withTimeout } from '../../utils';

export type VaultSyncState =
  | 'synced'
  | 'syncing'
  | 'offline'
  | 'sync_failed'
  | 'pending_changes'
  | 'conflict_detected'
  | 'auth_required'
  | 'corrupted_detected';

/**
 * Validates that an item payload strictly adheres to Zero-Knowledge principles.
 * Throws a critical security error if ANY plaintext field is present.
 */
export function assertZeroKnowledgeRecord(record: any): void {
  if (!record || typeof record !== 'object') {
    throw new VaultError('Invalid vault item: record must be an object.');
  }

  const forbiddenPlaintextFields = [
    'title',
    'username',
    'password',
    'url',
    'notes',
    'strengthScore',
    'customFields',
    'masterPassword',
    'masterKey',
    'vaultKey',
    'rawKey',
  ];

  for (const field of forbiddenPlaintextFields) {
    if (record[field] !== undefined) {
      throw new VaultError(
        `CRITICAL SECURITY VIOLATION: Plaintext field '${field}' detected in vault sync payload. Transmit aborted.`
      );
    }
  }

  if (typeof record.id !== 'string' || !record.id) {
    throw new VaultError('Invalid vault record: missing record ID.');
  }
  if (typeof record.iv !== 'string' || !record.iv) {
    throw new VaultError('Invalid vault record: missing IV.');
  }
  if (typeof record.ciphertext !== 'string' || !record.ciphertext) {
    throw new VaultError('Invalid vault record: missing ciphertext.');
  }
}

/**
 * Validates that vault metadata strictly adheres to Zero-Knowledge principles.
 */
export function assertZeroKnowledgeMeta(meta: any): void {
  if (!meta || typeof meta !== 'object') {
    throw new VaultError('Invalid vault meta: metadata must be an object.');
  }

  const forbiddenPlaintextFields = [
    'masterPassword',
    'masterKey',
    'vaultKey',
    'rawKey',
    'password',
    'secret',
  ];

  for (const field of forbiddenPlaintextFields) {
    if (meta[field] !== undefined) {
      throw new VaultError(
        `CRITICAL SECURITY VIOLATION: Plaintext credential '${field}' detected in vault meta payload. Transmit aborted.`
      );
    }
  }

  validateVaultMetaStructure(meta);
}

/**
 * Validates a remote record before accepting it into local storage.
 * Rejects corrupted ciphertext, invalid IVs, or malformed schemas.
 */
export function validateRemoteRecord(record: any): StoredVaultRecord {
  if (!record || typeof record !== 'object') {
    throw new CorruptedRecordError('Remote record is missing or not an object.');
  }

  if (typeof record.id !== 'string' || !record.id) {
    throw new CorruptedRecordError('Remote record missing ID.');
  }

  if (record.vaultVersion !== CURRENT_VAULT_VERSION) {
    throw new CorruptedRecordError(
      `Remote record has unsupported vault version ${record.vaultVersion}. Expected ${CURRENT_VAULT_VERSION}.`
    );
  }

  if (record.schemaVersion !== CURRENT_RECORD_SCHEMA_VERSION) {
    throw new CorruptedRecordError(
      `Remote record has unsupported schema version ${record.schemaVersion}. Expected ${CURRENT_RECORD_SCHEMA_VERSION}.`
    );
  }

  if (typeof record.iv !== 'string' || !record.iv) {
    throw new CorruptedRecordError('Remote record missing IV.');
  }

  if (typeof record.ciphertext !== 'string' || !record.ciphertext) {
    throw new CorruptedRecordError('Remote record missing ciphertext.');
  }

  // Validate Base64 and byte length of IV
  try {
    const ivBytes = base64ToBytes(record.iv, 'record.iv');
    if (ivBytes.byteLength !== GCM_IV_BYTE_LENGTH) {
      throw new CorruptedRecordError(
        `Remote record IV length invalid: expected ${GCM_IV_BYTE_LENGTH} bytes, got ${ivBytes.byteLength}`
      );
    }
  } catch (err) {
    throw new CorruptedRecordError(
      `Remote record IV is not valid base64: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Validate Base64 encoding of ciphertext
  try {
    const cipherBytes = base64ToBytes(record.ciphertext, 'record.ciphertext');
    if (cipherBytes.byteLength < 16) {
      // AES-GCM tag is 16 bytes, so ciphertext must be at least 16 bytes
      throw new CorruptedRecordError('Remote record ciphertext is smaller than the minimum authentication tag.');
    }
  } catch (err) {
    throw new CorruptedRecordError(
      `Remote record ciphertext is not valid base64: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (typeof record.createdAt !== 'number' || typeof record.updatedAt !== 'number') {
    throw new CorruptedRecordError('Remote record has invalid timestamps.');
  }

  if (typeof record.version !== 'number') {
    throw new CorruptedRecordError('Remote record has invalid version number.');
  }

  return {
    id: record.id,
    vaultVersion: record.vaultVersion,
    schemaVersion: record.schemaVersion,
    iv: record.iv,
    ciphertext: record.ciphertext,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: typeof record.deletedAt === 'number' ? record.deletedAt : null,
    version: record.version,
    _conflicts: Array.isArray(record._conflicts) ? record._conflicts : undefined,
    syncStatus: 'synchronized',
  };
}

/**
 * Checks whether remote record is stale compared to a local record.
 * STALE PROTECTION: Never silently overwrite newer data with stale data.
 */
export function isRemoteRecordStale(local: StoredVaultRecord, remote: StoredVaultRecord): boolean {
  if (remote.version < local.version) {
    return true;
  }
  if (remote.version === local.version && remote.updatedAt < local.updatedAt) {
    return true;
  }
  return false;
}

export class VaultSyncEngine {
  private isSyncing = false;
  private retryTimeout: number | null = null;
  private baseDelay = 1000;
  public onSyncStateChange?: (state: VaultSyncState, error?: Error) => void;

  constructor(onSyncStateChange?: (state: VaultSyncState, error?: Error) => void) {
    this.onSyncStateChange = onSyncStateChange;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.baseDelay = 1000;
        this.sync();
      });
    }
  }

  private notify(state: VaultSyncState, error?: Error) {
    if (this.onSyncStateChange) {
      this.onSyncStateChange(state, error);
    }
  }

  private scheduleRetry() {
    if (typeof window === 'undefined') return;
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    this.retryTimeout = window.setTimeout(() => {
      this.sync();
    }, this.baseDelay);
    this.baseDelay = Math.min(this.baseDelay * 2, 60000);
  }

  /**
   * Count of pending encrypted operations in the local vault (creates, updates, deletes).
   */
  async getPendingCount(): Promise<number> {
    const localDb = await getDB();
    const tx = localDb.transaction(['vaultItems', 'vaultMeta'], 'readonly');
    const itemsIndex = tx.objectStore('vaultItems').index('by-syncStatus');
    const creates = await itemsIndex.count('pending_create');
    const updates = await itemsIndex.count('pending_update');
    const deletes = await itemsIndex.count('pending_delete');

    const metaIndex = tx.objectStore('vaultMeta').index('by-syncStatus');
    const metaCreates = await metaIndex.count('pending_create');
    const metaUpdates = await metaIndex.count('pending_update');

    return creates + updates + deletes + metaCreates + metaUpdates;
  }

  /**
   * Timestamp of the last successful vault synchronization.
   */
  async getLastSyncedAt(): Promise<number | null> {
    const localDb = await getDB();
    const meta = await localDb.get('syncMeta', 'vault');
    return meta?.lastSyncedAt || null;
  }

  /**
   * Main synchronization entry point.
   */
  async sync(): Promise<{ success: boolean; pushed: number; pulled: number; conflicts: number; error?: Error }> {
    if (this.isSyncing) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: new Error('Sync already in progress') };
    }

    const user = auth.currentUser;
    if (!user) {
      this.notify('auth_required');
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: new Error('User not authenticated') };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notify('offline');
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, error: new Error('Network offline') };
    }

    this.isSyncing = true;
    this.notify('syncing');

    let pushedCount = 0;
    let pulledCount = 0;
    let conflictCount = 0;

    try {
      const userId = user.uid;

      // Phase 1: Synchronize Vault Metadata (EVK + KDF parameters)
      await this.syncVaultMeta(userId);

      // Phase 2: Synchronize Encrypted Vault Records
      const recordSyncResult = await this.syncVaultRecords(userId);
      pushedCount = recordSyncResult.pushed;
      pulledCount = recordSyncResult.pulled;
      conflictCount = recordSyncResult.conflicts;

      const remainingPending = await this.getPendingCount();
      if (conflictCount > 0) {
        this.notify('conflict_detected');
      } else if (remainingPending > 0) {
        this.notify('pending_changes');
      } else {
        this.notify('synced');
      }

      this.baseDelay = 1000;
      return { success: true, pushed: pushedCount, pulled: pulledCount, conflicts: conflictCount };
    } catch (error: any) {
      console.warn('[VaultSync] Synchronization notice:', error?.message || error);
      const err = error instanceof Error ? error : new Error(String(error));
      this.notify('sync_failed', err);
      // Let main SyncEngine handle retries rather than spawning duplicate retry loops
      return { success: false, pushed: pushedCount, pulled: pulledCount, conflicts: conflictCount, error: err };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Synchronizes vault metadata (EVK, KDF salt, iterations, version).
   */
  private async syncVaultMeta(userId: string): Promise<void> {
    const localDb = await getDB();
    const localMeta = await localDb.get('vaultMeta', PRIMARY_VAULT_META_ID);

    const remoteMetaDocRef = doc(db, `users/${userId}/vault_meta/${PRIMARY_VAULT_META_ID}`);
    const remoteSnap = await withTimeout(
      getDocFromServer(remoteMetaDocRef),
      8000,
      'Fetching vault configuration'
    );
    const remoteData = remoteSnap.data();

    // Case 1: Remote exists, validate zero-knowledge & structure
    if (remoteData) {
      assertZeroKnowledgeMeta(remoteData);
      validateVaultMetaStructure(remoteData);

      if (!localMeta) {
        // Initial setup on new client: download remote encrypted config
        const downloadedMeta: StoredVaultMeta = {
          ...(remoteData as StoredVaultMeta),
          syncStatus: 'synchronized',
          syncError: undefined,
        };
        await localDb.put('vaultMeta', downloadedMeta);
        return;
      }

      // Both exist: check for newer remote rekeying
      if (remoteData.updatedAt > localMeta.updatedAt && localMeta.syncStatus === 'synchronized') {
        const updatedLocalMeta: StoredVaultMeta = {
          ...(remoteData as StoredVaultMeta),
          syncStatus: 'synchronized',
          syncError: undefined,
        };
        await localDb.put('vaultMeta', updatedLocalMeta);
        return;
      }
    }

    // Case 2: Local meta has pending changes to upload
    if (localMeta && localMeta.syncStatus !== 'synchronized') {
      assertZeroKnowledgeMeta(localMeta);

      const { syncStatus, syncError, ...cleanPayload } = localMeta as any;
      await withTimeout(
        setDoc(remoteMetaDocRef, cleanPayload),
        8000,
        'Uploading vault configuration'
      );

      localMeta.syncStatus = 'synchronized';
      localMeta.syncError = undefined;
      await localDb.put('vaultMeta', localMeta);
    }
  }

  /**
   * Synchronizes encrypted vault records between local IndexedDB and Firestore.
   */
  private async syncVaultRecords(userId: string): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    const localDb = await getDB();
    let pushed = 0;
    let pulled = 0;
    let conflicts = 0;

    // 1. Fetch remote changes since last sync
    const syncMeta = await localDb.get('syncMeta', 'vault');
    const lastSyncedAt = syncMeta?.lastSyncedAt || 0;

    const remoteCollectionRef = collection(db, `users/${userId}/vault_items`);
    const q = query(remoteCollectionRef, where('updatedAt', '>', lastSyncedAt));
    const remoteSnapshot = await withTimeout(
      getDocsFromServer(q),
      8000,
      'Fetching remote vault items'
    );

    const remoteRecords: any[] = [];
    remoteSnapshot.forEach((docSnap) => {
      remoteRecords.push(docSnap.data());
    });

    // 2. Query all local pending changes
    const tx = localDb.transaction('vaultItems', 'readwrite');
    const store = tx.objectStore('vaultItems');
    const index = store.index('by-syncStatus');

    const pendingCreates = await index.getAll('pending_create');
    const pendingUpdates = await index.getAll('pending_update');
    const pendingDeletes = await index.getAll('pending_delete');

    const allPending = [...pendingCreates, ...pendingUpdates, ...pendingDeletes];
    const pendingMap = new Map<string, StoredVaultRecord>(allPending.map((p) => [p.id, p]));

    // 3. Process remote records (download & conflict detection)
    for (const rawRemote of remoteRecords) {
      let remote: StoredVaultRecord;
      try {
        remote = validateRemoteRecord(rawRemote);
      } catch (validationErr) {
        // CORRUPTED RECORD PROTECTION: Reject corrupted remote records
        console.error('[VaultSync] Corrupted remote record rejected:', rawRemote?.id, validationErr);
        this.notify('corrupted_detected', validationErr instanceof Error ? validationErr : new Error(String(validationErr)));
        // Skip corrupted remote record so it does NOT overwrite local valid records
        continue;
      }

      const localPending = pendingMap.get(remote.id);

      if (localPending) {
        // SIMULTANEOUS EDITS / CONFLICT DETECTED
        conflicts++;
        this.notify('conflict_detected');

        let resolved: StoredVaultRecord;
        if (localPending.updatedAt > remote.updatedAt || localPending.version > remote.version) {
          // Local wins: preserve local, append remote to conflict history
          resolved = {
            ...localPending,
            _conflicts: [...(localPending._conflicts || []), remote].slice(-10),
            syncStatus: 'pending_update',
          };
        } else {
          // Remote wins: adopt remote, preserve local in conflict history
          resolved = {
            ...remote,
            _conflicts: [...(remote._conflicts || []), localPending].slice(-10),
            syncStatus: 'pending_update',
          };
        }

        await store.put(resolved);
        pendingMap.set(resolved.id, resolved);
      } else {
        // No local pending change: check stale protection
        const localExisting = await store.get(remote.id);

        if (localExisting) {
          if (isRemoteRecordStale(localExisting, remote)) {
            // STALE DATA PROTECTION: Never overwrite newer data with stale data
            console.warn(`[VaultSync] Stale remote record ignored: ${remote.id}`);
            continue;
          }
        }

        // Apply clean remote update
        const updatedLocal: StoredVaultRecord = {
          ...remote,
          syncStatus: 'synchronized',
          syncError: undefined,
        };
        await store.put(updatedLocal);
        pulled++;
      }
    }

    // Close transaction before network batch writes
    await tx.done;

    // 4. Push local pending operations to Firestore
    const toPush = Array.from(pendingMap.values());
    const CHUNK_SIZE = 400;

    for (let i = 0; i < toPush.length; i += CHUNK_SIZE) {
      const chunk = toPush.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const local of chunk) {
        // Strict Zero-Knowledge check before network transmission
        assertZeroKnowledgeRecord(local);

        const { syncStatus, syncError, ...remotePayload } = local as any;
        const docRef = doc(db, `users/${userId}/vault_items/${local.id}`);
        batch.set(docRef, remotePayload);
      }

      try {
        await withTimeout(batch.commit(), 10000, 'Uploading vault records');

        // Mark pushed records as synchronized
        const updateTx = localDb.transaction('vaultItems', 'readwrite');
        const updateStore = updateTx.objectStore('vaultItems');

        for (const local of chunk) {
          const updated: StoredVaultRecord = {
            ...local,
            syncStatus: 'synchronized',
            syncError: undefined,
          };
          await updateStore.put(updated);
        }
        await updateTx.done;
        pushed += chunk.length;
      } catch (batchErr: any) {
        // Record sync errors on the items in IndexedDB
        const errMsg = batchErr instanceof Error ? batchErr.message : String(batchErr);
        const errTx = localDb.transaction('vaultItems', 'readwrite');
        const errStore = errTx.objectStore('vaultItems');

        for (const local of chunk) {
          const failed: StoredVaultRecord = {
            ...local,
            syncError: errMsg,
          };
          await errStore.put(failed);
        }
        await errTx.done;
        throw batchErr;
      }
    }

    // 5. Update last synchronized timestamp
    await localDb.put('syncMeta', { key: 'vault', lastSyncedAt: Date.now() });

    return { pushed, pulled, conflicts };
  }
}

export const vaultSyncEngine = new VaultSyncEngine();

/**
 * Convenience helper to trigger encrypted vault synchronization.
 */
export async function syncVault(): Promise<{ success: boolean; pushed: number; pulled: number; conflicts: number; error?: Error }> {
  return vaultSyncEngine.sync();
}

/**
 * Deletes remote encrypted vault documents for the specified authenticated user.
 * 
 * STRICT USER ISOLATION & ZERO-LEAKAGE:
 * - Operates ONLY on `users/${userId}/vault_meta` and `users/${userId}/vault_items`.
 * - Verifies that userId is provided and matches the active authenticated user if authenticated.
 * - Under NO circumstances queries or modifies records of any other user.
 * - Deletes in safe batch chunks (max 400 operations per batch) to respect Firestore limits.
 */
export async function deleteRemoteUserVault(userId: string): Promise<void> {
  if (!userId || typeof userId !== 'string') {
    throw new VaultError('User ID is required to reset remote vault data.');
  }

  // Security guard: verify authenticated context if in browser runtime
  if (auth.currentUser && auth.currentUser.uid !== userId) {
    throw new VaultError('Security violation: Cannot delete vault belonging to a different user.');
  }

  try {
    const itemsRef = collection(db, `users/${userId}/vault_items`);
    const snap = await getDocs(itemsRef);

    let currentBatch = writeBatch(db);
    let opCount = 0;

    // Delete user vault metadata
    const metaDocRef = doc(db, `users/${userId}/vault_meta/${PRIMARY_VAULT_META_ID}`);
    currentBatch.delete(metaDocRef);
    opCount++;

    // Delete user vault items
    for (const docSnap of snap.docs) {
      currentBatch.delete(docSnap.ref);
      opCount++;
      if (opCount >= 400) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await currentBatch.commit();
    }
  } catch (err) {
    console.warn('[VaultSync] Remote user vault deletion warning:', err);
    throw err;
  }
}

