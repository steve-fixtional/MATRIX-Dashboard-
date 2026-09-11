/**
 * MATRIX Password Vault - Encrypted Vault Backup & Restore Modal
 * 
 * Provides:
 * - Encrypted JSON Export with zero-knowledge verification
 * - Prominent Security Warning regarding encrypted vault backup protection
 * - Step-by-step Import flow:
 *     Step 1: Schema & Cryptographic Structure Validation
 *     Step 2: Pre-replacement Decryptability Verification (Master Password test)
 *     Step 3: Explicit Destructive Replacement Confirmation ('RESTORE' keyword)
 * - Safe data-only handling (no execution of imported content)
 */

import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  X,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useVault } from '../../store/VaultContext';
import {
  EncryptedVaultBackup,
  VaultBackupValidationError,
  IncorrectMasterPasswordError,
  CorruptedEVKError,
  CorruptedRecordError,
  UnsupportedVaultVersionError,
} from '../../domain/vaultTypes';
import { BackupVerificationResult } from '../../services/vault/vaultBackupService';
import { Button } from '../ui/Button';

interface VaultBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess?: () => void;
  initialTab?: 'export' | 'import';
}

export function VaultBackupModal({
  isOpen,
  onClose,
  onRestoreSuccess,
  initialTab = 'export',
}: VaultBackupModalProps) {
  const {
    exportVaultBackup,
    validateBackupFile,
    verifyBackup,
    restoreBackup,
    isUninitialized,
  } = useVault();

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessInfo, setExportSuccessInfo] = useState<{ filename: string; recordCount: number } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Import flow state
  // Step 1: File selection & structural validation
  const [importedBackup, setImportedBackup] = useState<EncryptedVaultBackup | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Step 2: Decryptability verification
  const [backupPassword, setBackupPassword] = useState('');
  const [showBackupPassword, setShowBackupPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<BackupVerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Step 3: Destructive replacement confirmation
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Reset import flow
  const resetImportFlow = () => {
    setImportedBackup(null);
    setFileName(null);
    setImportError(null);
    setBackupPassword('');
    setVerifiedResult(null);
    setVerificationError(null);
    setConfirmationInput('');
    setIsRestoring(false);
    setRestoreSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccessInfo(null);
    try {
      const res = await exportVaultBackup();
      setExportSuccessInfo(res);
    } catch (err: any) {
      setExportError(err?.message || 'Failed to export encrypted vault backup.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection and Step 1 structural validation
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    resetImportFlow();
    setFileName(file.name);
    setIsParsing(true);

    try {
      const content = await file.text();
      const validated = validateBackupFile(content);
      setImportedBackup(validated);
      setImportError(null);
    } catch (err: any) {
      setImportedBackup(null);
      if (err instanceof VaultBackupValidationError) {
        setImportError(err.message);
      } else if (err instanceof UnsupportedVaultVersionError) {
        setImportError(err.message);
      } else {
        setImportError('Invalid backup file: Structure validation failed.');
      }
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Step 2 decryptability verification
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importedBackup || !backupPassword || isVerifying) return;

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const result = await verifyBackup(importedBackup, backupPassword);
      setVerifiedResult(result);
    } catch (err: any) {
      setVerifiedResult(null);
      if (err instanceof IncorrectMasterPasswordError) {
        setVerificationError('Incorrect Master Password for this backup. Please verify and try again.');
      } else if (err instanceof CorruptedRecordError || err instanceof CorruptedEVKError) {
        setVerificationError(`Integrity Failure: ${err.message}`);
      } else {
        setVerificationError(err?.message || 'Verification failed. Could not decrypt backup.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle Step 3 destructive replacement
  const handlePerformRestore = async () => {
    if (!verifiedResult || confirmationInput.trim() !== 'RESTORE' || isRestoring) return;

    setIsRestoring(true);
    try {
      await restoreBackup(verifiedResult, 'RESTORE');
      setRestoreSuccess(true);
      setTimeout(() => {
        onRestoreSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setVerificationError(err?.message || 'Failed to restore vault from backup.');
      setIsRestoring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-backup-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 id="vault-backup-modal-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Encrypted Vault Backup & Restore
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Zero-knowledge backup file management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Prominent Mandatory Security Warning */}
        <div className="mx-6 mt-4 p-3.5 rounded-xl border border-amber-300/80 bg-amber-50 dark:border-amber-800/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold block">Security Notice: Protect Your Backup</strong>
              <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                This backup contains your encrypted vault material (ciphertext, KDF parameters, and EVK). While it cannot be decrypted without your Master Password, it should still be safeguarded. Never store backups in unencrypted public locations or share them insecurely.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-6 pt-3 border-b border-neutral-200 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            disabled={isUninitialized}
            className={`flex items-center gap-2 pb-2.5 text-xs font-medium border-b-2 transition-colors mr-6 ${
              activeTab === 'export'
                ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            } ${isUninitialized ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Backup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 pb-2.5 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import & Restore</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'export' ? (
            /* EXPORT TAB */
            <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  Export Encrypted Vault Backup
                </h3>
                <p className="leading-relaxed">
                  Generate an encrypted JSON backup file. All entries remain fully protected by AES-256-GCM encryption and your Master Password.
                </p>
              </div>

              {/* Zero-knowledge Guarantees Box */}
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2">
                <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Backup Content Guarantees</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="space-y-1">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300 block">Contains:</span>
                    <ul className="list-disc list-inside text-neutral-500 dark:text-neutral-400 space-y-0.5">
                      <li>Vault version & KDF parameters</li>
                      <li>Encrypted Vault Key (EVK) & IV</li>
                      <li>Encrypted record ciphertexts & IVs</li>
                      <li>Record IDs & version metadata</li>
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300 block">NEVER Contains:</span>
                    <ul className="list-disc list-inside text-rose-600 dark:text-rose-400 space-y-0.5 font-medium">
                      <li>No Master Password</li>
                      <li>No Master Key</li>
                      <li>No plaintext Vault Key</li>
                      <li>No plaintext passwords, notes, or URLs</li>
                    </ul>
                  </div>
                </div>
              </div>

              {exportSuccessInfo && (
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Backup downloaded successfully!</span>
                  </div>
                  <p className="text-[11px] mt-1 text-emerald-700 dark:text-emerald-300">
                    File: <code className="font-mono">{exportSuccessInfo.filename}</code> ({exportSuccessInfo.recordCount} records encrypted)
                  </p>
                </div>
              )}

              {exportError && (
                <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span>{exportError}</span>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                onClick={handleExport}
                disabled={isExporting}
                className="w-full gap-2 font-medium"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Assembling Encrypted Backup...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Download Encrypted Backup (.json)</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* IMPORT TAB */
            <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-400">
              {/* Step 1: Select File */}
              {!importedBackup && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      Step 1: Select Backup File
                    </h3>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Select an encrypted MATRIX backup file (<code className="font-mono text-[11px]">.json</code>). The file will be structurally validated before any changes occur.
                    </p>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-neutral-50/50 dark:bg-neutral-800/20"
                  >
                    <Upload className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
                    <div>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                        Click to choose a backup file
                      </span>
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                        Accepts .json backup files
                      </p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {isParsing && (
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                      <RefreshCw className="h-4 w-4 animate-spin text-neutral-500" />
                      <span>Validating cryptographic schema and integrity...</span>
                    </div>
                  )}

                  {importError && (
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold block">Validation Error: File Rejected</strong>
                          <p className="text-[11px] mt-0.5">{importError}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Verification of Decryptability */}
              {importedBackup && !verifiedResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-emerald-600" />
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {fileName || 'Backup File'}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {importedBackup.records.length} encrypted records • PBKDF2 {importedBackup.kdf.iterations.toLocaleString()} iterations
                        </div>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={resetImportFlow}>
                      Change File
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                      Step 2: Verify Backup Decryptability
                    </h3>
                    <p className="text-neutral-500 dark:text-neutral-400">
                      Enter the Master Password that was used when this backup was created. The vault will test decryption in memory without modifying your current vault.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyPassword} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Backup Master Password
                      </label>
                      <div className="relative">
                        <input
                          type={showBackupPassword ? 'text' : 'password'}
                          value={backupPassword}
                          onChange={(e) => setBackupPassword(e.target.value)}
                          placeholder="Enter Master Password for this backup..."
                          className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBackupPassword(!showBackupPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          {showBackupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {verificationError && (
                      <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 text-red-700 dark:text-red-300">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-semibold block">Decryption Failed</strong>
                            <p className="text-[11px] mt-0.5">{verificationError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!backupPassword.trim() || isVerifying}
                      className="w-full gap-2 font-medium"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Verifying EVK & Record Integrity...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Verify Decryption</span>
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              )}

              {/* Step 3: Explicit Destructive Replacement */}
              {verifiedResult && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <span>Decryption Verified</span>
                    </div>
                    <p className="text-xs mt-1 text-emerald-800 dark:text-emerald-300">
                      Successfully verified Master Password, EVK unwrapping, and record integrity for {verifiedResult.recordCount} items.
                    </p>
                  </div>

                  {/* Destructive Replacement Warning */}
                  <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-sm text-rose-800 dark:text-rose-300">
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                      <span>Destructive Replacement Confirmation</span>
                    </div>
                    <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                      Restoring this backup will permanently overwrite and replace your current local vault. This action cannot be reversed.
                    </p>
                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-rose-900 dark:text-rose-200 uppercase tracking-wider mb-1">
                        Type 'RESTORE' to confirm:
                      </label>
                      <input
                        type="text"
                        value={confirmationInput}
                        onChange={(e) => setConfirmationInput(e.target.value)}
                        placeholder="RESTORE"
                        className="flex h-10 w-full rounded-lg border border-rose-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-rose-600 dark:border-rose-800 dark:bg-neutral-950 dark:text-neutral-100"
                      />
                    </div>
                  </div>

                  {restoreSuccess && (
                    <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Vault successfully restored! Updating session...</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetImportFlow}
                      disabled={isRestoring}
                      className="w-1/3"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handlePerformRestore}
                      disabled={confirmationInput.trim() !== 'RESTORE' || isRestoring || restoreSuccess}
                      className="w-2/3 gap-2 font-medium"
                    >
                      {isRestoring ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Replacing Vault...</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4" />
                          <span>Replace Existing Vault</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
