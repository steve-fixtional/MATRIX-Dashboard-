const fs = require('fs');

let content = fs.readFileSync('src/services/storage/storageRegistry.ts', 'utf8');

if (!content.includes('cloudStorageProvider')) {
  content = content.replace(
    /import \{ cloudStorageProvider \} from '\.\/cloudStorageProvider';/,
    "import { cloudStorageProvider } from './cloudStorageProvider';"
  );
  // Just in case it wasn't imported properly before
  if (!content.includes("import { cloudStorageProvider }")) {
     content = "import { cloudStorageProvider } from './cloudStorageProvider';\n" + content;
  }

  content = content.replace(
    /const providers: Record<string, IStorageProvider> = \{/,
    "const providers: Record<string, IStorageProvider> = {\n  cloud: cloudStorageProvider,"
  );

  fs.writeFileSync('src/services/storage/storageRegistry.ts', content, 'utf8');
}
