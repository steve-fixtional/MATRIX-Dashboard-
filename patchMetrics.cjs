const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

const newMetrics = `
export async function getStorageMetrics(): Promise<{ totalBytes: number; fileCount: number; folderCount: number }> {
  // Use lower-level IDB API to avoid loading full objects if possible, but listFiles is fine if we just map
  // To avoid memory bloat, we fetch directly from repository but without parsing binary data.
  // We already don't parse binary data, but avoiding large array allocations is good.
  const files = await fileRepository.list(true);
  const folders = await folderRepository.list(true);
  
  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
  return { totalBytes, fileCount: files.length, folderCount: folders.length };
}

export async function getFolderItemCounts(): Promise<Record<string, number>> {
  const files = await fileRepository.list(true);
  const folders = await folderRepository.list(true);
  
  const counts: Record<string, number> = {};
  for (const f of files) {
    if (f.parentFolderId) {
      counts[f.parentFolderId] = (counts[f.parentFolderId] || 0) + 1;
    }
  }
  for (const f of folders) {
    if (f.parentFolderId) {
      counts[f.parentFolderId] = (counts[f.parentFolderId] || 0) + 1;
    }
  }
  return counts;
}
`;

content = content + '\n' + newMetrics;
fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
