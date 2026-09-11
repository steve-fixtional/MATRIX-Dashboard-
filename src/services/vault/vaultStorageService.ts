/**
 * MATRIX Password Vault - Encrypted Storage Layer
 * 
 * STRICT ZERO-KNOWLEDGE PERSISTENCE:
 * - Persistent storage (IndexedDB and Firestore) contains ONLY encrypted vault material.
 * - Allowed: id, vaultVersion, schemaVersion, iv, ciphertext, createdAt, updatedAt, deletedAt, version, syncStatus, kdf config, evk.
 * - FORBIDDEN: Master Password, Master Key, decrypted Vault Key, plaintext passwords, plaintext usernames, plaintext notes, decrypted URLs.
 * - No localStorage, sessionStorage, or cookies are ever used for vault secrets.
 */

import { getDB } from '../db';
import {
  CURRENT_VAULT_VERSION,
  CURRENT_RECORD_SCHEMA_VERSION,
  SALT_BYTE_LENGTH,
  GCM_IV_BYTE_LENGTH,
  StoredVaultRecord,
  StoredVaultMeta,
  VaultRecordPayload,
  VaultStatus,
  VaultError,
  IncorrectMasterPasswordError,
  CorruptedEVKError,
  CorruptedRecordError,
  UnsupportedVaultVersionError,
} from '../../domain/vaultTypes';
import {
  initializeVault,
  unlockVault,
  rekeyVault,
  createRekeyedVaultConfig,
  encryptVaultRecordPayload,
  decryptVaultRecordPayload,
  base64ToBytes,
} from './crypto';
import { syncVault, deleteRemoteUserVault } from './vaultSyncService';

export const PRIMARY_VAULT_META_ID = 'primary_vault_config';

/**
 * Expected byte length of an encrypted 256-bit Vault Key in AES-GCM:
 * 32 bytes raw key + 16 bytes GCM authentication tag = 48 bytes.
 */
const EXPECTED_EVK_BYTE_LENGTH = 48;

/**
 * Validates the structural integrity of a StoredVaultMeta record.
 * Throws CorruptedEVKError if malformed, invalid base64, or unexpected byte lengths.
 */
