/**
 * MATRIX Password Vault - Encrypted Vault Backup & Restore Service
 * 
 * Implements strict zero-knowledge export, import, validation, and restoration:
 * 
 * EXPORT:
 * - Generates encrypted JSON backup containing:
 *   vaultVersion, kdf, salt, evk, evkIv, encrypted records (id, vaultVersion, schemaVersion, iv, ciphertext, createdAt, updatedAt, version).
 * - STRICT ZERO-KNOWLEDGE: NEVER contains Master Password, Master Key, plaintext Vault Key,
 *   plaintext passwords, plaintext usernames, plaintext notes, or plaintext URLs.
 * - Enforces pre-export leak assertions (assertZeroPlaintextLeak).
 * - Security warning: Backup contains encrypted vault material and should be safeguarded.
 * 
 * IMPORT & EXISTING VAULT PROTECTION:
 * - Does NOT overwrite an existing vault immediately upon parsing.
 * - Step 1: Deep structural schema validation (rejects malformed JSON, invalid versions, invalid KDF, invalid EVK, invalid records).
 * - Step 2: Malicious content detection & zero-leak assertion (rejects embedded scripts, dangerous HTML, or unencrypted plaintext fields).
 * - Step 3: Decryptability verification: Prompts for Master Password and verifies EVK unwrapping + record AAD trial decryption in-memory before any mutation.
 * - Step 4: Explicit destructive replacement: Only after user confirmation ('RESTORE').
 */

import { getDB } from '../db';
import {
  CURRENT_VAULT_VERSION,
  CURRENT_RECORD_SCHEMA_VERSION,
  SALT_BYTE_LENGTH,
  GCM_IV_BYTE_LENGTH,
  EncryptedVaultBackup,
  EncryptedBackupRecord,
  StoredVaultMeta,
  StoredVaultRecord,
  VaultRecordPayload,
  VaultError,
  IncorrectMasterPasswordError,
  CorruptedEVKError,
  CorruptedRecordError,
  UnsupportedVaultVersionError,
  VaultBackupValidationError,
  BackupValidationErrorCode,
} from '../../domain/vaultTypes';
import {
  unlockVault,
  decryptVaultRecordPayload,
  base64ToBytes,
} from './crypto';
import {
  PRIMARY_VAULT_META_ID,
  getStoredVaultMeta,
  listStoredRecords,
} from './vaultStorageService';
import { vaultRuntimeService } from './vaultRuntimeService';

/** Expected byte length of an encrypted 256-bit Vault Key in AES-GCM (32 + 16 = 48) */
const EXPECTED_EVK_BYTE_LENGTH = 48;

/** Prohibited plaintext field names that must NEVER appear in an encrypted backup */
const FORBIDDEN_PLAINTEXT_KEYS = new Set([
  'password',
  'masterpassword',
  'masterkey',
  'vaultkey',
  'username',
  'notes',
  'url',
  'title',
  'customfields',
  'plaintext',
  'secret',
  'cleartext',
]);

/**
 * Malicious script / executable tags regex.
 * Imported notes, titles, URLs and metadata are purely text data, never HTML or JavaScript.
 */
const MALICIOUS_PAYLOAD_REGEX = /<script\b[^>]*>|javascript:|vbscript:|data:text\/html|<iframe\b[^>]*>|onerror\s*=|onload\s*=/i;

/**
 * Traverses an object and asserts that no prohibited plaintext fields exist.
 * Throws VaultBackupValidationError if any plaintext attribute is detected.
 */
export function assertZeroPlaintextLeak(obj: unknown, path = 'root'): void {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      assertZeroPlaintextLeak(obj[i], `${path}[${i}]`);
    }
    return;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FORBIDDEN_PLAINTEXT_KEYS.has(normalizedKey)) {
      throw new VaultBackupValidationError(
        'SUSPICIOUS_FIELD_DETECTED',
        `Prohibited plaintext field '${key}' detected at '${path}'. Encrypted backups must never contain unencrypted credentials or attributes.`
      );
    }

    if (value && typeof value === 'object') {
      assertZeroPlaintextLeak(value, `${path}.${key}`);
    }
  }
}

