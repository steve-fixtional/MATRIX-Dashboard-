/**
 * MATRIX Password Vault - Delete Confirmation Dialog
 * 
 * Enforces deliberate user action before deleting an encrypted record.
 */

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  itemTitle: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  itemTitle,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
          <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h3 id="delete-dialog-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Delete Vault Entry?
          </h3>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
          Are you sure you want to permanently delete <strong className="text-neutral-900 dark:text-neutral-200 font-semibold">{itemTitle}</strong>? This action cannot be undone and the encrypted data will be purged.
        </p>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-1.5"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Delete Entry</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
