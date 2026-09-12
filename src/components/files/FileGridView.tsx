import React from 'react';
import { Folder, Star, MoreVertical, Cloud, HardDrive } from 'lucide-react';
import { MatrixFile, MatrixFolder } from '../../domain/types';
import { formatFileSize, formatFileDate, getFileTypeInfo, isImage } from './fileUtils';
import { FileActionMenu, FileOrFolder } from './FileActionMenu';
import { FileSyncIndicator } from './FileSyncIndicator';
import { VirtuosoGrid } from 'react-virtuoso';
import { cn } from '../../utils';

interface FileGridViewProps {
  folders: MatrixFolder[];
  files: MatrixFile[];
  folderItemCounts: Record<string, number>;
  onOpenFolder: (folder: MatrixFolder) => void;
  onOpenFile: (file: MatrixFile) => void;
  onPreviewFile: (file: MatrixFile) => void;
  onDownloadFile: (file: MatrixFile) => void;
  onRenameFolder: (folder: MatrixFolder) => void;
  onRenameFile: (file: MatrixFile) => void;
  onMoveFolder: (folder: MatrixFolder) => void;
  onMoveFile: (file: MatrixFile) => void;
  onToggleFavorite: (file: MatrixFile) => void;
  onToggleFavoriteFolder?: (folder: MatrixFolder) => void;
  onEditTags: (file: MatrixFile) => void;
  onDeleteFolder: (folder: MatrixFolder) => void;
  onDeleteFile: (file: MatrixFile) => void;
  onMobileOpenActions: (item: FileOrFolder) => void;
  onGoToFolder?: (folderId: string | null) => void;
  isTrashView?: boolean;
  onRestoreFolder?: (folder: MatrixFolder) => void;
  onRestoreFile?: (file: MatrixFile) => void;
  onPermanentDeleteFolder?: (folder: MatrixFolder) => void;
  onPermanentDeleteFile?: (file: MatrixFile) => void;
}

export function FileGridView({
  folders,
  files,
  folderItemCounts,
  onOpenFolder,
  onOpenFile,
  onPreviewFile,
  onDownloadFile,
  onRenameFolder,
  onRenameFile,
  onMoveFolder,
  onMoveFile,
  onToggleFavorite,
  onToggleFavoriteFolder,
  onEditTags,
  onDeleteFolder,
  onDeleteFile,
  onMobileOpenActions,
  onGoToFolder,
  isTrashView,
  onRestoreFolder,
  onRestoreFile,
  onPermanentDeleteFolder,
  onPermanentDeleteFile,
}: FileGridViewProps) {
  return (
    <div className="space-y-6">
      {/* Folders Section (Displayed before files) */}
      {folders.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Folders ({folders.length})
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {folders.map((folder) => {
              const count = folderItemCounts[folder.id] || 0;
              return (
                <div
                  key={folder.id}
                  id={`folder-card-${folder.id}`}
                  onClick={() => onOpenFolder(folder)}
                  className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-150 cursor-pointer shadow-xs select-none"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div
                      className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform"
                      style={
                        folder.color
                          ? { backgroundColor: `${folder.color}15`, color: folder.color }
                          : undefined
                      }
                    >
                      <Folder className="h-5 w-5 sm:h-6 sm:w-6" style={folder.color ? { color: folder.color } : undefined} />
                    </div>

                    {/* Desktop Context Menu */}
                    <div className="hidden sm:block lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <FileActionMenu
                        item={{ type: 'folder', data: folder }}
                        onOpen={() => onOpenFolder(folder)}
                        onRename={() => onRenameFolder(folder)}
                        onMove={() => onMoveFolder(folder)}
                        onDelete={() => onDeleteFolder(folder)}
                    onGoToFolder={onGoToFolder ? () => onGoToFolder(folder.parentFolderId) : undefined}
                        isTrash={isTrashView}
                        onRestore={onRestoreFolder ? () => onRestoreFolder(folder) : undefined}
                        onPermanentDelete={onPermanentDeleteFolder ? () => onPermanentDeleteFolder(folder) : undefined}
                      />
                    </div>

                    {/* Mobile Context Menu Trigger */}
                    <button
                        aria-label="More actions"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMobileOpenActions({ type: 'folder', data: folder });
                        }}
                      className="sm:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-neutral-950 dark:group-hover:text-white">
                      {folder.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                      {count} {count === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      {files.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Files ({files.length})
            </h3>
          </div>

          <VirtuosoGrid
            useWindowScroll
            totalCount={files.length}
            overscan={20}
            listClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
            itemClassName="flex"
            itemContent={(index) => {
              const file = files[index];
              const typeInfo = getFileTypeInfo(file.mimeType, file.name);
              const TypeIcon = typeInfo.icon;
              const hasThumbnail = isImage(file.mimeType, file.name) && (file.thumbnailUrl || file.thumbnail?.url);
              return (
                <div
                  id={`file-card-${file.id}`}
                  onClick={() => onOpenFile(file)}
                  className="group relative flex flex-col p-3.5 sm:p-4 rounded-xl border border-neutral-200/90 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-150 cursor-pointer shadow-xs select-none w-full"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <button
                      aria-label={file.favorite ? "Remove from favorites" : "Add to favorites"}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(file);
                      }}
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        file.favorite
                          ? "text-amber-400"
                          : "text-neutral-300 dark:text-neutral-700 hover:text-amber-400 dark:hover:text-amber-400 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100"
                      )}
                    >
                      <Star className={cn("h-4 w-4 sm:h-5 sm:w-5", file.favorite && "fill-current")} />
                    </button>
                    
                    {/* Desktop Context Menu */}
                    <div className="hidden sm:block lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <FileActionMenu
                        item={{ type: "file", data: file }}
                        onRename={() => onRenameFile(file)}
                        onMove={() => onMoveFile(file)}
                        onDownload={() => onDownloadFile(file)}
                        onToggleFavorite={() => onToggleFavorite(file)}
                        onEditTags={() => onEditTags(file)}
                        onDelete={() => onDeleteFile(file)}
                        onRestore={onRestoreFile ? () => onRestoreFile(file) : undefined}
                        onPermanentDelete={onPermanentDeleteFile ? () => onPermanentDeleteFile(file) : undefined}
                        isTrashView={isTrashView}
                      />
                    </div>
                    {/* Mobile Menu */}
                    <div className="sm:hidden">
                      <button
                        aria-label="More actions"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMobileOpenActions({ ...file, isFolder: false });
                        }}
                        className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail / Icon area */}
                  <div className="flex-1 flex items-center justify-center bg-neutral-50/50 dark:bg-neutral-900/50 rounded-lg mb-3 overflow-hidden border border-neutral-100 dark:border-neutral-800/50 min-h-[100px]">
                    {hasThumbnail ? (
                      <img
                        src={file.thumbnailUrl || file.thumbnail?.url}
                        alt={file.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-neutral-500 dark:text-neutral-400">
                        <TypeIcon className="h-8 w-8 sm:h-9 sm:w-9" />
                        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                          {file.name.split('.').pop() || 'FILE'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="min-w-0 space-y-1">
                    <h4 className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{formatFileDate(file.modifiedAt || file.updatedAt)}</span>
                    </div>
                    {/* Tag badges */}
                    {file.tags && file.tags.length > 0 && (
                      <div className="flex items-center gap-1 pt-1 overflow-hidden">
                        {file.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 truncate max-w-[60px]"
                          >
                            {tag}
                          </span>
                        ))}
                        {file.tags.length > 2 && (
                          <span className="text-[9px] text-neutral-400">+{file.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
