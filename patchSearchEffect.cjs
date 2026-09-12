const fs = require('fs');

let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

content = content.replace(
  /const isGlobal = debouncedSearchQuery\.trim\(\)\.length > 0 \|\| activeFilter !== 'all';/,
  `useEffect(() => {
    let mounted = true;
    async function performSearch() {
      if (debouncedSearchQuery.trim().length > 0 || activeFilter !== 'all') {
        try {
          const { searchFilesOptimized } = await import('../services/fileService');
          const results = await searchFilesOptimized(debouncedSearchQuery);
          if (mounted) setSearchResults(results);
        } catch (e) {
          console.error("Search failed", e);
        }
      } else {
         if (mounted) setSearchResults([]);
      }
    }
    performSearch();
    return () => { mounted = false; };
  }, [debouncedSearchQuery, activeFilter]);

  const isGlobal = debouncedSearchQuery.trim().length > 0 || activeFilter !== 'all';`
);

fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
