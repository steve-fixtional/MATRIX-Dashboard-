import { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, Folder, AlertOctagon } from 'lucide-react';
import { Button } from '../ui/Button';
import { getFolderDescendantStats, FolderDescendantStats } from '../../services/fileService';

interface FileDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  isFolder: boolean;
  entityId?: string;
  onConfirm: (deleteContents?: boolean) => Promise<void>;
}

export function FileDeleteModal({
  isOpen,
  onClose,
  entityName,
  isFolder,
  entityId,
  onConfirm,
}: FileDeleteModalProps) {
  const [deleteContents, setDeleteContents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FolderDescendantStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (isOpen && isFolder && entityId) {
      setLoadingStats(true);
      setDeleteContents(true);
      getFolderDescendantStats(entityId)
        .then((s) => setStats(s))
        .catch(() => setStats(null))
        .finally(() => setLoadingStats(false));
    } else {
      setStats(null);
    }
  }, [isOpen, isFolder, entityId]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onConfirm(isFolder ? deleteContents : true);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete');
    } finally {
      setSubmitting(false);
    }
  };

  const hasNestedItems = stats && (stats.totalFiles > 0 || stats.totalFolders > 0);

  return (
    <div
      id="delete-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="delete-modal"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Delete {isFolder ? 'Folder' : 'File'}
            </h2>
          </div>
          <button
            id="delete-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Are you sure you want to delete <span className="font-semibold text-neutral-900 dark:text-neutral-100 break-all">{entityName}</span>?
          </p>

          {isFolder && (
            <div className="space-y-3">
              {loadingStats ? (
                <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/40 p-3 text-xs text-neutral-500 animate-pulse">
                  Calculating nested folder contents...
                </div>
              ) : hasNestedItems ? (
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/30 p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    <Folder className="h-4 w-4 text-amber-500" />
                    <span>
                      Contains {stats!.totalFiles} {stats!.totalFiles === 1 ? 'file' : 'files'} and {stats!.totalFolders} {stats!.totalFolders === 1 ? 'subfolder' : 'subfolders'}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1 border-t border-neutral-200/60 dark:border-neutral-700/50">
                    {/* Option 1: Delete folder and all contents */}
                    <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg border border-transparent hover:bg-white dark:hover:bg-neutral-800 transition-colors">
                      <input
                        type="radio"
                        name="folder-delete-strategy"
                        checked={deleteContents}
                        onChange={() => setDeleteContents(true)}
                        className="mt-0.5 text-red-600 focus:ring-red-500"
                      />
                      <div className="text-xs">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100 block">
                          Delete folder and all contents
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                          Permanently deletes this folder along with all nested files and subfolders.
                        </span>
                      </div>
                    </label>

                    {/* Option 2: Keep contents, delete folder only */}
                    <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg border border-transparent hover:bg-white dark:hover:bg-neutral-800 transition-colors">
                      <input
                        type="radio"
                        name="folder-delete-strategy"
                        checked={!deleteContents}
                        onChange={() => setDeleteContents(false)}
                        className="mt-0.5 text-neutral-900 focus:ring-neutral-500"
                      />
                      <div className="text-xs">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100 block">
                          Delete folder only, keep contents
                        </span>
                        <span className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
                          Nested files and subfolders will be moved up into the parent directory.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/30 p-3 text-xs text-neutral-500 dark:text-neutral-400">
                  This folder is currently empty.
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 p-2.5 rounded-lg">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>This action cannot be undone. Confirmation is required.</span>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              id="delete-cancel-btn"
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              id="delete-confirm-btn"
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : isFolder && deleteContents && hasNestedItems ? 'Delete Folder & Contents' : 'Delete'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
