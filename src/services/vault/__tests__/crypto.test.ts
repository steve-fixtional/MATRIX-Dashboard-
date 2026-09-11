/**
 * MATRIX Password Vault - Cryptographic Module Unit Tests
 * 
 * Tests the entire zero-knowledge Web Crypto pipeline:
 * 1. Random salt generation (32-byte entropy, non-static)
 * 2. Master Key derivation via PBKDF2-HMAC-SHA256
 * 3. Vault Key generation (non-extractable AES-256-GCM)
 * 4. EVK encryption/decryption roundtrip
 * 5. Incorrect master password failure handling
 * 6. Modified / corrupted EVK failure handling
 * 7. Record payload encryption and decryption roundtrip
 * 8. Modified ciphertext tampering detection (AES-GCM tag verification)
 * 9. Modified Additional Authenticated Data (AAD) tampering detection
 * 10. Unique IV generation across repeated encryptions
 * 11. Unsupported vault version rejection
 */

import {
  generateRandomBytes,
  bytesToBase64,
  base64ToBytes,
  deriveMasterKey,
  initializeVault,
  unlockVault,
  rekeyVault,
  encryptVaultRecordPayload,
  decryptVaultRecordPayload,
  createRecordAAD,
  createEvkAAD,
} from '../crypto';

import {
  CURRENT_VAULT_VERSION,
  CURRENT_RECORD_SCHEMA_VERSION,
  VaultRecordPayload,
  IncorrectMasterPasswordError,
  CorruptedEVKError,
  CorruptedRecordError,
  UnsupportedVaultVersionError,
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
    console.error(`  ✗ ${name}:`, error);
  }
}

