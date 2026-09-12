import React, { useState, useEffect } from 'react';
import { Edit3, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { validateFolderName, MAX_FOLDER_NAME_LENGTH } from '../../services/fileService';

interface FileRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  isFolder?: boolean;
  existingSiblingNames?: string[];
  onRename: (newName: string) => Promise<void>;
}

export function FileRenameModal({
  isOpen,
  onClose,
  currentName,
  isFolder = false,
  existingSiblingNames = [],
  onRename,
}: FileRenameModalProps) {
  const [name, setName] = useState(currentName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(currentName);
    setError(null);
  }, [currentName, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    const trimmed = val.trim();

    if (!trimmed) {
      setError(null);
      return;
    }

    if (isFolder) {
      const otherNames = existingSiblingNames.filter(
        (n) => n.toLowerCase() !== currentName.toLowerCase()
      );
      const validation = validateFolderName(trimmed, otherNames);
      if (!validation.valid) {
        setError(validation.error || 'Invalid name');
        return;
      }
    } else {
      if (trimmed.length > 255) {
        setError('File name cannot exceed 255 characters');
        return;
      }
      if (/[\/\\:*?"<>|]/.test(trimmed)) {
        setError('File name cannot contain / \\ : * ? " < > |');
        return;
      }
    }

    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError('Name cannot be empty');
      return;
    }

    if (trimmed === currentName.trim()) {
      onClose();
      return;
    }

    if (isFolder) {
      const otherNames = existingSiblingNames.filter(
        (n) => n.toLowerCase() !== currentName.toLowerCase()
      );
      const validation = validateFolderName(trimmed, otherNames);
      if (!validation.valid) {
        setError(validation.error || 'Invalid folder name');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      await onRename(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to rename');
    } finally {
      setSubmitting(false);
    }
  };

  const isNameEmpty = !name.trim();
  const isTooLong = name.trim().length > MAX_FOLDER_NAME_LENGTH;
  const isSubmitDisabled = submitting || isNameEmpty || Boolean(error) || isTooLong;

  return (
    <div
      id="rename-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="rename-modal"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              <Edit3 className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Rename {isFolder ? 'Folder' : 'File'}
            </h2>
          </div>
          <button
            id="rename-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="rename-input"
                className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              >
                New Name
              </label>
              <span
                className={`text-[11px] tabular-nums ${
                  name.length > MAX_FOLDER_NAME_LENGTH
                    ? 'text-red-500 font-semibold'
                    : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {name.length}/{MAX_FOLDER_NAME_LENGTH}
              </span>
            </div>

            <Input
              id="rename-input"
              autoFocus
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={submitting}
              className={error ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : ''}
            />

            {error && (
              <div id="rename-error-msg" className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5 animate-in fade-in duration-100">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              id="rename-cancel-btn"
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              id="rename-submit-btn"
              type="submit"
              variant="primary"
              disabled={isSubmitDisabled}
            >
              {submitting ? 'Renaming...' : 'Rename'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
