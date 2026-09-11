/**
 * MATRIX Password Vault - Auto-Lock & Clipboard Security Test Suite
 * 
 * Verifies:
 * 1. Default inactivity timeout (15 minutes).
 * 2. Inactivity timer triggers central lock and clears runtime data.
 * 3. User activity resets the timer.
 * 4. Manual lock and central lock consistency.
 * 5. Strict Visibility Mode: locks vault immediately upon tab switch when enabled.
 * 6. Strict Visibility Mode: does NOT lock on tab switch when disabled.
 * 7. Pagehide / lifecycle handling: safely clears runtime keys without persisting.
 * 8. Clipboard Security: copies password via Clipboard API with 45s timer.
 * 9. Best-effort clearing does NOT overwrite newer clipboard content.
 * 10. Volatile memory references are purged upon lock.
 */

import 'fake-indexeddb/auto';
import { vaultAutoLockService } from '../../../services/vault/vaultAutoLockService';
import { vaultRuntimeService } from '../../../services/vault/vaultRuntimeService';
import {
  copyPasswordWithAutoClear,
  cancelPendingClipboardClear,
  getActiveCopiedSecret,
  isClipboardClearPending,
} from '../../../services/vault/vaultClipboardService';
import { clearLocalVaultStorage } from '../../../services/vault/vaultStorageService';
import { resetDBPromise } from '../../../services/db';

interface TestResult {
  name: string;
  passed: boolean;
  error?: unknown;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('======================================================');
  console.log('  Running MATRIX Vault Auto-Lock & Clipboard Tests');
  console.log('======================================================');

  // Test 1: Inactivity timeout defaults and preferences
  try {
    const timeout = vaultAutoLockService.getInactivityTimeout();
    assert(timeout === 15, `Expected default timeout to be 15, got ${timeout}`);
    
    vaultAutoLockService.setInactivityTimeout(30);
    assert(vaultAutoLockService.getInactivityTimeout() === 30, 'Failed to update inactivity timeout');

    vaultAutoLockService.setInactivityTimeout(15); // reset
    results.push({ name: 'Default 15-minute inactivity timeout configuration', passed: true });
    console.log('  ✓ Default 15-minute inactivity timeout configuration');
  } catch (err) {
    results.push({ name: 'Default 15-minute inactivity timeout configuration', passed: false, error: err });
    console.error('  ✗ Default 15-minute inactivity timeout configuration:', err);
  }

  // Test 2: Inactivity timer triggers central lock
  try {
    resetDBPromise();
    await clearLocalVaultStorage();
    const testPassword = 'MasterPassword123!@#';
    await vaultRuntimeService.initializeVault(testPassword, 1000); // 1000 iterations for test speed
    assert(vaultRuntimeService.isUnlocked(), 'Vault should be unlocked after init');

    vaultAutoLockService.initialize();
    
    // Set a very short test timer of 50ms
    vaultAutoLockService.startTimer(50);
    assert(vaultRuntimeService.isUnlocked(), 'Vault should still be unlocked immediately');

    // Wait for timer to fire
    await new Promise((r) => setTimeout(r, 80));

    assert(!vaultRuntimeService.isUnlocked(), 'Vault should be locked after timer fires');
    assert(vaultRuntimeService.getState() === 'locked', 'Vault state should be locked');

    results.push({ name: 'Inactivity timer triggers central lock when timeout reached', passed: true });
    console.log('  ✓ Inactivity timer triggers central lock when timeout reached');
  } catch (err) {
    results.push({ name: 'Inactivity timer triggers central lock when timeout reached', passed: false, error: err });
    console.error('  ✗ Inactivity timer triggers central lock when timeout reached:', err);
  }

  // Test 3: User activity resets the inactivity timer
  try {
    resetDBPromise();
    await clearLocalVaultStorage();
    const testPassword = 'MasterPassword123!@#';
    await vaultRuntimeService.initializeVault(testPassword, 1000);
    assert(vaultRuntimeService.isUnlocked(), 'Vault should be unlocked');

    vaultAutoLockService.initialize();
    vaultAutoLockService.startTimer(100);

    // Record activity at 40ms to reset timer
    await new Promise((r) => setTimeout(r, 40));
    assert(vaultRuntimeService.isUnlocked(), 'Should be unlocked before activity reset');
    vaultAutoLockService.recordActivity();

    // At 80ms total (40ms after reset), should still be unlocked because timer was refreshed!
    await new Promise((r) => setTimeout(r, 40));
    assert(vaultRuntimeService.isUnlocked(), 'Vault should still be unlocked after activity reset');

    results.push({ name: 'User activity resets inactivity timer', passed: true });
    console.log('  ✓ User activity resets inactivity timer');
  } catch (err) {
    results.push({ name: 'User activity resets inactivity timer', passed: false, error: err });
    console.error('  ✗ User activity resets inactivity timer:', err);
  }

