const fs = require('fs');

let content = fs.readFileSync('src/components/files/fileUtils.ts', 'utf8');

content = content.replace(
  /export function isTextPreviewable[\s\S]*?}/,
  `export function isTextPreviewable(mimeType: string = '', filename: string = ''): boolean {
  const cat = getFileTypeInfo(mimeType, filename).category;
  const ext = filename.toLowerCase().split('.').pop() || '';
  return cat === 'text' || cat === 'code' || ext === 'csv';
}`
);

fs.writeFileSync('src/components/files/fileUtils.ts', content, 'utf8');
