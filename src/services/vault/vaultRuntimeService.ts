/**
 * MATRIX Password Vault - Runtime State & Unlocking Service
 * 
 * Provides a secure, closure-based runtime session layer for the MATRIX Vault:
 * - Clear runtime states: uninitialized, locked, unlocking, unlocked, locking, error.
 * - Secure unlock flow deriving Master Key, decrypting EVK, and holding the Vault Key
 *   strictly in volatile runtime memory (never in localStorage, sessionStorage, cookies,
 *   URLs, or window globals).
 * - Central lock function clearing volatile key references, decrypted caches, search buffers,
 *   and UI state.
 * - Logout and account-switching isolation ensuring no previous user's vault remains accessible.
 * - Multi-tab synchronization using BroadcastChannel for control events (LOCK_VAULT,
 *   LOGOUT, ACCOUNT_CHANGED) with zero key transmission.
 */

import {
  VaultRuntimeState,
  VaultRecordPayload,
  StoredVaultRecord,
  StoredVaultMeta,
  VaultBroadcastMessage,
  VaultBroadcastMessageType,
  VaultLockedError,
  IncorrectMasterPasswordError,
  CorruptedEVKError,
  CorruptedRecordError,
  UnsupportedVaultVersionError,
  VaultError,
} from '../../domain/vaultTypes';
import {
  isVaultInitialized,
  getStoredVaultMeta,
  initializeVaultStorage,
  unlockVaultStorage,
  createEncryptedRecord,
  updateEncryptedRecord,
  deleteEncryptedRecord,
  getStoredRecord,
  listStoredRecords,
  decryptStoredRecord,
  rekeyVaultStorage,
  changeMasterPasswordStorage,
  clearLocalVaultStorage,
  resetVaultStorage,
} from './vaultStorageService';

export const VAULT_BROADCAST_CHANNEL = 'matrix_vault_control';

// ============================================================================
// Private Volatile Runtime State (Enclosed in module closure)
// ============================================================================

/** The active Vault Key - held ONLY in volatile memory during unlocked session */
let activeVaultKey: CryptoKey | null = null;

/** In-memory cache of decrypted records for active session */
const decryptedRecordsCache = new Map<string, VaultRecordPayload>();

/** Sensitive search query held temporarily in memory */
let sensitiveSearchQuery: string = '';

/** Sensitive search results held temporarily in memory */
let sensitiveSearchResults: Array<{ id: string; payload: VaultRecordPayload }> = [];

/** Sensitive active selected record ID */
let sensitiveSelectedRecordId: string | null = null;

/** Active vault runtime state */
let currentState: VaultRuntimeState = 'uninitialized';

/** Safe user-facing error message (never leaks cryptographic secrets) */
let currentErrorMessage: string | null = null;

/** Authenticated user UID associated with active vault */
let currentUserId: string | null = null;

/** Active state change listener callbacks */
type StateChangeListener = (state: VaultRuntimeState, error: string | null) => void;
const stateListeners = new Set<StateChangeListener>();

/** Multi-tab BroadcastChannel instance */
let broadcastChannel: BroadcastChannel | null = null;

// ============================================================================
// Internal Helpers & Broadcast Synchronization
// ============================================================================

function notifyListeners(): void {
  for (const listener of stateListeners) {
    try {
      listener(currentState, currentErrorMessage);
    } catch (err) {
      console.error('[VaultRuntime] Listener error:', err);
    }
  }
}

function sendBroadcast(type: VaultBroadcastMessageType, userId?: string | null): void {
  if (!broadcastChannel) return;
  try {
    const message: VaultBroadcastMessage = {
      type,
      userId: userId ?? null,
      timestamp: Date.now(),
    };
    broadcastChannel.postMessage(message);
  } catch (err) {
    console.warn('[VaultRuntime] Failed to broadcast vault event:', err);
  }
}

