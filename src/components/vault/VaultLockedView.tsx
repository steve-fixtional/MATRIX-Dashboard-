/**
 * MATRIX Password Vault - Locked View
 * 
 * Displays the locked status, Master Password input with visibility toggle,
 * unlock action, error handling, and strict security mode indicator.
 * Zero decrypted vault data is present in this state.
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import { useVault } from '../../store/VaultContext';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { VaultHardResetModal } from './VaultHardResetModal';
import { VaultBackupModal } from './VaultBackupModal';

interface VaultLockedViewProps {
  onUnlockSuccess?: () => void;
}

export function VaultLockedView({ onUnlockSuccess }: VaultLockedViewProps) {
  const { unlock, error: vaultError, state, inactivityTimeout, strictVisibility } = useVault();
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showStrictDetails, setShowStrictDetails] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setLocalError(null);

    try {
      const res = await unlock(masterPassword);
      if (res.success) {
        setMasterPassword('');
        setShowPassword(false);
        onUnlockSuccess?.();
      } else {
        setLocalError(res.error || 'Incorrect master password. Please verify and try again.');
      }
    } catch {
      setLocalError('An error occurred during vault decryption. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || vaultError;
  const isUnlocking = state === 'unlocking' || isSubmitting;

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full px-4 py-8">
      <Card className="w-full max-w-md border-neutral-200/80 bg-white/95 dark:border-neutral-800/80 dark:bg-neutral-900/90 shadow-sm backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 px-6 sm:px-8 flex flex-col items-center text-center">
          {/* Status Icon */}
          <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-5 text-neutral-700 dark:text-neutral-300">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1.5">
            MATRIX Password Vault
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-xs">
            Your encrypted vault is currently locked. Enter your Master Password to derive your session keys.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
            <div>
              <label
                htmlFor="vault-master-password"
                className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5"
              >
                Master Password
              </label>
              <div className="relative">
                <input
                  id="vault-master-password"
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Enter Master Password..."
                  autoComplete="current-password"
                  autoFocus
                  disabled={isUnlocking}
                  className="flex h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-400 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isUnlocking}
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {displayError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{displayError}</span>
              </div>
            )}

            {/* Unlock Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!masterPassword.trim() || isUnlocking}
              className="w-full gap-2 font-medium"
            >
              {isUnlocking ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Deriving Session Keys...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Unlock Vault</span>
                </>
              )}
            </Button>
          </form>

          {/* Strict Security Mode Indicator */}
          <div className="w-full mt-6 pt-5 border-t border-neutral-100 dark:border-neutral-800/80">
            <button
              type="button"
              onClick={() => setShowStrictDetails(!showStrictDetails)}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Strict Security Mode
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Enforced
                </span>
              </div>
              <span className="text-xs text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
                {showStrictDetails ? 'Hide' : 'Details'}
              </span>
            </button>

            {showStrictDetails && (
              <div className="mt-3 rounded-lg bg-neutral-50 dark:bg-neutral-950/60 p-3 text-left text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5 border border-neutral-200/60 dark:border-neutral-800/60 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span>Key Derivation:</span>
                  <span className="font-mono text-[11px] text-neutral-900 dark:text-neutral-200">
                    PBKDF2 (600,000 rounds)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data Encryption:</span>
                  <span className="font-mono text-[11px] text-neutral-900 dark:text-neutral-200">
                    AES-256-GCM (96-bit IV)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Inactivity Auto-Lock:</span>
                  <span className="font-mono text-[11px] text-neutral-900 dark:text-neutral-200">
                    {inactivityTimeout} minutes
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Strict Visibility Mode:</span>
                  <span className={`font-mono text-[11px] ${strictVisibility ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-neutral-500'}`}>
                    {strictVisibility ? 'Active (locks on tab switch)' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Architecture:</span>
                  <span className="font-mono text-[11px] text-neutral-900 dark:text-neutral-200">
                    Zero-Knowledge / Non-extractable
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-neutral-200/40 dark:border-neutral-800/40">
                  Session keys reside only in volatile memory and are purged upon lock, tab close, or logout.
                </p>
              </div>
            )}
          </div>

          {/* Recovery Assistance & Hard Reset */}
          <div className="w-full mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 text-center space-y-2">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Forgotten your Master Password?
            </p>
            <div className="flex items-center justify-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(true)}
                className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 underline transition-colors"
              >
                Restore from backup
              </button>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium underline transition-colors"
              >
                Hard reset vault
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              MATRIX does not store Master Passwords and cannot recover lost access.
            </p>
          </div>
        </CardContent>
      </Card>

      <VaultHardResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />

      <VaultBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        initialTab="import"
      />
    </div>
  );
}
