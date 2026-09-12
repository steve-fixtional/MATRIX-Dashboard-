const fs = require('fs');

let content = fs.readFileSync('src/pages/settings/StorageSettings.tsx', 'utf8');
content = content.replace(/getAllFiles/g, 'getFiles');
fs.writeFileSync('src/pages/settings/StorageSettings.tsx', content, 'utf8');