function handleBroadcastMessage(message: VaultBroadcastMessage): void {
  if (!message || !message.type) return;

  switch (message.type) {
    case 'LOCK_VAULT':
      vaultRuntimeService.lock({ broadcast: false });
      break;

    case 'LOGOUT':
      vaultRuntimeService.handleLogout({ broadcast: false }).catch((err) => {
        console.error('[VaultRuntime] Cross-tab logout handling error:', err);
      });
      break;

    case 'ACCOUNT_CHANGED':
      vaultRuntimeService.handleAccountChanged(message.userId ?? null, { broadcast: false }).catch((err) => {
        console.error('[VaultRuntime] Cross-tab account change handling error:', err);
      });
      break;

    case 'VAULT_RESET':
      if (!message.userId || message.userId === currentUserId) {
        vaultRuntimeService.lock({ broadcast: false });
        clearLocalVaultStorage()
          .then(() => {
            currentState = 'uninitialized';
            currentErrorMessage = null;
            notifyListeners();
          })
          .catch((err) => {
            console.error('[VaultRuntime] Cross-tab vault reset handling error:', err);
          });
      }
      break;
  }
}

// Initialize multi-tab channel if supported
if (typeof BroadcastChannel !== 'undefined') {
  try {
    broadcastChannel = new BroadcastChannel(VAULT_BROADCAST_CHANNEL);
    broadcastChannel.onmessage = (event: MessageEvent<VaultBroadcastMessage>) => {
      handleBroadcastMessage(event.data);
    };
  } catch (err) {
    console.warn('[VaultRuntime] BroadcastChannel unavailable:', err);
    broadcastChannel = null;
  }
}

/** Optional activity hook invoked on user interaction with the vault */
let vaultActivityHook: (() => void) | null = null;

export function registerVaultActivityHook(hook: (() => void) | null): void {
  vaultActivityHook = hook;
}

/**
 * Asserts that the vault is unlocked and an active VaultKey is loaded in volatile memory.
 */
function assertUnlocked(): CryptoKey {
  if (currentState !== 'unlocked' || !activeVaultKey) {
    throw new VaultLockedError(
      'Vault is locked. You must unlock the vault with your Master Password to perform this action.'
    );
  }
  // Record vault activity to refresh auto-lock timer
  try {
    vaultActivityHook?.();
  } catch {
    // Ignore hook error
  }
  return activeVaultKey;
}

// ============================================================================
// Public Runtime Service
// ============================================================================

