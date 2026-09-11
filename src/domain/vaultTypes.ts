/**
 * MATRIX Password Vault - Cryptographic Domain Types
 * 
 * Strict zero-knowledge domain models and error hierarchies.
 * No plaintext passwords or extractable keys are ever stored in these models.
 */

import { BaseEntity, SyncStatus } from './types';

export const CURRENT_VAULT_VERSION = 1;
export const CURRENT_RECORD_SCHEMA_VERSION = 1;
export const PBKDF2_RECOMMENDED_ITERATIONS = 600_000;
export const SALT_BYTE_LENGTH = 32; // 256-bit cryptographically secure salt
export const GCM_IV_BYTE_LENGTH = 12; // 96-bit standard IV for AES-GCM

export interface VaultKdfConfig {
  /** Key Derivation Function name */
  readonly algorithm: 'PBKDF2';
  /** Hash primitive used by HMAC */
  readonly hash: 'SHA-256';
  /**
   * Iteration count.
   * Note: PBKDF2 is used because this implementation relies on native browser Web Crypto.
   * It is CPU-hard and computationally expensive, but not memory-hard.
   */
  readonly iterations: number;
  /** Base64-encoded cryptographically random per-vault salt (32 bytes) */
  readonly salt: string;
}

export interface EncryptedVaultKeyBundle {
  /** Base64-encoded ciphertext of the 256-bit Vault Key encrypted with Master Key */
  readonly encryptedVaultKey: string;
  /** Base64-encoded 96-bit unique IV used specifically for this EVK encryption */
  readonly evkIv: string;
}

/**
 * Stored vault configuration containing KDF parameters and the Encrypted Vault Key (EVK).
 * Contains NO plaintext passwords, NO Master Password, and NO unencrypted keys.
 */
export interface VaultConfig {
  readonly vaultVersion: number;
  readonly kdf: VaultKdfConfig;
  readonly evk: EncryptedVaultKeyBundle;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Decrypted in-memory payload of a vault item.
 * Exists ONLY in volatile memory during active unlocked sessions.
 */
export interface VaultRecordPayload {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  /** Password strength score from 0 (weakest) to 4 (strongest) */
  strengthScore: number;
  /** Optional custom field map */
  customFields?: Record<string, string>;
}

/**
 * Encrypted vault record structure intended for local storage or remote sync.
 * Payload fields are completely opaque AES-256-GCM ciphertext.
 */
export interface EncryptedVaultRecord {
  /** Unique record ID (UUID) */
  readonly id: string;
  /** Vault version under which this was encrypted */
  readonly vaultVersion: number;
  /** Record payload schema version */
  readonly schemaVersion: number;
  /** Base64-encoded 96-bit unique IV generated for this specific encryption */
  readonly iv: string;
  /** Base64-encoded AES-256-GCM ciphertext including authentication tag */
  readonly ciphertext: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/**
 * Encrypted vault record stored persistently in IndexedDB / synced to Firestore.
 * Conforms to BaseEntity for offline-first tracking.
 * STRICT ZERO-KNOWLEDGE: Contains NO plaintext password, username, title, notes, or URL fields!
 */
export interface StoredVaultRecord extends BaseEntity {
  vaultVersion: number;
  schemaVersion: number;
  iv: string; // Base64 96-bit IV
  ciphertext: string; // Base64 AES-256-GCM ciphertext + authentication tag
}

/**
 * Vault configuration record stored persistently in IndexedDB / synced to Firestore.
 * Contains only public KDF parameters and EVK ciphertext.
 */
export interface StoredVaultMeta extends BaseEntity {
  vaultVersion: number;
  kdf: VaultKdfConfig;
  evk: EncryptedVaultKeyBundle;
}

/**
 * Vault status for application state detection.
 */
export type VaultStatus =
  | 'uninitialized'
  | 'locked'
  | 'unlocked'
  | 'corrupted'
  | 'unsupported_version';

/**
 * Vault runtime state for runtime session lifecycle.
 */
export type VaultRuntimeState =
  | 'uninitialized'
  | 'locked'
  | 'unlocking'
  | 'unlocked'
  | 'locking'
  | 'error';

/**
 * Allowed multi-tab BroadcastChannel message types.
 * NEVER transmit Vault Key, Master Password, or decrypted records!
 */
export type VaultBroadcastMessageType =
  | 'LOCK_VAULT'
  | 'LOGOUT'
  | 'ACCOUNT_CHANGED'
  | 'VAULT_RESET';

export interface VaultBroadcastMessage {
  type: VaultBroadcastMessageType;
  userId?: string | null;
  timestamp: number;
}

/**
 * Additional Authenticated Data (AAD) metadata structure bound cryptographically to each record.
 */
export interface RecordAADMetadata {
  readonly recordId: string;
  readonly vaultVersion: number;
  readonly schemaVersion: number;
}

/**
 * Cryptographic Error Hierarchies
 * Safe error categories that never leak cryptographic keys or plaintext data.
 */

export class VaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class IncorrectMasterPasswordError extends VaultError {
  constructor(message = 'Incorrect master password or corrupted vault key.') {
    super(message);
    this.name = 'IncorrectMasterPasswordError';
  }
}

export class VaultLockedError extends VaultError {
  constructor(message = 'Vault is locked. Unlock with Master Password to perform this action.') {
    super(message);
    this.name = 'VaultLockedError';
  }
}

export class CorruptedEVKError extends VaultError {
  constructor(message = 'Encrypted vault key is invalid, corrupted, or tampered.') {
    super(message);
    this.name = 'CorruptedEVKError';
  }
}

export class CorruptedRecordError extends VaultError {
  constructor(message = 'Vault record ciphertext or authenticated metadata is corrupted, tampered, or invalid.') {
    super(message);
    this.name = 'CorruptedRecordError';
  }
}

export class UnsupportedVaultVersionError extends VaultError {
  public readonly version: number;
  public readonly supportedVersions: readonly number[];