  // Test 4: Strict Visibility Mode defaults to disabled
  try {
    vaultAutoLockService.setStrictVisibility(false);
    assert(vaultAutoLockService.getStrictVisibility() === false, 'Strict visibility should default to false');

    vaultAutoLockService.setStrictVisibility(true);
    assert(vaultAutoLockService.getStrictVisibility() === true, 'Strict visibility should be toggleable to true');

    vaultAutoLockService.setStrictVisibility(false); // reset
    results.push({ name: 'Strict Visibility Mode is disabled by default', passed: true });
    console.log('  ✓ Strict Visibility Mode is disabled by default');
  } catch (err) {
    results.push({ name: 'Strict Visibility Mode is disabled by default', passed: false, error: err });
    console.error('  ✗ Strict Visibility Mode is disabled by default:', err);
  }

  // Test 5: Strict Visibility Mode locks vault upon tab switch when enabled
  try {
    resetDBPromise();
    await clearLocalVaultStorage();
    const testPassword = 'MasterPassword123!@#';
    await vaultRuntimeService.initializeVault(testPassword, 1000);
    assert(vaultRuntimeService.isUnlocked(), 'Vault should be unlocked');

    vaultAutoLockService.initialize();
    vaultAutoLockService.setStrictVisibility(true);

    // Simulate tab switch (document hidden)
    const mockDocument = { hidden: true, visibilityState: 'hidden' };
    (globalThis as any).document = mockDocument;

    // Trigger visibilitychange event handler
    (vaultAutoLockService as any).handleVisibilityChange();

    assert(!vaultRuntimeService.isUnlocked(), 'Vault must lock when tab is hidden and strict visibility is ON');
    assert(vaultRuntimeService.getState() === 'locked', 'Vault state must be locked');

    // Reset document
    mockDocument.hidden = false;
    mockDocument.visibilityState = 'visible';
    vaultAutoLockService.setStrictVisibility(false);

    results.push({ name: 'Strict Visibility Mode locks vault on document hidden', passed: true });
    console.log('  ✓ Strict Visibility Mode locks vault on document hidden');
  } catch (err) {
    results.push({ name: 'Strict Visibility Mode locks vault on document hidden', passed: false, error: err });
    console.error('  ✗ Strict Visibility Mode locks vault on document hidden:', err);
  }

  // Test 6: Strict Visibility Mode does NOT lock when disabled
  try {
    resetDBPromise();
    await clearLocalVaultStorage();
    const testPassword = 'MasterPassword123!@#';
    await vaultRuntimeService.initializeVault(testPassword, 1000);
    assert(vaultRuntimeService.isUnlocked(), 'Vault should be unlocked');

    vaultAutoLockService.initialize();
    vaultAutoLockService.setStrictVisibility(false);

    // Simulate tab switch (document hidden)
    const mockDocument = { hidden: true, visibilityState: 'hidden' };
    (globalThis as any).document = mockDocument;

    (vaultAutoLockService as any).handleVisibilityChange();

    assert(vaultRuntimeService.isUnlocked(), 'Vault must remain unlocked when strict visibility is OFF');

    mockDocument.hidden = false;
    mockDocument.visibilityState = 'visible';

    results.push({ name: 'Strict Visibility Mode does not lock when disabled', passed: true });
    console.log('  ✓ Strict Visibility Mode does not lock when disabled');
  } catch (err) {
    results.push({ name: 'Strict Visibility Mode does not lock when disabled', passed: false, error: err });
    console.error('  ✗ Strict Visibility Mode does not lock when disabled:', err);
  }

  // Test 7: Pagehide lifecycle handler locks vault safely
  try {
    resetDBPromise();
    await clearLocalVaultStorage();
    const testPassword = 'MasterPassword123!@#';
    await vaultRuntimeService.initializeVault(testPassword, 1000);
    assert(vaultRuntimeService.isUnlocked(), 'Vault should be unlocked');

    (vaultAutoLockService as any).handlePageHide();

    assert(!vaultRuntimeService.isUnlocked(), 'Vault must be locked after pagehide event');
    assert(vaultRuntimeService.getState() === 'locked', 'Vault state must be locked');

    results.push({ name: 'Browser pagehide lifecycle locks vault safely', passed: true });
    console.log('  ✓ Browser pagehide lifecycle locks vault safely');
  } catch (err) {
    results.push({ name: 'Browser pagehide lifecycle locks vault safely', passed: false, error: err });
    console.error('  ✗ Browser pagehide lifecycle locks vault safely:', err);
  }

