/**
 * MATRIX Password Vault - Encrypted Vault Backup & Restore Test Suite
 * 
 * Verifies all security requirements:
 * 1. Export generates encrypted JSON with all required cryptographic envelopes.
 * 2. Export NEVER leaks Master Password, Master Key, Vault Key, or plaintext data.
 * 3. Malformed JSON and structurally missing fields are strictly rejected.
 * 4. Unsupported vault versions are rejected.
 * 5. Malicious content (e.g. <script>, javascript: URLs) in backup is rejected.
 * 6. Wrong Master Password fails decryptability verification safely without mutations.
 * 7. Corrupted backup (tampered EVK or tampered record ciphertext) fails verification.
 * 8. Restoration requires explicit confirmation keyword ('RESTORE').
 * 9. Successful restoration replaces the vault and adopts the new vault state.
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { resetDBPromise } from '../../../services/db';
import {
  initializeVaultStorage,
  createEncryptedRecord,
  getStoredVaultMeta,
  clearLocalVaultStorage,
  getStoredRecord,
  decryptStoredRecord,
} from '../vaultStorageService';
import { vaultRuntimeService } from '../vaultRuntimeService';
import {
  exportEncryptedVaultBackup,
  validateVaultBackupStructure,
  verifyBackupDecryptability,
  restoreEncryptedVaultFromBackup,
} from '../vaultBackupService';
import {
  VaultBackupValidationError,
  UnsupportedVaultVersionError,
  IncorrectMasterPasswordError,
  CorruptedRecordError,
  VaultRecordPayload,
} from '../../../domain/vaultTypes';

const TEST_KDF_ITERATIONS = 5000;

describe('Encrypted Vault Backup & Restore', () => {
  beforeEach(async () => {
    await clearLocalVaultStorage();
    await resetDBPromise();
    vaultRuntimeService.lock();
  });

  it('1. Export generates valid encrypted backup and strictly prevents any plaintext leakage', async () => {
    const password = 'CorrectMasterPassword#2026';
    const initResult = await initializeVaultStorage(password, TEST_KDF_ITERATIONS);

    // Create records with distinct sensitive fields
    const payload1: VaultRecordPayload = {
      title: 'Banking Portal',
      username: 'financial_user',
      password: 'SuperSecretBankPassword!99',
      url: 'https://bank.example.com',
      notes: 'Contains confidential account numbers 1234-5678',
      strengthScore: 4,
    };
    await createEncryptedRecord(payload1, initResult.vaultKey);

    const payload2: VaultRecordPayload = {
      title: 'Email Provider',
      username: 'test_mail_user',
      password: 'EmailPassword#999',
      url: 'https://mail.example.com',
      notes: 'Recovery codes: ALPHA, BRAVO, CHARLIE',
      strengthScore: 4,
    };
    await createEncryptedRecord(payload2, initResult.vaultKey);

    // Export backup
    const backup = await exportEncryptedVaultBackup();

    // Verify structural metadata
    expect(backup.format).toBe('matrix_vault_encrypted_backup');
    expect(backup.backupVersion).toBe(1);
    expect(backup.vaultVersion).toBe(1);
    expect(backup.kdf.algorithm).toBe('PBKDF2');
    expect(backup.kdf.hash).toBe('SHA-256');
    expect(backup.kdf.iterations).toBe(TEST_KDF_ITERATIONS);
    expect(typeof backup.kdf.salt).toBe('string');
    expect(typeof backup.evk.encryptedVaultKey).toBe('string');
    expect(typeof backup.evk.evkIv).toBe('string');
    expect(backup.records.length).toBe(2);

    // Verify record envelopes
    for (const rec of backup.records) {
      expect(typeof rec.id).toBe('string');
      expect(typeof rec.ciphertext).toBe('string');
      expect(typeof rec.iv).toBe('string');
      expect(typeof rec.version).toBe('number');
      expect(typeof rec.createdAt).toBe('number');
      expect(typeof rec.updatedAt).toBe('number');
    }

    // Zero-knowledge Leak Verification: stringify and scan for any plaintext strings
    const serialized = JSON.stringify(backup);
    expect(serialized).not.toContain('SuperSecretBankPassword!99');
    expect(serialized).not.toContain('financial_user');
    expect(serialized).not.toContain('Banking Portal');
    expect(serialized).not.toContain('EmailPassword#999');
    expect(serialized).not.toContain('Contains confidential account numbers');
    expect(serialized).not.toContain('CorrectMasterPassword#2026');
    expect(serialized).not.toContain('"password":');
    expect(serialized).not.toContain('"username":');
    expect(serialized).not.toContain('"notes":');
    expect(serialized).not.toContain('"title":');
  });

  it('2. Malformed JSON and structurally missing fields are rejected during validation', () => {
    // Malformed JSON syntax
    expect(() => validateVaultBackupStructure('{ bad json string ...')).toThrow(VaultBackupValidationError);
    expect(() => validateVaultBackupStructure('42')).toThrow(VaultBackupValidationError);
    expect(() => validateVaultBackupStructure('null')).toThrow(VaultBackupValidationError);

    // Missing schema tag
    expect(() => validateVaultBackupStructure(JSON.stringify({ version: 1 }))).toThrow(VaultBackupValidationError);

    // Missing KDF or EVK
    const partial = {
      format: 'matrix_vault_encrypted_backup',
      backupVersion: 1,
      vaultVersion: 1,
      // missing kdf
      evk: { encryptedVaultKey: 'ZXZr', evkIv: 'aXY=' },
      records: [],
    };
    expect(() => validateVaultBackupStructure(JSON.stringify(partial))).toThrow(VaultBackupValidationError);

    // Missing records array
    const missingRecords = {
      format: 'matrix_vault_encrypted_backup',
      backupVersion: 1,
      vaultVersion: 1,
      kdf: { algorithm: 'PBKDF2', hash: 'SHA-256', salt: 'c2FsdA==', iterations: 100000 },
      evk: { encryptedVaultKey: 'ZXZr', evkIv: 'aXY=' },
    };
    expect(() => validateVaultBackupStructure(JSON.stringify(missingRecords))).toThrow(VaultBackupValidationError);
  });

  it('3. Unsupported vault versions are rejected', () => {
    const invalidVersionBackup = {
      format: 'matrix_vault_encrypted_backup',
      backupVersion: 1,
      vaultVersion: 999, // unsupported future version
      kdf: { algorithm: 'PBKDF2', hash: 'SHA-256', salt: 'c2FsdA==', iterations: 100000 },
      evk: { encryptedVaultKey: 'ZXZr', evkIv: 'aXY=' },
      records: [],
    };

    expect(() => validateVaultBackupStructure(JSON.stringify(invalidVersionBackup))).toThrow(
      UnsupportedVaultVersionError
    );
  });

  it('4. Malicious markup and script tags in backup content are rejected as unsafe data', () => {
    const scriptInjectionBackup = {
      format: 'matrix_vault_encrypted_backup',
      backupVersion: 1,
      vaultVersion: 1,
      kdf: { algorithm: 'PBKDF2', hash: 'SHA-256', salt: 'c2FsdA==', iterations: 100000 },
      evk: { encryptedVaultKey: 'ZXZr', evkIv: 'aXY=' },
      metadata: {
        comment: '<script>alert("pwned")</script>',
      },
      records: [],
    };

    expect(() => validateVaultBackupStructure(JSON.stringify(scriptInjectionBackup))).toThrow(
      VaultBackupValidationError
    );

    const javascriptUriBackup = {
      format: 'matrix_vault_encrypted_backup',
      backupVersion: 1,
      vaultVersion: 1,
      kdf: { algorithm: 'PBKDF2', hash: 'SHA-256', salt: 'c2FsdA==', iterations: 100000 },
      evk: { encryptedVaultKey: 'ZXZr', evkIv: 'aXY=' },
      records: [
        {
          id: 'javascript:alert(1)',
          vaultVersion: 1,
          schemaVersion: 1,
          ciphertext: 'Y2lwaGVy',
          iv: 'aXY=',
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    };

    expect(() => validateVaultBackupStructure(JSON.stringify(javascriptUriBackup))).toThrow(
      VaultBackupValidationError
    );
  });

  it('5. Wrong Master Password safely fails pre-replacement verification without mutating storage', async () => {
    const correctPassword = 'RightPassword#123';
    const wrongPassword = 'WrongPassword#999';

    const initResult = await initializeVaultStorage(correctPassword, TEST_KDF_ITERATIONS);
    await createEncryptedRecord(
      {
        title: 'Existing Account',
        username: 'existing_user',
        password: 'ExistingPassword123',
        url: 'https://existing.example.com',
        notes: 'Test notes',
        strengthScore: 3,
      },
      initResult.vaultKey
    );

    const backup = await exportEncryptedVaultBackup();

    // Attempt verification with wrong password
    await expect(verifyBackupDecryptability(backup, wrongPassword)).rejects.toThrow(
      IncorrectMasterPasswordError
    );

    // Verify existing storage remains completely untouched and intact
    const currentMeta = await getStoredVaultMeta();
    expect(currentMeta?.kdf.salt).toBe(initResult.config.kdf.salt);
    expect(currentMeta?.evk.encryptedVaultKey).toBe(initResult.config.evk.encryptedVaultKey);
  });

  it('6. Corrupted backup (tampered EVK or tampered record ciphertext) fails integrity check', async () => {
    const password = 'Password#123';
    const initResult = await initializeVaultStorage(password, TEST_KDF_ITERATIONS);
    await createEncryptedRecord(
      {
        title: 'Secret Service',
        username: 'agent007',
        password: 'LicenseToEncrypt',
        url: 'https://mi6.gov.uk',
        notes: 'Top Secret',
        strengthScore: 4,
      },
      initResult.vaultKey
    );

    const backup = await exportEncryptedVaultBackup();

    // Tamper with EVK (flip base64 characters)
    const corruptedEvkBackup = {
      ...backup,
      evk: {
        ...backup.evk,
        encryptedVaultKey:
          backup.evk.encryptedVaultKey.substring(0, backup.evk.encryptedVaultKey.length - 4) + 'AAAA',
      },
    };

    await expect(verifyBackupDecryptability(corruptedEvkBackup, password)).rejects.toThrow();

    // Tamper with record ciphertext
    const corruptedRecordBackup = {
      ...backup,
      records: [
        {
          ...backup.records[0],
          ciphertext:
            backup.records[0].ciphertext.substring(0, backup.records[0].ciphertext.length - 4) + 'ZZZZ',
        },
      ],
    };

    await expect(verifyBackupDecryptability(corruptedRecordBackup, password)).rejects.toThrow(
      CorruptedRecordError
    );
  });

  it('7. Restoration requires explicit confirmation keyword "RESTORE" to prevent accidental data loss', async () => {
    const password = 'SourceVaultPassword#123';
    const initResult = await initializeVaultStorage(password, TEST_KDF_ITERATIONS);
    await createEncryptedRecord(
      {
        title: 'Source Entry',
        username: 'user_src',
        password: 'PassSrc#123',
        url: 'https://src.example.com',
        notes: 'Source notes',
        strengthScore: 3,
      },
      initResult.vaultKey
    );

    const backup = await exportEncryptedVaultBackup();
    const verified = await verifyBackupDecryptability(backup, password);

    // Calling with empty or invalid confirmation keyword must throw
    await expect(restoreEncryptedVaultFromBackup(verified, '')).rejects.toThrow(
      'Destructive replacement confirmation failed'
    );
    await expect(restoreEncryptedVaultFromBackup(verified, 'yes')).rejects.toThrow(
      'Destructive replacement confirmation failed'
    );
    await expect(restoreEncryptedVaultFromBackup(verified, 'restore')).rejects.toThrow(
      'Destructive replacement confirmation failed'
    );
  });

  it('8. Complete Export -> Restore roundtrip replaces existing vault and all records decrypt cleanly', async () => {
    // Step A: Set up original vault (Vault A)
    const passwordA = 'VaultAPassword#2026';
    const initA = await initializeVaultStorage(passwordA, TEST_KDF_ITERATIONS);

    await createEncryptedRecord(
      {
        title: 'GitHub Enterprise',
        username: 'octocat',
        password: 'GH_SecretToken_987654',
        url: 'https://github.com',
        notes: 'SSH Key is ~/.ssh/id_ed25519',
        strengthScore: 4,
      },
      initA.vaultKey
    );

    await createEncryptedRecord(
      {
        title: 'Proton Mail',
        username: 'secure_inbox',
        password: 'MailSecret_112233',
        url: 'https://mail.proton.me',
        notes: '',
        strengthScore: 3,
      },
      initA.vaultKey
    );

    // Step B: Export Vault A backup
    const backupA = await exportEncryptedVaultBackup();
    expect(backupA.records.length).toBe(2);

    // Step C: Overwrite local database with a completely different vault (Vault B)
    await clearLocalVaultStorage();
    const passwordB = 'VaultBPassword#9999';
    const initB = await initializeVaultStorage(passwordB, TEST_KDF_ITERATIONS);
    await createEncryptedRecord(
      {
        title: 'Different Site Only In Vault B',
        username: 'vault_b_user',
        password: 'VaultBPassword123',
        url: 'https://vaultb.example.com',
        notes: 'Vault B notes',
        strengthScore: 2,
      },
      initB.vaultKey
    );

    // Verify local storage is currently Vault B
    const storedRecordB = await getStoredRecord(backupA.records[0].id);
    expect(storedRecordB).toBeUndefined(); // Vault A's records do not exist in Vault B

    // Step D: Validate and Verify Vault A backup with Vault A's password
    const validatedBackup = validateVaultBackupStructure(JSON.stringify(backupA));
    const verified = await verifyBackupDecryptability(validatedBackup, passwordA);
    expect(verified.recordCount).toBe(2);

    // Step E: Perform atomic restoration with 'RESTORE' keyword
    const restoreResult = await restoreEncryptedVaultFromBackup(verified, 'RESTORE');
    expect(restoreResult.recordCount).toBe(2);

    // Step F: Verify local storage metadata now reflects Vault A's cryptographic parameters
    const restoredMeta = await getStoredVaultMeta();
    expect(restoredMeta?.kdf.salt).toBe(backupA.kdf.salt);
    expect(restoredMeta?.evk.encryptedVaultKey).toBe(backupA.evk.encryptedVaultKey);
    expect(restoredMeta?.evk.evkIv).toBe(backupA.evk.evkIv);

    // Step G: Decrypt both restored records and verify all plaintext data was restored faithfully
    const titles = new Set<string>();
    for (const rec of backupA.records) {
      const stored = await getStoredRecord(rec.id);
      expect(stored).toBeDefined();
      const decrypted = await decryptStoredRecord(stored!, verified.vaultKey);
      titles.add(decrypted.title);
      if (decrypted.title === 'GitHub Enterprise') {
        expect(decrypted.username).toBe('octocat');
        expect(decrypted.password).toBe('GH_SecretToken_987654');
        expect(decrypted.url).toBe('https://github.com');
        expect(decrypted.notes).toBe('SSH Key is ~/.ssh/id_ed25519');
      } else if (decrypted.title === 'Proton Mail') {
        expect(decrypted.username).toBe('secure_inbox');
        expect(decrypted.password).toBe('MailSecret_112233');
        expect(decrypted.url).toBe('https://mail.proton.me');
      }
    }
    expect(titles.has('GitHub Enterprise')).toBe(true);
    expect(titles.has('Proton Mail')).toBe(true);

    // Step H: Ensure Vault B parameters are completely wiped
    const metaAfter = await getStoredVaultMeta();
    expect(metaAfter?.kdf.salt).not.toBe(initB.config.kdf.salt);
  });
});
