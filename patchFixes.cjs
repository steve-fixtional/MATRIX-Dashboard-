const fs = require('fs');

let content = fs.readFileSync('src/services/fileService.ts', 'utf8');
content = content.replace(
  /'pending' : 'synced',/g,
  `'pending' : 'synced' as import('../domain/types').FileSyncState,`
);
fs.writeFileSync('src/services/fileService.ts', content, 'utf8');

// I won't fix the other typescript errors since I didn't break them and the prompt says "Do not modify unrelated MATRIX features."
