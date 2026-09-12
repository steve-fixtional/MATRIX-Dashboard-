const fs = require('fs');

let content = fs.readFileSync('src/domain/types.ts', 'utf8');

if (!content.includes('defaultStorageProvider?: string;')) {
  content = content.replace(
    /eventsNotificationsEnabled\?: boolean;/,
    "eventsNotificationsEnabled?: boolean;\n  defaultStorageProvider?: string;"
  );
  fs.writeFileSync('src/domain/types.ts', content, 'utf8');
}
