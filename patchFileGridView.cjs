const fs = require('fs');

let content = fs.readFileSync('src/components/files/FileGridView.tsx', 'utf8');

if (!content.includes('FileSyncIndicator')) {
  content = content.replace(
    /import \{ FileActionMenu, FileOrFolder \} from '\.\/FileActionMenu';/,
    "import { FileActionMenu, FileOrFolder } from './FileActionMenu';\nimport { FileSyncIndicator } from './FileSyncIndicator';"
  );

  content = content.replace(
    /\{file\.favorite && <Star className="h-4 w-4 fill-current" \/>\}\s*\{\!file\.favorite && <Star className="h-4 w-4" \/>\}\s*<\/button>/g,
    `{file.favorite && <Star className="h-4 w-4 fill-current" />}\n                      {!file.favorite && <Star className="h-4 w-4" />}\n                    </button>\n                    <div className="flex items-center gap-1">\n                      {file.storageProvider === 'cloud' && <Cloud className="h-3 w-3 text-neutral-400" title="Cloud Storage" />}\n                      {file.storageProvider === 'local' && <HardDrive className="h-3 w-3 text-neutral-400" title="Local Storage" />}\n                      <FileSyncIndicator state={file.fileSyncState} />\n                    </div>`
  );

  fs.writeFileSync('src/components/files/FileGridView.tsx', content, 'utf8');
}
