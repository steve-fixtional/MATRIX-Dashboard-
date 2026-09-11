/**
 * MATRIX Password Vault - Runtime State & Unlocking Test Suite
 * 
 * Tests:
 * 1. Correct master password unlocks vault and retrieves volatile VaultKey.
 * 2. Incorrect master password fails to unlock, exposes no cryptographic details, and does not persist.
 * 3. Manual lock works and transitions state to locked.
 * 4. Runtime secrets disappear from application state after lock (volatile key reference, cache, search query).
 * 5. Logout locks vault and prevents previous user's vault from remaining accessible.
 * 6. Account switching locks previous vault, wipes runtime data, and requires unlocking of new user's vault.
 * 7. Cross-tab lock works via BroadcastChannel (LOCK_VAULT, LOGOUT, ACCOUNT_CHANGED).
 * 8. Broadcast messages NEVER transmit the VaultKey or plaintext credentials.
 */

import 'fake-indexeddb/auto';
import {
  VaultRuntimeState,
  VaultRecordPayload,
  VaultLockedError,
  VaultBroadcastMessage,
} from '../../../domain/vaultTypes';
import { clearLocalVaultStorage } from '../vaultStorageService';
import {
  vaultRuntimeService,
  VAULT_BROADCAST_CHANNEL,
} from '../vaultRuntimeService';

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
  console.log('  Running MATRIX Vault Runtime State & Unlock Tests');
  console.log('======================================================');

  const testPassword = 'CorrectMasterPass123!';
  const fastIterations = 100_000; // Fast for testing

  // Test 1: Initial state is uninitialized
  try {
    await clearLocalVaultStorage();
    const state = await vaultRuntimeService.checkStatus();
    assert(state === 'uninitialized', `Initial state must be uninitialized, got ${state}`);
    assert(vaultRuntimeService.isUninitialized() === true, 'isUninitialized() must be true');
    assert(vaultRuntimeService.isUnlocked() === false, 'isUnlocked() must be false');
    assert(vaultRuntimeService.isLocked() === false, 'isLocked() must be false');

    results.push({ name: 'Initial state is uninitialized before setup', passed: true });
    console.log('  ✓ Initial state is uninitialized before setup');
  } catch (err) {
    results.push({ name: 'Initial state is uninitialized before setup', passed: false, error: err });
    console.error('  ✗ Initial state is uninitialized before setup:', err);
  }

  // Test 2: Correct password unlocks vault and obtains volatile VaultKey
  try {
    await clearLocalVaultStorage();
    // Initialize vault with Master Password
    const initRes = await vaultRuntimeService.initializeVault(testPassword, fastIterations);
    assert(initRes.success === true, 'Initialization must succeed');
    assert(vaultRuntimeService.getState() === 'unlocked', 'State must be unlocked after init');
    assert(vaultRuntimeService.isUnlocked() === true, 'isUnlocked() must return true');

    const snapshotAfterInit = vaultRuntimeService.getSensitiveStateSnapshot();
    assert(snapshotAfterInit.hasKey === true, 'Active VaultKey must be loaded in volatile memory');

    // Manually lock it to test unlock flow explicitly
    vaultRuntimeService.lock({ broadcast: false });
    assert(vaultRuntimeService.getState() === 'locked', 'State must be locked after manual lock');
    assert(vaultRuntimeService.isUnlocked() === false, 'isUnlocked() must be false when locked');

    // Now test unlocking with the correct password
    const unlockRes = await vaultRuntimeService.unlock(testPassword);
    assert(unlockRes.success === true, 'Unlock with correct password must succeed');
    assert(vaultRuntimeService.getState() === 'unlocked', 'State must transition to unlocked');
    assert(vaultRuntimeService.isUnlocked() === true, 'isUnlocked() must be true after unlock');

    const snapshotAfterUnlock = vaultRuntimeService.getSensitiveStateSnapshot();
    assert(snapshotAfterUnlock.hasKey === true, 'Volatile VaultKey must be present in memory');

    results.push({ name: 'Correct master password unlocks vault and obtains volatile key', passed: true });
    console.log('  ✓ Correct master password unlocks vault and obtains volatile key');
  } catch (err) {
    results.push({ name: 'Correct master password unlocks vault and obtains volatile key', passed: false, error: err });
    console.error('  ✗ Correct master password unlocks vault and obtains volatile key:', err);
  }

  // Test 3: Decrypted record operations work during unlocked session
  let createdRecordId: string = '';
  try {
    const payload: VaultRecordPayload = {
      title: 'Company Cloud Gateway',
      username: 'admin@matrix.internal',
      password: 'Secr3tPassword-Strong!',
      url: 'https://gateway.matrix.internal',
      notes: 'Contains biometric fallback token',
      strengthScore: 98,
    };

    const record = await vaultRuntimeService.createRecord(payload);
    assert(!!record.id, 'Record must be created with ID');
    createdRecordId = record.id;

    // Fetch decrypted record
    const decrypted = await vaultRuntimeService.getDecryptedRecord(record.id);
    assert(decrypted.title === payload.title, 'Decrypted title matches');
    assert(decrypted.password === payload.password, 'Decrypted password matches');
    assert(decrypted.username === payload.username, 'Decrypted username matches');

    // In-memory sensitive search
    const searchResults = await vaultRuntimeService.searchSensitiveRecords('gateway');
    assert(searchResults.length === 1, 'Search should find the matching record');
    assert(searchResults[0].payload.title === payload.title, 'Search payload matches');

    results.push({ name: 'Decrypted record operations and search work during unlocked session', passed: true });
    console.log('  ✓ Decrypted record operations and search work during unlocked session');
  } catch (err) {
    results.push({ name: 'Decrypted record operations and search work during unlocked session', passed: false, error: err });
    console.error('  ✗ Decrypted record operations and search work during unlocked session:', err);
  }

  // Test 4: Incorrect password fails to unlock, never leaks password, and stays locked
  try {
    // Lock vault first
    vaultRuntimeService.lock({ broadcast: false });
    assert(vaultRuntimeService.getState() === 'locked', 'Vault must be locked before wrong password test');

    const wrongPassword = 'CompletelyWrongPassword123!';
    const unlockFailRes = await vaultRuntimeService.unlock(wrongPassword);

    assert(unlockFailRes.success === false, 'Unlock with wrong password must return success: false');
    assert(
      unlockFailRes.error === 'Incorrect master password. Please verify and try again.',
      `Error must be safe, got: ${unlockFailRes.error}`
    );
    assert(vaultRuntimeService.getState() === 'error', 'State must be error after failed unlock');
    assert(vaultRuntimeService.isUnlocked() === false, 'Vault must remain locked');

    // Verify key was NOT loaded
    const snapshot = vaultRuntimeService.getSensitiveStateSnapshot();
    assert(snapshot.hasKey === false, 'No VaultKey must be loaded on failed unlock');

    // Attempting to access records must throw VaultLockedError
    let threwLockedError = false;
    try {
      await vaultRuntimeService.getDecryptedRecord(createdRecordId);
    } catch (e) {
      if (e instanceof VaultLockedError) {
        threwLockedError = true;
      }
    }
    assert(threwLockedError, 'Accessing records after failed unlock must throw VaultLockedError');

    results.push({ name: 'Incorrect master password fails safely and does not unlock', passed: true });
    console.log('  ✓ Incorrect master password fails safely and does not unlock');
  } catch (err) {
    results.push({ name: 'Incorrect master password fails safely and does not unlock', passed: false, error: err });
    console.error('  ✗ Incorrect master password fails safely and does not unlock:', err);
  }

  // Test 5: Manual lock works and transitions state to locked
  try {
    // Re-unlock with correct password
    const unlockRes = await vaultRuntimeService.unlock(testPassword);
    assert(unlockRes.success === true, 'Should unlock with correct password');
    assert(vaultRuntimeService.isUnlocked() === true, 'Vault is unlocked');

    // Execute manual lock
    vaultRuntimeService.lock({ broadcast: false });
    assert(vaultRuntimeService.getState() === 'locked', 'State must be locked');
    assert(vaultRuntimeService.isLocked() === true, 'isLocked() must be true');
    assert(vaultRuntimeService.isUnlocked() === false, 'isUnlocked() must be false');

    results.push({ name: 'Manual lock works and transitions state to locked', passed: true });
    console.log('  ✓ Manual lock works and transitions state to locked');
  } catch (err) {
    results.push({ name: 'Manual lock works and transitions state to locked', passed: false, error: err });
    console.error('  ✗ Manual lock works and transitions state to locked:', err);
  }

  // Test 6: Runtime secrets disappear from application state after lock
  try {
    // 1. Re-unlock and populate volatile caches
    await vaultRuntimeService.unlock(testPassword);
    await vaultRuntimeService.getDecryptedRecord(createdRecordId);
    await vaultRuntimeService.searchSensitiveRecords('gateway');
    vaultRuntimeService.setSelectedRecordId(createdRecordId);

    // Snapshot BEFORE lock
    const beforeLock = vaultRuntimeService.getSensitiveStateSnapshot();
    assert(beforeLock.hasKey === true, 'Volatile key was present before lock');
    assert(beforeLock.decryptedCacheSize > 0, 'Decrypted cache was populated before lock');
    assert(beforeLock.searchQuery.length > 0, 'Search query was active before lock');
    assert(beforeLock.searchResultsCount > 0, 'Search results were populated before lock');
    assert(beforeLock.selectedRecordId === createdRecordId, 'Selected record was set before lock');

    // 2. Perform central lock
    vaultRuntimeService.lock({ broadcast: false });

    // Snapshot AFTER lock
    const afterLock = vaultRuntimeService.getSensitiveStateSnapshot();
    assert(afterLock.hasKey === false, 'Runtime VaultKey reference MUST be cleared (null)');
    assert(afterLock.decryptedCacheSize === 0, 'Decrypted record cache MUST be completely emptied');
    assert(afterLock.searchQuery === '', 'Sensitive search query MUST be cleared to empty string');
    assert(afterLock.searchResultsCount === 0, 'Sensitive search results MUST be completely cleared');
    assert(afterLock.selectedRecordId === null, 'Selected record ID MUST be cleared');

    // 3. Verify no lingering access
    let accessBlocked = false;
    try {
      await vaultRuntimeService.createRecord({
        title: 'Unauthorized',
        username: 'unauth',
        password: 'unauth-password',
        url: '',
        notes: '',
        strengthScore: 10,
      });
    } catch (e) {
      if (e instanceof VaultLockedError) {
        accessBlocked = true;
      }
    }
    assert(accessBlocked, 'Creating records after lock must be blocked with VaultLockedError');

    results.push({ name: 'Runtime secrets disappear completely from application state after lock', passed: true });
    console.log('  ✓ Runtime secrets disappear completely from application state after lock');
  } catch (err) {
    results.push({ name: 'Runtime secrets disappear completely from application state after lock', passed: false, error: err });
    console.error('  ✗ Runtime secrets disappear completely from application state after lock:', err);
  }

  // Test 7: Logout locks vault and clears local storage
  try {
    // Unlock vault first
    await vaultRuntimeService.unlock(testPassword);
    assert(vaultRuntimeService.isUnlocked() === true, 'Vault is unlocked');

    // Trigger logout
    await vaultRuntimeService.handleLogout({ broadcast: false });

    assert(vaultRuntimeService.isUnlocked() === false, 'Vault must NOT be unlocked after logout');
    assert(vaultRuntimeService.getState() === 'uninitialized', 'State must transition to uninitialized');

    const snapshot = vaultRuntimeService.getSensitiveStateSnapshot();
    assert(snapshot.hasKey === false, 'VaultKey must be null after logout');
    assert(snapshot.decryptedCacheSize === 0, 'Cache must be 0 after logout');

    // Verify local IndexedDB was cleared so no previous user vault remains accessible
    const status = await vaultRuntimeService.checkStatus();
    assert(status === 'uninitialized', 'Storage must be uninitialized after logout');

    results.push({ name: 'Logout locks vault and prevents previous user vault from remaining accessible', passed: true });
    console.log('  ✓ Logout locks vault and prevents previous user vault from remaining accessible');
  } catch (err) {
    results.push({ name: 'Logout locks vault and prevents previous user vault from remaining accessible', passed: false, error: err });
    console.error('  ✗ Logout locks vault and prevents previous user vault from remaining accessible:', err);
  }

  // Test 8: Account switching locks previous vault, wipes runtime data, and isolates accounts
  try {
    // 1. User Alice initializes vault
    await vaultRuntimeService.handleAccountChanged('user-alice-1', { broadcast: false });
    const aliceInit = await vaultRuntimeService.initializeVault('AlicePassword123!', fastIterations);
    assert(aliceInit.success === true, 'Alice vault initialized');
    await vaultRuntimeService.createRecord({
      title: 'Alice Confidential Record',
      username: 'alice@matrix.test',
      password: 'Alice-Secret-Password!',
      url: 'https://alice.internal',
      notes: 'Secret financial keys',
      strengthScore: 90,
    });
    assert(vaultRuntimeService.isUnlocked() === true, 'Alice vault is unlocked');

    // 2. Account switches to Bob
    await vaultRuntimeService.handleAccountChanged('user-bob-2', { broadcast: false });

    // Alice vault MUST be locked immediately
    assert(vaultRuntimeService.isUnlocked() === false, 'Vault must be locked on account switch');
    const bobSnapshot = vaultRuntimeService.getSensitiveStateSnapshot();
    assert(bobSnapshot.hasKey === false, 'Alice VaultKey must be wiped from memory');
    assert(bobSnapshot.decryptedCacheSize === 0, 'Alice decrypted records must be wiped');
    assert(bobSnapshot.userId === 'user-bob-2', 'Active user must be Bob');

    // Bob cannot unlock with Alice password or see Alice records
    let bobUnlockFailed = false;
    const bobUnlock = await vaultRuntimeService.unlock('AlicePassword123!');
    if (!bobUnlock.success) {
      bobUnlockFailed = true;
    }
    assert(bobUnlockFailed, 'Bob must not be able to unlock Alice vault');

    results.push({ name: 'Account switching locks previous vault and isolates users', passed: true });
    console.log('  ✓ Account switching locks previous vault and isolates users');
  } catch (err) {
    results.push({ name: 'Account switching locks previous vault and isolates users', passed: false, error: err });
    console.error('  ✗ Account switching locks previous vault and isolates users:', err);
  }

  // Test 9: Cross-tab lock works via BroadcastChannel
  try {
    // 1. Set up a simulated remote tab using BroadcastChannel
    const remoteTabChannel = new BroadcastChannel(VAULT_BROADCAST_CHANNEL);

    // Clear and initialize vault on Tab 1
    await clearLocalVaultStorage();
    await vaultRuntimeService.initializeVault(testPassword, fastIterations);
    assert(vaultRuntimeService.isUnlocked() === true, 'Tab 1 vault should be unlocked');

    // 2. Simulate Tab 2 broadcasting LOCK_VAULT
    const lockMessage: VaultBroadcastMessage = {
      type: 'LOCK_VAULT',
      timestamp: Date.now(),
    };
    remoteTabChannel.postMessage(lockMessage);

    // Allow broadcast message tick to be processed by Tab 1
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Tab 1 should now be locked!
    assert(vaultRuntimeService.getState() === 'locked', 'Tab 1 must lock on LOCK_VAULT broadcast');
    assert(vaultRuntimeService.isUnlocked() === false, 'Tab 1 isUnlocked() must be false');
    assert(vaultRuntimeService.getSensitiveStateSnapshot().hasKey === false, 'Tab 1 volatile key must be null');

    remoteTabChannel.close();

    results.push({ name: 'Cross-tab lock works via BroadcastChannel', passed: true });
    console.log('  ✓ Cross-tab lock works via BroadcastChannel');
  } catch (err) {
    results.push({ name: 'Cross-tab lock works via BroadcastChannel', passed: false, error: err });
    console.error('  ✗ Cross-tab lock works via BroadcastChannel:', err);
  }

  // Test 10: Broadcast messages NEVER transmit the VaultKey or plaintext credentials
  try {
    const interceptedMessages: any[] = [];
    const monitorChannel = new BroadcastChannel(VAULT_BROADCAST_CHANNEL);
    monitorChannel.onmessage = (event) => {
      interceptedMessages.push(event.data);
    };

    // Unlock and lock with broadcasting enabled
    await vaultRuntimeService.unlock(testPassword);
    vaultRuntimeService.lock({ broadcast: true });

    // Allow event to dispatch
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert(interceptedMessages.length > 0, 'Should have intercepted broadcast message');
    for (const msg of interceptedMessages) {
      assert(typeof msg.type === 'string', 'Message must have a type');
      assert(
        ['LOCK_VAULT', 'LOGOUT', 'ACCOUNT_CHANGED'].includes(msg.type),
        `Message type must be allowed: ${msg.type}`
      );
      // STRICT CHECK: Ensure ZERO keys, passwords, or data in broadcast message
      assert(msg.key === undefined, 'Must not contain key');
      assert(msg.vaultKey === undefined, 'Must not contain vaultKey');
      assert(msg.password === undefined, 'Must not contain password');
      assert(msg.masterPassword === undefined, 'Must not contain masterPassword');
      assert(msg.ciphertext === undefined, 'Must not contain ciphertext');
      assert(msg.payload === undefined, 'Must not contain payload');
    }

    monitorChannel.close();

    results.push({ name: 'BroadcastChannel NEVER transmits VaultKey or plaintext secrets', passed: true });
    console.log('  ✓ BroadcastChannel NEVER transmits VaultKey or plaintext secrets');
  } catch (err) {
    results.push({ name: 'BroadcastChannel NEVER transmits VaultKey or plaintext secrets', passed: false, error: err });
    console.error('  ✗ BroadcastChannel NEVER transmits VaultKey or plaintext secrets:', err);
  }

  console.log('------------------------------------------------------');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Results: ${passed} passed, ${failed} failed (${results.length} total)`);
  console.log('------------------------------------------------------');

  vaultRuntimeService.closeChannel();
  return failed === 0;
}

// Vitest Suite Integration
import { describe, it, expect } from 'vitest';

describe('Runtime State & Unlock Layer', () => {
  it('runs all runtime tests successfully', async () => {
    const success = await runTests();
    expect(success).toBe(true);
  });
});

if (typeof process !== 'undefined' && process.argv && process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  runTests().then((success) => {
    if (!success) {
      process.exit(1);
    }
  }).catch((err) => {
    console.error('Runtime test execution fatal error:', err);
    process.exit(1);
  });
}