/**
 * Checks for malicious script / executable payload patterns in string fields.
 */
export function validateBackupContentSanitization(obj: unknown, path = 'root'): void {
  if (typeof obj === 'string') {
    if (MALICIOUS_PAYLOAD_REGEX.test(obj)) {
      throw new VaultBackupValidationError(
        'MALICIOUS_PAYLOAD_DETECTED',
        `Suspicious or executable script markup detected in '${path}'. Imported vault items are strictly text data.`
      );
    }
    return;
  }

  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        validateBackupContentSanitization(obj[i], `${path}[${i}]`);
      }
    } else {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        validateBackupContentSanitization(value, `${path}.${key}`);
      }
    }
  }
}

/**
 * Validates the full structural schema of an imported backup before any decryption or mutation.
 */
export function validateVaultBackupStructure(raw: unknown): EncryptedVaultBackup {
  let parsed: unknown = raw;

  // 1. JSON parsing validation
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new VaultBackupValidationError(
        'INVALID_JSON',
        'Malformed JSON: The imported backup file could not be parsed as valid JSON.'
      );
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new VaultBackupValidationError(
      'MALFORMED_STRUCTURE',
      'Malformed backup structure: Top-level item must be a JSON object.'
    );
  }

  const obj = parsed as Record<string, unknown>;

  // 2. Format validation
  if (obj.format !== 'matrix_vault_encrypted_backup') {
    throw new VaultBackupValidationError(
      'MISSING_FORMAT',
      "Unrecognized file format: Expected format 'matrix_vault_encrypted_backup'."
    );
  }

  // 3. Backup Version validation
  if (obj.backupVersion !== 1) {
    throw new VaultBackupValidationError(
      'UNSUPPORTED_BACKUP_VERSION',
      `Unsupported backup version: ${obj.backupVersion}. Only version 1 is supported.`
    );
  }

  // 4. Vault Version validation
  if (typeof obj.vaultVersion !== 'number' || obj.vaultVersion !== CURRENT_VAULT_VERSION) {
    throw new UnsupportedVaultVersionError(
      typeof obj.vaultVersion === 'number' ? obj.vaultVersion : -1,
      [CURRENT_VAULT_VERSION]
    );
  }

  // 5. KDF Configuration validation
  if (!obj.kdf || typeof obj.kdf !== 'object' || Array.isArray(obj.kdf)) {
    throw new VaultBackupValidationError('INVALID_KDF', 'Missing or invalid KDF configuration.');
  }

  const kdf = obj.kdf as Record<string, unknown>;
  if (kdf.algorithm !== 'PBKDF2' || kdf.hash !== 'SHA-256') {
    throw new VaultBackupValidationError(
      'INVALID_KDF',
      'Invalid KDF parameters: MATRIX requires PBKDF2 with SHA-256.'
    );
  }

  if (
    typeof kdf.iterations !== 'number' ||
    !Number.isInteger(kdf.iterations) ||
    kdf.iterations < 1_000 ||
    kdf.iterations > 5_000_000
  ) {
    throw new VaultBackupValidationError(
      'INVALID_KDF',
      'Invalid KDF iteration count: Must be an integer between 1,000 and 5,000,000.'
    );
  }

  if (typeof kdf.salt !== 'string' || !kdf.salt) {
    throw new VaultBackupValidationError('INVALID_KDF', 'Missing or invalid KDF salt.');
  }

  try {
    const saltBytes = base64ToBytes(kdf.salt, 'kdf.salt');
    if (saltBytes.length !== SALT_BYTE_LENGTH) {
      throw new VaultBackupValidationError(
        'INVALID_KDF',
        `KDF salt must be exactly ${SALT_BYTE_LENGTH} bytes. Received: ${saltBytes.length} bytes.`
      );
    }
  } catch (err) {
    if (err instanceof VaultBackupValidationError) throw err;
    throw new VaultBackupValidationError('INVALID_KDF', 'KDF salt contains invalid Base64 encoding.');
  }

  // 6. EVK Structure validation
  if (!obj.evk || typeof obj.evk !== 'object' || Array.isArray(obj.evk)) {
    throw new VaultBackupValidationError('INVALID_EVK', 'Missing or invalid EVK configuration.');
  }

  const evk = obj.evk as Record<string, unknown>;
  if (typeof evk.encryptedVaultKey !== 'string' || !evk.encryptedVaultKey) {
    throw new VaultBackupValidationError('INVALID_EVK', 'Missing encrypted Vault Key ciphertext.');
  }

  if (typeof evk.evkIv !== 'string' || !evk.evkIv) {
    throw new VaultBackupValidationError('INVALID_EVK', 'Missing EVK initialization vector (evkIv).');
  }

  try {
    const evkBytes = base64ToBytes(evk.encryptedVaultKey, 'evk.encryptedVaultKey');
    if (evkBytes.length !== EXPECTED_EVK_BYTE_LENGTH) {
      throw new VaultBackupValidationError(
        'INVALID_EVK',
        `EVK ciphertext length invalid: Expected ${EXPECTED_EVK_BYTE_LENGTH} bytes (32 key + 16 auth tag), received ${evkBytes.length} bytes.`
      );
    }

    const ivBytes = base64ToBytes(evk.evkIv, 'evk.evkIv');
    if (ivBytes.length !== GCM_IV_BYTE_LENGTH) {
      throw new VaultBackupValidationError(
        'INVALID_EVK',
        `EVK IV length invalid: Expected ${GCM_IV_BYTE_LENGTH} bytes, received ${ivBytes.length} bytes.`
      );
    }
  } catch (err) {
    if (err instanceof VaultBackupValidationError) throw err;
    throw new VaultBackupValidationError('INVALID_EVK', 'EVK fields contain invalid Base64 encoding.');
  }

  // 7. Records array validation
  if (!Array.isArray(obj.records)) {
    throw new VaultBackupValidationError(
      'INVALID_RECORD',
      "Malformed backup structure: 'records' must be an array."
    );
  }

  for (let i = 0; i < obj.records.length; i++) {
    const rec = obj.records[i];
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
      throw new VaultBackupValidationError(
        'INVALID_RECORD',
        `Record at index ${i} is not a valid object.`
      );
    }

    if (typeof rec.id !== 'string' || !rec.id.trim() || rec.id.length > 128) {
      throw new VaultBackupValidationError(
        'INVALID_RECORD',
        `Record at index ${i} has an invalid or missing record ID.`
      );
    }

    if (rec.vaultVersion !== CURRENT_VAULT_VERSION) {
      throw new VaultBackupValidationError(
        'INVALID_RECORD',
        `Record ${rec.id} specifies unsupported vault version: ${rec.vaultVersion}.`
      );
    }

    if (rec.schemaVersion !== CURRENT_RECORD_SCHEMA_VERSION) {
      throw new VaultBackupValidationError(
        'INVALID_RECORD',
        `Record ${rec.id} specifies unsupported schema version: ${rec.schemaVersion}.`
      );
    }

    if (typeof rec.iv !== 'string' || !rec.iv) {
      throw new VaultBackupValidationError(
        'INVALID_RECORD',
        `Record ${rec.id} is missing its initialization vector (iv).`
      );
    }

    if (typeof rec.ciphertext !== 'string' || !rec.ciphertext) {
      throw new VaultBackupValidationError(
        'INVALID_RECORD',
        `Record ${rec.id} is missing ciphertext.`
      );
    }

    try {
      const recordIv = base64ToBytes(rec.iv, `records[${i}].iv`);
      if (recordIv.length !== GCM_IV_BYTE_LENGTH) {
        throw new VaultBackupValidationError(
          'INVALID_RECORD',
          `Record ${rec.id} IV length invalid: Expected ${GCM_IV_BYTE_LENGTH} bytes, got ${recordIv.length}.`
        );
      }

      const recordCiphertext = base64ToBytes(rec.ciphertext, `records[${i}].ciphertext`);
      if (recordCiphertext.length < 16) {
        throw new VaultBackupValidationError(
          'INVALID_RECORD',
          `Record ${rec.id} ciphertext is truncated (minimum 16 bytes auth tag).`
        );
      }
    } catch (err) {
      if (err instanceof VaultBackupValidationError) throw err;
      throw new VaultBackupValidationError(
        'INVALID_RECORD',
        `Record ${rec.id} contains invalid Base64 cryptographic encoding.`
      );
    }

    if (typeof rec.createdAt !== 'number' || typeof rec.updatedAt !== 'number') {
      throw new VaultBackupValidationError(
        'INVALID_RECORD',
        `Record ${rec.id} contains invalid timestamps.`
      );
    }

    if (typeof rec.version !== 'number' || rec.version < 1) {
      throw new VaultBackupValidationError(
        'INVALID_RECORD',
        `Record ${rec.id} has an invalid version number.`
      );
    }
  }

  // 8. Zero-Knowledge Leak Assertion & Sanitization
  assertZeroPlaintextLeak(obj);
  validateBackupContentSanitization(obj);

  return obj as unknown as EncryptedVaultBackup;
}

