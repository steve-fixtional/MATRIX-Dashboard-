const fs = require('fs');
let content = fs.readFileSync('src/services/sync.ts', 'utf8');

const replacement = `
    const allItems = await store.getAll();
    const batch = writeBatch(db);
    let batchSize = 0;

    for (const item of allItems) {
      // 1. Skip strictly local files
      if (collectionName === 'files' && (item as any).storageProvider === 'local') {
        continue;
      }
`;

content = content.replace(
  /const allItems = await store\.getAll\(\);\s+const batch = writeBatch\(db\);\s+let batchSize = 0;\s+for \(const item of allItems\) \{/g,
  replacement
);

fs.writeFileSync('src/services/sync.ts', content, 'utf8');
