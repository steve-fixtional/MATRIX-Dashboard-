const fs = require('fs');

// Patch FileListView
let listView = fs.readFileSync('src/components/files/FileListView.tsx', 'utf8');
listView = listView.replace(
  /onToggleFavorite: \(file: MatrixFile\) => void;/,
  'onToggleFavorite: (file: MatrixFile) => void;\n  onToggleFavoriteFolder?: (folder: MatrixFolder) => void;'
);
listView = listView.replace(
  /onToggleFavorite,/,
  'onToggleFavorite,\n  onToggleFavoriteFolder,'
);
listView = listView.replace(
  /onMove=\{\(\) => onOpenMove\(folder\)\}\n\s*onDelete=\{\(\) => onOpenDelete\(folder, true\)\}/,
  `onMove={() => onOpenMove(folder)}
                        onToggleFavorite={onToggleFavoriteFolder ? () => onToggleFavoriteFolder(folder) : undefined}
                        onDelete={() => onOpenDelete(folder, true)}`
);
fs.writeFileSync('src/components/files/FileListView.tsx', listView, 'utf8');

// Patch FileGridView
let gridView = fs.readFileSync('src/components/files/FileGridView.tsx', 'utf8');
gridView = gridView.replace(
  /onToggleFavorite: \(file: MatrixFile\) => void;/,
  'onToggleFavorite: (file: MatrixFile) => void;\n  onToggleFavoriteFolder?: (folder: MatrixFolder) => void;'
);
gridView = gridView.replace(
  /onToggleFavorite,/,
  'onToggleFavorite,\n  onToggleFavoriteFolder,'
);
gridView = gridView.replace(
  /onMove=\{\(\) => onOpenMove\(folder\)\}\n\s*onDelete=\{\(\) => onOpenDelete\(folder, true\)\}/,
  `onMove={() => onOpenMove(folder)}
                      onToggleFavorite={onToggleFavoriteFolder ? () => onToggleFavoriteFolder(folder) : undefined}
                      onDelete={() => onOpenDelete(folder, true)}`
);
fs.writeFileSync('src/components/files/FileGridView.tsx', gridView, 'utf8');

// Patch Files.tsx
let filesTsx = fs.readFileSync('src/pages/Files.tsx', 'utf8');

const folderFav = `
  const handleToggleFavoriteFolder = async (folder: MatrixFolder) => {
    try {
      const { updateFolder } = await import('../services/fileService');
      await updateFolder(folder.id, { favorite: !folder.favorite });
      loadData(true);
    } catch(err) {
      console.error(err);
    }
  };
`;

filesTsx = filesTsx.replace(
  /const handleToggleFavorite = async \(file: MatrixFile\) => \{/,
  folderFav + '\n  const handleToggleFavorite = async (file: MatrixFile) => {'
);

filesTsx = filesTsx.replace(
  /onToggleFavorite=\{handleToggleFavorite\}/g,
  `onToggleFavorite={handleToggleFavorite}
              onToggleFavoriteFolder={handleToggleFavoriteFolder}`
);

fs.writeFileSync('src/pages/Files.tsx', filesTsx, 'utf8');

// Also, add updateFolder if it doesn't exist to fileService.ts.
let fileService = fs.readFileSync('src/services/fileService.ts', 'utf8');
if (!fileService.includes('export async function updateFolder(')) {
  const uf = `
export async function updateFolder(id: string, data: Partial<MatrixFolder>): Promise<MatrixFolder> {
  const folder = await folderRepository.read(id);
  if (!folder) throw new Error('Folder not found');
  if (!isUserAuthorized(folder.userId)) throw new UnauthorizedFileAccessError();
  const updated = await folderRepository.update(id, { ...data, modifiedAt: Date.now() });
  crossTabSync.broadcastDataChange('folders', id, 'update');
  return updated;
}
`;
  fileService += uf;
  fs.writeFileSync('src/services/fileService.ts', fileService, 'utf8');
}

