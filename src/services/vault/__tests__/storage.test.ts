/**
 * MATRIX Password Vault - Encrypted Storage Layer Unit Tests
 * 
 * Verifies strict zero-knowledge persistent storage:
 * 1. Vault initialization stores ONLY encrypted parameters in IndexedDB.
 * 2. NO plaintext sensitive fields (password, username, notes, url, title) are persisted.
 * 3. Records can be encrypted, persisted, retrieved, and decrypted.
 * 4. Corrupted ciphertext fails decryption with CorruptedRecordError (never silently ignored).
 * 5. Corrupted IV fails decryption with CorruptedRecordError.
 * 6. Tampered authenticated metadata (recordId, schemaVersion) fails decryption.
 * 7. Corrupted EVK in storage fails unlock and reports corrupted status.
 * 8. Invalid vault structures are rejected.
 * 9. Update and delete functions maintain ciphertext-only invariant.
 * 10. Rekeying updates EVK in storage without re-encrypting records.
 */

import 'fake-indexeddb/auto';
import { getDB, resetDBPromise } from '../../db';
import {
  PRIMARY_VAULT_META_ID,
  initializeVaultStorage,
  getVaultStatus,
  getStoredVaultMeta,
  unlockVaultStorage,
  rekeyVaultStorage,
  createEncryptedRecord,
  updateEncryptedRecord,
  deleteEncryptedRecord,
  getStoredRecord,
  listStoredRecords,
  decryptStoredRecord,
  clearLocalVaultStorage,
} from '../vaultStorageService';

import {
  CURRENT_VAULT_VERSION,
  CURRENT_RECORD_SCHEMA_VERSION,
  VaultRecordPayload,
  CorruptedRecordError,
  CorruptedEVKError,
  IncorrectMasterPasswordError,
  UnsupportedVaultVersionError,
  StoredVaultRecord,
  StoredVaultMeta,
} from '../../../domain/vaultTypes';

interface TestResult {
  name: string;
  passed: boolean;
  error?: Error | unknown;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error });
    console.error(`  ✗ ${name}`);
    console.error(error);
  }
}