/**
 * Export the current encrypted vault representation.
 * STRICT ZERO-KNOWLEDGE: Contains NO plaintext passwords, NO Master Password,
 * NO Master Key, and NO unencrypted record payload fields.
 */
export async function exportEncryptedVault(): Promise<EncryptedVaultBackup> {
  const meta = await getStoredVaultMeta();
  if (!meta) {
    throw new VaultError('Cannot export: No initialized vault found in storage.');
  }

  // Fetch all active encrypted records
  const storedRecords = await listStoredRecords(false);

  const backupRecords: EncryptedBackupRecord[] = storedRecords.map((r) => ({
    id: r.id,
    vaultVersion: r.vaultVersion,
    schemaVersion: r.schemaVersion,
    iv: r.iv,
    ciphertext: r.ciphertext,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    version: r.version,
  }));

  const backup: EncryptedVaultBackup = {
    format: 'matrix_vault_encrypted_backup',
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    vaultVersion: meta.vaultVersion,
    kdf: {
      algorithm: meta.kdf.algorithm,
      hash: meta.kdf.hash,
      iterations: meta.kdf.iterations,
      salt: meta.kdf.salt,
    },
    evk: {
      encryptedVaultKey: meta.evk.encryptedVaultKey,
      evkIv: meta.evk.evkIv,
    },
    records: backupRecords,
  };

  // Run zero-leak assertion before returning
  assertZeroPlaintextLeak(backup);

  return backup;
}

