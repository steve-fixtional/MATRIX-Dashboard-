const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

content = content.replace(
  /  const thumb = await generateThumbnail\(file\);\s+const now = Date\.now\(\);/,
  `  const thumb = await generateThumbnail(file);

  const now = Date.now();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;`
);

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