export function validateVaultMetaStructure(meta: any): asserts meta is StoredVaultMeta {
  if (!meta || typeof meta !== 'object') {
    throw new CorruptedEVKError('Vault metadata is missing or not an object.');
  }
  if (typeof meta.id !== 'string' || !meta.id) {
    throw new CorruptedEVKError('Vault metadata ID is missing or invalid.');
  }
  if (typeof meta.vaultVersion !== 'number') {
    throw new CorruptedEVKError('Vault metadata vaultVersion is missing or invalid.');
  }
  if (!meta.kdf || typeof meta.kdf !== 'object') {
    throw new CorruptedEVKError('Vault metadata KDF configuration is missing or invalid.');
  }
  if (
    meta.kdf.algorithm !== 'PBKDF2' ||
    meta.kdf.hash !== 'SHA-256' ||
    typeof meta.kdf.iterations !== 'number' ||
    meta.kdf.iterations <= 0 ||
    typeof meta.kdf.salt !== 'string' ||
    !meta.kdf.salt
  ) {
    throw new CorruptedEVKError('Vault metadata KDF parameters are corrupted or unsupported.');
  }
  if (!meta.evk || typeof meta.evk !== 'object') {
    throw new CorruptedEVKError('Vault metadata EVK bundle is missing or invalid.');
  }
  if (
    typeof meta.evk.encryptedVaultKey !== 'string' ||
    !meta.evk.encryptedVaultKey ||
    typeof meta.evk.evkIv !== 'string' ||
    !meta.evk.evkIv
  ) {
    throw new CorruptedEVKError('Vault metadata EVK payload or IV is corrupted.');
  }

  // Validate Base64 encodings and exact cryptographic byte lengths
  let saltBytes: Uint8Array;
  let ivBytes: Uint8Array;
  let evkBytes: Uint8Array;

  try {
    saltBytes = base64ToBytes(meta.kdf.salt, 'salt');
    ivBytes = base64ToBytes(meta.evk.evkIv, 'evkIv');
    evkBytes = base64ToBytes(meta.evk.encryptedVaultKey, 'encryptedVaultKey');
  } catch (err) {
    throw new CorruptedEVKError(
      `Vault metadata contains invalid base64 encoding: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (saltBytes.byteLength !== SALT_BYTE_LENGTH) {
    throw new CorruptedEVKError(
      `Invalid salt length: expected ${SALT_BYTE_LENGTH} bytes, got ${saltBytes.byteLength}`
    );
  }
  if (ivBytes.byteLength !== GCM_IV_BYTE_LENGTH) {
    throw new CorruptedEVKError(
      `Invalid EVK IV length: expected ${GCM_IV_BYTE_LENGTH} bytes, got ${ivBytes.byteLength}`
    );
  }
  if (evkBytes.byteLength !== EXPECTED_EVK_BYTE_LENGTH) {
    throw new CorruptedEVKError(
      `Invalid EVK length: expected ${EXPECTED_EVK_BYTE_LENGTH} bytes (32 key + 16 tag), got ${evkBytes.byteLength}`
    );
  }
}

/**
 * Checks if a primary vault configuration has been initialized in persistent storage.
 */
export async function isVaultInitialized(): Promise<boolean> {
  const db = await getDB();
  const meta = await db.get('vaultMeta', PRIMARY_VAULT_META_ID);
  return !!meta && !(typeof meta.deletedAt === 'number' && meta.deletedAt > 0);
}

/**
 * Evaluates the vault status to differentiate between:
 * - uninitialized (no configuration exists or marked deleted)
 * - unsupported_version (version is newer or incompatible)
 * - corrupted (damaged structural configuration or invalid EVK/KDF)
 * - locked (initialized and valid, awaiting correct Master Password)
 * - unlocked (valid and successfully decrypted with supplied Master Password)
 */
export async function getVaultStatus(masterPassword?: string): Promise<VaultStatus> {
  const db = await getDB();
  const meta = await db.get('vaultMeta', PRIMARY_VAULT_META_ID);

  if (!meta || (typeof meta.deletedAt === 'number' && meta.deletedAt > 0)) {
    return 'uninitialized';
  }

  // 1. Check version compatibility
  if (meta.vaultVersion !== CURRENT_VAULT_VERSION) {
    return 'unsupported_version';
  }

  // 2. Validate structural and cryptographic parameter integrity
  try {
    validateVaultMetaStructure(meta);
  } catch {
    return 'corrupted';
  }

  if (!masterPassword) {
    return 'locked';
  }

  // 3. Attempt decryption with supplied password
  try {
    await unlockVault(masterPassword, meta);
    return 'unlocked';
  } catch (err) {
    if (err instanceof IncorrectMasterPasswordError) {
      return 'locked';
    }
    if (err instanceof UnsupportedVaultVersionError) {
      return 'unsupported_version';
    }
    return 'corrupted';
  }
}

/**
 * Retrieves the stored vault metadata record.
 */
export async function getStoredVaultMeta(): Promise<StoredVaultMeta | null> {
  const db = await getDB();
  const meta = await db.get('vaultMeta', PRIMARY_VAULT_META_ID);
  if (!meta || (typeof meta.deletedAt === 'number' && meta.deletedAt > 0)) {
    return null;
  }
  validateVaultMetaStructure(meta);
  return meta;
}

export interface VaultInitStorageResult {
  config: StoredVaultMeta;
  vaultKey: CryptoKey;
}

/**
 * Initializes a new encrypted vault:
 * 1. Generates random salt
 * 2. Derives Master Key via PBKDF2
 * 3. Generates random 256-bit Vault Key
 * 4. Generates random EVK IV
 * 5. Encrypts Vault Key under Master Key (EVK)
 * 6. Verifies that the EVK unwrap test succeeds before saving
 * 7. Persists only the encrypted configuration into IndexedDB
 */
export async function initializeVaultStorage(
  masterPassword: string,
  iterations?: number
): Promise<VaultInitStorageResult> {
  const alreadyInit = await isVaultInitialized();
  if (alreadyInit) {
    throw new VaultError('A Password Vault is already initialized on this device.');
  }

  // Steps 1-5 handled in cryptographic foundation
  const initResult = await initializeVault(masterPassword, iterations);

  // Step 6: Strictly verify unwrap succeeds before committing to storage
  const testKey = await unlockVault(masterPassword, initResult.config);
  if (!testKey) {
    throw new VaultError('Vault initialization self-test failed: unwrapped key is invalid.');
  }

  const now = Date.now();
  const storedMeta: StoredVaultMeta = {
    id: PRIMARY_VAULT_META_ID,
    vaultVersion: initResult.config.vaultVersion,
    kdf: initResult.config.kdf,
    evk: initResult.config.evk,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending_create',
  };

  // Step 7: Store the encrypted configuration
  const db = await getDB();
  await db.put('vaultMeta', storedMeta);

  // Trigger non-blocking encrypted sync
  syncVault().catch(() => {});

  return {
    config: storedMeta,
    vaultKey: initResult.vaultKey,
  };
}

export interface VaultUnlockResult {
  meta: StoredVaultMeta;
  vaultKey: CryptoKey;
}

/**
 * Unlocks an existing initialized vault using the Master Password.
 * Distinguishes uninitialized, unsupported version, corrupted, and incorrect password.
 */
export async function unlockVaultStorage(masterPassword: string): Promise<VaultUnlockResult> {
  const meta = await getStoredVaultMeta();
  if (!meta) {
    throw new VaultError('Cannot unlock: Vault is not initialized on this device.');
  }

  if (meta.vaultVersion !== CURRENT_VAULT_VERSION) {
    throw new UnsupportedVaultVersionError(meta.vaultVersion, [CURRENT_VAULT_VERSION]);
  }

  validateVaultMetaStructure(meta);

  const vaultKey = await unlockVault(masterPassword, meta);

  return {
    meta,
    vaultKey,
  };
}

/**
 * Securely changes the Master Password in persistent storage using the active runtime Vault Key.
 * 
 * Strict Process:
 * 1. Requires the vault to already be unlocked (vaultKey provided).
 * 2. Derives new Master Key and encrypts the existing Vault Key into a new EVK.
 * 3. Verifies that the new EVK successfully decrypts the Vault Key BEFORE touching storage.
 * 4. Only after successful verification, replaces the old encrypted vault configuration.
 * 5. Persists the new cryptographic configuration in IndexedDB.
 * 
 * Vault records remain completely untouched.
 * Crash safety: Does NOT destroy or overwrite the old valid EVK if derivation, encryption, or verification fails.
 * If synchronization fails, preserves the local valid encrypted vault state.
 */
export async function changeMasterPasswordStorage(
  newMasterPassword: string,
  vaultKey: CryptoKey,
  newIterations?: number
): Promise<StoredVaultMeta> {
  const meta = await getStoredVaultMeta();
  if (!meta) {
    throw new VaultError('Cannot change Master Password: Vault is not initialized.');
  }

  validateVaultMetaStructure(meta);

  // Steps 3-7: Generate fresh salt & IV, derive new Master Key, re-encrypt existing Vault Key, and verify
  // CRASH SAFETY: If any crypto or verification error occurs, the old EVK in IndexedDB is 100% untouched.
  const { newConfig } = await createRekeyedVaultConfig({
    newMasterPassword,
    vaultKey,
    currentConfig: meta,
    newIterations,
  });

  // Steps 8-9: Replace and persist only after successful verification
  const now = Date.now();
  const updatedMeta: StoredVaultMeta = {
    ...meta,
    kdf: newConfig.kdf,
    evk: newConfig.evk,
    updatedAt: now,
    version: meta.version + 1,
    syncStatus: meta.syncStatus === 'pending_create' ? 'pending_create' : 'pending_update',
    syncError: undefined,
  };

  const db = await getDB();
  const tx = db.transaction('vaultMeta', 'readwrite');
  await tx.objectStore('vaultMeta').put(updatedMeta);
  await tx.done;

  // Trigger non-blocking encrypted sync (preserves last valid state if network fails)
  syncVault().catch((err) => {
    console.warn('[VaultStorage] Non-blocking sync deferred after password change:', err);
  });

  return updatedMeta;
}

/**
 * Rekeyes the vault with a new Master Password without re-encrypting records.
 * Updates the stored EVK in IndexedDB after verification.
 */
export async function rekeyVaultStorage(
  currentMasterPassword: string,
  newMasterPassword: string,
  newIterations?: number
): Promise<StoredVaultMeta> {
  const meta = await getStoredVaultMeta();
  if (!meta) {
    throw new VaultError('Cannot rekey: Vault is not initialized.');
  }

  validateVaultMetaStructure(meta);

  // 1. Verify current password by unlocking and obtaining the Vault Key
  const vaultKey = await unlockVault(currentMasterPassword, meta);

  // 2. Perform the verified changeMasterPasswordStorage process
  return changeMasterPasswordStorage(newMasterPassword, vaultKey, newIterations);
}

/**
 * Creates and persists a new encrypted vault record.
 * GUARANTEE: Persisted record contains ONLY ciphertext, IV, and authenticated metadata.
 * Absolutely NO plaintext fields (title, username, password, url, notes) are persisted.
 */
export async function createEncryptedRecord(
  payload: VaultRecordPayload,
  vaultKey: CryptoKey,
  recordId?: string
): Promise<StoredVaultRecord> {
  const id = recordId || crypto.randomUUID();
  const now = Date.now();

  const encrypted = await encryptVaultRecordPayload({
    payload,
    vaultKey,
    recordId: id,
    vaultVersion: CURRENT_VAULT_VERSION,
    schemaVersion: CURRENT_RECORD_SCHEMA_VERSION,
  });

  const record: StoredVaultRecord = {
    id,
    vaultVersion: encrypted.vaultVersion,
    schemaVersion: encrypted.schemaVersion,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending_create',
  };

  const db = await getDB();
  await db.put('vaultItems', record);

  // Trigger non-blocking encrypted sync
  syncVault().catch(() => {});

  return record;
}

/**
 * Updates an existing encrypted vault record with fresh ciphertext and a new IV.
 */
export async function updateEncryptedRecord(
  recordId: string,
  payload: VaultRecordPayload,
  vaultKey: CryptoKey
): Promise<StoredVaultRecord> {
  const db = await getDB();
  const existing = await db.get('vaultItems', recordId);

  if (!existing || existing.deletedAt !== null) {
    throw new VaultError(`Cannot update: Vault record ${recordId} does not exist.`);
  }

  const encrypted = await encryptVaultRecordPayload({
    payload,
    vaultKey,
    recordId,
    vaultVersion: existing.vaultVersion,
    schemaVersion: existing.schemaVersion,
  });

  const now = Date.now();
  const updated: StoredVaultRecord = {
    ...existing,
    iv: encrypted.iv,
    ciphertext: encrypted.ciphertext,
    updatedAt: now,
    version: existing.version + 1,
    syncStatus: existing.syncStatus === 'pending_create' ? 'pending_create' : 'pending_update',
  };

  await db.put('vaultItems', updated);

  // Trigger non-blocking encrypted sync
  syncVault().catch(() => {});

  return updated;
}

/**
 * Deletes a vault record. Soft-deletes for synchronization tracking or removes if unsynced.
 */
export async function deleteEncryptedRecord(recordId: string): Promise<void> {
  const db = await getDB();
  const existing = await db.get('vaultItems', recordId);

  if (!existing || existing.deletedAt !== null) {
    return;
  }

  if (existing.syncStatus === 'pending_create') {
    await db.delete('vaultItems', recordId);
  } else {
    const now = Date.now();
    const deleted: StoredVaultRecord = {
      ...existing,
      updatedAt: now,
      deletedAt: now,
      version: existing.version + 1,
      syncStatus: 'pending_delete',
    };
    await db.put('vaultItems', deleted);
    syncVault().catch(() => {});
  }
}

/**
 * Reads a single stored encrypted vault record by ID.
 */
export async function getStoredRecord(recordId: string): Promise<StoredVaultRecord | undefined> {
  const db = await getDB();
  const record = await db.get('vaultItems', recordId);
  if (!record || record.deletedAt !== null) {
    return undefined;
  }
  return record;
}

/**
 * Lists stored encrypted vault records sorted by updatedAt descending.
 */
export async function listStoredRecords(includeDeleted = false): Promise<StoredVaultRecord[]> {
  const db = await getDB();
  const all = await db.getAll('vaultItems');
  if (includeDeleted) {
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return all.filter((r) => r.deletedAt === null).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Decrypts a stored encrypted vault record using the active in-memory Vault Key.
 * Rejects tampered ciphertext, altered IVs, or modified authenticated metadata.
 * Throws CorruptedRecordError on any tampering. Never silently ignores errors.
 */
export async function decryptStoredRecord(
  record: StoredVaultRecord,
  vaultKey: CryptoKey
): Promise<VaultRecordPayload> {
  if (!record || !record.ciphertext || !record.iv || !record.id) {
    throw new CorruptedRecordError('Stored record contains missing or invalid cryptographic fields.');
  }

  return decryptVaultRecordPayload({
    ciphertext: record.ciphertext,
    iv: record.iv,
    vaultKey,
    recordId: record.id,
    vaultVersion: record.vaultVersion,
    schemaVersion: record.schemaVersion,
  });
}

/**
 * Clears all local vault storage (both metadata and items, plus sync metadata).
 * Useful for test suites, account resetting, or device wiping.
 */
export async function clearLocalVaultStorage(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['vaultMeta', 'vaultItems', 'syncMeta'], 'readwrite');
  await Promise.all([
    tx.objectStore('vaultMeta').clear(),
    tx.objectStore('vaultItems').clear(),
    tx.objectStore('syncMeta').delete('vault'),
    tx.done,
  ]);
}

/**
 * Destructive Hard Reset of Vault Storage:
 * 1. If an authenticated user ID is provided, permanently deletes remote encrypted vault documents
 *    scoped strictly to users/${userId}/...
 * 2. Purges all local encrypted records, metadata, and sync points in IndexedDB.
 * 
 * STRICT USER ISOLATION:
 * - Never modifies or affects records of any other user.
 */
export async function resetVaultStorage(userId?: string | null): Promise<void> {
  if (userId) {
    try {
      await deleteRemoteUserVault(userId);
    } catch (err) {
      console.warn('[VaultStorage] Remote vault deletion failed during reset (continuing local reset):', err);
    }
  }
  await clearLocalVaultStorage();
}

