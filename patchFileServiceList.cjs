const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

content = content.replace(
  /export async function listFolders\(parentFolderId: string \| null = null\): Promise<MatrixFolder\[\]> \{/,
  'export async function listFolders(parentFolderId: string | null = null, includeDeleted = false): Promise<MatrixFolder[]> {'
);
content = content.replace(
  /const all = await folderRepository\.list\(\);/,
  'const all = await folderRepository.list(includeDeleted);'
);

content = content.replace(
  /export async function getAllFolders\(\): Promise<MatrixFolder\[\]> \{/,
  'export async function getAllFolders(includeDeleted = false): Promise<MatrixFolder[]> {'
);
content = content.replace(
  /const all = await folderRepository\.list\(\);\n  return all\n    \.filter\(f => isUserAuthorized\(f\.userId\)\)/,
  'const all = await folderRepository.list(includeDeleted);\n  return all\n    .filter(f => isUserAuthorized(f.userId))'
);

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
