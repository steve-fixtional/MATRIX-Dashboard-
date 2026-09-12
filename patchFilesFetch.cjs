const fs = require('fs');

let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

// Update loadData to fetch deleted items
content = content.replace(
  /listFiles\(\{ parentFolderId: currentFolderId \}\),/,
  'listFiles({ parentFolderId: currentFolderId, includeDeleted: true }),'
);
content = content.replace(
  /listFolders\(currentFolderId\),/,
  'listFolders(currentFolderId, true),'
);
content = content.replace(
  /getAllFolders\(\),/,
  'getAllFolders(true),'
);
content = content.replace(
  /listFiles\(\{\}\), \/\/ all files to compute storage metrics and item counts/,
  'listFiles({ includeDeleted: true }), // all files to compute storage metrics and item counts'
);

// We should also patch the fileService.ts listFolders to accept includeDeleted. Wait, listFolders doesn't accept includeDeleted by default. Let me check its definition.
fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
