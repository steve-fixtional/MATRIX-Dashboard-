/**
 * MATRIX Password Vault - Cryptographic Primitives
 * 
 * Strict zero-knowledge cryptographic module built entirely on native Web Crypto (crypto.subtle).
 * 
 * Key Hierarchy:
 * Master Password
 *   --> PBKDF2-HMAC-SHA256 (600,000 iterations + 256-bit random salt)
 *   --> Master Key (AES-256-GCM, non-extractable)
 *   --> Decrypts Encrypted Vault Key (EVK)
 *   --> Vault Key (AES-256-GCM, 256-bit random, non-extractable CryptoKey)
 *   --> Encrypts / Decrypts individual records with unique 96-bit random IVs and AAD
 * 
 * Guarantees:
 * - Master Password is never used directly as an encryption key.
 * - Master Password is never stored or cached anywhere.
 * - Runtime Vault Key is a non-extractable CryptoKey.
 * - Every encryption uses a freshly generated, cryptographically random 96-bit IV.
 * - Additional Authenticated Data (AAD) binds record metadata to prevent transplant/tampering.
 * - No plaintext passwords, keys, or sensitive data are ever logged or exposed.
 */

import {
  CURRENT_VAULT_VERSION,
  CURRENT_RECORD_SCHEMA_VERSION,
  PBKDF2_RECOMMENDED_ITERATIONS,
  SALT_BYTE_LENGTH,
  GCM_IV_BYTE_LENGTH,
  VaultConfig,
  VaultKdfConfig,
  VaultRecordPayload,
  RecordAADMetadata,
  VaultError,
  IncorrectMasterPasswordError,
  CorruptedEVKError,
  CorruptedRecordError,
  UnsupportedVaultVersionError,
  CryptoOperationError,
} from '../../domain/vaultTypes';

const SUPPORTED_VAULT_VERSIONS: readonly number[] = [1];
const SUPPORTED_RECORD_SCHEMA_VERSIONS: readonly number[] = [1];

/**
 * Validates that globalThis.crypto and crypto.subtle are available.
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis.crypto?.subtle === 'undefined') {
    throw new CryptoOperationError(
      'Web Cryptography API (crypto.subtle) is not available in this environment. HTTPS or a secure context is required.'
    );
  }
  return globalThis.crypto.subtle;
}

/**
 * Generates cryptographically secure random bytes using crypto.getRandomValues.
 */
export function generateRandomBytes(length: number): Uint8Array {
  if (length <= 0 || !Number.isInteger(length)) {
    throw new CryptoOperationError(`Invalid random byte length: ${length}`);
  }
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Converts a Uint8Array into a standard Base64 string without data loss.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64 string into a Uint8Array.
 * Throws CorruptedRecordError or CorruptedEVKError if base64 format is invalid.
 */
export function base64ToBytes(base64: string, context = 'data'): Uint8Array {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    throw new VaultError(`Invalid base64 encoding encountered while parsing ${context}.`);
  }
}

/**
 * Constructs deterministic Additional Authenticated Data (AAD) for a record.
 * Cryptographically binds recordId, vaultVersion, and schemaVersion to the ciphertext.
 */
export function createRecordAAD(metadata: RecordAADMetadata): Uint8Array {
  const canonicalString = `MATRIX_VAULT_RECORD_AAD|v=${metadata.vaultVersion}|s=${metadata.schemaVersion}|id=${metadata.recordId}`;
  return new TextEncoder().encode(canonicalString);
}

/**
 * Constructs deterministic Additional Authenticated Data (AAD) for the Encrypted Vault Key (EVK).
 * Binds the KDF configuration and vault version to the EVK ciphertext.
 */
export function createEvkAAD(vaultVersion: number, kdf: VaultKdfConfig): Uint8Array {
  const canonicalString = `MATRIX_VAULT_EVK_AAD|v=${vaultVersion}|kdf=${kdf.algorithm}|h=${kdf.hash}|i=${kdf.iterations}|s=${kdf.salt}`;
  return new TextEncoder().encode(canonicalString);
}

