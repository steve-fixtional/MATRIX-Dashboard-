/**
 * MATRIX Password Vault - React Context & State Hook
 * 
 * Provides reactive vault state to the UI without ever putting
 * the CryptoKey or plaintext passwords into React state.
 * 
 * Synchronizes with AuthContext for automatic locking on logout
 * and account isolation on user change.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  VaultRuntimeState,
  VaultRecordPayload,
  StoredVaultRecord,
  EncryptedVaultBackup,
} from '../domain/vaultTypes';
import { vaultRuntimeService } from '../services/vault/vaultRuntimeService';
import {
  vaultAutoLockService,
  DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
} from '../services/vault/vaultAutoLockService';
import {
  copyPasswordWithAutoClear,
  subscribeClipboardCountdown,
  cancelPendingClipboardClear,
} from '../services/vault/vaultClipboardService';
import {
  downloadVaultBackupFile,
  validateVaultBackupStructure,
  verifyBackupDecryptability,
  restoreEncryptedVaultFromBackup,
  BackupVerificationResult,
} from '../services/vault/vaultBackupService';
import { useAuth } from './AuthContext';

export interface VaultContextValue {
  /** Current lifecycle state: uninitialized | locked | unlocking | unlocked | locking | error */
  state: VaultRuntimeState;
  /** Active user-safe error message, if any */
  error: string | null;
  /** Whether the vault is currently unlocked */
  isUnlocked: boolean;
  /** Whether the vault is currently locked */
  isLocked: boolean;
  /** Whether the vault has not yet been initialized */
  isUninitialized: boolean;
  /** Inactivity auto-lock timeout in minutes */
  inactivityTimeout: number;
  /** Sets the inactivity auto-lock timeout */
  setInactivityTimeout: (minutes: number) => void;
  /** Whether Strict Visibility Mode is enabled (locks on tab switch) */
  strictVisibility: boolean;
  /** Toggles Strict Visibility Mode */
  setStrictVisibility: (enabled: boolean) => void;
  /** Clipboard countdown remaining seconds (null if no active copied password timer) */
  clipboardCountdown: number | null;
  /** Copies a password with best-effort 45-second auto-clear */
  copyPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  /** Manually cancels any pending clipboard clear */
  cancelClipboardClear: () => void;
  /** Manually records meaningful user interaction to refresh auto-lock timer */
  recordActivity: () => void;
  /** Unlocks the vault with the supplied master password */
  unlock: (masterPassword: string) => Promise<{ success: boolean; error?: string }>;
  /** Central lock function */
  lock: () => void;
  /** Initializes a new primary vault */
  initializeVault: (masterPassword: string, iterations?: number) => Promise<{ success: boolean; error?: string }>;
  /** Refreshes vault status */
  refreshStatus: () => Promise<VaultRuntimeState>;
  /** Decrypted record operations (active only when unlocked) */
  listRecords: () => Promise<Array<{ id: string; payload: VaultRecordPayload; createdAt: number; updatedAt: number }>>;
  getRecord: (id: string) => Promise<VaultRecordPayload>;
  createRecord: (payload: VaultRecordPayload) => Promise<StoredVaultRecord>;
  updateRecord: (id: string, payload: VaultRecordPayload) => Promise<StoredVaultRecord>;
  deleteRecord: (id: string) => Promise<void>;
  searchRecords: (query: string) => Promise<Array<{ id: string; payload: VaultRecordPayload }>>;
  clearSearch: () => void;
  rekey: (currentPassword: string, newPassword: string, newIterations?: number) => Promise<void>;
  changeMasterPassword: (newPassword: string, options?: { newIterations?: number }) => Promise<{ success: boolean; error?: string }>;
  /** Encrypted Backup & Restore Operations */
  exportVaultBackup: () => Promise<{ filename: string; recordCount: number }>;
  validateBackupFile: (content: string) => EncryptedVaultBackup;
  verifyBackup: (backup: EncryptedVaultBackup, masterPassword: string) => Promise<BackupVerificationResult>;
  restoreBackup: (verified: BackupVerificationResult, confirmationKeyword: string) => Promise<{ recordCount: number }>;
  /** Explicit destructive hard reset */
  hardReset: (confirmationKeyword: string) => Promise<{ success: boolean; error?: string }>;
}

