const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

const updatedMetrics = `
export async function getStorageMetricsOptimized(): Promise<{ totalBytes: number; fileCount: number; folderCount: number }> {
  const { getDB } = await import('../db');
  const db = await getDB();
  const tx = db.transaction(['files', 'folders'], 'readonly');
  
  let totalBytes = 0;
  let fileCount = 0;
  let folderCount = 0;

  let fileCursor = await tx.objectStore('files').openCursor();
  while (fileCursor) {
    if (!fileCursor.value.deletedAt && isUserAuthorized(fileCursor.value.userId)) {
      fileCount++;
      totalBytes += (fileCursor.value.size || 0);
    }
    fileCursor = await fileCursor.continue();
  }

  let folderCursor = await tx.objectStore('folders').openCursor();
  while (folderCursor) {
    if (!folderCursor.value.deletedAt && isUserAuthorized(folderCursor.value.userId)) {
      folderCount++;
    }
    folderCursor = await folderCursor.continue();
  }

  return { totalBytes, fileCount, folderCount };
}

export async function getFolderItemCountsOptimized(): Promise<Record<string, number>> {
  const { getDB } = await import('../db');
  const db = await getDB();
  const tx = db.transaction(['files', 'folders'], 'readonly');
  const counts: Record<string, number> = {};

  let fileCursor = await tx.objectStore('files').openCursor();
  while (fileCursor) {
    if (!fileCursor.value.deletedAt && isUserAuthorized(fileCursor.value.userId) && fileCursor.value.parentFolderId) {
       counts[fileCursor.value.parentFolderId] = (counts[fileCursor.value.parentFolderId] || 0) + 1;
    }
    fileCursor = await fileCursor.continue();
  }

  let folderCursor = await tx.objectStore('folders').openCursor();
  while (folderCursor) {
    if (!folderCursor.value.deletedAt && isUserAuthorized(folderCursor.value.userId) && folderCursor.value.parentFolderId) {
       counts[folderCursor.value.parentFolderId] = (counts[folderCursor.value.parentFolderId] || 0) + 1;
    }
    folderCursor = await folderCursor.continue();
  }

  return counts;
}
`;

content = content.replace(/export async function getStorageMetrics\(\)[\s\S]*?return counts;\s+\}/, updatedMetrics);
fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