  constructor(version: number, supportedVersions: readonly number[]) {
    super(
      `Unsupported vault version: ${version}. This version of MATRIX supports: ${supportedVersions.join(', ')}.`
    );
    this.name = 'UnsupportedVaultVersionError';
    this.version = version;
    this.supportedVersions = supportedVersions;
  }
}

export class CryptoOperationError extends VaultError {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoOperationError';
  }
}

/**
 * Encrypted Vault Backup Schema
 * 
 * Contains ONLY cryptographic envelopes and encrypted record ciphertexts.
 * STRICTLY ZERO-KNOWLEDGE: Contains NO Master Password, NO Master Key,
 * NO plaintext Vault Key, and NO unencrypted record payload attributes.
 */
export interface EncryptedBackupRecord {
  readonly id: string;
  readonly vaultVersion: number;
  readonly schemaVersion: number;
  readonly iv: string; // Base64 96-bit IV
  readonly ciphertext: string; // Base64 AES-256-GCM ciphertext + auth tag
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly version: number;
}

export interface EncryptedVaultBackup {
  readonly format: 'matrix_vault_encrypted_backup';
  readonly backupVersion: 1;
  readonly exportedAt: string; // ISO-8601 timestamp
  readonly vaultVersion: number;
  readonly kdf: VaultKdfConfig;
  readonly evk: EncryptedVaultKeyBundle;
  readonly records: readonly EncryptedBackupRecord[];
}

export type BackupValidationErrorCode =
  | 'INVALID_JSON'
  | 'MISSING_FORMAT'
  | 'UNSUPPORTED_BACKUP_VERSION'
  | 'UNSUPPORTED_VAULT_VERSION'
  | 'INVALID_KDF'
  | 'INVALID_EVK'
  | 'INVALID_RECORD'
  | 'SUSPICIOUS_FIELD_DETECTED'
  | 'MALFORMED_STRUCTURE'
  | 'MALICIOUS_PAYLOAD_DETECTED';

export class VaultBackupValidationError extends VaultError {
  public readonly code: BackupValidationErrorCode;

  constructor(code: BackupValidationErrorCode, message: string) {
    super(message);
    this.name = 'VaultBackupValidationError';
    this.code = code;
  }
}
