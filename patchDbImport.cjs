const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

content = content.replace(/await import\('\.\.\/db'\)/g, "await import('./db')");

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
