const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

const updatedMime = `
export function sanitizeMimeType(mimeType: string, filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  // If the extension is dangerous, forcefully override the MIME type
  if (['html', 'htm', 'js', 'mjs', 'php', 'exe', 'sh', 'bat', 'cmd'].includes(ext)) {
    return 'text/plain'; // Prevent execution
  }

  // If no mime type provided, sniff extension or default
  if (!mimeType) return 'application/octet-stream';
  
  const lowerMime = mimeType.toLowerCase();
  
  // Danger types fallback to plain text or octet-stream
  if (lowerMime.includes('html') || lowerMime.includes('javascript') || lowerMime.includes('xml')) {
    return 'text/plain'; // Prevent execution
  }
  
  if (lowerMime === 'image/svg+xml') {
    return 'image/svg+xml';
  }

  return lowerMime;
}
`;

content = content.replace(
  /export function sanitizeMimeType\([\s\S]*?return lowerMime;\s+\}/,
  updatedMime.trim()
);

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
