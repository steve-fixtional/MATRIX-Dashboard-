const fs = require('fs');

let content = fs.readFileSync('src/services/storage/fileSyncEngine.ts', 'utf8');
content = content.replace(
  /import \{ getStorageProvider, cloudStorageProvider \} from '\.\/storageRegistry';/,
  "import { getStorageProvider } from './storageRegistry';\nimport { cloudStorageProvider } from './cloudStorageProvider';"
);

fs.writeFileSync('src/services/storage/fileSyncEngine.ts', content, 'utf8');
