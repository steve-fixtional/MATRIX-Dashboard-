const fs = require('fs');
let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

// For FileGridView
content = content.replace(
  /onMobileOpenActions=\{\(item\) => setBottomSheetItem\(item\)\}\n\s*\/>/g,
  'onMobileOpenActions={(item) => setBottomSheetItem(item)}\n              onGoToFolder={(f) => handleGoToFolder(f)}\n            />'
);

fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
