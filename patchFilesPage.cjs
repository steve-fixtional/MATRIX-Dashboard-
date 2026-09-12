const fs = require('fs');

let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

// Replace state
content = content.replace(
  /const \[allFiles, setAllFiles\] = useState<MatrixFile\[\]>\(\[\]\);/,
  `// allFiles removed for memory optimization
  const [searchResults, setSearchResults] = useState<MatrixFile[]>([]);
  const [metrics, setMetrics] = useState({ totalBytes: 0, fileCount: 0, folderCount: 0 });
  const [folderItemCounts, setFolderItemCounts] = useState<Record<string, number>>({});
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);`
);

// Replace loadData
content = content.replace(
  /const \[currentFiles, currentFolders, allFList, allFilesList, path\] = await Promise\.all\(\[\s+listFiles\(\{ parentFolderId: currentFolderId, includeDeleted: true \}\),\s+listFolders\(currentFolderId, true\),\s+getAllFolders\(true\),\s+listFiles\(\{ includeDeleted: true \}\), \/\/ all files to compute storage metrics and item counts\s+getFolderPath\(currentFolderId\),\s+\]\);[\s\S]*?setAllFiles\(allFilesList\);/,
  `const { getStorageMetricsOptimized, getFolderItemCountsOptimized } = await import('../services/fileService');
      const [currentFiles, currentFolders, allFList, path, newMetrics, itemCounts] = await Promise.all([
        listFiles({ parentFolderId: currentFolderId, includeDeleted: true }),
        listFolders(currentFolderId, true),
        getAllFolders(true),
        getFolderPath(currentFolderId),
        getStorageMetricsOptimized(),
        getFolderItemCountsOptimized()
      ]);

      setFiles(currentFiles);
      setFolders(currentFolders);
      setAllFolders(allFList);
      setFolderPath(path);
      setMetrics(newMetrics);
      setFolderItemCounts(itemCounts);`
);

// Replace folderItemCounts useMemo
content = content.replace(
  /\/\/ Calculate items count per folder[\s\S]*?\}, \[allFiles, allFolders\]\);/,
  `// folderItemCounts is now fetched directly in loadData`
);

// Replace totalBytes useMemo
content = content.replace(
  /\/\/ Total storage metrics[\s\S]*?\}, \[allFiles\]\);/,
  `const totalBytes = metrics.totalBytes;`
);

// Replace filteredAndSorted
content = content.replace(
  /const isGlobal = searchQuery\.trim\(\)\.length > 0 \|\| activeFilter !== 'all';\s+let sourceFolders = isGlobal \? allFolders : folders;\s+let sourceFiles = isGlobal \? allFiles : files;/,
  `const isGlobal = debouncedSearchQuery.trim().length > 0 || activeFilter !== 'all';
    let sourceFolders = isGlobal ? allFolders : folders;
    let sourceFiles = isGlobal ? searchResults : files;`
);

content = content.replace(
  /}, \[folders, files, allFolders, allFiles, searchQuery, activeFilter, sortField, sortDirection\]\);/,
  `}, [folders, files, allFolders, searchResults, debouncedSearchQuery, activeFilter, sortField, sortDirection]);`
);

content = content.replace(
  /fileCount=\{allFiles\.length\}/g,
  `fileCount={metrics.fileCount}`
);

fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
