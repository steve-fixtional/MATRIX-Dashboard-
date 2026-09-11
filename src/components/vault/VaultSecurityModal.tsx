/**
 * MATRIX Password Vault - Security Settings Modal
 * 
 * Provides configuration for:
 * - Inactivity Auto-Lock duration (1m, 5m, 15m default, 30m, 60m)
 * - Strict Visibility Mode (auto-locks on tab switch / document.hidden)
 * - Clipboard auto-clearing transparency (45s best-effort notice)
 * - Accurate volatile memory disclaimer (no false physical RAM destruction claims)
 */

import React, { useState } from 'react';
import {
  Shield,
  Clock,
  EyeOff,
  Eye,
  ClipboardCheck,
  AlertTriangle,
  X,
  Check,
  KeyRound,
  Lock,
  Loader2,
  Download,
  Upload,
} from 'lucide-react';
import { useVault } from '../../store/VaultContext';
import { INACTIVITY_TIMEOUT_OPTIONS } from '../../services/vault/vaultAutoLockService';
import { Button } from '../ui/Button';
import { VaultHardResetModal } from './VaultHardResetModal';

interface VaultSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBackupModal?: (tab: 'export' | 'import') => void;
}

export function VaultSecurityModal({ isOpen, onClose, onOpenBackupModal }: VaultSecurityModalProps) {
  const {
    isUnlocked,
    inactivityTimeout,
    setInactivityTimeout,
    strictVisibility,
    setStrictVisibility,
    clipboardCountdown,
    cancelClipboardClear,
    changeMasterPassword,
  } = useVault();

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isHardResetModalOpen, setIsHardResetModalOpen] = useState(false);

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(false);

    if (newPassword.length < 8) {
      setPasswordChangeError('New Master Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Passwords do not match. Please verify.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await changeMasterPassword(newPassword);
      if (result.success) {
        setPasswordChangeSuccess(true);
        // Clear passwords immediately from React state (minimized memory lifetime)
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordSection(false);
          setPasswordChangeSuccess(false);
        }, 2500);
      } else {
        setPasswordChangeError(result.error || 'Failed to change Master Password.');
      }
    } catch (err: any) {
      setPasswordChangeError(err?.message || 'Failed to change Master Password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 flex items-center justify-center">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="security-modal-title"
                className="text-base font-semibold text-neutral-900 dark:text-neutral-100"
              >
                Vault Security Settings
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Configure auto-lock timers, tab privacy, and clipboard protections
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Inactivity Auto-Lock */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="inactivity-select"
                className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100"
              >
                <Clock className="h-4 w-4 text-neutral-500" />
                Inactivity Auto-Lock
              </label>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Default: 15 minutes
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Locks the vault and purges runtime decrypted data and key references after keyboard or mouse inactivity.
            </p>
            <select
              id="inactivity-select"
              value={inactivityTimeout}
              onChange={(e) => setInactivityTimeout(Number(e.target.value))}
              className="w-full h-10 px-3 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 text-neutral-900 dark:text-neutral-100"
            >
              {INACTIVITY_TIMEOUT_OPTIONS.map((min) => (
                <option key={min} value={min}>
                  {min} {min === 1 ? 'minute' : 'minutes'} {min === 15 ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="h-px bg-neutral-200/80 dark:bg-neutral-800/80" />

          {/* Strict Visibility Mode */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Strict Visibility Mode
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Immediately locks the vault whenever you switch away from this browser tab or minimize the window. Returning requires entering your Master Password again.
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={strictVisibility}
                onClick={() => setStrictVisibility(!strictVisibility)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 ${
                  strictVisibility
                    ? 'bg-neutral-900 dark:bg-neutral-100'
                    : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-900 shadow-lg ring-0 transition duration-200 ease-in-out ${
                    strictVisibility ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <div className="text-[11px] text-neutral-400 dark:text-neutral-500 italic">
              Note: Disabled by default for standard multitasking workflows.
            </div>
          </div>

          <div className="h-px bg-neutral-200/80 dark:bg-neutral-800/80" />

          {/* Clipboard Protections */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Clipboard Security
                </span>
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                45s auto-clear
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              When copying passwords, an automatic clear attempt is triggered after 45 seconds. MATRIX inspects clipboard content before clearing so that any newer content you copied in the meantime is never overwritten.
            </p>

            {clipboardCountdown !== null && clipboardCountdown > 0 && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-200">
                <span>Active clipboard timer: clearing in {clipboardCountdown}s</span>
                <button
                  type="button"
                  onClick={cancelClipboardClear}
                  className="font-medium underline hover:text-amber-950 dark:hover:text-amber-100"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="text-[11px] text-neutral-400 dark:text-neutral-500">
              * Clipboard clearing is best-effort. Browser permissions, background tab limits, or window focus can prevent clearing.
            </div>
          </div>

          <div className="h-px bg-neutral-200/80 dark:bg-neutral-800/80" />

          {/* Master Password Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Master Password
                </span>
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                Zero re-encryption
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Changing your Master Password re-encrypts the Vault Key under a fresh salt and new PBKDF2 Master Key. All vault records remain completely untouched.
            </p>

            {!isUnlocked ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-800/60 text-xs text-neutral-600 dark:text-neutral-400">
                <Lock className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <span>Vault is currently locked. Unlock your vault to change your Master Password.</span>
              </div>
            ) : !showPasswordSection ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordSection(true)}
                className="w-full justify-center"
              >
                Change Master Password
              </Button>
            ) : (
              <form onSubmit={handlePasswordChangeSubmit} className="space-y-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    New Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      disabled={isChangingPassword}
                      className="w-full h-9 pl-3 pr-9 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 text-neutral-900 dark:text-neutral-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Confirm New Master Password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new master password"
                    disabled={isChangingPassword}
                    className="w-full h-9 px-3 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-300 text-neutral-900 dark:text-neutral-100"
                  />
                </div>

                {passwordChangeError && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{passwordChangeError}</span>
                  </div>
                )}

                {passwordChangeSuccess && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5 shrink-0" />
                    <span>Master Password updated successfully!</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isChangingPassword}
                    onClick={() => {
                      setShowPasswordSection(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordChangeError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isChangingPassword || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Verifying & Updating...
                      </>
                    ) : (
                      'Update Master Password'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="h-px bg-neutral-200/80 dark:bg-neutral-800/80" />

          {/* Encrypted Vault Backup & Restore */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-neutral-500" />
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Encrypted Vault Backup
                </span>
              </div>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                Zero-knowledge
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Export an encrypted JSON file of your vault or restore an existing backup. Backups contain zero plaintext passwords, notes, or keys and require your Master Password to decrypt.
            </p>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenBackupModal?.('export');
                }}
                disabled={!isUnlocked}
                className="flex-1 gap-1.5 justify-center text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Backup</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenBackupModal?.('import');
                }}
                className="flex-1 gap-1.5 justify-center text-xs"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Import & Restore</span>
              </Button>
            </div>
          </div>

          <div className="h-px bg-neutral-200/80 dark:bg-neutral-800/80" />

          {/* Danger Zone: Hard Reset */}
          <div className="rounded-xl border border-red-200/90 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/25 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-950 dark:text-red-200 font-semibold text-xs">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>Danger Zone: Hard Reset</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200">
                Destructive
              </span>
            </div>
            <p className="text-xs text-red-900/90 dark:text-red-300/90 leading-relaxed">
              Permanently delete your encrypted vault, remove all local credentials and cloud synchronization for your account, wipe session keys from memory, and return the vault to an uninitialized state.
            </p>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => setIsHardResetModalOpen(true)}
              className="w-full justify-center text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              Hard Reset Vault...
            </Button>
          </div>

          <div className="h-px bg-neutral-200/80 dark:bg-neutral-800/80" />

          {/* Accurate Memory Disclaimer */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800/70 text-neutral-600 dark:text-neutral-400">
            <AlertTriangle className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="text-neutral-800 dark:text-neutral-200 font-medium">Volatile Memory Notice:</strong>{' '}
              Session keys and decrypted credentials exist strictly in temporary memory during active sessions and are dereferenced immediately upon lock. JavaScript environments cannot guarantee physical hardware RAM destruction due to engine garbage collection semantics.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-end">
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>

      <VaultHardResetModal
        isOpen={isHardResetModalOpen}
        onClose={() => setIsHardResetModalOpen(false)}
        onResetSuccess={() => {
          setIsHardResetModalOpen(false);
          onClose();
        }}
      />
    </div>
  );
}