export const vaultRuntimeService = {
  /**
   * Returns the current runtime state.
   */
  getState(): VaultRuntimeState {
    return currentState;
  },

  /**
   * Returns any active error message.
   */
  getError(): string | null {
    return currentErrorMessage;
  },

  /**
   * Checks if the vault is currently unlocked.
   */
  isUnlocked(): boolean {
    return currentState === 'unlocked' && activeVaultKey !== null;
  },

  /**
   * Checks if the vault is currently locked.
   */
  isLocked(): boolean {
    return currentState === 'locked';
  },

  /**
   * Checks if the vault is uninitialized.
   */
  isUninitialized(): boolean {
    return currentState === 'uninitialized';
  },

  /**
   * Subscribes to runtime state changes.
   */
  subscribe(listener: StateChangeListener): () => void {
    stateListeners.add(listener);
    // Emit immediate current state
    try {
      listener(currentState, currentErrorMessage);
    } catch (err) {
      console.error('[VaultRuntime] Initial listener callback error:', err);
    }
    return () => {
      stateListeners.delete(listener);
    };
  },

  /**
   * Checks local storage and synchronizes the runtime state (e.g. at app start or after refresh).
   */
  async checkStatus(): Promise<VaultRuntimeState> {
    try {
      const initialized = await isVaultInitialized();
      if (!initialized) {
        currentState = 'uninitialized';
        currentErrorMessage = null;
      } else if (currentState === 'uninitialized') {
        currentState = 'locked';
        currentErrorMessage = null;
      } else if (currentState === 'unlocked' && !activeVaultKey) {
        currentState = 'locked';
      }
    } catch (err) {
      currentState = 'error';
      currentErrorMessage = err instanceof Error ? err.message : 'Failed to inspect vault status';
    }
    notifyListeners();
    return currentState;
  },

  /**
   * Initializes a brand-new primary vault with a Master Password and unlocks it immediately.
   */
  async initializeVault(
    masterPassword: string,
    iterations?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      currentState = 'unlocking';
      currentErrorMessage = null;
      notifyListeners();

      const initResult = await initializeVaultStorage(masterPassword, iterations);
      activeVaultKey = initResult.vaultKey;
      currentState = 'unlocked';
      currentErrorMessage = null;
      notifyListeners();
      return { success: true };
    } catch (err) {
      activeVaultKey = null;
      currentState = 'error';
      currentErrorMessage = err instanceof Error ? err.message : 'Vault initialization failed';
      notifyListeners();
      return { success: false, error: currentErrorMessage };
    }
  },

  /**
   * Unlocks the vault using the Master Password.
   * 
   * Strict Unlock Flow:
   * 1. Retrieve encrypted vault configuration.
   * 2. Retrieve salt and KDF configuration.
   * 3. Derive Master Key.
   * 4. Attempt to decrypt EVK.
   * 5. If successful, obtain Vault Key into volatile runtime memory.
   * 6. Mark the vault as unlocked.
   * 
   * If decryption fails:
   * - do not unlock
   * - do not expose cryptographic details
   * - do not persist the password
   * - show a safe incorrect-password error
   */
  async unlock(masterPassword: string): Promise<{ success: boolean; error?: string }> {
    if (currentState === 'unlocked' && activeVaultKey) {
      return { success: true };
    }

    currentState = 'unlocking';
    currentErrorMessage = null;
    notifyListeners();

    try {
      // Step 1 to 5 executed within storage & crypto layer
      const unlockResult = await unlockVaultStorage(masterPassword);

      // Step 6: Keep Vault Key ONLY in volatile runtime memory
      activeVaultKey = unlockResult.vaultKey;

      // Step 7: Mark Vault as unlocked
      currentState = 'unlocked';
      currentErrorMessage = null;
      notifyListeners();
      return { success: true };
    } catch (err) {
      // Decryption or validation failed
      activeVaultKey = null;
      decryptedRecordsCache.clear();
      sensitiveSearchQuery = '';
      sensitiveSearchResults = [];
      sensitiveSelectedRecordId = null;

      currentState = 'error';

      // Safe error categorization that never leaks keys or cryptographic details
      if (err instanceof IncorrectMasterPasswordError) {
        currentErrorMessage = 'Incorrect master password. Please verify and try again.';
      } else if (err instanceof UnsupportedVaultVersionError) {
        currentErrorMessage = 'Vault version is unsupported on this device.';
      } else if (err instanceof CorruptedEVKError || err instanceof CorruptedRecordError) {
        currentErrorMessage = 'Vault data is corrupted or invalid.';
      } else if (err instanceof VaultError) {
        currentErrorMessage = err.message;
      } else {
        currentErrorMessage = 'Incorrect master password or unlock failure. Please try again.';
      }

      notifyListeners();
      return { success: false, error: currentErrorMessage };
    }
  },

  /**
   * Central lock function:
   * - clears runtime Vault Key reference
   * - clears decrypted record state
   * - clears sensitive search state
   * - clears sensitive UI state
   * - changes state to locked
   */
  lock(options?: { broadcast?: boolean }): void {
    currentState = 'locking';
    notifyListeners();

    // 1. Clear runtime Vault Key reference
    activeVaultKey = null;

    // 2. Clear decrypted record cache
    decryptedRecordsCache.clear();

    // 3. Clear sensitive search state
    sensitiveSearchQuery = '';
    sensitiveSearchResults = [];

    // 4. Clear sensitive UI state
    sensitiveSelectedRecordId = null;

    // 5. Change state to locked
    currentState = 'locked';
    currentErrorMessage = null;

    // 6. Broadcast lock event across tabs
    if (options?.broadcast !== false) {
      sendBroadcast('LOCK_VAULT');
    }

    notifyListeners();
  },

  /**
   * Adopts a verified restored vault:
   * Sets the newly restored active Vault Key, clears volatile caches,
   * and transitions state to unlocked.
   */
  adoptRestoredVault(vaultKey: CryptoKey): void {
    decryptedRecordsCache.clear();
    sensitiveSearchQuery = '';
    sensitiveSearchResults = [];
    sensitiveSelectedRecordId = null;

    activeVaultKey = vaultKey;
    currentState = 'unlocked';
    currentErrorMessage = null;
    notifyListeners();
  },

  /**
   * Logout handler:
   * - Locks the vault
   * - Clears runtime vault state
   * - Clears local storage so no previous user's vault remains accessible
   * - Broadcasts LOGOUT event to other tabs
   */
  async handleLogout(options?: { broadcast?: boolean }): Promise<void> {
    // 1. Lock vault
    this.lock({ broadcast: false });

    // 2. Clear user and reset to uninitialized
    currentUserId = null;
    currentState = 'uninitialized';
    currentErrorMessage = null;

    // 3. Clear local storage so no previous user data remains accessible
    try {
      await clearLocalVaultStorage();
    } catch (err) {
      console.warn('[VaultRuntime] Warning clearing local vault storage on logout:', err);
    }

    // 4. Broadcast logout across tabs
    if (options?.broadcast !== false) {
      sendBroadcast('LOGOUT');
    }

    notifyListeners();
  },

  /**
   * Account switching handler:
   * - Immediately locks the previous vault
   * - Clears previous runtime data
   * - Clears previous user's local vault store to prevent cross-account contamination
   * - Requires unlocking of the new user's vault
   * - Broadcasts ACCOUNT_CHANGED event to other tabs
   */
  async handleAccountChanged(
    newUserId: string | null,
    options?: { broadcast?: boolean }
  ): Promise<void> {
    if (newUserId === currentUserId) return;

    // 1. Immediately lock previous vault
    this.lock({ broadcast: false });

    // 2. Clear previous user's local store
    try {
      await clearLocalVaultStorage();
    } catch (err) {
      console.warn('[VaultRuntime] Warning clearing storage during account switch:', err);
    }

    currentUserId = newUserId;
    currentState = 'uninitialized';
    currentErrorMessage = null;

    // 3. Broadcast account change across tabs
    if (options?.broadcast !== false) {
      sendBroadcast('ACCOUNT_CHANGED', newUserId);
    }

    // 4. Re-check local status for new user
    await this.checkStatus();
    notifyListeners();
  },

  /**
   * Hard Reset:
   * Performs an explicit, destructive wipe of the vault for the currently authenticated user:
   * - Requires strong confirmation keyword ('RESET').
   * - Identifies that the operation is destructive.
   * - Deletes the current user's encrypted vault in remote Firestore (users/{currentUserId}/vault_meta & vault_items).
   * - Removes local encrypted vault data from IndexedDB.
   * - Clears in-memory runtime keys (activeVaultKey = null).
   * - Clears decrypted data, search buffers, and UI selection.
   * - Returns the Vault to uninitialized state.
   * 
   * STRICT USER ISOLATION:
   * - Operates ONLY on the currently authenticated user's remote vault documents.
   * - Never touches or affects any other user's records.
   */
  async hardResetVault(
    confirmationKeyword: string,
    targetUserId?: string | null,
    options?: { broadcast?: boolean }
  ): Promise<void> {
    const trimmed = confirmationKeyword?.trim()?.toUpperCase();
    if (trimmed !== 'RESET') {
      throw new VaultError('Confirmation failed: You must type RESET to confirm hard reset.');
    }

    const effectiveUserId = targetUserId !== undefined ? targetUserId : currentUserId;

    // 1. Wipe remote encrypted vault (if authenticated) and local storage
    try {
      await resetVaultStorage(effectiveUserId);
    } catch (err) {
      console.warn('[VaultRuntime] Warning resetting vault storage:', err);
    }

    // 2. Clear volatile runtime keys
    activeVaultKey = null;

    // 3. Clear in-memory caches and sensitive state
    decryptedRecordsCache.clear();
    sensitiveSearchQuery = '';
    sensitiveSearchResults = [];
    sensitiveSelectedRecordId = null;

    // 4. Return to uninitialized state
    currentState = 'uninitialized';
    currentErrorMessage = null;

    // 5. Broadcast reset across tabs
    if (options?.broadcast !== false) {
      sendBroadcast('VAULT_RESET', effectiveUserId);
    }

    // 6. Notify all UI listeners
    notifyListeners();
  },

  // ==========================================================================
  // Decrypted In-Memory Record Operations (Accessible ONLY when unlocked)
  // ==========================================================================

  /**
   * Decrypts and retrieves a single vault record by ID.
   */
  async getDecryptedRecord(recordId: string): Promise<VaultRecordPayload> {
    const key = assertUnlocked();

    // Check memory cache first
    const cached = decryptedRecordsCache.get(recordId);
    if (cached) {
      return { ...cached };
    }

    const stored = await getStoredRecord(recordId);
    if (!stored) {
      throw new VaultError(`Vault record '${recordId}' not found.`);
    }

    const decrypted = await decryptStoredRecord(stored, key);
    decryptedRecordsCache.set(recordId, decrypted);
    return { ...decrypted };
  },

  /**
   * Creates and stores a new encrypted vault record using the active volatile Vault Key.
   */
  async createRecord(payload: VaultRecordPayload): Promise<StoredVaultRecord> {
    const key = assertUnlocked();
    const stored = await createEncryptedRecord(payload, key);
    decryptedRecordsCache.set(stored.id, { ...payload });
    return stored;
  },

  /**
   * Updates an existing record with fresh ciphertext using the volatile Vault Key.
   */
  async updateRecord(recordId: string, payload: VaultRecordPayload): Promise<StoredVaultRecord> {
    const key = assertUnlocked();
    const stored = await updateEncryptedRecord(recordId, payload, key);
    decryptedRecordsCache.set(recordId, { ...payload });
    return stored;
  },

  /**
   * Deletes a record from storage and clears it from volatile memory cache.
   */
  async deleteRecord(recordId: string): Promise<void> {
    assertUnlocked();
    await deleteEncryptedRecord(recordId);
    decryptedRecordsCache.delete(recordId);
  },

  /**
   * Lists and decrypts all stored active records into volatile memory.
   */
  async listDecryptedRecords(): Promise<
    Array<{ id: string; payload: VaultRecordPayload; createdAt: number; updatedAt: number }>
  > {
    const key = assertUnlocked();
    const storedList = await listStoredRecords();

    const results: Array<{ id: string; payload: VaultRecordPayload; createdAt: number; updatedAt: number }> = [];

    for (const stored of storedList) {
      try {
        let payload = decryptedRecordsCache.get(stored.id);
        if (!payload) {
          payload = await decryptStoredRecord(stored, key);
          decryptedRecordsCache.set(stored.id, payload);
        }
        results.push({
          id: stored.id,
          payload: { ...payload },
          createdAt: stored.createdAt,
          updatedAt: stored.updatedAt,
        });
      } catch (err) {
        console.error(`[VaultRuntime] Failed to decrypt record ${stored.id}:`, err);
      }
    }

    return results;
  },

  /**
   * Performs in-memory search over decrypted records.
   * Search queries and results are kept ONLY in volatile memory.
   */
  async searchSensitiveRecords(
    query: string
  ): Promise<Array<{ id: string; payload: VaultRecordPayload }>> {
    assertUnlocked();
    const trimmed = query.trim().toLowerCase();
    sensitiveSearchQuery = query;

    if (!trimmed) {
      sensitiveSearchResults = [];
      return [];
    }

    const all = await this.listDecryptedRecords();
    const matches = all.filter(({ payload }) => {
      return (
        payload.title.toLowerCase().includes(trimmed) ||
        payload.username.toLowerCase().includes(trimmed) ||
        payload.url.toLowerCase().includes(trimmed) ||
        payload.notes.toLowerCase().includes(trimmed)
      );
    }).map(({ id, payload }) => ({ id, payload }));

    sensitiveSearchResults = matches;
    return matches;
  },

  /**
   * Clears sensitive search query and in-memory search results.
   */
  clearSensitiveSearch(): void {
    sensitiveSearchQuery = '';
    sensitiveSearchResults = [];
  },

  /**
   * Sets the active selected record ID for UI inspection.
   */
  setSelectedRecordId(id: string | null): void {
    sensitiveSelectedRecordId = id;
  },

  /**
   * Gets the active selected record ID.
   */
  getSelectedRecordId(): string | null {
    return sensitiveSelectedRecordId;
  },

  /**
   * Securely changes the Master Password:
   * 1. Require the Vault to already be unlocked.
   * 2. Obtain the current runtime Vault Key.
   * 3. Generate a new random salt.
   * 4. Derive a new Master Key from the new Master Password.
   * 5. Generate a new EVK IV.
   * 6. Encrypt the existing Vault Key using the new Master Key.
   * 7. Verify that the new EVK successfully decrypts the Vault Key.
   * 8. Only after successful verification, replace the old encrypted vault configuration.
   * 9. Persist the new cryptographic configuration.
   * 
   * Crash safety: Old valid EVK is not destroyed before the new EVK is verified.
   * Password handling: Never persists old/new Master Passwords or derived Master Keys.
   */
  async changeMasterPassword(
    newMasterPassword: string,
    options?: { newIterations?: number }
  ): Promise<StoredVaultMeta> {
    // 1. Require the Vault to already be unlocked
    if (currentState !== 'unlocked' || !activeVaultKey) {
      throw new VaultLockedError('Cannot change Master Password: Vault must be unlocked first.');
    }

    // 2. Obtain current runtime Vault Key
    const key = activeVaultKey;

    if (!newMasterPassword || typeof newMasterPassword !== 'string' || newMasterPassword.length < 8) {
      throw new VaultError('New Master Password must be at least 8 characters long.');
    }

    // 3 - 9. Perform verified re-keying & persist to storage
    const updatedMeta = await changeMasterPasswordStorage(
      newMasterPassword,
      key,
      options?.newIterations
    );

    notifyListeners();
    return updatedMeta;
  },

  /**
   * Rekeyes the vault under a new Master Password while keeping the current Vault Key.
   */
  async rekey(
    currentPassword: string,
    newPassword: string,
    newIterations?: number
  ): Promise<void> {
    assertUnlocked();
    await rekeyVaultStorage(currentPassword, newPassword, newIterations);
  },

  // ==========================================================================
  // Inspection Helpers for Verification & Testing
  // ==========================================================================

  /**
   * Returns a snapshot of internal volatile state for testing assertions.
   * Confirms that keys, caches, and search queries are completely eradicated upon locking.
   */
  getSensitiveStateSnapshot(): {
    hasKey: boolean;
    decryptedCacheSize: number;
    searchQuery: string;
    searchResultsCount: number;
    selectedRecordId: string | null;
    userId: string | null;
  } {
    return {
      hasKey: activeVaultKey !== null,
      decryptedCacheSize: decryptedRecordsCache.size,
      searchQuery: sensitiveSearchQuery,
      searchResultsCount: sensitiveSearchResults.length,
      selectedRecordId: sensitiveSelectedRecordId,
      userId: currentUserId,
    };
  },

  /**
   * Directly sets the broadcast channel instance (used in unit tests for multi-tab simulation).
   */
  _setBroadcastChannel(channel: BroadcastChannel | null): void {
    broadcastChannel = channel;
    if (broadcastChannel) {
      broadcastChannel.onmessage = (event: MessageEvent<VaultBroadcastMessage>) => {
        handleBroadcastMessage(event.data);
      };
    }
  },

  /**
   * Closes the multi-tab BroadcastChannel (used during teardown or tests).
   */
  closeChannel(): void {
    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch {
        // ignore
      }
      broadcastChannel = null;
    }
  },
};