export async function runCryptoTests(): Promise<boolean> {
  console.log('\n======================================================');
  console.log('Running MATRIX Password Vault Cryptographic Test Suite');
  console.log('======================================================\n');

  // Test 1: Random salt generation
  await test('Random salt generation generates 32-byte distinct entropy', async () => {
    const salt1 = generateRandomBytes(32);
    const salt2 = generateRandomBytes(32);

    assert(salt1.byteLength === 32, 'Salt 1 must be 32 bytes');
    assert(salt2.byteLength === 32, 'Salt 2 must be 32 bytes');

    const b64_1 = bytesToBase64(salt1);
    const b64_2 = bytesToBase64(salt2);
    assert(b64_1 !== b64_2, 'Successive salts must not be identical');

    const decoded = base64ToBytes(b64_1);
    assert(decoded.byteLength === 32, 'Decoded salt must retain exact length');
    assert(
      Array.from(decoded).every((byte, i) => byte === salt1[i]),
      'Decoded salt bytes must exactly match original bytes'
    );
  });

  // Test 2: Master Key derivation (PBKDF2-HMAC-SHA256)
  await test('Master Key derivation produces non-extractable AES-GCM key', async () => {
    const salt = generateRandomBytes(32);
    const password = 'CorrectHorseBatteryStaple!2026';

    // Using lower iterations in unit test for execution speed (5,000 for test verification)
    const masterKey = await deriveMasterKey(password, salt, 5000, 'SHA-256');

    assert(masterKey instanceof CryptoKey, 'Derived key must be a CryptoKey');
    assert(masterKey.algorithm.name === 'AES-GCM', 'Derived key algorithm must be AES-GCM');
    assert(masterKey.extractable === false, 'Master Key MUST be non-extractable');
    assert(masterKey.usages.includes('encrypt') && masterKey.usages.includes('decrypt'), 'Master Key must support encrypt and decrypt');
  });

  // Test 3 & 4: Vault Key generation & EVK encryption/decryption roundtrip
  await test('initializeVault creates versioned EVK and unlockVault recovers working key', async () => {
    const password = 'SuperSecretVaultMasterKey#99';
    const testIterations = 5000;

    // 1. Initialize
    const { config, vaultKey } = await initializeVault(password, testIterations);

    assert(config.vaultVersion === CURRENT_VAULT_VERSION, 'Config must have current vault version');
    assert(config.kdf.algorithm === 'PBKDF2', 'KDF must be PBKDF2');
    assert(config.kdf.hash === 'SHA-256', 'Hash must be SHA-256');
    assert(config.kdf.iterations === testIterations, 'Iterations must match configured value');
    assert(typeof config.kdf.salt === 'string' && config.kdf.salt.length > 0, 'Salt must be present');
    assert(typeof config.evk.encryptedVaultKey === 'string', 'EVK ciphertext must be present');
    assert(typeof config.evk.evkIv === 'string', 'EVK IV must be present');

    assert(vaultKey instanceof CryptoKey, 'Runtime VaultKey must be a CryptoKey');
    assert(vaultKey.extractable === true, 'Runtime VaultKey is extractable for re-wrapping during re-key');

    // 2. Unlock with correct password
    const recoveredVaultKey = await unlockVault(password, config);
    assert(recoveredVaultKey instanceof CryptoKey, 'Recovered key must be a CryptoKey');
    assert(recoveredVaultKey.extractable === true, 'Recovered VaultKey is extractable for re-wrapping during re-key');

    // 3. Verify that recovered key encrypts/decrypts compatibly with initial vaultKey
    const samplePayload: VaultRecordPayload = {
      title: 'GitHub Work Account',
      username: 'steve.workmann',
      password: 'ghp_secretTokenHere998877665544',
      url: 'https://github.com/login',
      notes: '2FA backup codes in safe',
      strengthScore: 4,
    };

    const encrypted = await encryptVaultRecordPayload({
      payload: samplePayload,
      vaultKey,
      recordId: 'record-roundtrip-test-1',
    });

    const decryptedWithRecovered = await decryptVaultRecordPayload({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      vaultKey: recoveredVaultKey,
      recordId: 'record-roundtrip-test-1',
      vaultVersion: encrypted.vaultVersion,
      schemaVersion: encrypted.schemaVersion,
    });

    assert(decryptedWithRecovered.title === samplePayload.title, 'Payload title must match');
    assert(decryptedWithRecovered.password === samplePayload.password, 'Payload password must match');
    assert(decryptedWithRecovered.strengthScore === samplePayload.strengthScore, 'Strength score must match');
  });

  // Test 5: Incorrect master password failure
  await test('unlockVault fails securely with IncorrectMasterPasswordError on wrong password', async () => {
    const password = 'RealMasterPassword#2026';
    const wrongPassword = 'WrongMasterPassword#2026';
    const { config } = await initializeVault(password, 5000);

    let threw = false;
    try {
      await unlockVault(wrongPassword, config);
    } catch (err) {
      threw = true;
      assert(
        err instanceof IncorrectMasterPasswordError,
        `Expected IncorrectMasterPasswordError, got ${err?.constructor?.name}`
      );
    }
    assert(threw, 'unlockVault must throw an error when given an incorrect password');
  });

  // Test 6: Modified / corrupted EVK failure
  await test('unlockVault fails with IncorrectMasterPasswordError or CorruptedEVKError on tampered EVK', async () => {
    const password = 'RealMasterPassword#2026';
    const { config } = await initializeVault(password, 5000);

    // Tamper with EVK ciphertext: flip characters in base64
    const originalCiphertext = config.evk.encryptedVaultKey;
    const tamperedBytes = base64ToBytes(originalCiphertext);
    tamperedBytes[0] ^= 0x01; // bit flip first byte
    const tamperedCiphertext = bytesToBase64(tamperedBytes);

    const tamperedConfig = {
      ...config,
      evk: {
        ...config.evk,
        encryptedVaultKey: tamperedCiphertext,
      },
    };

    let threw = false;
    try {
      await unlockVault(password, tamperedConfig);
    } catch (err) {
      threw = true;
      assert(
        err instanceof IncorrectMasterPasswordError || err instanceof CorruptedEVKError,
        'Tampered EVK must fail authentication tag check'
      );
    }
    assert(threw, 'unlockVault must reject tampered EVK');
  });

  // Test 7: Record payload encryption/decryption roundtrip
  await test('Record encryption/decryption roundtrip preserves all payload fields and types', async () => {
    const { vaultKey } = await initializeVault('PasswordForRecords#123', 5000);

    const payload: VaultRecordPayload = {
      title: 'AWS Production Root',
      username: 'root@company.internal',
      password: 'VeryLongComplexPassword$9876543210!@#',
      url: 'https://aws.amazon.com/console',
      notes: 'Hardware YubiKey required for root account.\nDo not use for daily operations.',
      strengthScore: 4,
      customFields: {
        accountNumber: '123456789012',
        pin: '9876',
      },
    };

    const recordId = 'aws-root-001';
    const encrypted = await encryptVaultRecordPayload({
      payload,
      vaultKey,
      recordId,
    });

    assert(typeof encrypted.ciphertext === 'string', 'Ciphertext must be string');
    assert(typeof encrypted.iv === 'string', 'IV must be string');
    assert(encrypted.vaultVersion === CURRENT_VAULT_VERSION, 'Vault version must match');
    assert(encrypted.schemaVersion === CURRENT_RECORD_SCHEMA_VERSION, 'Schema version must match');

    // Decrypt
    const decrypted = await decryptVaultRecordPayload({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      vaultKey,
      recordId,
      vaultVersion: encrypted.vaultVersion,
      schemaVersion: encrypted.schemaVersion,
    });

    assert(decrypted.title === payload.title, 'Title must match');
    assert(decrypted.username === payload.username, 'Username must match');
    assert(decrypted.password === payload.password, 'Password must match');
    assert(decrypted.url === payload.url, 'URL must match');
    assert(decrypted.notes === payload.notes, 'Notes must match');
    assert(decrypted.strengthScore === payload.strengthScore, 'Strength score must match');
    assert(decrypted.customFields?.accountNumber === '123456789012', 'Custom fields must match');
  });

  // Test 8: Modified ciphertext tampering detection (AES-GCM tag verification)
  await test('Tampered record ciphertext fails with CorruptedRecordError', async () => {
    const { vaultKey } = await initializeVault('PasswordTamper#123', 5000);
    const payload: VaultRecordPayload = {
      title: 'Banking Portal',
      username: 'myuser',
      password: 'SafePassword123',
      url: 'https://bank.com',
      notes: 'Secret note',
      strengthScore: 3,
    };

    const recordId = 'bank-rec-001';
    const encrypted = await encryptVaultRecordPayload({
      payload,
      vaultKey,
      recordId,
    });

    // Flip a byte in the middle of the ciphertext
    const bytes = base64ToBytes(encrypted.ciphertext);
    bytes[Math.floor(bytes.length / 2)] ^= 0xff;
    const tamperedCiphertext = bytesToBase64(bytes);

    let threw = false;
    try {
      await decryptVaultRecordPayload({
        ciphertext: tamperedCiphertext,
        iv: encrypted.iv,
        vaultKey,
        recordId,
        vaultVersion: encrypted.vaultVersion,
        schemaVersion: encrypted.schemaVersion,
      });
    } catch (err) {
      threw = true;
      assert(err instanceof CorruptedRecordError, `Expected CorruptedRecordError, got ${err?.constructor?.name}`);
    }
    assert(threw, 'decryptVaultRecordPayload must throw on tampered ciphertext');
  });

  // Test 9: Modified Additional Authenticated Data (AAD) tampering detection
  await test('Modified AAD (e.g. recordId transplant attack) fails with CorruptedRecordError', async () => {
    const { vaultKey } = await initializeVault('PasswordAAD#123', 5000);
    const payload: VaultRecordPayload = {
      title: 'Admin Console',
      username: 'admin',
      password: 'AdminPassword456',
      url: 'https://admin.portal',
      notes: '',
      strengthScore: 3,
    };

    const recordIdA = 'record-A-victim';
    const recordIdB = 'record-B-transplanted';

    const encryptedA = await encryptVaultRecordPayload({
      payload,
      vaultKey,
      recordId: recordIdA,
    });

    // Attempt to decrypt record A ciphertext under record B's ID
    let threw = false;
    try {
      await decryptVaultRecordPayload({
        ciphertext: encryptedA.ciphertext,
        iv: encryptedA.iv,
        vaultKey,
        recordId: recordIdB, // Transpose / transplant attempt!
        vaultVersion: encryptedA.vaultVersion,
        schemaVersion: encryptedA.schemaVersion,
      });
    } catch (err) {
      threw = true;
      assert(err instanceof CorruptedRecordError, 'Transplanted recordId must fail AAD verification');
    }
    assert(threw, 'Decryption must fail when recordId does not match the encrypted AAD');
  });

  // Test 10: Unique IV generation across repeated encryptions
  await test('Encrypting the exact same payload multiple times generates unique IVs and distinct ciphertexts', async () => {
    const { vaultKey } = await initializeVault('PasswordIVTest#123', 5000);
    const payload: VaultRecordPayload = {
      title: 'Repeat Test',
      username: 'repeat',
      password: 'RepeatPassword#1',
      url: '',
      notes: '',
      strengthScore: 2,
    };

    const recordId = 'repeat-test-id';
    const enc1 = await encryptVaultRecordPayload({ payload, vaultKey, recordId });
    const enc2 = await encryptVaultRecordPayload({ payload, vaultKey, recordId });
    const enc3 = await encryptVaultRecordPayload({ payload, vaultKey, recordId });

    assert(enc1.iv !== enc2.iv, 'IV 1 and IV 2 must be distinct');
    assert(enc2.iv !== enc3.iv, 'IV 2 and IV 3 must be distinct');
    assert(enc1.iv !== enc3.iv, 'IV 1 and IV 3 must be distinct');

    assert(enc1.ciphertext !== enc2.ciphertext, 'Ciphertexts 1 and 2 must be distinct');
    assert(enc2.ciphertext !== enc3.ciphertext, 'Ciphertexts 2 and 3 must be distinct');

    // All must still decrypt successfully to identical payload
    const dec1 = await decryptVaultRecordPayload({ ...enc1, vaultKey, recordId });
    const dec2 = await decryptVaultRecordPayload({ ...enc2, vaultKey, recordId });
    const dec3 = await decryptVaultRecordPayload({ ...enc3, vaultKey, recordId });

    assert(dec1.password === payload.password, 'Decrypted 1 matches');
    assert(dec2.password === payload.password, 'Decrypted 2 matches');
    assert(dec3.password === payload.password, 'Decrypted 3 matches');
  });

  // Test 11: Unsupported vault version handling
  await test('unlockVault and decryptVaultRecordPayload reject unsupported vault versions', async () => {
    const { config, vaultKey } = await initializeVault('PasswordVersionTest#123', 5000);

    const badVersionConfig = {
      ...config,
      vaultVersion: 999, // future or unsupported version
    };

    let unlockThrew = false;
    try {
      await unlockVault('PasswordVersionTest#123', badVersionConfig);
    } catch (err) {
      unlockThrew = true;
      assert(err instanceof UnsupportedVaultVersionError, 'Must throw UnsupportedVaultVersionError');
    }
    assert(unlockThrew, 'unlockVault must reject unsupported version');

    // Test decrypt with bad version
    const enc = await encryptVaultRecordPayload({
      payload: { title: 'T', username: 'U', password: 'P', url: '', notes: '', strengthScore: 1 },
      vaultKey,
      recordId: 'version-test-rec',
    });

    let decryptThrew = false;
    try {
      await decryptVaultRecordPayload({
        ...enc,
        vaultKey,
        recordId: 'version-test-rec',
        vaultVersion: 999,
      });
    } catch (err) {
      decryptThrew = true;
      assert(err instanceof UnsupportedVaultVersionError, 'Must throw UnsupportedVaultVersionError');
    }
    assert(decryptThrew, 'decryptVaultRecordPayload must reject unsupported version');
  });

  // Test 12: Rekey Vault (Change Master Password)
  await test('rekeyVault changes Master Password without modifying the Vault Key or invalidating existing records', async () => {
    const originalPassword = 'InitialMasterPassword#111';
    const newPassword = 'NewMasterPassword#222';
    const testIterations = 5000;

    const { config: initialConfig, vaultKey: initialKey } = await initializeVault(originalPassword, testIterations);

    // Create an encrypted record under initial key
    const recordPayload: VaultRecordPayload = {
      title: 'Persistent Credential',
      username: 'user@persistent.test',
      password: 'MySecretPasswordThatMustStayValid',
      url: 'https://persistent.test',
      notes: 'Notes remain intact across re-keying',
      strengthScore: 4,
    };
    const encryptedRecord = await encryptVaultRecordPayload({
      payload: recordPayload,
      vaultKey: initialKey,
      recordId: 'persistent-rec-001',
    });

    // Rekey the vault to newPassword
    const rekeyedConfig = await rekeyVault(originalPassword, newPassword, initialConfig, testIterations);

    assert(rekeyedConfig.kdf.salt !== initialConfig.kdf.salt, 'Rekeyed vault must have fresh random salt');
    assert(rekeyedConfig.evk.evkIv !== initialConfig.evk.evkIv, 'Rekeyed vault must have fresh EVK IV');
    assert(rekeyedConfig.evk.encryptedVaultKey !== initialConfig.evk.encryptedVaultKey, 'Rekeyed EVK ciphertext must be different');

    // Old password must now fail
    let oldPwThrew = false;
    try {
      await unlockVault(originalPassword, rekeyedConfig);
    } catch (err) {
      oldPwThrew = true;
      assert(err instanceof IncorrectMasterPasswordError, 'Old password must fail to unlock');
    }
    assert(oldPwThrew, 'Old password must be rejected after rekey');

    // New password unlocks the vault
    const rekeyedVaultKey = await unlockVault(newPassword, rekeyedConfig);
    assert(rekeyedVaultKey instanceof CryptoKey, 'Unlocked key must be a CryptoKey');

    // Previously encrypted record must decrypt successfully with rekeyedVaultKey
    const decrypted = await decryptVaultRecordPayload({
      ciphertext: encryptedRecord.ciphertext,
      iv: encryptedRecord.iv,
      vaultKey: rekeyedVaultKey,
      recordId: 'persistent-rec-001',
      vaultVersion: encryptedRecord.vaultVersion,
      schemaVersion: encryptedRecord.schemaVersion,
    });

    assert(decrypted.password === recordPayload.password, 'Record password decrypted with rekeyed key must match');
    assert(decrypted.title === recordPayload.title, 'Record title must match');
  });

  // Test 13: Production 600,000 iterations default verification
  await test('Production default (600,000 PBKDF2 iterations) completes and verifies successfully', async () => {
    const password = 'ProductionDefaultIterations#2026';
    const startTime = Date.now();
    const { config, vaultKey } = await initializeVault(password); // Uses default 600,000 iterations
    const elapsedInit = Date.now() - startTime;

    assert(config.kdf.iterations === 600_000, 'Iterations must default to 600,000');

    const unlockedKey = await unlockVault(password, config);
    assert(unlockedKey instanceof CryptoKey, 'Unlocked key must be valid CryptoKey');

    const payload: VaultRecordPayload = {
      title: 'Prod Test',
      username: 'user',
      password: 'ProdPassword999',
      url: 'https://prod.example.com',
      notes: 'Testing 600k rounds',
      strengthScore: 4,
    };

    const enc = await encryptVaultRecordPayload({
      payload,
      vaultKey,
      recordId: 'prod-record-600k',
    });

    const dec = await decryptVaultRecordPayload({
      ...enc,
      vaultKey: unlockedKey,
      recordId: 'prod-record-600k',
    });

    assert(dec.password === payload.password, 'Decrypted record must match under 600,000 iterations');
    console.log(`    (600k rounds init completed in ${elapsedInit}ms)`);
  });

  console.log('\n------------------------------------------------------');
  const allPassed = results.every(r => r.passed);
  console.log(`Test Results: ${results.filter(r => r.passed).length}/${results.length} passed.`);
  if (allPassed) {
    console.log('✓ ALL CRYPTOGRAPHIC TESTS PASSED SUCCESSFULLY.');
  } else {
    console.error('✗ SOME TESTS FAILED.');
  }
  console.log('------------------------------------------------------\n');

  return allPassed;
}

// Vitest Suite Integration
import { describe, it, expect } from 'vitest';

describe('Cryptographic Primitives', () => {
  it('runs all cryptographic tests successfully', async () => {
    const success = await runCryptoTests();
    expect(success).toBe(true);
  });
});

// Auto-run if executed directly via tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  runCryptoTests().then(success => {
    if (!success) {
      process.exit(1);
    }
  });
}
