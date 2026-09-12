const fs = require('fs');

const content = `import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  ExternalLink,
  Eye,
  Download,
  Edit3,
  FolderInput,
  Star,
  Tag,
  Trash2,
  FolderOpen,
  RefreshCw,
} from 'lucide-react';
import { MatrixFile, MatrixFolder } from '../../domain/types';
import { cn } from '../../utils';
import { getStorageProvider } from '../../services/storage/storageRegistry';

export type FileOrFolder =
  | { type: 'file'; data: MatrixFile }
  | { type: 'folder'; data: MatrixFolder };

interface FileActionMenuProps {
  item: FileOrFolder;
  onOpen: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onRename: () => void;
  onMove: () => void;
  onToggleFavorite?: () => void;
  onEditTags?: () => void;
  onDelete: () => void;
  onGoToFolder?: () => void;
  isTrash?: boolean;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  className?: string;
  buttonClassName?: string;
}

export function FileActionMenu({
  item,
  onOpen,
  onPreview,
  onDownload,
  onRename,
  onMove,
  onToggleFavorite,
  onEditTags,
  onDelete,
  onGoToFolder,
  isTrash,
  onRestore,
  onPermanentDelete,
  className,
  buttonClassName,
}: FileActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const providerType = item.type === 'file' ? item.data.storageProvider : 'local';
  const provider = getStorageProvider(providerType);
  const caps = provider.capabilities;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isFile = item.type === 'file';
  const fileData = isFile ? item.data : null;

  const handleAction = (actionFn?: () => void) => {
    setIsOpen(false);
    if (actionFn) actionFn();
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={menuRef}>
      <button
        id={\`action-trigger-\${item.data.id}\`}
        type="button"
        aria-label="More actions"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none",
          isOpen && "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
          buttonClassName
        )}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          id={\`action-menu-\${item.data.id}\`}
          className="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-1 z-30 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {isTrash ? (
            <>
              {caps.trash && onRestore && (
                <button
                  type="button"
                  onClick={() => handleAction(onRestore)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Restore</span>
                </button>
              )}
              {onPermanentDelete && (
                <button
                  type="button"
                  onClick={() => handleAction(onPermanentDelete)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Permanently</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleAction(onOpen)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
              >
                {isFile ? <ExternalLink className="h-3.5 w-3.5 text-neutral-400" /> : <FolderOpen className="h-3.5 w-3.5 text-neutral-400" />}
                <span>Open</span>
              </button>

              {isFile && onPreview && caps.thumbnails && (
                <button
                  type="button"
                  onClick={() => handleAction(onPreview)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <Eye className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Preview</span>
                </button>
              )}

              {isFile && onDownload && (
                <button
                  type="button"
                  onClick={() => handleAction(onDownload)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <Download className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Download</span>
                </button>
              )}

              <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

              {onGoToFolder && (
                <button
                  type="button"
                  onClick={() => handleAction(onGoToFolder)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Go to folder</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleAction(onRename)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
              >
                <Edit3 className="h-3.5 w-3.5 text-neutral-400" />
                <span>Rename</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction(onMove)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
              >
                <FolderInput className="h-3.5 w-3.5 text-neutral-400" />
                <span>Move</span>
              </button>

              {onToggleFavorite && item.data && (
                <button
                  type="button"
                  onClick={() => handleAction(onToggleFavorite)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      item.data.favorite ? "fill-amber-400 text-amber-400" : "text-neutral-400"
                    )}
                  />
                  <span>{item.data.favorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                </button>
              )}

              {isFile && onEditTags && (
                <button
                  type="button"
                  onClick={() => handleAction(onEditTags)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                >
                  <Tag className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Add / Edit Tags</span>
                </button>
              )}

              <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

              <button
                type="button"
                onClick={() => handleAction(onDelete)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/files/FileActionMenu.tsx', content, 'utf8');
