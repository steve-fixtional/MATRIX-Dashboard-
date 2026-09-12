const fs = require('fs');

let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

// Replace filteredAndSorted
const filteredAndSortedCode = `  const filteredAndSorted = useMemo(() => {
    const isGlobal = searchQuery.trim().length > 0 || activeFilter !== 'all';
    let sourceFolders = isGlobal ? allFolders : folders;
    let sourceFiles = isGlobal ? allFiles : files;

    let fFolders = [...sourceFolders];
    let fFiles = [...sourceFiles];

    if (activeFilter === 'trash') {
      // Only show deleted items in Trash
      fFolders = fFolders.filter(f => f.deletedAt);
      fFiles = fFiles.filter(f => f.deletedAt);
    } else {
      // Hide deleted items from all other views
      fFolders = fFolders.filter(f => !f.deletedAt);
      fFiles = fFiles.filter(f => !f.deletedAt);
      
      if (activeFilter === 'recent') {
        fFolders = [];
        const recentStr = localStorage.getItem('matrix_recent_files');
        let recentFiles = [];
        try {
          if (recentStr) recentFiles = JSON.parse(recentStr);
        } catch(e) {}
        
        const recentIds = new Set(recentFiles.map(r => r.id));
        fFiles = fFiles.filter(f => recentIds.has(f.id));
        
        // We will sort them by the recent timestamp instead of standard sort
        const recentMap = new Map(recentFiles.map(r => [r.id, r.timestamp]));
        fFiles.sort((a, b) => (recentMap.get(b.id) || 0) - (recentMap.get(a.id) || 0));
        
        return { folders: fFolders, files: fFiles, isGlobal }; // return early to keep recent sort
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      fFolders = fFolders.filter((f) => f.name.toLowerCase().includes(q));
      fFiles = fFiles.filter((f) => {
        const typeInfo = getFileTypeInfo(f.mimeType, f.name);
        return (
          f.name.toLowerCase().includes(q) ||
          f.originalName?.toLowerCase().includes(q) ||
          f.tags?.some((t) => t.toLowerCase().includes(q)) ||
          typeInfo.label.toLowerCase().includes(q) ||
          typeInfo.category.toLowerCase().includes(q) ||
          (f.mimeType && f.mimeType.toLowerCase().includes(q))
        );
      });
    }

    if (activeFilter !== 'all' && activeFilter !== 'trash') {
      if (activeFilter === 'favorites') {
        fFolders = fFolders.filter(f => f.favorite);
        fFiles = fFiles.filter(f => f.favorite);
      } else {
        fFolders = [];
        fFiles = fFiles.filter(f => {
          const cat = getFileTypeInfo(f.mimeType, f.name).category;
          switch (activeFilter) {
            case 'image': return cat === 'image';
            case 'video': return cat === 'video';
            case 'audio': return cat === 'audio';
            case 'archive': return cat === 'archive';
            case 'document': return cat === 'pdf' || cat === 'text' || cat === 'spreadsheet';
            case 'other': return cat === 'binary' || cat === 'code';
            default: return true;
          }
        });
      }
    }

    const mult = sortDirection === 'asc' ? 1 : -1;
    fFolders.sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name) * mult;
      if (sortField === 'modified') return ((a.modifiedAt || a.updatedAt) - (b.modifiedAt || b.updatedAt)) * mult;
      if (sortField === 'created') return (a.createdAt - b.createdAt) * mult;
      return a.name.localeCompare(b.name) * mult;
    });

    fFiles.sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name) * mult;
      if (sortField === 'modified') return ((a.modifiedAt || a.updatedAt) - (b.modifiedAt || b.updatedAt)) * mult;
      if (sortField === 'created') return (a.createdAt - b.createdAt) * mult;
      if (sortField === 'size') return ((a.size || 0) - (b.size || 0)) * mult;
      if (sortField === 'type') return (a.mimeType || '').localeCompare(b.mimeType || '') * mult;
      return a.name.localeCompare(b.name) * mult;
    });

    return { folders: fFolders, files: fFiles, isGlobal };
  }, [folders, files, allFolders, allFiles, searchQuery, activeFilter, sortField, sortDirection]);`;

content = content.replace(
  /const filteredAndSorted = useMemo\(\(\) => \{[\s\S]*?\}, \[folders, files, allFolders, allFiles, searchQuery, activeFilter, sortField, sortDirection\]\);/,
  filteredAndSortedCode
);

