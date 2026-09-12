const fs = require('fs');

let content = fs.readFileSync('src/components/files/FileGridView.tsx', 'utf8');

content = content.replace(
  /import \{ FileSyncIndicator \} from '\.\/FileSyncIndicator';/,
  `import { FileSyncIndicator } from './FileSyncIndicator';
import { VirtuosoGrid } from 'react-virtuoso';`
);

// We replace the `folders.map` and `files.map` with VirtuosoGrid if arrays are big?
// Actually, it's better to render VirtuosoGrid for files since files can be large, folders are usually few.
// But wait, VirtuosoGrid has a specific layout logic.
// Let's modify the files map.
const oldFilesMap = /<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">\s*\{files\.map\(\(file\) => \{\s*return \(\s*<div\s*key=\{file\.id\}[\s\S]*?<\/div>\s*\);\s*\}\)\}\s*<\/div>/;

content = content.replace(
  oldFilesMap,
  `<VirtuosoGrid
            useWindowScroll
            totalCount={files.length}
            overscan={20}
            listClassName="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4"
            itemClassName="flex"
            itemContent={(index) => {
              const file = files[index];
              return (
                <div
                  id={\`file-card-\${file.id}\`}
                  onClick={() => onOpenFile(file)}
                  className="group relative flex flex-col justify-between p-3 sm:p-3.5 rounded-xl border border-neutral-200/90 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-150 cursor-pointer shadow-xs select-none w-full"
                >
                  {/* Top Bar on Card: Favorite indicator & Action Menu */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(file);
                      }}
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        file.favorite
                          ? "text-amber-400"
                          : "text-neutral-300 dark:text-neutral-700 hover:text-amber-400 dark:hover:text-amber-400 opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <Star className={cn("h-4 w-4", file.favorite && "fill-current")} />
                    </button>
                    
                    <div className="hidden sm:block">
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
                    <div className="sm:hidden">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMobileOpenActions({ ...file, isFolder: false });
                        }}
                        className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail / Icon area */}
                  <div className="flex-1 flex flex-col items-center justify-center py-2 mb-2 min-h-[80px]">
                    {file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="max-h-[80px] max-w-full object-contain rounded-md shadow-sm"
                        loading="lazy"
                      />
                    ) : isImage(file.mimeType, file.name) ? (
                      <div className="h-16 w-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-500">
                        <span className="text-[10px] uppercase font-bold tracking-wider">Img</span>
                      </div>
                    ) : (
                      (() => {
                        const { icon: TypeIcon, color } = getFileTypeInfo(file.mimeType, file.name);
                        return <TypeIcon className={cn("h-12 w-12 sm:h-14 sm:w-14", color)} />;
                      })()
                    )}
                  </div>

                  {/* File Info */}
                  <div className="mt-auto">
                    <div className="flex items-center gap-1.5 mb-1">
                      {file.storageProvider === 'cloud' ? (
                        <Cloud className="h-3 w-3 text-blue-500 shrink-0" />
                      ) : (
                        <HardDrive className="h-3 w-3 text-neutral-400 shrink-0" />
                      )}
                      <h4
                        className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate group-hover:text-neutral-950 dark:group-hover:text-white"
                        title={file.name}
                      >
                        {file.name}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
                      <span>{formatFileSize(file.size)}</span>
                      <div className="flex items-center gap-1.5">
                        <FileSyncIndicator state={file.fileSyncState} />
                        <span>{formatFileDate(file.modifiedAt || file.updatedAt)}</span>
                      </div>
                    </div>
                    {isTrashView && onGoToFolder && file.parentFolderId && (
                       <div className="mt-1.5 text-[9px] text-neutral-400 truncate text-right">
                         <span className="hover:underline" onClick={(e) => { e.stopPropagation(); onGoToFolder(file.parentFolderId); }}>
                           View original location
                         </span>
                       </div>
                    )}
                  </div>
                </div>
              );
            }}
          />`
);

fs.writeFileSync('src/components/files/FileGridView.tsx', content, 'utf8');
