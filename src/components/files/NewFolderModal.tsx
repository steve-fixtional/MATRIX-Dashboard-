import React, { useState, useEffect } from 'react';
import { Folder, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { validateFolderName, MAX_FOLDER_NAME_LENGTH } from '../../services/fileService';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color?: string) => Promise<void>;
  currentLocationName?: string;
  existingFolderNames?: string[];
}

const FOLDER_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
];

export function NewFolderModal({
  isOpen,
  onClose,
  onCreate,
  currentLocationName = 'Files',
  existingFolderNames = [],
}: NewFolderModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelectedColor('');
      setError(null);
      setIsTouched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    setIsTouched(true);

    if (!val.trim()) {
      setError(null);
      return;
    }

    const validation = validateFolderName(val, existingFolderNames);
    if (!validation.valid) {
      setError(validation.error || 'Invalid folder name');
    } else {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    const validation = validateFolderName(trimmed, existingFolderNames);
    if (!validation.valid) {
      setError(validation.error || 'Invalid folder name');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onCreate(trimmed, selectedColor || undefined);
      setName('');
      setSelectedColor('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create folder');
    } finally {
      setSubmitting(false);
    }
  };

  const isNameEmpty = !name.trim();
  const isTooLong = name.trim().length > MAX_FOLDER_NAME_LENGTH;
  const isSubmitDisabled = submitting || isNameEmpty || Boolean(error) || isTooLong;

  return (
    <div
      id="new-folder-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="new-folder-modal"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition-colors"
              style={
                selectedColor
                  ? { backgroundColor: `${selectedColor}18`, color: selectedColor }
                  : undefined
              }
            >
              <Folder className="h-5 w-5" style={selectedColor ? { color: selectedColor } : undefined} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                New Folder
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Inside: <span className="font-medium text-neutral-700 dark:text-neutral-300">{currentLocationName}</span>
              </p>
            </div>
          </div>
          <button
            id="new-folder-close-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="new-folder-name-input"
                className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              >
                Folder Name
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
              id="new-folder-name-input"
              autoFocus
              type="text"
              placeholder="e.g. Documents, Projects, Archive"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={submitting}
              className={error ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : ''}
            />

            {error && (
              <div id="new-folder-error-msg" className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5 animate-in fade-in duration-100">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {!error && isTouched && isNameEmpty && (
              <p className="text-xs text-neutral-400 mt-1">Please enter a folder name</p>
            )}
          </div>

          {/* Color Accent Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Folder Color (Optional)
            </label>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
                    selectedColor === c.value
                      ? 'border-neutral-900 dark:border-white scale-110 shadow-xs ring-2 ring-neutral-400/20'
                      : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: c.value || 'var(--color-neutral-300, #cbd5e1)',
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              id="new-folder-cancel-btn"
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              id="new-folder-submit-btn"
              type="submit"
              variant="primary"
              disabled={isSubmitDisabled}
            >
              {submitting ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
