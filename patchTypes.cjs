const fs = require('fs');

let content = fs.readFileSync('src/domain/types.ts', 'utf8');

const newFields = `  defaultStorageProvider?: string;
  storageMode?: 'local' | 'cloud' | 'hybrid';
  syncEnabled?: boolean;
  syncAutomatically?: boolean;
  syncWifiOnly?: boolean;
  syncFrequency?: 'realtime' | '15m' | '1h' | '12h' | 'daily';`;

content = content.replace(
  /  defaultStorageProvider\?: string;/,
  newFields
);

fs.writeFileSync('src/domain/types.ts', content, 'utf8');