export const exportEncryptedVaultBackup = exportEncryptedVault;

/**
 * Exports the encrypted vault representation as formatted JSON.
 */
export async function exportEncryptedVaultAsJson(): Promise<string> {
  const backup = await exportEncryptedVault();
  return JSON.stringify(backup, null, 2);
}

/**
 * Triggers a secure browser download for the encrypted vault backup file.
 */
export async function downloadVaultBackupFile(): Promise<{ filename: string; recordCount: number }> {
  const backup = await exportEncryptedVault();
  const json = JSON.stringify(backup, null, 2);

  const dateSlug = new Date().toISOString().split('T')[0];
  const filename = `matrix-vault-backup-${dateSlug}.json`;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { filename, recordCount: backup.records.length };
}

export interface BackupVerificationResult {
  valid: true;
  recordCount: number;
  vaultVersion: number;
  kdfIterations: number;
  exportedAt: string;
  verifiedVaultKey: CryptoKey;
  vaultKey: CryptoKey;
  backupData: EncryptedVaultBackup;
}

/**
 * Verifies that the imported backup can be unlocked and decrypted using the provided Master Password.
 * 
 * EXISTING VAULT PROTECTION:
 * - Does NOT modify existing vault storage or state!
 * - Unwraps the imported EVK in-memory.
 * - Test-decrypts all records using their unique IVs and authenticated metadata (AAD).
 * - Only if all cryptographic checks succeed does it return the verified result.
 */