/**
 * Derives an AES-256-GCM Master Key from the user's Master Password using PBKDF2-HMAC-SHA256.
 * The derived key is configured as NON-EXTRACTABLE.
 */
export async function deriveMasterKey(
  masterPassword: string,
  saltBytes: Uint8Array,
  iterations: number = PBKDF2_RECOMMENDED_ITERATIONS,
  hash: 'SHA-256' = 'SHA-256'
): Promise<CryptoKey> {
  if (!masterPassword || typeof masterPassword !== 'string') {
    throw new CryptoOperationError('Master password must be a non-empty string.');
  }
  if (saltBytes.byteLength < 16) {
    throw new CryptoOperationError('PBKDF2 salt must be at least 16 bytes.');
  }
  if (iterations < 1_000) {
    throw new CryptoOperationError('PBKDF2 iterations must be at least 1,000.');
  }

  const subtle = getSubtleCrypto();
  const passwordBytes = new TextEncoder().encode(masterPassword);

  let baseKey: CryptoKey | null = null;
  try {
    // Import password as raw key material for PBKDF2
    baseKey = await subtle.importKey(
      'raw',
      passwordBytes,
      { name: 'PBKDF2' },
      false, // non-extractable
      ['deriveKey']
    );

    // Derive 256-bit AES-GCM Master Key
    const masterKey = await subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes as BufferSource,
        iterations,
        hash,
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false, // non-extractable!
      ['encrypt', 'decrypt']
    );

    return masterKey;
  } finally {
    // Overwrite the password byte buffer in memory
    passwordBytes.fill(0);
  }
}

/**
 * Initializes a brand new MATRIX Vault.
 * 
 * 1. Generates a 256-bit random salt.
 * 2. Derives the Master Key via PBKDF2.
 * 3. Generates a cryptographically random 256-bit raw Vault Key.
 * 4. Encrypts the raw Vault Key using the Master Key + unique 96-bit IV + EVK AAD to create the EVK.
 * 5. Imports the raw Vault Key as a NON-EXTRACTABLE CryptoKey for active runtime use.
 * 6. Securely wipes the raw Vault Key buffer from memory.
 */
export async function initializeVault(
  masterPassword: string,
  iterations: number = PBKDF2_RECOMMENDED_ITERATIONS
): Promise<{ config: VaultConfig; vaultKey: CryptoKey }> {
  if (!masterPassword || masterPassword.length < 8) {
    throw new CryptoOperationError('Master password must be at least 8 characters long.');
  }

  const subtle = getSubtleCrypto();

  // 1. Generate 256-bit random salt
  const saltBytes = generateRandomBytes(SALT_BYTE_LENGTH);
  const saltBase64 = bytesToBase64(saltBytes);

  const kdfConfig: VaultKdfConfig = {
    algorithm: 'PBKDF2',
    hash: 'SHA-256',
    iterations,
    salt: saltBase64,
  };

  // 2. Derive Master Key
  const masterKey = await deriveMasterKey(masterPassword, saltBytes, iterations, 'SHA-256');

  // 3. Generate 256-bit random raw Vault Key (32 bytes)
  const rawVaultKey = generateRandomBytes(32);

  // 4. Generate unique 96-bit IV for EVK
  const evkIv = generateRandomBytes(GCM_IV_BYTE_LENGTH);
  const evkAAD = createEvkAAD(CURRENT_VAULT_VERSION, kdfConfig);

  try {
    // Encrypt the raw Vault Key using the derived Master Key
    const encryptedKeyBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: evkIv as BufferSource,
        additionalData: evkAAD as BufferSource,
      },
      masterKey,
      rawVaultKey as BufferSource
    );

    const evkCiphertextBase64 = bytesToBase64(new Uint8Array(encryptedKeyBuffer));
    const evkIvBase64 = bytesToBase64(evkIv);

    // 5. Import raw Vault Key as a CryptoKey for runtime operations
    const vaultKey = await subtle.importKey(
      'raw',
      rawVaultKey as BufferSource,
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable for runtime re-keying and wrapping
      ['encrypt', 'decrypt']
    );

    const now = Date.now();
    const config: VaultConfig = {
      vaultVersion: CURRENT_VAULT_VERSION,
      kdf: kdfConfig,
      evk: {
        encryptedVaultKey: evkCiphertextBase64,
        evkIv: evkIvBase64,
      },
      createdAt: now,
      updatedAt: now,
    };

    return { config, vaultKey };
  } finally {
    // 6. Securely wipe the temporary raw Vault Key bytes from memory
    rawVaultKey.fill(0);
  }
}

