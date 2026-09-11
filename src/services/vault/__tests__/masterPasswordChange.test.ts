/**
 * MATRIX Password Vault - Master Password Changing Test Suite
 * 
 * Verifies strict cryptographic requirements:
 * 1. Password change succeeds without re-encrypting records.
 * 2. Old password no longer unlocks the vault (IncorrectMasterPasswordError).
 * 3. New password unlocks the vault and recovers the identical Vault Key.
 * 4. Existing records remain intact and untouched (same ciphertext/IV, perfect decryption).
 * 5. Old EVK is not destroyed prematurely (crash safety: verify before persist).
 * 6. Failed password change leaves vault completely usable.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDBPromise, getDB } from '../../../services/db';
import {
  initializeVaultStorage,
  unlockVaultStorage,
  getStoredVaultMeta,
  createEncryptedRecord,
  getStoredRecord,
  decryptStoredRecord,
  changeMasterPasswordStorage,
  clearLocalVaultStorage,
  PRIMARY_VAULT_META_ID,
} from '../vaultStorageService';
import {
  createRekeyedVaultConfig,
  unlockVault,
  encryptVaultRecordPayload,
  decryptVaultRecordPayload,
} from '../crypto';
import { vaultRuntimeService } from '../vaultRuntimeService';
import {
  IncorrectMasterPasswordError,
  VaultLockedError,
  VaultError,
  VaultRecordPayload,
} from '../../../domain/vaultTypes';

// Fast iteration count for test execution speed while maintaining PBKDF2 structure
const TEST_KDF_ITERATIONS = 5000;

describe('Master Password Changing & EVK Rekeying', () => {
  beforeEach(async () => {
    await clearLocalVaultStorage();
    await resetDBPromise();
    vaultRuntimeService.lock();
  });

  it('1. Password change succeeds and persists fresh salt & EVK without altering record ciphertexts', async () => {
    const originalPassword = 'InitialMasterPassword#2026';
    const newPassword = 'NewlyUpdatedMasterPassword#2026';

    // Initialize vault with original password
    const initResult = await initializeVaultStorage(originalPassword, TEST_KDF_ITERATIONS);
    const initialMeta = await getStoredVaultMeta();
    expect(initialMeta).not.toBeNull();

    // Create records before password change
    const record1Payload: VaultRecordPayload = {
      title: 'Production AWS Root',
      username: 'aws_admin',
      password: 'SuperSecretAWSPassword99!',
      url: 'https://aws.amazon.com',
      notes: 'Root account access - do not delete',
      strengthScore: 4,
    };
    const storedRecord1 = await createEncryptedRecord(record1Payload, initResult.vaultKey);

    const record2Payload: VaultRecordPayload = {
      title: 'GitHub Personal Token',
      username: 'octocat',
      password: 'ghp_secretTokenValue123456789',
      url: 'https://github.com',
      notes: 'Developer token',
      strengthScore: 4,
    };
    const storedRecord2 = await createEncryptedRecord(record2Payload, initResult.vaultKey);

    // Capture exact record ciphertexts and IVs before password change
    const record1CiphertextBefore = storedRecord1.ciphertext;
    const record1IvBefore = storedRecord1.iv;
    const record2CiphertextBefore = storedRecord2.ciphertext;
    const record2IvBefore = storedRecord2.iv;

    // Perform secure Master Password change
    const updatedMeta = await changeMasterPasswordStorage(
      newPassword,
      initResult.vaultKey,
      TEST_KDF_ITERATIONS
    );

    // Verify cryptographic metadata changes
    expect(updatedMeta.kdf.salt).not.toBe(initialMeta!.kdf.salt);
    expect(updatedMeta.evk.evkIv).not.toBe(initialMeta!.evk.evkIv);
    expect(updatedMeta.evk.encryptedVaultKey).not.toBe(initialMeta!.evk.encryptedVaultKey);
    expect(updatedMeta.version).toBe(initialMeta!.version + 1);

    // Verify stored records in IndexedDB are completely untouched
    const stored1After = await getStoredRecord(storedRecord1.id);
    const stored2After = await getStoredRecord(storedRecord2.id);

    expect(stored1After).not.toBeNull();
    expect(stored2After).not.toBeNull();
    expect(stored1After!.ciphertext).toBe(record1CiphertextBefore);
    expect(stored1After!.iv).toBe(record1IvBefore);
    expect(stored2After!.ciphertext).toBe(record2CiphertextBefore);
    expect(stored2After!.iv).toBe(record2IvBefore);
  });

  it('2. Old password no longer unlocks the vault after password change', async () => {
    const originalPassword = 'InitialMasterPassword#2026';
    const newPassword = 'NewlyUpdatedMasterPassword#2026';

    const initResult = await initializeVaultStorage(originalPassword, TEST_KDF_ITERATIONS);
    await changeMasterPasswordStorage(newPassword, initResult.vaultKey, TEST_KDF_ITERATIONS);

    // Attempting to unlock with old password must throw IncorrectMasterPasswordError
    await expect(unlockVaultStorage(originalPassword)).rejects.toThrow(
      IncorrectMasterPasswordError
    );
  });

  it('3. New password unlocks the vault and recovers the identical Vault Key', async () => {
    const originalPassword = 'InitialMasterPassword#2026';
    const newPassword = 'NewlyUpdatedMasterPassword#2026';

    const initResult = await initializeVaultStorage(originalPassword, TEST_KDF_ITERATIONS);
    await changeMasterPasswordStorage(newPassword, initResult.vaultKey, TEST_KDF_ITERATIONS);

    // Unlock with new password
    const unlockResult = await unlockVaultStorage(newPassword);
    expect(unlockResult.vaultKey).toBeInstanceOf(CryptoKey);
    expect(unlockResult.meta.id).toBe(PRIMARY_VAULT_META_ID);

    // Verify cryptographically that the recovered key can decrypt data encrypted with the original key
    const subtle = crypto.subtle;
    const testIV = crypto.getRandomValues(new Uint8Array(12));
    const sampleData = new TextEncoder().encode('Test verification sample 2026');

    const encryptedWithOld = await subtle.encrypt(
      { name: 'AES-GCM', iv: testIV },
      initResult.vaultKey,
      sampleData
    );

    const decryptedWithNew = await subtle.decrypt(
      { name: 'AES-GCM', iv: testIV },
      unlockResult.vaultKey,
      encryptedWithOld
    );

    expect(new TextDecoder().decode(decryptedWithNew)).toBe('Test verification sample 2026');
  });

  it('4. Existing records remain intact and decrypt cleanly after password change', async () => {
    const originalPassword = 'InitialMasterPassword#2026';
    const newPassword = 'NewlyUpdatedMasterPassword#2026';

    const initResult = await initializeVaultStorage(originalPassword, TEST_KDF_ITERATIONS);

    const secretPayload: VaultRecordPayload = {
      title: 'Confidential Finance Portal',
      username: 'cfo_secure',
      password: 'VaultRecord$Secret#987654',
      url: 'https://finance.matrix.internal',
      notes: 'Important account records',
      strengthScore: 4,
    };
    const storedRecord = await createEncryptedRecord(secretPayload, initResult.vaultKey);

    // Change master password
    await changeMasterPasswordStorage(newPassword, initResult.vaultKey, TEST_KDF_ITERATIONS);

    // Unlock vault using the NEW master password
    const newUnlock = await unlockVaultStorage(newPassword);

    // Decrypt the existing record using the key obtained with the new password
    const decryptedRecord = await decryptStoredRecord(storedRecord, newUnlock.vaultKey);
    expect(decryptedRecord.title).toBe(secretPayload.title);
    expect(decryptedRecord.username).toBe(secretPayload.username);
    expect(decryptedRecord.password).toBe(secretPayload.password);
    expect(decryptedRecord.url).toBe(secretPayload.url);
    expect(decryptedRecord.notes).toBe(secretPayload.notes);

    // Create a new record using the recovered key to confirm ongoing write/read capability
    const postChangePayload: VaultRecordPayload = {
      title: 'New Service After Rekey',
      username: 'post_rekey_user',
      password: 'BrandNewPostRekeyPass2026!',
      url: 'https://matrix.internal/service',
      notes: 'Newly added after password rotation',
      strengthScore: 4,
    };
    const newPostRecord = await createEncryptedRecord(postChangePayload, newUnlock.vaultKey);
    const decryptedPostRecord = await decryptStoredRecord(newPostRecord, newUnlock.vaultKey);
    expect(decryptedPostRecord.password).toBe(postChangePayload.password);
  });

  it('5. Old EVK is NOT destroyed prematurely (Crash Safety)', async () => {
    const originalPassword = 'InitialMasterPassword#2026';
    const initResult = await initializeVaultStorage(originalPassword, TEST_KDF_ITERATIONS);
    const initialMeta = await getStoredVaultMeta();
    expect(initialMeta).not.toBeNull();

    // Verify createRekeyedVaultConfig generates and verifies in-memory BEFORE touching storage
    const currentMetaBefore = await getStoredVaultMeta();

    // Test rejection: Attempting to create rekeyed config with invalid password throws before touching storage
    await expect(
      createRekeyedVaultConfig({
        newMasterPassword: 'short', // < 8 characters
        vaultKey: initResult.vaultKey,
        currentConfig: initialMeta!,
        newIterations: TEST_KDF_ITERATIONS,
      })
    ).rejects.toThrow();

    // Storage is verified to be 100% byte-for-byte unchanged
    const currentMetaAfterFail = await getStoredVaultMeta();
    expect(currentMetaAfterFail!.evk.encryptedVaultKey).toBe(currentMetaBefore!.evk.encryptedVaultKey);
    expect(currentMetaAfterFail!.evk.evkIv).toBe(currentMetaBefore!.evk.evkIv);
    expect(currentMetaAfterFail!.kdf.salt).toBe(currentMetaBefore!.kdf.salt);
    expect(currentMetaAfterFail!.version).toBe(currentMetaBefore!.version);

    // Vault remains fully unlockable with the original password
    const unlockOriginal = await unlockVaultStorage(originalPassword);
    expect(unlockOriginal.vaultKey).toBeInstanceOf(CryptoKey);
  });

  it('6. Failed password change leaves vault completely usable', async () => {
    const originalPassword = 'InitialMasterPassword#2026';
    const initRes = await vaultRuntimeService.initializeVault(originalPassword, TEST_KDF_ITERATIONS);
    expect(initRes.success).toBe(true);

    expect(vaultRuntimeService.getState()).toBe('unlocked');

    // Create a record while unlocked
    const recordPayload: VaultRecordPayload = {
      title: 'Active Session Record',
      username: 'operator',
      password: 'ActivePassword123!',
      url: 'https://matrix.internal/operator',
      notes: 'Active session payload',
      strengthScore: 4,
    };
    const createdRecord = await vaultRuntimeService.createRecord(recordPayload);
    expect(createdRecord).toBeDefined();

    // Attempt invalid password change (too short)
    await expect(
      vaultRuntimeService.changeMasterPassword('123')
    ).rejects.toThrow();

    // Vault MUST remain unlocked and fully functional
    expect(vaultRuntimeService.getState()).toBe('unlocked');
    const readBack = await vaultRuntimeService.getDecryptedRecord(createdRecord.id);
    expect(readBack.password).toBe('ActivePassword123!');

    // Now test locking and unlocking: original password must still work
    vaultRuntimeService.lock();
    expect(vaultRuntimeService.getState()).toBe('locked');

    // Unlock with original password
    await vaultRuntimeService.unlock(originalPassword);
    expect(vaultRuntimeService.getState()).toBe('unlocked');

    // Now perform valid password change through vaultRuntimeService
    const newPassword = 'ValidNewMasterPassword2026!';
    await vaultRuntimeService.changeMasterPassword(newPassword, { newIterations: TEST_KDF_ITERATIONS });

    // Lock and unlock with the NEW password
    vaultRuntimeService.lock();
    expect(vaultRuntimeService.getState()).toBe('locked');

    // Old password must now fail in runtime service
    const failedOldUnlock = await vaultRuntimeService.unlock(originalPassword);
    expect(failedOldUnlock.success).toBe(false);
    expect(vaultRuntimeService.getState()).toBe('error');

    // New password succeeds in runtime service
    const successNewUnlock = await vaultRuntimeService.unlock(newPassword);
    expect(successNewUnlock.success).toBe(true);
    expect(vaultRuntimeService.getState()).toBe('unlocked');

    // Decrypted record still exists and decrypts
    const records = await vaultRuntimeService.listDecryptedRecords();
    expect(records.length).toBe(1);
    expect(records[0].payload.password).toBe('ActivePassword123!');
  });
});
