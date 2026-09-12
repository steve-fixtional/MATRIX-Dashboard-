const fs = require('fs');

let content = fs.readFileSync('src/services/sync.ts', 'utf8');

const replacement = `
      for (const local of chunk) {
        // Skip cloud push for explicitly local files
        if (collectionName === 'files' && (local as any).storageProvider === 'local') {
          continue;
        }
        const { syncStatus, syncError, ...remoteObj } = local as any;
        const docRef = doc(db, \`users/\${userId}/\${collectionName}/\${local.id}\`);
        batch.set(docRef, remoteObj);
      }
`;

content = content.replace(
  /for \(const local of chunk\) \{\s+const \{ syncStatus, syncError, \.\.\.remoteObj \} = local as any;\s+const docRef = doc\(db, `users\/\$\{userId\}\/\$\{collectionName\}\/\$\{local\.id\}`\);\s+batch\.set\(docRef, remoteObj\);\s+\}/g,
  replacement
);

fs.writeFileSync('src/services/sync.ts', content, 'utf8');