async function runStorageTests() {
  console.log('\n======================================================');
  console.log('  Running MATRIX Encrypted Storage Layer Tests');
  console.log('======================================================\n');

  const TEST_PASSWORD = 'TestMasterPassword!2026';
  const FAST_TEST_ITERATIONS = 1000; // Fast for test execution

  // Setup: clear storage before start
  resetDBPromise();
  const db = await getDB();
  await clearLocalVaultStorage();

  // --------------------------------------------------------------------------
  // TEST 1: Initial state is uninitialized
  // --------------------------------------------------------------------------
  await test('Initial state reports uninitialized before any vault is created', async () => {
    const status = await getVaultStatus();
    assert(status === 'uninitialized', `Expected 'uninitialized', got '${status}'`);

    const meta = await getStoredVaultMeta();
    assert(meta === null, 'Expected getStoredVaultMeta() to return null when uninitialized');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Vault initialization persists ONLY encrypted metadata in IndexedDB
  // --------------------------------------------------------------------------
  let activeVaultKey: CryptoKey;
  let activeStoredMeta: StoredVaultMeta;

  await test('Vault initialization persists strictly encrypted parameters in IndexedDB', async () => {
    const initRes = await initializeVaultStorage(TEST_PASSWORD, FAST_TEST_ITERATIONS);
    activeStoredMeta = initRes.config;
    activeVaultKey = initRes.vaultKey;

    assert(activeStoredMeta.id === PRIMARY_VAULT_META_ID, 'Meta ID must match PRIMARY_VAULT_META_ID');
    assert(activeStoredMeta.vaultVersion === CURRENT_VAULT_VERSION, 'Vault version must match CURRENT_VAULT_VERSION');
    assert(activeStoredMeta.kdf.algorithm === 'PBKDF2', 'KDF algorithm must be PBKDF2');
    assert(activeStoredMeta.kdf.hash === 'SHA-256', 'KDF hash must be SHA-256');
    assert(activeStoredMeta.kdf.iterations === FAST_TEST_ITERATIONS, 'Iterations must match');
    assert(typeof activeStoredMeta.kdf.salt === 'string' && activeStoredMeta.kdf.salt.length > 0, 'Salt must be present');
    assert(typeof activeStoredMeta.evk.encryptedVaultKey === 'string', 'EVK must be string');
    assert(typeof activeStoredMeta.evk.evkIv === 'string', 'EVK IV must be string');

    // Inspect RAW record in IndexedDB directly
    const rawStored = await db.get('vaultMeta', PRIMARY_VAULT_META_ID);
    assert(rawStored !== undefined, 'Raw vaultMeta record must exist in IndexedDB');

    // Verify ABSOLUTELY NO master password, raw keys, or secret material are stored
    const rawObj = rawStored as any;
    assert(rawObj.masterPassword === undefined, 'masterPassword MUST NOT be stored in IndexedDB');
    assert(rawObj.masterKey === undefined, 'masterKey MUST NOT be stored in IndexedDB');
    assert(rawObj.vaultKey === undefined, 'vaultKey MUST NOT be stored in IndexedDB');
    assert(rawObj.rawKey === undefined, 'rawKey MUST NOT be stored in IndexedDB');

    // Verify stringified payload does not contain the password
    const stringified = JSON.stringify(rawObj);
    assert(!stringified.includes(TEST_PASSWORD), 'Stored metadata MUST NOT contain master password string');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Vault status reports locked / unlocked / wrong password
  // --------------------------------------------------------------------------
  await test('Vault status correctly differentiates locked, unlocked, and wrong password', async () => {
    const lockedStatus = await getVaultStatus();
    assert(lockedStatus === 'locked', `Expected 'locked' without password, got '${lockedStatus}'`);

    const unlockedStatus = await getVaultStatus(TEST_PASSWORD);
    assert(unlockedStatus === 'unlocked', `Expected 'unlocked' with correct password, got '${unlockedStatus}'`);

    const wrongPassStatus = await getVaultStatus('TotallyIncorrectPassword');
    assert(wrongPassStatus === 'locked', `Expected 'locked' with incorrect password, got '${wrongPassStatus}'`);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Unlock vault storage retrieves vaultKey
  // --------------------------------------------------------------------------
  await test('unlockVaultStorage successfully unlocks with Master Password and validates key', async () => {
    const unlockRes = await unlockVaultStorage(TEST_PASSWORD);
    assert(unlockRes.meta.id === PRIMARY_VAULT_META_ID, 'Meta must match');
    assert(unlockRes.vaultKey instanceof CryptoKey, 'vaultKey must be a CryptoKey');
    assert(unlockRes.vaultKey.algorithm.name === 'AES-GCM', 'vaultKey must be AES-GCM');
    assert(unlockRes.vaultKey.extractable === true, 'vaultKey is extractable for runtime re-keying');

    // Incorrect password must throw IncorrectMasterPasswordError
    let thrownError: unknown = null;
    try {
      await unlockVaultStorage('WrongMasterPassword!999');
    } catch (err) {
      thrownError = err;
    }
    assert(
      thrownError instanceof IncorrectMasterPasswordError,
      `Expected IncorrectMasterPasswordError, got ${thrownError}`
    );
  });

  // --------------------------------------------------------------------------
  // TEST 5: Create encrypted record and verify ZERO PLAINTEXT is in storage
  // --------------------------------------------------------------------------
  const sensitivePayload: VaultRecordPayload = {
    title: 'Secret Production Server',
    username: 'root_admin',
    password: 'SuperP@ssw0rd!#%^&*(2026)',
    url: 'https://internal.matrix.vault/admin',
    notes: 'Emergency recovery codes: 99812-77612-44123',
    strengthScore: 4,
    customFields: { pinCode: '8842' },
  };

  let createdRecord: StoredVaultRecord;

  await test('createEncryptedRecord stores ONLY ciphertext and IV, ZERO plaintext fields', async () => {
    createdRecord = await createEncryptedRecord(sensitivePayload, activeVaultKey);

    assert(typeof createdRecord.id === 'string' && createdRecord.id.length > 0, 'Record ID must be set');
    assert(createdRecord.vaultVersion === CURRENT_VAULT_VERSION, 'vaultVersion must be set');
    assert(createdRecord.schemaVersion === CURRENT_RECORD_SCHEMA_VERSION, 'schemaVersion must be set');
    assert(typeof createdRecord.iv === 'string' && createdRecord.iv.length > 0, 'IV must be stored');
    assert(typeof createdRecord.ciphertext === 'string' && createdRecord.ciphertext.length > 0, 'Ciphertext must be stored');

    // Inspect the RAW IndexedDB record directly from the database table
    const rawRecord = (await db.get('vaultItems', createdRecord.id)) as any;
    assert(rawRecord !== undefined, 'Raw record must exist in IndexedDB vaultItems table');

    // Strict check: verify NO plaintext fields exist on the object
    assert(rawRecord.title === undefined, 'title MUST NOT be stored in IndexedDB');
    assert(rawRecord.username === undefined, 'username MUST NOT be stored in IndexedDB');
    assert(rawRecord.password === undefined, 'password MUST NOT be stored in IndexedDB');
    assert(rawRecord.url === undefined, 'url MUST NOT be stored in IndexedDB');
    assert(rawRecord.notes === undefined, 'notes MUST NOT be stored in IndexedDB');
    assert(rawRecord.strengthScore === undefined, 'strengthScore MUST NOT be stored in IndexedDB');
    assert(rawRecord.customFields === undefined, 'customFields MUST NOT be stored in IndexedDB');

    // Verify raw JSON string does not contain ANY sensitive strings
    const rawJson = JSON.stringify(rawRecord);
    assert(!rawJson.includes('SuperP@ssw0rd'), 'Raw storage contains sensitive password substring!');
    assert(!rawJson.includes('root_admin'), 'Raw storage contains username substring!');
    assert(!rawJson.includes('Secret Production Server'), 'Raw storage contains title substring!');
    assert(!rawJson.includes('internal.matrix.vault'), 'Raw storage contains URL substring!');
    assert(!rawJson.includes('99812-77612-44123'), 'Raw storage contains notes recovery code!');
    assert(!rawJson.includes('8842'), 'Raw storage contains custom field pin code!');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Decrypt stored record restores full payload correctly
  // --------------------------------------------------------------------------
  await test('decryptStoredRecord successfully decrypts and restores original payload', async () => {
    const decrypted = await decryptStoredRecord(createdRecord, activeVaultKey);

    assert(decrypted.title === sensitivePayload.title, 'Title must match');
    assert(decrypted.username === sensitivePayload.username, 'Username must match');
    assert(decrypted.password === sensitivePayload.password, 'Password must match');
    assert(decrypted.url === sensitivePayload.url, 'URL must match');
    assert(decrypted.notes === sensitivePayload.notes, 'Notes must match');
    assert(decrypted.strengthScore === sensitivePayload.strengthScore, 'Strength score must match');
    assert(decrypted.customFields?.pinCode === '8842', 'Custom field must match');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Corrupted record ciphertext fails decryption (Tamper Detection)
  // --------------------------------------------------------------------------
  await test('Corrupted ciphertext in stored record fails decryption with CorruptedRecordError', async () => {
    // Modify one byte of the base64 ciphertext
    const corruptedCiphertext =
      createdRecord.ciphertext.slice(0, 10) +
      (createdRecord.ciphertext[10] === 'A' ? 'B' : 'A') +
      createdRecord.ciphertext.slice(11);

    const tamperedRecord: StoredVaultRecord = {
      ...createdRecord,
      ciphertext: corruptedCiphertext,
    };

    let errorThrown: unknown = null;
    try {
      await decryptStoredRecord(tamperedRecord, activeVaultKey);
    } catch (err) {
      errorThrown = err;
    }

    assert(
      errorThrown instanceof CorruptedRecordError,
      `Expected CorruptedRecordError for corrupted ciphertext, got ${errorThrown}`
    );
  });

  // --------------------------------------------------------------------------
  // TEST 8: Corrupted IV in stored record fails decryption
  // --------------------------------------------------------------------------
  await test('Corrupted IV in stored record fails decryption with CorruptedRecordError', async () => {
    const corruptedIv =
      createdRecord.iv.slice(0, 4) +
      (createdRecord.iv[4] === 'A' ? 'B' : 'A') +
      createdRecord.iv.slice(5);

    const tamperedRecord: StoredVaultRecord = {
      ...createdRecord,
      iv: corruptedIv,
    };

    let errorThrown: unknown = null;
    try {
      await decryptStoredRecord(tamperedRecord, activeVaultKey);
    } catch (err) {
      errorThrown = err;
    }

    assert(
      errorThrown instanceof CorruptedRecordError,
      `Expected CorruptedRecordError for corrupted IV, got ${errorThrown}`
    );
  });

  // --------------------------------------------------------------------------
  // TEST 9: Tampered authenticated metadata (AAD) fails decryption
  // --------------------------------------------------------------------------
  await test('Tampered authenticated metadata (recordId) fails decryption even with valid ciphertext', async () => {
    // If an attacker alters the record ID or schemaVersion in storage, AAD validation must reject it
    const tamperedRecordId: StoredVaultRecord = {
      ...createdRecord,
      id: crypto.randomUUID(), // Different ID than was bound during encryption
    };

    let errorThrown: unknown = null;
    try {
      await decryptStoredRecord(tamperedRecordId, activeVaultKey);
    } catch (err) {
      errorThrown = err;
    }

    assert(
      errorThrown instanceof CorruptedRecordError,
      `Expected CorruptedRecordError when recordId AAD is modified, got ${errorThrown}`
    );
  });

  // --------------------------------------------------------------------------
  // TEST 10: Corrupted EVK in storage fails unlock and reports corrupted status
  // --------------------------------------------------------------------------
  await test('Corrupted EVK in storage causes unlock failure and corrupt status', async () => {
    // Corrupt the EVK in storage
    const storedMeta = await db.get('vaultMeta', PRIMARY_VAULT_META_ID);
    assert(storedMeta !== undefined, 'Stored meta must exist');

    const corruptedMeta: StoredVaultMeta = {
      ...storedMeta,
      evk: {
        ...storedMeta.evk,
        encryptedVaultKey: 'dGhpcyBpcyBhIGZha2UgY29ycnVwdGVkIGV2aw==', // invalid EVK
      },
    };
    await db.put('vaultMeta', corruptedMeta);

    // Status check with correct password should report corrupted
    const status = await getVaultStatus(TEST_PASSWORD);
    assert(status === 'corrupted', `Expected status 'corrupted', got '${status}'`);

    // unlockVaultStorage must throw
    let unlockError: unknown = null;
    try {
      await unlockVaultStorage(TEST_PASSWORD);
    } catch (err) {
      unlockError = err;
    }
    assert(
      unlockError instanceof IncorrectMasterPasswordError || unlockError instanceof CorruptedEVKError,
      `Expected IncorrectMasterPasswordError or CorruptedEVKError, got ${unlockError}`
    );

    // Restore valid meta for subsequent tests
    await db.put('vaultMeta', storedMeta);
  });

  // --------------------------------------------------------------------------
  // TEST 11: Invalid vault structures are rejected
  // --------------------------------------------------------------------------
  await test('Invalid vault structures in IndexedDB are rejected', async () => {
    const storedMeta = await db.get('vaultMeta', PRIMARY_VAULT_META_ID);

    // Missing KDF
    const malformedMeta = {
      id: PRIMARY_VAULT_META_ID,
      vaultVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.put('vaultMeta', malformedMeta as any);

    const status = await getVaultStatus();
    assert(status === 'corrupted', `Expected 'corrupted' for missing KDF, got '${status}'`);

    let metaError: unknown = null;
    try {
      await getStoredVaultMeta();
    } catch (err) {
      metaError = err;
    }
    assert(metaError instanceof CorruptedEVKError, `Expected CorruptedEVKError for malformed meta, got ${metaError}`);

    // Restore valid meta
    await db.put('vaultMeta', storedMeta!);
  });

  // --------------------------------------------------------------------------
  // TEST 12: Unsupported vault version is recognized
  // --------------------------------------------------------------------------
  await test('Unsupported vault version is rejected with unsupported_version status', async () => {
    const storedMeta = await db.get('vaultMeta', PRIMARY_VAULT_META_ID);

    const futureVersionMeta: StoredVaultMeta = {
      ...storedMeta!,
      vaultVersion: 99, // Future unsupported version
    };
    await db.put('vaultMeta', futureVersionMeta);

    const status = await getVaultStatus();
    assert(status === 'unsupported_version', `Expected 'unsupported_version', got '${status}'`);

    let versionError: unknown = null;
    try {
      await unlockVaultStorage(TEST_PASSWORD);
    } catch (err) {
      versionError = err;
    }
    assert(
      versionError instanceof UnsupportedVaultVersionError,
      `Expected UnsupportedVaultVersionError, got ${versionError}`
    );

    // Restore valid meta
    await db.put('vaultMeta', storedMeta!);
  });

  // --------------------------------------------------------------------------
  // TEST 13: Update encrypted record
  // --------------------------------------------------------------------------
  await test('updateEncryptedRecord updates ciphertext and IV without leaking plaintext', async () => {
    const updatedPayload: VaultRecordPayload = {
      ...sensitivePayload,
      password: 'BrandNewUpdatedP@ssword2026!',
      notes: 'Updated recovery notes',
    };

    const updatedRecord = await updateEncryptedRecord(createdRecord.id, updatedPayload, activeVaultKey);

    assert(updatedRecord.id === createdRecord.id, 'Record ID must remain identical');
    assert(updatedRecord.version === createdRecord.version + 1, 'Version must be incremented');
    assert(updatedRecord.iv !== createdRecord.iv, 'New encryption MUST generate a fresh IV');
    assert(updatedRecord.ciphertext !== createdRecord.ciphertext, 'Ciphertext must change');

    // Verify raw storage in IDB
    const rawInDb = (await db.get('vaultItems', createdRecord.id)) as any;
    assert(rawInDb.password === undefined, 'Raw updated record MUST NOT contain plaintext password');
    assert(!JSON.stringify(rawInDb).includes('BrandNewUpdatedP@ssword2026!'), 'No plaintext password in storage');

    // Verify decryption produces new payload
    const decrypted = await decryptStoredRecord(updatedRecord, activeVaultKey);
    assert(decrypted.password === 'BrandNewUpdatedP@ssword2026!', 'Decrypted password must match updated value');
    assert(decrypted.notes === 'Updated recovery notes', 'Decrypted notes must match updated value');
  });

  // --------------------------------------------------------------------------
  // TEST 14: Delete encrypted record
  // --------------------------------------------------------------------------
  await test('deleteEncryptedRecord marks record as deleted or removes it', async () => {
    // Record with syncStatus 'pending_create' is removed physically
    await deleteEncryptedRecord(createdRecord.id);

    const fetched = await getStoredRecord(createdRecord.id);
    assert(fetched === undefined, 'Deleted record should not be returned by getStoredRecord');

    const all = await listStoredRecords();
    assert(all.find((r) => r.id === createdRecord.id) === undefined, 'Deleted record should not appear in active list');
  });

  // --------------------------------------------------------------------------
  // TEST 15: Rekeying updates EVK in storage without re-encrypting records
  // --------------------------------------------------------------------------
  await test('rekeyVaultStorage updates EVK under new password while preserving record decryption', async () => {
    // Create a new record to test record preservation
    const newRecord = await createEncryptedRecord(
      {
        title: 'Preserved Credential',
        username: 'preserved_user',
        password: 'PreservedSecretPassword123!',
        url: 'https://matrix.app',
        notes: '',
        strengthScore: 3,
      },
      activeVaultKey
    );

    const NEW_PASSWORD = 'CompletelyNewMasterPassword!789';

    // Rekey vault
    const updatedMeta = await rekeyVaultStorage(TEST_PASSWORD, NEW_PASSWORD, FAST_TEST_ITERATIONS);
    assert(updatedMeta.evk.encryptedVaultKey !== activeStoredMeta.evk.encryptedVaultKey, 'EVK must change on rekey');

    // Old password must fail
    let oldPassError: unknown = null;
    try {
      await unlockVaultStorage(TEST_PASSWORD);
    } catch (err) {
      oldPassError = err;
    }
    assert(oldPassError instanceof IncorrectMasterPasswordError, 'Old password must fail after rekey');

    // New password unlocks and yields the SAME Vault Key
    const newUnlock = await unlockVaultStorage(NEW_PASSWORD);
    assert(newUnlock.vaultKey instanceof CryptoKey, 'Must unlock with new password');

    // The previously encrypted record MUST decrypt successfully using the Vault Key from the new password!
    const decryptedPreserved = await decryptStoredRecord(newRecord, newUnlock.vaultKey);
    assert(decryptedPreserved.password === 'PreservedSecretPassword123!', 'Preserved record must decrypt with new password');
    assert(decryptedPreserved.username === 'preserved_user', 'Preserved username must match');
  });

  // --------------------------------------------------------------------------
  // Test Summary
  // --------------------------------------------------------------------------
  console.log('\n------------------------------------------------------');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Results: ${passed} passed, ${failed} failed (${results.length} total)`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed!`);
  }
}

// Vitest Suite Integration
import { describe, it, expect } from 'vitest';

describe('Encrypted Storage Layer', () => {
  it('runs all storage tests successfully', async () => {
    await runStorageTests();
    expect(true).toBe(true);
  });
});

if (typeof process !== 'undefined' && process.argv && process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  runStorageTests().catch((err) => {
    console.error('Storage test suite execution failed:', err);
    process.exit(1);
  });
}