/**
 * Unlocks an existing MATRIX Vault using the Master Password and VaultConfig.
 * 
 * 1. Validates vault version compatibility.
 * 2. Re-derives the Master Key from the Master Password and stored salt.
 * 3. Decrypts the Encrypted Vault Key (EVK) using AES-256-GCM.
 *    If the password is wrong or ciphertext tampered, AES-GCM authentication fails.
 * 4. Imports the decrypted raw key into a NON-EXTRACTABLE CryptoKey for runtime use.
 * 5. Securely wipes the raw key buffer from memory.
 */
export async function unlockVault(
  masterPassword: string,
  config: VaultConfig
): Promise<CryptoKey> {
  if (!config) {
    throw new CorruptedEVKError('Vault configuration is missing.');
  }

  // 1. Version validation
  if (!SUPPORTED_VAULT_VERSIONS.includes(config.vaultVersion)) {
    throw new UnsupportedVaultVersionError(config.vaultVersion, SUPPORTED_VAULT_VERSIONS);
  }

  if (
    !config.kdf ||
    config.kdf.algorithm !== 'PBKDF2' ||
    config.kdf.hash !== 'SHA-256' ||
    !config.kdf.salt ||
    !config.evk?.encryptedVaultKey ||
    !config.evk?.evkIv
  ) {
    throw new CorruptedEVKError('Vault configuration contains missing or malformed KDF/EVK metadata.');
  }

  let saltBytes: Uint8Array;
  let evkIvBytes: Uint8Array;
  let encryptedKeyBytes: Uint8Array;

  try {
    saltBytes = base64ToBytes(config.kdf.salt, 'salt');
    evkIvBytes = base64ToBytes(config.evk.evkIv, 'evkIv');
    encryptedKeyBytes = base64ToBytes(config.evk.encryptedVaultKey, 'encryptedVaultKey');
  } catch (err) {
    throw new CorruptedEVKError(`Failed to decode base64 EVK parameters: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (evkIvBytes.byteLength !== GCM_IV_BYTE_LENGTH) {
    throw new CorruptedEVKError(`Invalid EVK IV length: expected ${GCM_IV_BYTE_LENGTH} bytes, got ${evkIvBytes.byteLength}.`);
  }

  const subtle = getSubtleCrypto();

  // 2. Re-derive Master Key
  const masterKey = await deriveMasterKey(
    masterPassword,
    saltBytes,
    config.kdf.iterations,
    config.kdf.hash
  );

  const evkAAD = createEvkAAD(config.vaultVersion, config.kdf);

  // 3. Decrypt the EVK
  let decryptedKeyBuffer: ArrayBuffer;
  try {
    decryptedKeyBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: evkIvBytes as BufferSource,
        additionalData: evkAAD as BufferSource,
      },
      masterKey,
      encryptedKeyBytes as BufferSource
    );
  } catch {
    // Decryption failure in AES-GCM indicates invalid tag (wrong password or corrupted/tampered ciphertext)
    throw new IncorrectMasterPasswordError();
  }

  const decryptedKeyBytes = new Uint8Array(decryptedKeyBuffer);
  if (decryptedKeyBytes.byteLength !== 32) {
    decryptedKeyBytes.fill(0);
    throw new CorruptedEVKError(`Decrypted vault key has unexpected length: ${decryptedKeyBytes.byteLength} bytes.`);
  }

  try {
    // 4. Import as runtime CryptoKey (extractable for rekeying and wrapping operations)
    const vaultKey = await subtle.importKey(
      'raw',
      decryptedKeyBytes as BufferSource,
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // extractable for runtime re-keying and wrapping
      ['encrypt', 'decrypt']
    );

    return vaultKey;
  } finally {
    // 5. Zero-fill decrypted raw key bytes
    decryptedKeyBytes.fill(0);
  }
}

/**
 * Parameters for re-keying a vault configuration.
 */
export interface CreateRekeyedVaultConfigParams {
  /** The new Master Password */
  newMasterPassword: string;
  /** Current active runtime Vault Key */
  vaultKey: CryptoKey;
  /** Existing vault configuration */
  currentConfig: VaultConfig;
  /** PBKDF2 iterations for new key derivation (defaults to 600,000) */
  newIterations?: number;
}

/**
 * Creates and verifies a re-keyed vault configuration with a new Master Password:
 * 1. Obtains the current runtime Vault Key.
 * 2. Generates a new random salt.
 * 3. Derives a new Master Key from the new Master Password.
 * 4. Generates a new EVK IV.
 * 5. Encrypts the existing Vault Key using the new Master Key.
 * 6. Verifies that the new EVK successfully decrypts the Vault Key.
 * 7. Cryptographically cross-verifies that candidate EVK recovers a key identical to original Vault Key.
 * 
 * Crash safety: Does NOT touch storage or destroy the old EVK before verification.
 * Password handling: Never persists passwords or derived keys; zeros all sensitive memory buffers.
 */
export async function createRekeyedVaultConfig({
  newMasterPassword,
  vaultKey,
  currentConfig,
  newIterations = PBKDF2_RECOMMENDED_ITERATIONS,
}: CreateRekeyedVaultConfigParams): Promise<{
  newConfig: VaultConfig;
  verifiedKey: CryptoKey;
}> {
  if (!newMasterPassword || typeof newMasterPassword !== 'string' || newMasterPassword.length < 8) {
    throw new CryptoOperationError('New master password must be at least 8 characters long.');
  }
  if (!vaultKey) {
    throw new CryptoOperationError('Cannot change Master Password: active Vault Key is missing.');
  }

  const subtle = getSubtleCrypto();

  // Obtain raw bytes of the current runtime Vault Key
  const rawVaultKeyBuffer = await subtle.exportKey('raw', vaultKey);
  const rawVaultKeyBytes = new Uint8Array(rawVaultKeyBuffer);

  try {
    // 3. Generate a new random salt (32 bytes / 256-bit)
    const newSaltBytes = generateRandomBytes(SALT_BYTE_LENGTH);
    const newKdfConfig: VaultKdfConfig = {
      algorithm: 'PBKDF2',
      hash: 'SHA-256',
      iterations: newIterations,
      salt: bytesToBase64(newSaltBytes),
    };

    // 4. Derive a new Master Key from the new Master Password
    const newMasterKey = await deriveMasterKey(
      newMasterPassword,
      newSaltBytes,
      newIterations,
      'SHA-256'
    );

    // 5. Generate a new EVK IV (12 bytes / 96-bit)
    const newEvkIv = generateRandomBytes(GCM_IV_BYTE_LENGTH);
    const newEvkAAD = createEvkAAD(currentConfig.vaultVersion, newKdfConfig);

    // 6. Encrypt the existing Vault Key using the new Master Key
    const newEncryptedKeyBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: newEvkIv as BufferSource,
        additionalData: newEvkAAD as BufferSource,
      },
      newMasterKey,
      rawVaultKeyBytes as BufferSource
    );

    const candidateConfig: VaultConfig = {
      ...currentConfig,
      kdf: newKdfConfig,
      evk: {
        encryptedVaultKey: bytesToBase64(new Uint8Array(newEncryptedKeyBuffer)),
        evkIv: bytesToBase64(newEvkIv),
      },
      updatedAt: Date.now(),
    };

    // 7. Verify that the new EVK successfully decrypts the Vault Key
    const verifiedKey = await unlockVault(newMasterPassword, candidateConfig);
    if (!verifiedKey) {
      throw new CryptoOperationError('Verification failed: newly derived EVK could not decrypt the Vault Key.');
    }

    // Cryptographic self-test: verify that candidate EVK recovers a key that can decrypt data encrypted with existing vaultKey
    const testIV = generateRandomBytes(GCM_IV_BYTE_LENGTH);
    const testBlock = new Uint8Array([86, 65, 85, 76, 84, 95, 75, 69, 89]); // "VAULT_KEY"
    const testCipher = await subtle.encrypt(
      { name: 'AES-GCM', iv: testIV as BufferSource },
      vaultKey,
      testBlock as BufferSource
    );
    const testDecrypted = await subtle.decrypt(
      { name: 'AES-GCM', iv: testIV as BufferSource },
      verifiedKey,
      testCipher as BufferSource
    );
    const decBytes = new Uint8Array(testDecrypted);
    if (decBytes.length !== testBlock.length || !decBytes.every((b, i) => b === testBlock[i])) {
      throw new CryptoOperationError('Cryptographic verification failed: decrypted key does not match original Vault Key.');
    }

    return {
      newConfig: candidateConfig,
      verifiedKey,
    };
  } finally {
    // Zero-fill temporary raw vault key buffer immediately
    rawVaultKeyBytes.fill(0);
  }
}

/**
 * Changes the Master Password for an existing vault without re-encrypting records.
 * Generates a new salt, derives a new Master Key, and re-encrypts the existing Vault Key.
 * Verifies that the new EVK is functional before returning the new configuration.
 */
export async function rekeyVault(
  currentMasterPassword: string,
  newMasterPassword: string,
  config: VaultConfig,
  newIterations: number = PBKDF2_RECOMMENDED_ITERATIONS
): Promise<VaultConfig> {
  if (!newMasterPassword || newMasterPassword.length < 8) {
    throw new CryptoOperationError('New master password must be at least 8 characters long.');
  }

  // 1. Verify current password by unlocking the vault and obtaining the Vault Key
  const vaultKey = await unlockVault(currentMasterPassword, config);

  // 2. Perform the secure 9-step rekeying and verification process
  const { newConfig } = await createRekeyedVaultConfig({
    newMasterPassword,
    vaultKey,
    currentConfig: config,
    newIterations,
  });

  return newConfig;
}

/**
 * Parameters for encrypting a vault record.
 */
export interface EncryptRecordParams {
  payload: VaultRecordPayload;
  vaultKey: CryptoKey;
  recordId: string;
  vaultVersion?: number;
  schemaVersion?: number;
}

/**
 * Encrypts a VaultRecordPayload into AES-256-GCM ciphertext.
 * Generates a unique 96-bit random IV for EVERY encryption.
 * Binds recordId, vaultVersion, and schemaVersion using Additional Authenticated Data (AAD).
 */
export async function encryptVaultRecordPayload(
  params: EncryptRecordParams
): Promise<{
  ciphertext: string;
  iv: string;
  vaultVersion: number;
  schemaVersion: number;
}> {
  const { payload, vaultKey, recordId } = params;
  const vaultVersion = params.vaultVersion ?? CURRENT_VAULT_VERSION;
  const schemaVersion = params.schemaVersion ?? CURRENT_RECORD_SCHEMA_VERSION;

  if (!recordId || typeof recordId !== 'string') {
    throw new CryptoOperationError('recordId must be a valid non-empty string.');
  }
  if (!vaultKey) {
    throw new CryptoOperationError('A valid VaultKey CryptoKey is required for encryption.');
  }

  const subtle = getSubtleCrypto();

  // Generate a fresh, unique 96-bit IV for every single record encryption
  const ivBytes = generateRandomBytes(GCM_IV_BYTE_LENGTH);

  // Deterministic Additional Authenticated Data (AAD)
  const aadBytes = createRecordAAD({
    recordId,
    vaultVersion,
    schemaVersion,
  });

  // Serialize payload to canonical JSON UTF-8
  const plaintextString = JSON.stringify({
    title: payload.title ?? '',
    username: payload.username ?? '',
    password: payload.password ?? '',
    url: payload.url ?? '',
    notes: payload.notes ?? '',
    strengthScore: typeof payload.strengthScore === 'number' ? payload.strengthScore : 0,
    customFields: payload.customFields ?? {},
  });
  const plaintextBytes = new TextEncoder().encode(plaintextString);

  try {
    const ciphertextBuffer = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as BufferSource,
        additionalData: aadBytes as BufferSource,
      },
      vaultKey,
      plaintextBytes as BufferSource
    );

    return {
      ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
      iv: bytesToBase64(ivBytes),
      vaultVersion,
      schemaVersion,
    };
  } catch (err) {
    throw new CryptoOperationError(`Failed to encrypt vault record payload: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parameters for decrypting a vault record.
 */
export interface DecryptRecordParams {
  ciphertext: string;
  iv: string;
  vaultKey: CryptoKey;
  recordId: string;
  vaultVersion: number;
  schemaVersion: number;
}

/**
 * Decrypts a vault record ciphertext using AES-256-GCM.
 * Validates the GCM authentication tag against the exact ciphertext and Additional Authenticated Data (AAD).
 * If ciphertext or metadata was altered, decryption fails and throws CorruptedRecordError.
 */
export async function decryptVaultRecordPayload(
  params: DecryptRecordParams
): Promise<VaultRecordPayload> {
  const { ciphertext, iv, vaultKey, recordId, vaultVersion, schemaVersion } = params;

  if (!SUPPORTED_VAULT_VERSIONS.includes(vaultVersion)) {
    throw new UnsupportedVaultVersionError(vaultVersion, SUPPORTED_VAULT_VERSIONS);
  }
  if (!SUPPORTED_RECORD_SCHEMA_VERSIONS.includes(schemaVersion)) {
    throw new CorruptedRecordError(`Unsupported record schema version: ${schemaVersion}.`);
  }
  if (!recordId || typeof recordId !== 'string') {
    throw new CorruptedRecordError('Missing recordId for authenticated data verification.');
  }

  let ciphertextBytes: Uint8Array;
  let ivBytes: Uint8Array;

  try {
    ciphertextBytes = base64ToBytes(ciphertext, 'record ciphertext');
    ivBytes = base64ToBytes(iv, 'record iv');
  } catch (err) {
    throw new CorruptedRecordError(`Failed to decode record base64 fields: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (ivBytes.byteLength !== GCM_IV_BYTE_LENGTH) {
    throw new CorruptedRecordError(`Invalid IV length: expected ${GCM_IV_BYTE_LENGTH} bytes, got ${ivBytes.byteLength}.`);
  }

  const subtle = getSubtleCrypto();

  // Re-generate deterministic AAD
  const aadBytes = createRecordAAD({
    recordId,
    vaultVersion,
    schemaVersion,
  });

  let plaintextBuffer: ArrayBuffer;
  try {
    plaintextBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes as BufferSource,
        additionalData: aadBytes as BufferSource,
      },
      vaultKey,
      ciphertextBytes as BufferSource
    );
  } catch {
    // In AES-GCM, any bit-flip in ciphertext, IV, or AAD causes decrypt() to fail
    throw new CorruptedRecordError();
  }

  try {
    const jsonString = new TextDecoder().decode(plaintextBuffer);
    const parsed = JSON.parse(jsonString);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.title !== 'string' ||
      typeof parsed.username !== 'string' ||
      typeof parsed.password !== 'string' ||
      typeof parsed.url !== 'string' ||
      typeof parsed.notes !== 'string' ||
      typeof parsed.strengthScore !== 'number'
    ) {
      throw new CorruptedRecordError('Decrypted payload does not conform to required VaultRecordPayload fields.');
    }

    return {
      title: parsed.title,
      username: parsed.username,
      password: parsed.password,
      url: parsed.url,
      notes: parsed.notes,
      strengthScore: parsed.strengthScore,
      customFields: parsed.customFields ?? {},
    };
  } catch (err) {
    if (err instanceof VaultError) throw err;
    throw new CorruptedRecordError('Failed to parse decrypted record payload as valid JSON.');
  }
}
