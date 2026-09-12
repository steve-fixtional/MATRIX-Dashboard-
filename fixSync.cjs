const fs = require('fs');
let content = fs.readFileSync('src/services/sync.ts', 'utf8');

// Revert the early skip
content = content.replace(
  /\/\/ 1\. Skip strictly local files\n      if \(collectionName === 'files' && \(item as any\)\.storageProvider === 'local'\) \{\n        continue;\n      \}/g,
  ""
);

fs.writeFileSync('src/services/sync.ts', content, 'utf8');
