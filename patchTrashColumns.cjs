const fs = require('fs');
let content = fs.readFileSync('src/components/files/FileListView.tsx', 'utf8');

content = content.replace(
  /<div className="w-24 text-right flex-shrink-0">Size<\/div>/,
  `{isTrashView ? <div className="w-32 flex-shrink-0">Deleted</div> : <div className="w-24 text-right flex-shrink-0">Size</div>}`
);

content = content.replace(
  /<div className="w-32 flex-shrink-0">Type<\/div>/,
  `{isTrashView ? <div className="w-32 flex-shrink-0">Location</div> : <div className="w-32 flex-shrink-0">Type</div>}`
);

content = content.replace(
  /<div className="w-32 flex-shrink-0">\s*\{folder\.modifiedAt \? formatFileDate\(folder\.modifiedAt\) : formatFileDate\(folder\.updatedAt\)\}\s*<\/div>\s*<div className="w-24 text-right flex-shrink-0 text-neutral-400 dark:text-neutral-500">\s*--\s*<\/div>\s*<div className="w-32 flex-shrink-0">\s*Folder\s*<\/div>/,
  `<div className="w-32 flex-shrink-0">
                  {folder.modifiedAt ? formatFileDate(folder.modifiedAt) : formatFileDate(folder.updatedAt)}
                </div>
                {isTrashView ? (
                  <>
                    <div className="w-32 flex-shrink-0">{folder.deletedAt ? formatFileDate(folder.deletedAt) : '--'}</div>
                    <div className="w-32 flex-shrink-0 truncate" title={folder.parentFolderId ? (folderPathNames[folder.parentFolderId] || 'Unknown') : 'Root'}>
                      {folder.parentFolderId ? (folderPathNames[folder.parentFolderId] || 'Unknown') : 'Root'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-24 text-right flex-shrink-0 text-neutral-400 dark:text-neutral-500">
                      --
                    </div>
                    <div className="w-32 flex-shrink-0">
                      Folder
                    </div>
                  </>
                )}`
);

content = content.replace(
  /<div className="w-32 flex-shrink-0">\s*\{file\.modifiedAt \? formatFileDate\(file\.modifiedAt\) : formatFileDate\(file\.updatedAt\)\}\s*<\/div>\s*<div className="w-24 text-right flex-shrink-0">\s*\{formatFileSize\(file\.size\)\}\s*<\/div>\s*<div className="w-32 flex-shrink-0 truncate" title=\{typeInfo\.label\}>\s*\{typeInfo\.label\}\s*<\/div>/,
  `<div className="w-32 flex-shrink-0">
                  {file.modifiedAt ? formatFileDate(file.modifiedAt) : formatFileDate(file.updatedAt)}
                </div>
                {isTrashView ? (
                  <>
                    <div className="w-32 flex-shrink-0">{file.deletedAt ? formatFileDate(file.deletedAt) : '--'}</div>
                    <div className="w-32 flex-shrink-0 truncate" title={file.parentFolderId ? (folderPathNames[file.parentFolderId] || 'Unknown') : 'Root'}>
                      {file.parentFolderId ? (folderPathNames[file.parentFolderId] || 'Unknown') : 'Root'}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-24 text-right flex-shrink-0">
                      {formatFileSize(file.size)}
                    </div>
                    <div className="w-32 flex-shrink-0 truncate" title={typeInfo.label}>
                      {typeInfo.label}
                    </div>
                  </>
                )}`
);

fs.writeFileSync('src/components/files/FileListView.tsx', content, 'utf8');
