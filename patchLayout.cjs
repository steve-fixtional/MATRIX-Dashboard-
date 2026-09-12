const fs = require('fs');

let content = fs.readFileSync('src/components/files/FileListView.tsx', 'utf8');

// Header
content = content.replace(
  /className="col-span-6 sm:col-span-5 md:col-span-4 flex items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"/,
  'className="col-span-6 sm:col-span-5 md:col-span-4 lg:col-span-3 xl:col-span-3 flex items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"'
);
content = content.replace(
  /className="hidden sm:flex sm:col-span-2 md:col-span-2 items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"/,
  'className="hidden sm:flex sm:col-span-2 md:col-span-2 lg:col-span-1 xl:col-span-1 items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"'
);
content = content.replace(
  /className="hidden md:flex md:col-span-2 items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"/,
  'className="hidden md:flex md:col-span-2 lg:col-span-2 xl:col-span-1 items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"'
);
content = content.replace(
  /className="col-span-4 sm:col-span-3 md:col-span-2 flex items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"/,
  'className="col-span-4 sm:col-span-3 md:col-span-2 lg:col-span-2 xl:col-span-2 flex items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"'
);
content = content.replace(
  /<div className="hidden lg:block lg:col-span-1">Location<\/div>/,
  `        {/* Created Column */}
        <button
          type="button"
          onClick={() => onSort('created')}
          className="hidden xl:flex xl:col-span-2 items-center group text-left hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <span>Created</span>
          {renderSortIndicator('created')}
        </button>

        {/* Location Column (desktop wide) */}
        <div className="hidden lg:block lg:col-span-2 xl:col-span-2">Location</div>`
);


// Folder rows
content = content.replace(
  /className="col-span-6 sm:col-span-5 md:col-span-4 flex items-center gap-2.5 min-w-0 pr-2"/g,
  'className="col-span-6 sm:col-span-5 md:col-span-4 lg:col-span-3 xl:col-span-3 flex items-center gap-2.5 min-w-0 pr-2"'
);
content = content.replace(
  /className="hidden sm:block sm:col-span-2 md:col-span-2 text-neutral-500 dark:text-neutral-400 truncate"/g,
  'className="hidden sm:block sm:col-span-2 md:col-span-2 lg:col-span-1 xl:col-span-1 text-neutral-500 dark:text-neutral-400 truncate"'
);
content = content.replace(
  /className="hidden md:block md:col-span-2 text-neutral-500 dark:text-neutral-400 font-mono"/g,
  'className="hidden md:block md:col-span-2 lg:col-span-2 xl:col-span-1 text-neutral-500 dark:text-neutral-400 font-mono"'
);
content = content.replace(
  /className="col-span-4 sm:col-span-3 md:col-span-2 text-neutral-500 dark:text-neutral-400 font-mono truncate"/g,
  'className="col-span-4 sm:col-span-3 md:col-span-2 lg:col-span-2 xl:col-span-2 text-neutral-500 dark:text-neutral-400 font-mono truncate"'
);

// We need to add the Created data cells to folder and file rows
// Find where Modified is rendered for folders: {formatFileDate(folder.modifiedAt || folder.updatedAt)}
content = content.replace(
  /\{formatFileDate\(folder.modifiedAt \|\| folder.updatedAt\)\}\n\s*<\/div>\n\n\s*\{\/\* Location \*\/\}\n\s*<div className="hidden lg:block lg:col-span-1 text-neutral-400 dark:text-neutral-500 truncate" title=\{loc\}>/,
  `{formatFileDate(folder.modifiedAt || folder.updatedAt)}
              </div>

              {/* Created */}
              <div className="hidden xl:block xl:col-span-2 text-neutral-500 dark:text-neutral-400 font-mono truncate">
                {formatFileDate(folder.createdAt)}
              </div>

              {/* Location */}
              <div className="hidden lg:block lg:col-span-2 xl:col-span-2 text-neutral-400 dark:text-neutral-500 truncate" title={loc}>`
);

// Find where Modified is rendered for files: {formatFileDate(file.modifiedAt || file.updatedAt)}
content = content.replace(
  /\{formatFileDate\(file.modifiedAt \|\| file.updatedAt\)\}\n\s*<\/div>\n\n\s*\{\/\* Location \*\/\}\n\s*<div className="hidden lg:block lg:col-span-1 text-neutral-400 dark:text-neutral-500 truncate" title=\{loc\}>/,
  `{formatFileDate(file.modifiedAt || file.updatedAt)}
              </div>

              {/* Created */}
              <div className="hidden xl:block xl:col-span-2 text-neutral-500 dark:text-neutral-400 font-mono truncate">
                {formatFileDate(file.createdAt)}
              </div>

              {/* Location */}
              <div className="hidden lg:block lg:col-span-2 xl:col-span-2 text-neutral-400 dark:text-neutral-500 truncate" title={loc}>`
);

fs.writeFileSync('src/components/files/FileListView.tsx', content, 'utf8');
