const fs = require('fs');

let content = fs.readFileSync('src/components/files/FileListView.tsx', 'utf8');
content = content.replace(
  /import \{ FileSyncIndicator \} from '\.\/FileSyncIndicator';/,
  `import { FileSyncIndicator } from './FileSyncIndicator';\nimport { Virtuoso } from 'react-virtuoso';`
);

const regex = /<div className="divide-y divide-neutral-100 dark:divide-neutral-800\/50">\s*\{files\.map\(\(file\) => \{[\s\S]*?\}\)\}\s*<\/div>/;

const newList = `<Virtuoso
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
                id={\`file-row-\${file.id}\`}
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
                  <div className="hidden sm:block opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <FileActionMenu
                      item={{ ...file, isFolder: false }}
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
        />`;

content = content.replace(regex, newList);

fs.writeFileSync('src/components/files/FileListView.tsx', content, 'utf8');
