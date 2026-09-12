const fs = require('fs');

let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

// Add Filter, ListFilter icons
content = content.replace(
  /LayoutGrid,/,
  "Filter, ListFilter, LayoutGrid,"
);

// Add getFileTypeInfo to imports from fileUtils
content = content.replace(
  /import { crossTabSync/,
  "import { getFileTypeInfo } from '../components/files/fileUtils';\nimport { crossTabSync"
);

// Add filter state
const statePattern = /const \[searchQuery, setSearchQuery\] = useState\(''\);/;
const filterStateCode = `  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>(() => {
    return localStorage.getItem('matrix_files_filter') || 'all';
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId);
    localStorage.setItem('matrix_files_filter', filterId);
    setIsFilterOpen(false);
  };
`;
content = content.replace(statePattern, filterStateCode);

// Add handleGoToFolder function
const handlersStartPattern = /\/\/ Sort header toggling/;
const handlersCode = `// Navigate to a specific item's parent folder
  const handleGoToFolder = useCallback((parentFolderId: string | null) => {
    handleNavigateFolder(parentFolderId);
  }, [handleNavigateFolder]);

  // Sort header toggling`;
content = content.replace(handlersStartPattern, handlersCode);

// Modify filteredAndSorted
const filteredAndSortedPattern = /const filteredAndSorted = useMemo\(\(\) => \{[\s\S]*?\}, \[folders, files, searchQuery, sortField, sortDirection\]\);/;
const newFilteredAndSortedCode = `const filteredAndSorted = useMemo(() => {
    const isGlobal = searchQuery.trim().length > 0 || activeFilter !== 'all';
    let sourceFolders = isGlobal ? allFolders : folders;
    let sourceFiles = isGlobal ? allFiles : files;

    let fFolders = [...sourceFolders];
    let fFiles = [...sourceFiles];

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

    if (activeFilter !== 'all') {
      // Folders do not match most file filters except maybe 'favorites'
      if (activeFilter === 'favorites') {
        // Assume folders don't have favorites implemented right now, hide them
        fFolders = [];
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
content = content.replace(filteredAndSortedPattern, newFilteredAndSortedCode);

// Add sorting localstorage
const setSortFieldPattern = /setSortField\(field\);/;
content = content.replace(setSortFieldPattern, "setSortField(field);\n      localStorage.setItem('matrix_files_sort_field', field);");

const setSortDirPattern = /setSortDirection\(\(prev\) => \(prev === 'asc' \? 'desc' : 'asc'\)\);/;
content = content.replace(setSortDirPattern, `setSortDirection((prev) => {
        const next = prev === 'asc' ? 'desc' : 'asc';
        localStorage.setItem('matrix_files_sort_direction', next);
        return next;
      });`);

// Fix sort state initialization
const sortStatePattern = /const \[sortField, setSortField\] = useState<SortField>\('name'\);\n  const \[sortDirection, setSortDirection\] = useState<SortDirection>\('asc'\);/;
const newSortStateCode = `  const [sortField, setSortField] = useState<SortField>(() => {
    return (localStorage.getItem('matrix_files_sort_field') as SortField) || 'name';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    return (localStorage.getItem('matrix_files_sort_direction') as SortDirection) || 'asc';
  });`;
content = content.replace(sortStatePattern, newSortStateCode);


fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
