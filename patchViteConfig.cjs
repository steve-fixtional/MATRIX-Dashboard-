const fs = require('fs');

let content = fs.readFileSync('vite.config.ts', 'utf8');

content = content.replace(
  /workbox: \{/,
  'workbox: {\n          maximumFileSizeToCacheInBytes: 5000000,'
);

fs.writeFileSync('vite.config.ts', content, 'utf8');
