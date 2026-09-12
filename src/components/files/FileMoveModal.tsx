import { useState, useMemo } from 'react';
import { FolderInput, Folder as FolderIcon, HardDrive, X, Check, AlertCircle } from 'lucide-react';
import { MatrixFolder } from '../../domain/types';
import { Button } from '../ui/Button';
import { cn } from '../../utils';

interface FileMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  isFolder: boolean;
  entityId: string;
  currentParentFolderId: string | null;
  allFolders: MatrixFolder[];
  onMove: (targetFolderId: string | null) => Promise<void>;
}

export function FileMoveModal({
  isOpen,
  onClose,
  entityName,
  isFolder,
  entityId,
  currentParentFolderId,
  allFolders,
  onMove,
}: FileMoveModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentParentFolderId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If entity is a folder, calculate all descendant IDs to disable them
  const disabledFolderIds = useMemo(() => {
    const disabled = new Set<string>();
    if (isFolder) {
      disabled.add(entityId); // Cannot move folder into itself
      const findDescendants = (parentId: string) => {
        const children = allFolders.filter((f) => f.parentFolderId === parentId);
        for (const child of children) {
          disabled.add(child.id);
          findDescendants(child.id);
        }
      };
      findDescendants(entityId);
    }
    return disabled;
  }, [isFolder, entityId, allFolders]);

  // Duplicate destination folder name conflict detection
  const nameConflictFolderIds = useMemo(() => {
    const conflicts = new Set<string>();
    if (isFolder) {
      const lowerName = entityName.toLowerCase();
      // Check root
      const rootFolders = allFolders.filter((f) => f.parentFolderId === null && f.id !== entityId);
      if (rootFolders.some((f) => f.name.toLowerCase() === lowerName)) {
        conflicts.add('root');
      }
      // Check each folder
      for (const f of allFolders) {
        const children = allFolders.filter((child) => child.parentFolderId === f.id && child.id !== entityId);
        if (children.some((child) => child.name.toLowerCase() === lowerName)) {
          conflicts.add(f.id);
        }
      }
    }
    return conflicts;
  }, [isFolder, entityName, allFolders, entityId]);

  // Build hierarchical tree of folders for clean indented presentation
  const hierarchicalFolders = useMemo(() => {
    const result: { folder: MatrixFolder; depth: number }[] = [];
    const traverse = (parentId: string | null, depth: number) => {
      const children = allFolders
        .filter((f) => (f.parentFolderId || null) === (parentId || null))
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const child of children) {
        result.push({ folder: child, depth });
        traverse(child.id, depth + 1);
      }
    };
    traverse(null, 0);
    return result;
  }, [allFolders]);

  if (!isOpen) return null;

  const handleMove = async () => {
    if (selectedFolderId === currentParentFolderId) {
      onClose();
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onMove(selectedFolderId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to move');
    } finally {
      setSubmitting(false);
    }
  };

  const isRootDuplicate = isFolder && nameConflictFolderIds.has('root');
  const isSelectedInvalid =
    selectedFolderId === currentParentFolderId ||
    (selectedFolderId && disabledFolderIds.has(selectedFolderId)) ||
    (selectedFolderId && nameConflictFolderIds.has(selectedFolderId)) ||
    (selectedFolderId === null && isRootDuplicate);

  return (
    <div
      id="move-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        id="move-modal"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
              <FolderInput className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Move {isFolder ? 'Folder' : 'File'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[240px]">
                {entityName}
              </p>
            </div>
          </div>
          <button
            id="move-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Select Destination Folder
          </div>

          <div className="max-h-60 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {/* Root Option */}
            <button
              id="move-destination-root"
              type="button"
              disabled={isRootDuplicate}
              onClick={() => setSelectedFolderId(null)}
              className={cn(
                "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors",
                selectedFolderId === null
                  ? "bg-neutral-100 dark:bg-neutral-800 font-medium text-neutral-900 dark:text-neutral-100"
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300",
                isRootDuplicate && "opacity-40 cursor-not-allowed bg-neutral-50/50 dark:bg-neutral-900/40"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <HardDrive className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                <span>Files (Root)</span>
                {currentParentFolderId === null && (
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0">(Current)</span>
                )}
                {isRootDuplicate && (
                  <span className="text-[10px] text-amber-500 italic shrink-0">(Name collision)</span>
                )}
              </div>
              {selectedFolderId === null && <Check className="h-4 w-4 shrink-0 text-neutral-900 dark:text-neutral-100" />}
            </button>

            {/* Folder List */}
            {hierarchicalFolders.map(({ folder, depth }) => {
              const isDescendantOrSelf = disabledFolderIds.has(folder.id);
              const isDuplicateName = nameConflictFolderIds.has(folder.id);
              const isDisabled = isDescendantOrSelf || isDuplicateName;
              const isSelected = selectedFolderId === folder.id;
              const isCurrent = currentParentFolderId === folder.id;

              return (
                <button
                  key={folder.id}
                  id={`move-destination-${folder.id}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && setSelectedFolderId(folder.id)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors",
                    isDisabled && "opacity-40 cursor-not-allowed bg-neutral-50/50 dark:bg-neutral-900/40",
                    isSelected && "bg-neutral-100 dark:bg-neutral-800 font-medium text-neutral-900 dark:text-neutral-100",
                    !isSelected && !isDisabled && "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300"
                  )}
                  style={{ paddingLeft: `${14 + depth * 16}px` }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderIcon
                      className="h-4 w-4 shrink-0"
                      style={folder.color ? { color: folder.color } : { color: 'var(--color-neutral-400)' }}
                    />
                    <span className="truncate">{folder.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0">(Current)</span>
                    )}
                    {isDescendantOrSelf && isFolder && (
                      <span className="text-[10px] text-red-500/80 dark:text-red-400/80 italic shrink-0">
                        {folder.id === entityId ? '(Current folder)' : '(Descendant)'}
                      </span>
                    )}
                    {isDuplicateName && !isDescendantOrSelf && (
                      <span className="text-[10px] text-amber-500 italic shrink-0">(Name collision)</span>
                    )}
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-neutral-900 dark:text-neutral-100" />}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              id="move-cancel-btn"
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              id="move-submit-btn"
              type="submit"
              variant="primary"
              onClick={handleMove}
              disabled={submitting || isSelectedInvalid}
            >
              {submitting ? 'Moving...' : 'Move Here'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
