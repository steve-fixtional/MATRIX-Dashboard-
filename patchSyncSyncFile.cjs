const fs = require('fs');
let content = fs.readFileSync('src/services/sync.ts', 'utf8');

if (!content.includes('fileSyncEngine')) {
  content = content.replace(
    /import \{ vaultSyncEngine \} from '\.\/vault\/vaultSyncService';/,
    "import { vaultSyncEngine } from './vault/vaultSyncService';\nimport { fileSyncEngine } from './storage/fileSyncEngine';"
  );

  content = content.replace(
    /await this\.executeCloudSync\(\);/,
    "await this.executeCloudSync();\n      await fileSyncEngine.syncAll();"
  );

  fs.writeFileSync('src/services/sync.ts', content, 'utf8');
}
