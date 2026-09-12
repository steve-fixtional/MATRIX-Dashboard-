const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

const updatedSearch = `
export async function searchFilesOptimized(query: string): Promise<MatrixFile[]> {
  const { getDB } = await import('../db');
  const db = await getDB();
  const tx = db.transaction('files', 'readonly');
  
  const results: MatrixFile[] = [];
  const lowerQuery = query.toLowerCase();

  let fileCursor = await tx.objectStore('files').openCursor();
  while (fileCursor) {
    const f = fileCursor.value;
    if (!f.deletedAt && isUserAuthorized(f.userId)) {
      if (
        (f.name && f.name.toLowerCase().includes(lowerQuery)) ||
        (f.tags && f.tags.some((t: string) => t.toLowerCase().includes(lowerQuery)))
      ) {
        results.push(f);
      }
    }
    fileCursor = await fileCursor.continue();
  }

  return results;
}
`;

content = content + '\n' + updatedSearch;
fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
