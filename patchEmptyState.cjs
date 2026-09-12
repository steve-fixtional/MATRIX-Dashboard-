const fs = require('fs');

let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

content = content.replace(
  /searchQuery\.trim\(\) \? \(\n\s*<EmptyState/,
  'filteredAndSorted.isGlobal ? (\n              <EmptyState'
);

content = content.replace(
  /description=\{\`No files or folders matched "\$\{searchQuery\}"\. Try searching with a different term or clear the filter\.\`\}/,
  'description={searchQuery.trim() ? `No files or folders matched "${searchQuery}".` : `No files match the active filter.`}'
);

content = content.replace(
  /<Button size="sm" variant="secondary" onClick=\{.*?\}\>\n\s*Clear Search Filter\n\s*<\/Button>/,
  '<Button size="sm" variant="secondary" onClick={() => { setSearchQuery(\'\'); handleFilterChange(\'all\'); }}>\n                    Clear Search & Filters\n                  </Button>'
);

fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