const VaultContext = createContext<VaultContextValue | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<VaultRuntimeState>(vaultRuntimeService.getState());
  const [error, setError] = useState<string | null>(vaultRuntimeService.getError());
  const [inactivityTimeout, setInactivityTimeoutState] = useState<number>(() =>
    vaultAutoLockService.getInactivityTimeout()
  );
  const [strictVisibility, setStrictVisibilityState] = useState<boolean>(() =>
    vaultAutoLockService.getStrictVisibility()
  );
  const [clipboardCountdown, setClipboardCountdown] = useState<number | null>(null);

  // Initialize auto-lock service on mount
  useEffect(() => {
    vaultAutoLockService.initialize();
  }, []);

  // Listen to clipboard countdown
  useEffect(() => {
    const unsub = subscribeClipboardCountdown((remaining) => {
      setClipboardCountdown(remaining);
    });
    return unsub;
  }, []);

  // Listen to runtime service state transitions
  useEffect(() => {
    const unsubscribe = vaultRuntimeService.subscribe((newState, newError) => {
      setState(newState);
      setError(newError);
    });
    return unsubscribe;
  }, []);

  // Synchronize vault with authentication state
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // User logged out: lock vault and clear previous user's vault runtime data
      vaultRuntimeService.handleLogout().catch((err) => {
        console.error('[VaultProvider] Logout sync error:', err);
      });
    } else {
      // User authenticated or switched
      vaultRuntimeService.handleAccountChanged(user.uid).catch((err) => {
        console.error('[VaultProvider] Account change sync error:', err);
      });
    }
  }, [user?.uid, authLoading]);

  const setInactivityTimeout = useCallback((minutes: number) => {
    vaultAutoLockService.setInactivityTimeout(minutes);
    setInactivityTimeoutState(minutes);
  }, []);

  const setStrictVisibility = useCallback((enabled: boolean) => {
    vaultAutoLockService.setStrictVisibility(enabled);
    setStrictVisibilityState(enabled);
  }, []);

  const copyPassword = useCallback(async (password: string) => {
    vaultAutoLockService.recordActivity();
    return copyPasswordWithAutoClear(password);
  }, []);

  const cancelClipboardClearCallback = useCallback(() => {
    cancelPendingClipboardClear();
  }, []);

  const recordActivity = useCallback(() => {
    vaultAutoLockService.recordActivity();
  }, []);

  const unlock = useCallback(async (masterPassword: string) => {
    return vaultRuntimeService.unlock(masterPassword);
  }, []);

  const lock = useCallback(() => {
    vaultRuntimeService.lock();
  }, []);

  const initializeVault = useCallback(async (masterPassword: string, iterations?: number) => {
    return vaultRuntimeService.initializeVault(masterPassword, iterations);
  }, []);

  const refreshStatus = useCallback(async () => {
    return vaultRuntimeService.checkStatus();
  }, []);

  const listRecords = useCallback(async () => {
    return vaultRuntimeService.listDecryptedRecords();
  }, []);

  const getRecord = useCallback(async (id: string) => {
    return vaultRuntimeService.getDecryptedRecord(id);
  }, []);

  const createRecord = useCallback(async (payload: VaultRecordPayload) => {
    return vaultRuntimeService.createRecord(payload);
  }, []);

  const updateRecord = useCallback(async (id: string, payload: VaultRecordPayload) => {
    return vaultRuntimeService.updateRecord(id, payload);
  }, []);

  const deleteRecord = useCallback(async (id: string) => {
    return vaultRuntimeService.deleteRecord(id);
  }, []);

  const searchRecords = useCallback(async (query: string) => {
    return vaultRuntimeService.searchSensitiveRecords(query);
  }, []);

  const clearSearch = useCallback(() => {
    vaultRuntimeService.clearSensitiveSearch();
  }, []);

  const rekey = useCallback(async (currentPassword: string, newPassword: string, newIterations?: number) => {
    return vaultRuntimeService.rekey(currentPassword, newPassword, newIterations);
  }, []);

  const changeMasterPassword = useCallback(async (newPassword: string, options?: { newIterations?: number }) => {
    try {
      await vaultRuntimeService.changeMasterPassword(newPassword, options);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to change Master Password.' };
    }
  }, []);

  const exportVaultBackup = useCallback(async () => {
    return downloadVaultBackupFile();
  }, []);

  const validateBackupFile = useCallback((content: string) => {
    return validateVaultBackupStructure(content);
  }, []);

  const verifyBackup = useCallback(async (backup: EncryptedVaultBackup, masterPassword: string) => {
    return verifyBackupDecryptability(backup, masterPassword);
  }, []);

  const restoreBackup = useCallback(async (verified: BackupVerificationResult, confirmationKeyword: string) => {
    const result = await restoreEncryptedVaultFromBackup(verified, confirmationKeyword);
    await refreshStatus();
    return result;
  }, [refreshStatus]);

  const hardReset = useCallback(async (confirmationKeyword: string) => {
    try {
      await vaultRuntimeService.hardResetVault(confirmationKeyword, user?.uid);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [user?.uid]);

  const value = useMemo<VaultContextValue>(() => ({
    state,
    error,
    isUnlocked: state === 'unlocked',
    isLocked: state === 'locked',
    isUninitialized: state === 'uninitialized',
    inactivityTimeout,
    setInactivityTimeout,
    strictVisibility,
    setStrictVisibility,
    clipboardCountdown,
    copyPassword,
    cancelClipboardClear: cancelClipboardClearCallback,
    recordActivity,
    unlock,
    lock,
    initializeVault,
    refreshStatus,
    listRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    searchRecords,
    clearSearch,
    rekey,
    changeMasterPassword,
    exportVaultBackup,
    validateBackupFile,
    verifyBackup,
    restoreBackup,
    hardReset,
  }), [
    state,
    error,
    inactivityTimeout,
    setInactivityTimeout,
    strictVisibility,
    setStrictVisibility,
    clipboardCountdown,
    copyPassword,
    cancelClipboardClearCallback,
    recordActivity,
    unlock,
    lock,
    initializeVault,
    refreshStatus,
    listRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
    searchRecords,
    clearSearch,
    rekey,
    changeMasterPassword,
    exportVaultBackup,
    validateBackupFile,
    verifyBackup,
    restoreBackup,
    hardReset,
  ]);

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
