const fs = require('fs');

let content = fs.readFileSync('src/components/files/FileGridView.tsx', 'utf8');

// Add onGoToFolder to props interface
content = content.replace(
  /onMobileOpenActions: \(item: FileOrFolder\) => void;/,
  'onMobileOpenActions: (item: FileOrFolder) => void;\n  onGoToFolder?: (folderId: string | null) => void;'
);

// Add to component destructuring
content = content.replace(
  /onMobileOpenActions,\n}: FileGridViewProps\) {/,
  'onMobileOpenActions,\n  onGoToFolder,\n}: FileGridViewProps) {'
);

// Add to ActionMenu (Folder)
content = content.replace(
  /onDelete=\{.*?onDeleteFolder\(folder\).*?\}\n.*?\/>/,
  'onDelete={() => onDeleteFolder(folder)}\n                    onGoToFolder={onGoToFolder ? () => onGoToFolder(folder.parentFolderId) : undefined}\n                  />'
);

// Add to ActionMenu (File)
content = content.replace(
  /onDelete=\{.*?onDeleteFile\(file\).*?\}\n.*?\/>/,
  'onDelete={() => onDeleteFile(file)}\n                    onGoToFolder={onGoToFolder ? () => onGoToFolder(file.parentFolderId) : undefined}\n                  />'
);

fs.writeFileSync('src/components/files/FileGridView.tsx', content, 'utf8');
