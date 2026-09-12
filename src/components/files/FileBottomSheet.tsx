import {
  X,
  ExternalLink,
  Eye,
  Download,
  Edit3,
  FolderInput,
  Star,
  Tag,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { FileOrFolder } from './FileActionMenu';
import { formatFileSize, getFileTypeInfo } from './fileUtils';
import { cn } from '../../utils';

interface FileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  item: FileOrFolder | null;
  onOpen: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onRename: () => void;
  onMove: () => void;
  onToggleFavorite?: () => void;
  onEditTags?: () => void;
  onDelete: () => void;
  onGoToFolder?: () => void;
}

export function FileBottomSheet({
  isOpen,
  onClose,
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
}: FileBottomSheetProps) {
  if (!isOpen || !item) return null;

  const isFile = item.type === 'file';
  const fileData = isFile ? item.data : null;
  const folderData = !isFile ? item.data : null;
  const typeInfo = isFile ? getFileTypeInfo(fileData?.mimeType, fileData?.name) : null;
  const Icon = typeInfo?.icon || FolderOpen;

  const handleSelect = (actionFn?: () => void) => {
    onClose();
    if (actionFn) actionFn();
  };

  return (
    <div
      id="file-bottom-sheet-backdrop"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm sm:hidden"
      onClick={onClose}
    >
      <div
        id="file-bottom-sheet"
        className="w-full rounded-t-2xl bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 shadow-2xl p-4 pb-8 space-y-3 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle indicator */}
        <div className="flex justify-center">
          <div className="h-1 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        </div>

        {/* Item Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {item.data.name}
              </h3>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                {isFile ? `${formatFileSize(fileData?.size)} • ${typeInfo?.label}` : 'Folder'}
              </p>
            </div>
          </div>
          <button
            id="bottom-sheet-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action List with touch targets >= 44px (min-h-[48px]) */}
        <div className="space-y-1 overflow-y-auto max-h-[60vh]">
          {/* Open */}
          <button
            id="bottom-sheet-action-open"
            type="button"
            onClick={() => handleSelect(onOpen)}
            className="flex w-full items-center gap-3.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
          >
            {isFile ? <ExternalLink className="h-5 w-5 text-neutral-400" /> : <FolderOpen className="h-5 w-5 text-neutral-400" />}
            <span>Open</span>
          </button>

          {/* Preview (files only) */}
          {isFile && onPreview && (
            <button
              id="bottom-sheet-action-preview"
              type="button"
              onClick={() => handleSelect(onPreview)}
              className="flex w-full items-center gap-3.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
            >
              <Eye className="h-5 w-5 text-neutral-400" />
              <span>Preview</span>
            </button>
          )}

          {/* Download (files only) */}
          {isFile && onDownload && (
            <button
              id="bottom-sheet-action-download"
              type="button"
              onClick={() => handleSelect(onDownload)}
              className="flex w-full items-center gap-3.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
            >
              <Download className="h-5 w-5 text-neutral-400" />
              <span>Download</span>
            </button>
          )}

          {/* Go to Folder */}
          {onGoToFolder && (
            <button
              id="bottom-sheet-action-goto"
              type="button"
              onClick={() => handleSelect(onGoToFolder)}
              className="flex w-full items-center gap-3.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
            >
              <FolderOpen className="h-5 w-5 text-neutral-400" />
              <span>Go to folder</span>
            </button>
          )}

          {/* Rename */}
          <button
            id="bottom-sheet-action-rename"
            type="button"
            onClick={() => handleSelect(onRename)}
            className="flex w-full items-center gap-3.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
          >
            <Edit3 className="h-5 w-5 text-neutral-400" />
            <span>Rename</span>
          </button>

          {/* Move */}
          <button
            id="bottom-sheet-action-move"
            type="button"
            onClick={() => handleSelect(onMove)}
            className="flex w-full items-center gap-3.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
          >
            <FolderInput className="h-5 w-5 text-neutral-400" />
            <span>Move</span>
          </button>

          {/* Favorites (files only) */}
          {isFile && onToggleFavorite && fileData && (
            <button
              id="bottom-sheet-action-favorite"
              type="button"
              onClick={() => handleSelect(onToggleFavorite)}
              className="flex w-full items-center gap-3.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
            >
              <Star
                className={cn(
                  "h-5 w-5",
                  fileData.favorite ? "fill-amber-400 text-amber-400" : "text-neutral-400"
                )}
              />
              <span>{fileData.favorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
            </button>
          )}

          {/* Tags (files only) */}
          {isFile && onEditTags && (
            <button
              id="bottom-sheet-action-tags"
              type="button"
              onClick={() => handleSelect(onEditTags)}
              className="flex w-full items-center gap-3.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium text-neutral-800 dark:text-neutral-200 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
            >
              <Tag className="h-5 w-5 text-neutral-400" />
              <span>Add / Edit Tags</span>
            </button>
          )}

          <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

          {/* Delete */}
          <button
            id="bottom-sheet-action-delete"
            type="button"
            onClick={() => handleSelect(onDelete)}
            className="flex w-full items-center gap-3.5 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium text-red-600 dark:text-red-400 active:bg-red-50 dark:active:bg-red-950/30 transition-colors"
          >
            <Trash2 className="h-5 w-5" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
