import React from 'react';
import {
  Folder,
  Star,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { MatrixFile, MatrixFolder } from '../../domain/types';
import { formatFileSize, formatFileDate, getFileTypeInfo } from './fileUtils';
import { FileActionMenu, FileOrFolder } from './FileActionMenu';
import { FileSyncIndicator } from './FileSyncIndicator';
import { Virtuoso } from 'react-virtuoso';
import { cn } from '../../utils';

export type SortField = 'name' | 'modified' | 'created' | 'size' | 'type';
export type SortDirection = 'asc' | 'desc';

interface FileListViewProps {
  folders: MatrixFolder[];
  files: MatrixFile[];
  folderItemCounts: Record<string, number>;
  folderPathNames: Record<string, string>;
  currentLocationName: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
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

export function FileListView({
  folders,
  files,
  folderItemCounts,
  folderPathNames,
  currentLocationName,
  sortField,
  sortDirection,
  onSort,
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
}: FileListViewProps) {
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity ml-1" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-neutral-900 dark:text-neutral-100 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 text-neutral-900 dark:text-neutral-100 ml-1" />
    );
  };

  return (
    <div className="w-full rounded-xl border border-neutral-200/90 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/30 overflow-hidden shadow-xs">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-neutral-50/80 dark:bg-neutral-900/80 border-b border-neutral-200/80 dark:border-neutral-800 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 select-none">
        {/* Name Column */}
        <button
          type="button"
          onClick={() => onSort('name')}
          className="col-span-6 sm:col-span-5 md:col-span-4 lg:col-span-3 xl:col-span-3 flex items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <span>Name</span>
          {renderSortIndicator('name')}
        </button>

        {/* Type Column */}
        <button
          type="button"
          onClick={() => onSort('type')}
          className="hidden sm:flex sm:col-span-2 md:col-span-2 lg:col-span-1 xl:col-span-1 items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <span>Type</span>
          {renderSortIndicator('type')}
        </button>

        {/* Size Column */}
        <button
          type="button"
          onClick={() => onSort('size')}
          className="hidden md:flex md:col-span-2 lg:col-span-2 xl:col-span-1 items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <span>Size</span>
          {renderSortIndicator('size')}
        </button>

        {/* Modified Column */}
        <button
          type="button"
          onClick={() => onSort('modified')}
          className="col-span-4 sm:col-span-3 md:col-span-2 lg:col-span-2 xl:col-span-2 flex items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <span>Modified</span>
          {renderSortIndicator('modified')}
        </button>

        {/* Location Column (desktop wide) */}
                {/* Created Column */}
        <button
          type="button"
          onClick={() => onSort('created')}
          className="hidden xl:flex xl:col-span-2 items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <span>Created</span>
          {renderSortIndicator('created')}
        </button>

        {/* Location Column (desktop wide) */}
        <div className="hidden lg:block lg:col-span-2 xl:col-span-2">Location</div>

        {/* Actions Column */}
        <div className="col-span-2 sm:col-span-2 md:col-span-1 text-right pr-2">Actions</div>
      </div>

      {/* Folders List (Displayed before files) */}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
        {folders.map((folder) => {
          const count = folderItemCounts[folder.id] || 0;
          const loc = folderPathNames[folder.id] || currentLocationName;

          return (
            <div
              key={folder.id}
              id={`folder-row-${folder.id}`}
              onClick={() => onOpenFolder(folder)}
              className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-neutral-50/90 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer text-xs group select-none"
            >
              {/* Name */}
              <div className="col-span-6 sm:col-span-5 md:col-span-4 lg:col-span-3 xl:col-span-3 flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 shrink-0"
                  style={
                    folder.color
                      ? { backgroundColor: `${folder.color}20`, color: folder.color }
                      : undefined
                  }
                >
                  <Folder className="h-4 w-4" style={folder.color ? { color: folder.color } : undefined} />
                </div>
                <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate group-hover:text-neutral-950 dark:group-hover:text-white">
                  {folder.name}
                </span>
              </div>

              {/* Type */}
              <div className="hidden sm:block sm:col-span-2 md:col-span-2 lg:col-span-1 xl:col-span-1 text-neutral-500 dark:text-neutral-400 truncate">
                Folder
              </div>

              {/* Size */}
              <div className="hidden md:block md:col-span-2 lg:col-span-2 xl:col-span-1 text-neutral-500 dark:text-neutral-400 font-mono">
                {count} {count === 1 ? 'item' : 'items'}
              </div>

              {/* Modified */}
              <div className="col-span-4 sm:col-span-3 md:col-span-2 lg:col-span-2 xl:col-span-2 text-neutral-500 dark:text-neutral-400 font-mono truncate">
                {formatFileDate(folder.modifiedAt || folder.updatedAt)}
              </div>

              {/* Created */}
              <div className="hidden xl:block xl:col-span-2 text-neutral-500 dark:text-neutral-400 font-mono truncate">
                {formatFileDate(folder.createdAt)}
              </div>

              {/* Location */}
              <div className="hidden lg:block lg:col-span-2 xl:col-span-2 text-neutral-400 dark:text-neutral-500 truncate" title={loc}>
                {loc}
              </div>

              {/* Actions */}
              <div className="col-span-2 sm:col-span-2 md:col-span-1 flex items-center justify-end">
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
                <button
                  aria-label="More actions"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMobileOpenActions({ type: 'folder', data: folder });
                  }}
                  className="sm:hidden p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Files List */}
        <Virtuoso
          useWindowScroll
          totalCount={files.length}
          overscan={30}
          className="divide-y divide-neutral-100 dark:divide-neutral-800/50"
          itemContent={(index) => {
            const file = files[index];
            const typeInfo = getFileTypeInfo(file.mimeType, file.name);
            const TypeIcon = typeInfo.icon;
            
            return (
              <div
                id={`file-row-${file.id}`}
                onClick={() => onOpenFile(file)}
                className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-neutral-50/90 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer text-xs group select-none border-b border-neutral-100 dark:border-neutral-800/50 last:border-0"
              >
                {/* Name */}
                <div className="col-span-6 sm:col-span-5 md:col-span-4 lg:col-span-3 xl:col-span-3 flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shrink-0">
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate" title={file.name}>
                      {file.name}
                    </span>
                    {file.favorite && (
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                    )}
                  </div>
                </div>

                {/* Location (Global View) */}
                {isGlobal && (
                  <div className="hidden lg:flex lg:col-span-2 items-center min-w-0 pr-2">
                    <span className="text-neutral-500 dark:text-neutral-400 truncate" title={folderPathNames?.[file.id] || 'Folder'}>
                      {folderPathNames?.[file.id] || 'Folder'}
                    </span>
                  </div>
                )}

                {/* Type */}
                <div className="hidden sm:flex sm:col-span-2 md:col-span-2 lg:col-span-1 xl:col-span-1 items-center min-w-0 pr-2">
                  <span className="text-neutral-500 dark:text-neutral-400 truncate uppercase text-[10px] tracking-wider">
                    {file.name.split('.').pop() || 'FILE'}
                  </span>
                </div>

                {/* Size */}
                <div className="hidden md:flex md:col-span-2 lg:col-span-1 xl:col-span-1 items-center font-mono text-neutral-500 dark:text-neutral-400 min-w-0 pr-2">
                  {formatFileSize(file.size)}
                </div>

                {/* Modified */}
                <div className="hidden xl:flex xl:col-span-2 items-center text-neutral-500 dark:text-neutral-400 min-w-0 pr-2">
                  {formatFileDate(file.modifiedAt || file.updatedAt)}
                </div>

                {/* Location/Storage */}
                <div className="hidden lg:flex lg:col-span-1 xl:col-span-1 items-center gap-1 min-w-0 pr-2">
                  {file.storageProvider === 'cloud' ? (
                    <Cloud className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  ) : (
                    <HardDrive className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  )}
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 capitalize truncate">
                    {file.storageProvider}
                  </span>
                </div>

                {/* Tags */}
                <div className="hidden sm:flex sm:col-span-3 md:col-span-3 lg:col-span-2 xl:col-span-1 items-center gap-1 overflow-hidden pr-2">
                  {file.tags && file.tags.slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 truncate max-w-[60px]"
                    >
                      {tag}
                    </span>
                  ))}
                  {file.tags && file.tags.length > 2 && (
                    <span className="text-[9px] text-neutral-400">+{file.tags.length - 2}</span>
                  )}
                </div>

                {/* Actions & Sync */}
                <div className="col-span-6 sm:col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-1 flex items-center justify-end gap-3 min-w-0 pl-2 ml-auto">
                  <FileSyncIndicator state={file.fileSyncState} />
                  
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
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
