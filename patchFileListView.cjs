const fs = require('fs');

let content = fs.readFileSync('src/components/files/FileListView.tsx', 'utf8');

if (!content.includes('FileSyncIndicator')) {
  content = content.replace(
    /import \{ FileActionMenu, FileOrFolder \} from '\.\/FileActionMenu';/,
    "import { FileActionMenu, FileOrFolder } from './FileActionMenu';\nimport { FileSyncIndicator } from './FileSyncIndicator';"
  );

  content = content.replace(
    /\{file\.favorite && <Star className="h-4 w-4 fill-current" \/>\}\s*\{\!file\.favorite && <Star className="h-4 w-4" \/>\}\s*<\/button>\s*<\/td>/g,
    `{file.favorite && <Star className="h-4 w-4 fill-current" />}\n                      {!file.favorite && <Star className="h-4 w-4" />}\n                    </button>\n                    <div className="inline-flex items-center ml-2">\n                      <FileSyncIndicator state={file.fileSyncState} />\n                    </div>\n                  </td>`
  );

  fs.writeFileSync('src/components/files/FileListView.tsx', content, 'utf8');
}
