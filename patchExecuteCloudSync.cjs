const fs = require('fs');

let content = fs.readFileSync('src/services/sync.ts', 'utf8');

content = content.replace(
  /await this\.syncCollection\('clipboard'\);/,
  "await this.syncCollection('clipboard');\n    await fileSyncEngine.syncAll();"
);

fs.writeFileSync('src/services/sync.ts', content, 'utf8');
