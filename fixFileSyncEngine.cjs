const fs = require('fs');

let content = fs.readFileSync('src/services/storage/fileSyncEngine.ts', 'utf8');

// I need to move the resolveConflict method INSIDE the class block.
// Currently it's at the end of the file.

const methodRegex = /public async resolveConflict[\s\S]*?\}\n\}/;
const match = content.match(methodRegex);

if (match) {
  content = content.replace(match[0], '');
  content = content.replace(
    /export const fileSyncEngine = new FileSyncEngine\(\);/,
    match[0] + '\n\nexport const fileSyncEngine = new FileSyncEngine();'
  );
  fs.writeFileSync('src/services/storage/fileSyncEngine.ts', content, 'utf8');
}
