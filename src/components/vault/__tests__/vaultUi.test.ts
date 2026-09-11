import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeUrl,
  extractHostname,
  calculatePasswordStrength,
  generateSecurePassword,
} from '../../../utils/vaultSecurity';
import { vaultRuntimeService } from '../../../services/vault/vaultRuntimeService';
import { clearLocalVaultStorage } from '../../../services/vault/vaultStorageService';
import { resetDBPromise } from '../../../services/db';

describe('Vault Security & UI Utilities', () => {
  describe('sanitizeUrl', () => {
    it('accepts valid https and http URLs', () => {
      expect(sanitizeUrl('https://matrix.internal')).toBe('https://matrix.internal/');
      expect(sanitizeUrl('http://localhost:3000/app')).toBe('http://localhost:3000/app');
    });

    it('prefixes bare domains with https:// safely', () => {
      expect(sanitizeUrl('github.com')).toBe('https://github.com/');
      expect(sanitizeUrl('aws.amazon.com/console')).toBe('https://aws.amazon.com/console');
    });

    it('strictly forbids dangerous URL schemes to prevent XSS', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeUrl('javascript:/*--></title></style></textarea><script>alert(1)</script>')).toBeNull();
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(sanitizeUrl('vbscript:msgbox("hello")')).toBeNull();
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
    });

    it('returns null for empty or invalid input', () => {
      expect(sanitizeUrl('')).toBeNull();
      expect(sanitizeUrl('   ')).toBeNull();
      expect(sanitizeUrl(null)).toBeNull();
      expect(sanitizeUrl(undefined)).toBeNull();
    });
  });

  describe('extractHostname', () => {
    it('extracts clean hostnames without www', () => {
      expect(extractHostname('https://www.github.com/repo')).toBe('github.com');
      expect(extractHostname('https://matrix.internal:8080/dashboard')).toBe('matrix.internal');
      expect(extractHostname('amazon.com')).toBe('amazon.com');
      expect(extractHostname('javascript:alert(1)')).toBeNull();
    });
  });

  describe('calculatePasswordStrength', () => {
    it('returns 0 for empty or very short weak passwords', () => {
      expect(calculatePasswordStrength('').score).toBe(0);
      expect(calculatePasswordStrength('123').score).toBe(0);
      expect(calculatePasswordStrength('password').score).toBe(0);
    });

    it('returns higher scores for diverse and long passwords', () => {
      const strong = calculatePasswordStrength('Kx9#mP$2vL@qW4!zB8&y');
      expect(strong.score).toBeGreaterThanOrEqual(3);
      expect(strong.label).toMatch(/Strong/);
    });
  });

  describe('generateSecurePassword', () => {
    it('generates passwords of exact requested length', () => {
      const pass16 = generateSecurePassword({ length: 16 });
      expect(pass16.length).toBe(16);

      const pass32 = generateSecurePassword({ length: 32 });
      expect(pass32.length).toBe(32);
    });

    it('generates passwords with character diversity', () => {
      const pass = generateSecurePassword({ length: 24 });
      expect(/[A-Z]/.test(pass)).toBe(true);
      expect(/[a-z]/.test(pass)).toBe(true);
      expect(/[0-9]/.test(pass)).toBe(true);
      expect(/[^A-Za-z0-9]/.test(pass)).toBe(true);
    });
  });

  describe('UI Service Integration', () => {
    const testPassword = 'MasterPassword123!@#Test';

    beforeEach(async () => {
      vaultRuntimeService.lock({ broadcast: false });
      await clearLocalVaultStorage();
      await vaultRuntimeService.checkStatus();
    });

    it('manages vault lifecycle through the runtime service without leaking data in locked state', async () => {
      // 1. Initialize
      const initRes = await vaultRuntimeService.initializeVault(testPassword);
      expect(initRes.success).toBe(true);
      expect(vaultRuntimeService.getState()).toBe('unlocked');
      expect(vaultRuntimeService.isUnlocked()).toBe(true);

      // 2. Create record
      const created = await vaultRuntimeService.createRecord({
        title: 'Production API Key',
        username: 'service-account@matrix.org',
        password: 'super-secret-token-value',
        url: 'https://api.matrix.org',
        notes: 'Rotate every 90 days',
        strengthScore: 4,
      });
      expect(created.id).toBeDefined();

      // 3. Verify record can be retrieved while unlocked
      const records = await vaultRuntimeService.listDecryptedRecords();
      expect(records.length).toBe(1);
      expect(records[0].payload.title).toBe('Production API Key');
      expect(records[0].payload.password).toBe('super-secret-token-value');

      // 4. Lock vault
      vaultRuntimeService.lock();
      expect(vaultRuntimeService.getState()).toBe('locked');
      expect(vaultRuntimeService.isUnlocked()).toBe(false);

      // 5. Attempting to list records while locked throws an error (assertUnlocked)
      await expect(vaultRuntimeService.listDecryptedRecords()).rejects.toThrow();

      // 6. Unlock again
      const unlockRes = await vaultRuntimeService.unlock(testPassword);
      expect(unlockRes.success).toBe(true);
      expect(vaultRuntimeService.isUnlocked()).toBe(true);

      // 7. Update record
      await vaultRuntimeService.updateRecord(created.id, {
        title: 'Production API Key (Rotated)',
        username: 'service-account@matrix.org',
        password: 'new-rotated-password-val',
        url: 'https://api.matrix.org',
        notes: 'Rotated today',
        strengthScore: 4,
      });

      const updatedRecords = await vaultRuntimeService.listDecryptedRecords();
      expect(updatedRecords[0].payload.title).toBe('Production API Key (Rotated)');
      expect(updatedRecords[0].payload.password).toBe('new-rotated-password-val');

      // 8. Delete record
      await vaultRuntimeService.deleteRecord(created.id);
      const afterDelete = await vaultRuntimeService.listDecryptedRecords();
      expect(afterDelete.length).toBe(0);
    });
  });
});