export async function verifyBackupDecryptability(
  backup: EncryptedVaultBackup,
  masterPassword: string
): Promise<BackupVerificationResult> {
  if (!masterPassword) {
    throw new IncorrectMasterPasswordError('Master Password is required to verify backup.');
  }

  // 1. Re-validate structure just in case
  validateVaultBackupStructure(backup);

  // 2. Attempt in-memory unlock of the backup EVK
  const candidateConfig = {
    vaultVersion: backup.vaultVersion,
    kdf: backup.kdf,
    evk: backup.evk,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  let candidateVaultKey: CryptoKey;
  try {
    candidateVaultKey = await unlockVault(masterPassword, candidateConfig);
  } catch (err) {
    if (err instanceof IncorrectMasterPasswordError) {
      throw new IncorrectMasterPasswordError(
        'The provided Master Password does not match this backup or cannot decrypt the vault key.'
      );
    }
    throw err;
  }

  // 3. Test-decrypt every record in the backup to confirm data integrity & authenticity
  for (const record of backup.records) {
    try {
      const payload = await decryptVaultRecordPayload({
        ciphertext: record.ciphertext,
        iv: record.iv,
        vaultKey: candidateVaultKey,
        recordId: record.id,
        vaultVersion: record.vaultVersion,
        schemaVersion: record.schemaVersion,
      });

      // Confirm payload structure (treat all attributes as pure text data, never HTML or code)
      if (
        typeof payload.title !== 'string' ||
        typeof payload.username !== 'string' ||
        typeof payload.password !== 'string' ||
        typeof payload.url !== 'string' ||
        typeof payload.notes !== 'string'
      ) {
        throw new CorruptedRecordError(`Record ${record.id} contains malformed payload types.`);
      }
    } catch (err) {
      if (err instanceof CorruptedRecordError) {
        throw err;
      }
      throw new CorruptedRecordError(
        `Failed to decrypt record ${record.id}: The record is corrupted or tampered.`
      );
    }
  }

  return {
    valid: true,
    recordCount: backup.records.length,
    vaultVersion: backup.vaultVersion,
    kdfIterations: backup.kdf.iterations,
    exportedAt: backup.exportedAt,
    verifiedVaultKey: candidateVaultKey,
    vaultKey: candidateVaultKey,
    backupData: backup,
  };
}

/**
 * Restores an encrypted vault from a verified backup result.
 * 
 * STRICT CONFIRMATION MANDATE:
 * - Requires explicit confirmation keyword 'RESTORE' to proceed.
 * - Atomically replaces primary_vault_config and all records in IndexedDB.
 * - Adopts the verified Vault Key into the active runtime service session.
 */
export async function restoreEncryptedVaultFromBackup(
  verified: BackupVerificationResult,
  confirmationKeyword: string
): Promise<{ recordCount: number }> {
  if (confirmationKeyword !== 'RESTORE') {
    throw new VaultError(
      "Destructive replacement confirmation failed. You must provide the confirmation keyword 'RESTORE'."
    );
  }

  const db = await getDB();
  const now = Date.now();

  const newMeta: StoredVaultMeta = {
    id: PRIMARY_VAULT_META_ID,
    vaultVersion: verified.backupData.vaultVersion,
    kdf: verified.backupData.kdf,
    evk: verified.backupData.evk,
    createdAt: now,
    updatedAt: now,
    version: 1,
    syncStatus: 'synchronized',
    deletedAt: null,
  };

  const newRecords: StoredVaultRecord[] = verified.backupData.records.map((r) => ({
    id: r.id,
    vaultVersion: r.vaultVersion,
    schemaVersion: r.schemaVersion,
    iv: r.iv,
    ciphertext: r.ciphertext,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    version: r.version,
    syncStatus: 'synchronized',
    deletedAt: null,
  }));

  // Perform atomic replacement in an IndexedDB transaction
  const tx = db.transaction(['vaultMeta', 'vaultItems'], 'readwrite');
  await Promise.all([
    tx.objectStore('vaultMeta').put(newMeta),
    tx.objectStore('vaultItems').clear(),
  ]);

  for (const rec of newRecords) {
    await tx.objectStore('vaultItems').put(rec);
  }

  await tx.done;

  // Adopt new key and unlocked state in the active runtime service
  vaultRuntimeService.adoptRestoredVault(verified.verifiedVaultKey);

  return { recordCount: newRecords.length };
}
