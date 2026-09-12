const fs = require('fs');

let content = fs.readFileSync('src/pages/settings/StorageSettings.tsx', 'utf8');

content = content.replace(/const \{ settings, updateSettings \} = useSettings\(\);/g, 'const { settings, saveSettings } = useSettings();');
content = content.replace(/updateSettings/g, 'saveSettings');

fs.writeFileSync('src/pages/settings/StorageSettings.tsx', content, 'utf8');
