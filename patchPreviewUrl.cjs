const fs = require('fs');
let content = fs.readFileSync('src/components/files/FilePreviewModal.tsx', 'utf8');

content = content.replace(
  /\} else if \(externalUrl\) \{\s+setBlobUrl\(externalUrl\);\s+\}/,
  `} else if (externalUrl) {
          // Sanitize externalUrl to prevent javascript: or data: XSS vectors
          const safeUrl = externalUrl.trim();
          if (safeUrl.startsWith('http://') || safeUrl.startsWith('https://') || safeUrl.startsWith('blob:')) {
            setBlobUrl(safeUrl);
          } else {
            setError('Invalid or unsafe external URL provided for preview.');
          }
        }`
);

fs.writeFileSync('src/components/files/FilePreviewModal.tsx', content, 'utf8');
