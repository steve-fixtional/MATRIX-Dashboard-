const fs = require('fs');
let content = fs.readFileSync('src/services/storage/localStorageProvider.ts', 'utf8');

const capabilities = `  readonly name = 'Local Storage';
  readonly capabilities = {
    sync: false,
    sharing: false,
    versionHistory: false,
    thumbnails: true,
    trash: true,
    offlineFiles: true,
  };`;

content = content.replace(/readonly providerType = 'local' as const;/, "readonly providerType = 'local' as const;\n" + capabilities);

fs.writeFileSync('src/services/storage/localStorageProvider.ts', content, 'utf8');