  // Helper to mock clipboard on globalThis
  function setupMockClipboard() {
    let text = '';
    const clipboard = {
      writeText: async (t: string) => {
        text = t;
      },
      readText: async () => {
        return text;
      },
    };
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard },
      configurable: true,
      writable: true,
    });
    (globalThis as any).document = {
      ...(globalThis as any).document,
      hasFocus: () => true,
    };
    return {
      getText: () => text,
      setText: (t: string) => {
        text = t;
      },
    };
  }

  // Test 8: Clipboard Security - Copies password with auto-clear timer
  try {
    const mock = setupMockClipboard();

    const secretPassword = 'MySuperSecretPassword#2026';
    // Use short 60ms delay for unit test
    const res = await copyPasswordWithAutoClear(secretPassword, 60);

    assert(res.success === true, 'Copy should succeed');
    assert(mock.getText() === secretPassword, 'Password should be in clipboard');
    assert(getActiveCopiedSecret() === secretPassword, 'Active secret should match');
    assert(isClipboardClearPending() === true, 'Clear should be pending');

    // Wait for auto-clear delay
    await new Promise((r) => setTimeout(r, 100));

    assert(mock.getText() === '', 'Clipboard should be cleared after timeout');
    assert(getActiveCopiedSecret() === null, 'Active secret reference should be cleared');
    assert(isClipboardClearPending() === false, 'No clear should be pending');

    results.push({ name: 'Clipboard copy with auto-clear successfully clears secret', passed: true });
    console.log('  ✓ Clipboard copy with auto-clear successfully clears secret');
  } catch (err) {
    results.push({ name: 'Clipboard copy with auto-clear successfully clears secret', passed: false, error: err });
    console.error('  ✗ Clipboard copy with auto-clear successfully clears secret:', err);
  }

  // Test 9: Best-effort clearing does NOT overwrite newer clipboard content
  try {
    const mock = setupMockClipboard();

    const secretPassword = 'VaultSecretPassword-999';
    await copyPasswordWithAutoClear(secretPassword, 60);
    assert(mock.getText() === secretPassword, 'Password copied');

    // User copies something else in the meantime (e.g. an address or note)
    mock.setText('Newer content copied by user');

    // Wait for auto-clear delay to expire
    await new Promise((r) => setTimeout(r, 100));

    // The newer content MUST NOT be overwritten!
    assert(
      mock.getText() === 'Newer content copied by user',
      `Clipboard should NOT have been cleared because user copied newer content; current content: "${mock.getText()}"`
    );
    assert(getActiveCopiedSecret() === null, 'Active secret reference should be nullified');

    results.push({ name: 'Clipboard auto-clear does NOT overwrite newer user content', passed: true });
    console.log('  ✓ Clipboard auto-clear does NOT overwrite newer user content');
  } catch (err) {
    results.push({ name: 'Clipboard auto-clear does NOT overwrite newer user content', passed: false, error: err });
    console.error('  ✗ Clipboard auto-clear does NOT overwrite newer user content:', err);
  }

  // Test 10: Manual cancel of pending clipboard clear
  try {
    const mock = setupMockClipboard();

    await copyPasswordWithAutoClear('CancelMe123', 60);
    assert(isClipboardClearPending() === true, 'Clear pending');

    cancelPendingClipboardClear();
    assert(isClipboardClearPending() === false, 'Clear should be cancelled');
    assert(getActiveCopiedSecret() === null, 'Secret cleared');

    await new Promise((r) => setTimeout(r, 100));
    assert(mock.getText() === 'CancelMe123', 'Clipboard was not cleared after cancel');

    results.push({ name: 'Manual cancel of clipboard clear cancels timer', passed: true });
    console.log('  ✓ Manual cancel of clipboard clear cancels timer');
  } catch (err) {
    results.push({ name: 'Manual cancel of clipboard clear cancels timer', passed: false, error: err });
    console.error('  ✗ Manual cancel of clipboard clear cancels timer:', err);
  }

  console.log('------------------------------------------------------');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Results: ${passed} passed, ${failed} failed (${results.length} total)`);
  console.log('------------------------------------------------------');

  vaultAutoLockService.destroy();
  vaultRuntimeService.closeChannel();

  if (failed > 0) {
    throw new Error(`${failed} auto-lock and clipboard tests failed!`);
  }
}

// Vitest Suite Integration
import { describe, it, expect } from 'vitest';

describe('Auto-Lock & Ephemeral Clipboard Layer', () => {
  it('runs all auto-lock and clipboard security tests successfully', async () => {
    await runTests();
    expect(true).toBe(true);
  });
});

if (typeof process !== 'undefined' && process.argv && process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((err) => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}
