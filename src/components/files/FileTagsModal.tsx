import React, { useState, useEffect } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface FileTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  initialTags: string[];
  onSaveTags: (tags: string[]) => Promise<void>;
}

export function FileTagsModal({
  isOpen,
  onClose,
  fileName,
  initialTags,
  onSaveTags,
}: FileTagsModalProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTagInput, setNewTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTags(initialTags);
    setNewTagInput('');
    setError(null);
  }, [initialTags, isOpen]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setNewTagInput('');
      return;
    }
    setTags([...tags, trimmed]);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onSaveTags(tags);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save tags');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="tags-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        id="tags-modal"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              <Tag className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Edit Tags
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[240px]">
                {fileName}
              </p>
            </div>
          </div>
          <button
            id="tags-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Input
              id="tag-input"
              autoFocus
              type="text"
              placeholder="Add a tag..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitting}
            />
            <Button
              id="add-tag-btn"
              type="button"
              variant="secondary"
              onClick={handleAddTag}
              disabled={submitting || !newTagInput.trim()}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Current Tags ({tags.length})
            </label>
            {tags.length === 0 ? (
              <p className="text-xs text-neutral-400 dark:text-neutral-500 italic py-2">
                No tags added yet. Enter a tag above.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto py-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              id="tags-cancel-btn"
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              id="tags-save-btn"
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Tags'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
