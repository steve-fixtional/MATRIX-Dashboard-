/**
 * MATRIX Password Vault - Initialization Setup View
 * 
 * Allows setting up a new Master Password when the vault is uninitialized.
 * Communicates zero-knowledge recovery boundaries and validates key strength.
 */

import React, { useState } from 'react';
import { ShieldAlert, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { useVault } from '../../store/VaultContext';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { calculatePasswordStrength } from '../../utils/vaultSecurity';
import { VaultBackupModal } from './VaultBackupModal';

interface VaultInitViewProps {
  onInitSuccess?: () => void;
}

export function VaultInitView({ onInitSuccess }: VaultInitViewProps) {
  const { initializeVault } = useVault();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acknowledgedNoRecovery, setAcknowledgedNoRecovery] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  const strength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!acknowledgedNoRecovery) {
      setError('You must acknowledge that your Master Password cannot be recovered by MATRIX before continuing.');
      return;
    }

    if (password.length < 10) {
      setError('Master Password must be at least 10 characters for adequate security.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await initializeVault(password);
      if (res.success) {
        setPassword('');
        setConfirmPassword('');
        onInitSuccess?.();
      } else {
        setError(res.error || 'Failed to initialize password vault.');
      }
    } catch {
      setError('An unexpected error occurred while initializing the vault.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full px-4 py-8">
      <Card className="w-full max-w-md border-neutral-200/80 bg-white/95 dark:border-neutral-800/80 dark:bg-neutral-900/90 shadow-sm backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 px-6 sm:px-8 flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-5 text-neutral-700 dark:text-neutral-300">
            <KeyRound className="h-7 w-7" />
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 mb-1.5">
            Initialize MATRIX Vault
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 max-w-xs">
            Create a strong Master Password to secure your credentials with end-to-end zero-knowledge encryption.
          </p>

          {/* Zero Recovery Warning & Explicit Acknowledgement */}
          <div className="w-full mb-6 rounded-xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-800/80 dark:bg-amber-950/40 p-4 text-left space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1">
                <span className="font-semibold text-xs text-amber-950 dark:text-amber-100 block">
                  Zero-Recovery Architecture
                </span>
                <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200 font-medium">
                  Your Master Password cannot be recovered by MATRIX. If you forget it and do not have a usable backup, your encrypted vault cannot be decrypted.
                </p>
              </div>
            </div>

            <label
              htmlFor="vault-ack-no-recovery"
              className="flex items-start gap-2.5 pt-2.5 border-t border-amber-200/80 dark:border-amber-900/50 cursor-pointer select-none group"
            >
              <input
                type="checkbox"
                id="vault-ack-no-recovery"
                checked={acknowledgedNoRecovery}
                onChange={(e) => setAcknowledgedNoRecovery(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-amber-400 text-neutral-900 focus:ring-neutral-900 dark:border-amber-700 dark:bg-neutral-900 cursor-pointer shrink-0"
              />
              <span className="text-xs text-amber-950 dark:text-amber-200 font-medium leading-normal">
                I acknowledge that my Master Password cannot be recovered by MATRIX, and without it or a backup, my encrypted vault cannot be decrypted.
              </span>
            </label>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
            <div>
              <label
                htmlFor="init-master-password"
                className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5"
              >
                Create Master Password
              </label>
              <div className="relative">
                <input
                  id="init-master-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 10 characters..."
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  className="flex h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 pr-11 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={isSubmitting}
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500 dark:text-neutral-400">Strength:</span>
                    <span className={`font-medium ${strength.textClass}`}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${strength.bgClass}`}
                      style={{ width: `${strength.widthPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="init-confirm-password"
                className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5"
              >
                Confirm Master Password
              </label>
              <input
                id="init-confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Master Password..."
                autoComplete="new-password"
                disabled={isSubmitting}
                className="flex h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:ring-neutral-400"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={!password.trim() || !confirmPassword.trim() || !acknowledgedNoRecovery || isSubmitting}
              className="w-full gap-2 font-medium"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  <span>Configuring Cryptographic Engine...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Set Up Vault</span>
                </>
              )}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsBackupModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 underline transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Or restore an existing encrypted backup file</span>
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <VaultBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        initialTab="import"
        onRestoreSuccess={onInitSuccess}
      />
    </div>
  );
}
