const fs = require('fs');
let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

// For FileBottomSheet
content = content.replace(
  /onDelete=\{handleBottomSheetDelete\}\n\s*\/>/,
  'onDelete={handleBottomSheetDelete}\n        onGoToFolder={() => bottomSheetItem && handleGoToFolder(bottomSheetItem.data.parentFolderId)}\n      />'
);

fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
