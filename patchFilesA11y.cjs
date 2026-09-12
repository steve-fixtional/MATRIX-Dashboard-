const fs = require('fs');

let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

content = content.replace(/<button\n\s*type="button"\n\s*onClick=\{\(\) => setSearchQuery\(''\)\}/g, '<button\n                  aria-label="Clear search"\n                  type="button"\n                  onClick={() => setSearchQuery(\'\')}');
content = content.replace(/<button\n\s*id="files-sort-direction-btn"/g, '<button\n                aria-label="Toggle sort direction"\n                id="files-sort-direction-btn"');
content = content.replace(/<button\n\s*id="files-filter-btn"/g, '<button\n                aria-label="Filter options"\n                id="files-filter-btn"');
content = content.replace(/<button\n\s*id="view-grid-btn"/g, '<button\n                aria-label="Grid view"\n                id="view-grid-btn"');
content = content.replace(/<button\n\s*id="view-list-btn"/g, '<button\n                aria-label="List view"\n                id="view-list-btn"');

content = content.replace(/<button onClick=\{\(\) => setIsFilterOpen\(false\)\}/g, '<button aria-label="Close filters" onClick={() => setIsFilterOpen(false)}');

fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