// Add 'recent' and 'trash' to filters array
const filtersArray = `{ id: 'other', label: 'Other' },
                        { id: 'favorites', label: 'Favorites' },
                        { id: 'recent', label: 'Recent' },
                        { id: 'trash', label: 'Trash' }`;
content = content.replace(
  /\{ id: 'other', label: 'Other' \},\n\s*\{ id: 'favorites', label: 'Favorites' \}/g,
  filtersArray
);

// Handle track recent files in onOpenFile
content = content.replace(
  /onOpenFile=\{\(file\) => setPreviewFile\(file\)\}/g,
  `onOpenFile={(file) => {
                setPreviewFile(file);
                const recentStr = localStorage.getItem('matrix_recent_files');
                let recentFiles = [];
                try {
                  if (recentStr) recentFiles = JSON.parse(recentStr);
                } catch(e) {}
                recentFiles = recentFiles.filter(r => r.id !== file.id);
                recentFiles.unshift({ id: file.id, timestamp: Date.now() });
                recentFiles = recentFiles.slice(0, 20); // limit to 20
                localStorage.setItem('matrix_recent_files', JSON.stringify(recentFiles));
              }}`
);

// Add restore and permanent delete functions
const restoreFunctions = `
  const handleRestoreFile = async (file: MatrixFile) => {
    try {
      const { restoreFile } = await import('../services/fileService');
      await restoreFile(file.id);
      loadData(true);
    } catch(err) {
      console.error(err);
    }
  };

  const handleRestoreFolder = async (folder: MatrixFolder) => {
    try {
      const { restoreFolder } = await import('../services/fileService');
      await restoreFolder(folder.id);
      loadData(true);
    } catch(err) {
      console.error(err);
    }
  };

  const handlePermanentDeleteFile = async (file: MatrixFile) => {
    if (!window.confirm(\`Are you sure you want to permanently delete "\${file.name}"? This cannot be undone.\`)) return;
    try {
      await deleteFile(file.id, true);
      loadData(true);
    } catch(err) {
      console.error(err);
    }
  };

  const handlePermanentDeleteFolder = async (folder: MatrixFolder) => {
    if (!window.confirm(\`Are you sure you want to permanently delete "\${folder.name}" and all its contents? This cannot be undone.\`)) return;
    try {
      await deleteFolder(folder.id, true, true);
      loadData(true);
    } catch(err) {
      console.error(err);
    }
  };
  
  const handleEmptyTrash = async () => {
    if (!window.confirm('Are you sure you want to empty the trash? All deleted items will be permanently removed. This cannot be undone.')) return;
    try {
      const { emptyTrash } = await import('../services/fileService');
      await emptyTrash();
      loadData(true);
    } catch(err) {
      console.error(err);
    }
  };
`;

content = content.replace(
  /const handleDeleteFolder = async \(\) => \{/,
  restoreFunctions + '\n  const handleDeleteFolder = async () => {'
);

// Add isTrashView and onRestore/onPermanentDelete to FileGridView and FileListView
content = content.replace(
  /onDownloadFile=\{handleDownloadFile\}/g,
  `onDownloadFile={handleDownloadFile}
              isTrashView={activeFilter === 'trash'}
              onRestoreFile={handleRestoreFile}
              onRestoreFolder={handleRestoreFolder}
              onPermanentDeleteFile={handlePermanentDeleteFile}
              onPermanentDeleteFolder={handlePermanentDeleteFolder}`
);

// Empty trash button in header if activeFilter is trash
const emptyTrashBtn = `{activeFilter === 'trash' && (
              <Button onClick={handleEmptyTrash} variant="danger" className="ml-2">
                Empty Trash
              </Button>
            )}`;
            
content = content.replace(
  /<Button\s+onClick=\{\(\) => setIsNewFolderOpen\(true\)\}\s+variant="secondary"\s+className="hidden sm:flex"\s*>\s*<FolderPlus className="h-4 w-4 mr-2" \/>\s*New Folder\s*<\/Button>/,
  `<Button
              onClick={() => setIsNewFolderOpen(true)}
              variant="secondary"
              className="hidden sm:flex"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
            ${emptyTrashBtn}`
);


// FolderPlus is not imported, let's fix the regex to find the New menu instead, there is no FolderPlus in the New menu but maybe NewFolderModal trigger? Wait, I will just put it near the "Upload File" button.
// Let's use string search.
fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
