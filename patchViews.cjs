const fs = require('fs');

function patchView(filename) {
  let content = fs.readFileSync(filename, 'utf8');
  
  // Add props to interface
  content = content.replace(
    /onGoToFolder\?: \(folderId: string \| null\) => void;\n\}/,
    'onGoToFolder?: (folderId: string | null) => void;\n  isTrashView?: boolean;\n  onRestoreFolder?: (folder: MatrixFolder) => void;\n  onRestoreFile?: (file: MatrixFile) => void;\n  onPermanentDeleteFolder?: (folder: MatrixFolder) => void;\n  onPermanentDeleteFile?: (file: MatrixFile) => void;\n}'
  );

  // Add props to function
  content = content.replace(
    /onGoToFolder,\n\}:/,
    'onGoToFolder,\n  isTrashView,\n  onRestoreFolder,\n  onRestoreFile,\n  onPermanentDeleteFolder,\n  onPermanentDeleteFile,\n}:'
  );

  // Update FileActionMenu for folder
  content = content.replace(
    /onGoToFolder=\{onGoToFolder \? \(\) => onGoToFolder\(folder\.parentFolderId\) : undefined\}\n\s*\/>/,
    `onGoToFolder={onGoToFolder ? () => onGoToFolder(folder.parentFolderId) : undefined}
                        isTrash={isTrashView}
                        onRestore={onRestoreFolder ? () => onRestoreFolder(folder) : undefined}
                        onPermanentDelete={onPermanentDeleteFolder ? () => onPermanentDeleteFolder(folder) : undefined}
                      />`
  );

  // Update FileActionMenu for file
  content = content.replace(
    /onGoToFolder=\{onGoToFolder \? \(\) => onGoToFolder\(file\.parentFolderId\) : undefined\}\n\s*\/>/,
    `onGoToFolder={onGoToFolder ? () => onGoToFolder(file.parentFolderId) : undefined}
                        isTrash={isTrashView}
                        onRestore={onRestoreFile ? () => onRestoreFile(file) : undefined}
                        onPermanentDelete={onPermanentDeleteFile ? () => onPermanentDeleteFile(file) : undefined}
                      />`
  );
  
  fs.writeFileSync(filename, content, 'utf8');
}

patchView('src/components/files/FileGridView.tsx');
patchView('src/components/files/FileListView.tsx');
