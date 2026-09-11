import React, { useState, useEffect } from 'react';
import { AlertOctagon, Loader2, X, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useVault } from '../../store/VaultContext';

interface VaultHardResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetSuccess?: () => void;
}

export function VaultHardResetModal({
  isOpen,
  onClose,
  onResetSuccess,
}: VaultHardResetModalProps) {
  const { hardReset } = useVault();
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfirmKeyword('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = confirmKeyword.trim().toUpperCase() === 'RESET';

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await hardReset(confirmKeyword);
      if (result.success) {
        onClose();
        if (onResetSuccess) {
          onResetSuccess();
        }
      } else {
        setError(result.error || 'Failed to hard reset the vault. Please try again.');
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hard-reset-title"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-red-200 dark:border-red-900/60 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Destructive Accent */}
        <div className="flex items-center justify-between p-5 border-b border-red-100 dark:border-red-950/60 bg-red-50/70 dark:bg-red-950/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="hard-reset-title"
                className="text-base font-semibold text-red-950 dark:text-red-100 leading-tight"
              >
                Hard Reset Encrypted Vault
              </h2>
              <p className="text-xs text-red-700 dark:text-red-400">
                Destructive, irreversible operation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-white/60 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content & Warning */}
        <form onSubmit={handleExecuteReset} className="p-5 space-y-4">
          <div className="rounded-xl border border-red-200/80 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/30 p-3.5 space-y-2">
            <div className="text-xs font-semibold text-red-900 dark:text-red-200 flex items-center gap-1.5">
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              This action cannot be undone
            </div>
            <ul className="text-xs text-red-800/90 dark:text-red-300/90 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>
                Deletes all local encrypted vault records and metadata from this device.
              </li>
              <li>
                Deletes remote encrypted vault records and metadata strictly for your authenticated account.
              </li>
              <li>
                Clears all in-memory cryptographic keys and decrypted session caches.
              </li>
              <li>
                Returns your vault to the uninitialized state.
              </li>
            </ul>
          </div>

          <div className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            MATRIX does not possess recovery keys or decryption backdoors. If you proceed, your vault will be permanently wiped.
          </div>

          {/* Strong Confirmation Input */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="hard-reset-confirm-input"
              className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block"
            >
              Type <strong className="text-red-600 dark:text-red-400 font-mono">RESET</strong> to confirm:
            </label>
            <input
              id="hard-reset-confirm-input"
              type="text"
              value={confirmKeyword}
              onChange={(e) => setConfirmKeyword(e.target.value)}
              placeholder="RESET"
              disabled={isSubmitting}
              autoComplete="off"
              autoFocus
              className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono uppercase text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-100 dark:bg-red-950/60 p-2.5 text-xs text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={!isConfirmed || isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Resetting Vault...
                </>
              ) : (
                'Permanently Reset Vault'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
