import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Upload,
  Filter, ListFilter, LayoutGrid,
  List as ListIcon,
  HardDrive,
  RefreshCw,
  AlertCircle,
  X,
  ArrowUpDown,
  UploadCloud,
  FilePlus,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { MatrixFile, MatrixFolder } from '../domain/types';
import {
  listFiles,
  listFolders,
  getAllFolders,
  getFolderPath,
  uploadFile,
  createFolder,
  renameFile,
  renameFolder,
  moveFile,
  moveFolder,
  deleteFile,
  deleteFolder,
  toggleFavorite,
  updateFileTags,
  downloadFile,
} from '../services/fileService';
import { getFileTypeInfo } from '../components/files/fileUtils';
import { crossTabSync } from '../services/crossTabSync';

import { FileBreadcrumbs } from '../components/files/FileBreadcrumbs';
import { FileStorageIndicator } from '../components/files/FileStorageIndicator';
import { FileNewMenu } from '../components/files/FileNewMenu';
import { FileGridView } from '../components/files/FileGridView';
import { FileListView, SortField, SortDirection } from '../components/files/FileListView';
import { FileOrFolder } from '../components/files/FileActionMenu';
import { FileBottomSheet } from '../components/files/FileBottomSheet';
import { FilePreviewModal } from '../components/files/FilePreviewModal';
import { NewFolderModal } from '../components/files/NewFolderModal';
import { FileRenameModal } from '../components/files/FileRenameModal';
import { FileMoveModal } from '../components/files/FileMoveModal';
import { FileTagsModal } from '../components/files/FileTagsModal';
import { FileDeleteModal } from '../components/files/FileDeleteModal';
import { FileConflictModal } from '../components/files/FileConflictModal';
import { fileSyncEngine } from '../services/storage/fileSyncEngine';
import { useUploadQueue } from '../components/files/useUploadQueue';
import { FileUploadQueue } from '../components/files/FileUploadQueue';
import { cn } from '../utils';

export function Files() {
  const [searchParams, setSearchParams] = useSearchParams();
  const folderParam = searchParams.get('folder');
  const currentFolderId = folderParam || null;

  // Data state
  const [files, setFiles] = useState<MatrixFile[]>([]);
  const [folders, setFolders] = useState<MatrixFolder[]>([]);
  const [allFolders, setAllFolders] = useState<MatrixFolder[]>([]);
  // allFiles removed for memory optimization
  const [searchResults, setSearchResults] = useState<MatrixFile[]>([]);
  const [metrics, setMetrics] = useState({ totalBytes: 0, fileCount: 0, folderCount: 0 });
  const [folderItemCounts, setFolderItemCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);
  const [folderPath, setFolderPath] = useState<MatrixFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI Controls
  const [activeFilter, setActiveFilter] = useState<string>(() => {
    return localStorage.getItem('matrix_files_filter') || 'all';
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId);
    localStorage.setItem('matrix_files_filter', filterId);
    setIsFilterOpen(false);
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('matrix_files_view') as 'grid' | 'list') || 'grid';
  });
    const [sortField, setSortField] = useState<SortField>(() => {
    return (localStorage.getItem('matrix_files_sort_field') as SortField) || 'name';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    return (localStorage.getItem('matrix_files_sort_direction') as SortDirection) || 'asc';
  });

  // Drag and drop upload
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<MatrixFile | null>(null);
  const [renameItem, setRenameItem] = useState<{ isFolder: boolean; id: string; name: string } | null>(null);
  const [moveItem, setMoveItem] = useState<{ isFolder: boolean; id: string; name: string; currentParentId: string | null } | null>(null);
  const [tagsFile, setTagsFile] = useState<MatrixFile | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ isFolder: boolean; id: string; name: string } | null>(null);

  // Mobile Bottom Sheet
  const [bottomSheetItem, setBottomSheetItem] = useState<FileOrFolder | null>(null);

  // Persist view mode preference
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('matrix_files_view', mode);
  };

  // Navigate folder
  const handleNavigateFolder = useCallback((folderId: string | null) => {
    if (folderId) {
      setSearchParams({ folder: folderId });
    } else {
      setSearchParams({});
    }
    setSearchQuery('');
  }, [setSearchParams]);

  // Load all folder & file data
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { getStorageMetricsOptimized, getFolderItemCountsOptimized } = await import('../services/fileService');
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
      setFolderItemCounts(itemCounts);
      setFolderPath(path);
    } catch (err: any) {
      console.error('Failed to load files:', err);
      setError(err?.message || 'Failed to load files from storage');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentFolderId]);

  // Upload Queue Hook
  const uploadQueue = useUploadQueue(() => {
    loadData(true);
  });

  useEffect(() => {
    loadData();

    // Cross-tab synchronization
    const unsubscribe = crossTabSync.onDataChange((event) => {
      if (event.storeName === 'files' || event.storeName === 'folders') {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  // folderItemCounts is now fetched directly in loadData

  // Map of folder paths for table view location display
  const folderPathNames = useMemo(() => {
    const map: Record<string, string> = {};
    const folderNameMap = new Map<string, string>();
    for (const f of allFolders) {
      folderNameMap.set(f.id, f.name);
    }
    
    const visibleFiles = searchResults.length > 0 ? searchResults : files;
    for (const f of visibleFiles) {
      if (!f.parentFolderId) {
        map[f.id] = 'Files (Root)';
      } else {
        map[f.id] = folderNameMap.get(f.parentFolderId) || 'Folder';
      }
    }
    for (const f of allFolders) {
      if (!f.parentFolderId) {
        map[f.id] = 'Files (Root)';
      } else {
        map[f.id] = folderNameMap.get(f.parentFolderId) || 'Folder';
      }
    }
    return map;
  }, [files, searchResults, allFolders]);

  // Current location friendly name
  const currentLocationName = useMemo(() => {
    if (folderPath.length === 0) return 'Files (Root)';
    return folderPath[folderPath.length - 1]?.name || 'Files';
  }, [folderPath]);

  const totalBytes = metrics.totalBytes;

  useEffect(() => {
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

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    const isGlobal = debouncedSearchQuery.trim().length > 0 || activeFilter !== 'all';
    let sourceFolders = isGlobal ? allFolders : folders;
    let sourceFiles = isGlobal ? searchResults : files;

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
  }, [folders, files, allFolders, searchResults, debouncedSearchQuery, activeFilter, sortField, sortDirection]);

  // Navigate to a specific item's parent folder
  const handleGoToFolder = useCallback((parentFolderId: string | null) => {
    handleNavigateFolder(parentFolderId);
  }, [handleNavigateFolder]);

  // Sort header toggling
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => {
        const next = prev === 'asc' ? 'desc' : 'asc';
        localStorage.setItem('matrix_files_sort_direction', next);
        return next;
      });
    } else {
      setSortField(field);
      localStorage.setItem('matrix_files_sort_field', field);
      setSortDirection('asc');
    }
  };

  // Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    uploadQueue.addFiles(uploadedFiles, currentFolderId, currentLocationName);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadQueue.addFiles(e.dataTransfer.files, currentFolderId, currentLocationName);
    }
  };

  // File Download action
  const handleDownloadFile = async (file: MatrixFile) => {
    try {
      const { blob, externalUrl, filename } = await downloadFile(file.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (externalUrl) {
        window.open(externalUrl, '_blank');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to download file');
    }
  };

  // Toggle favorite
  
  const handleToggleFavoriteFolder = async (folder: MatrixFolder) => {
    try {
      const { updateFolder } = await import('../services/fileService');
      await updateFolder(folder.id, { favorite: !folder.favorite });
      loadData(true);
    } catch(err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = async (file: MatrixFile) => {
    try {
      const updated = await toggleFavorite(file.id);
      setFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
      if (previewFile?.id === file.id) {
        setPreviewFile(updated);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle favorite');
    }
  };

  // Create folder
  const handleCreateFolder = async (name: string, color?: string) => {
    await createFolder(name, currentFolderId, { color });
    await loadData();
  };

  // Rename execute
  const handleRenameConfirm = async (newName: string) => {
    if (!renameItem) return;
    if (renameItem.isFolder) {
      await renameFolder(renameItem.id, newName);
    } else {
      await renameFile(renameItem.id, newName);
    }
    await loadData();
  };

  // Move execute
  const handleMoveConfirm = async (targetFolderId: string | null) => {
    if (!moveItem) return;
    if (moveItem.isFolder) {
      await moveFolder(moveItem.id, targetFolderId);
    } else {
      await moveFile(moveItem.id, targetFolderId);
    }
    await loadData();
  };

  // Tags save
  const handleSaveTags = async (newTags: string[]) => {
    if (!tagsFile) return;
    const updated = await updateFileTags(tagsFile.id, newTags);
    setFiles((prev) => prev.map((f) => (f.id === tagsFile.id ? updated : f)));
    if (previewFile?.id === tagsFile.id) {
      setPreviewFile(updated);
    }
  };

  // Trash and Restore handlers
  const handleRestoreFile = async (fileId: string) => {
    try {
      const { restoreFile } = await import('../services/fileService');
      await restoreFile(fileId);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to restore file');
    }
  };

  const handleRestoreFolder = async (folderId: string) => {
    try {
      const { restoreFolder } = await import('../services/fileService');
      await restoreFolder(folderId);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to restore folder');
    }
  };

  const handlePermanentDeleteFile = async (fileId: string) => {
    if (!window.confirm("Permanently delete this file? This cannot be undone.")) return;
    try {
      await deleteFile(fileId, true);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to permanently delete file');
    }
  };

  const handlePermanentDeleteFolder = async (folderId: string) => {
    if (!window.confirm("Permanently delete this folder? This cannot be undone.")) return;
    try {
      const { deleteFolder } = await import('../services/fileService');
      await deleteFolder(folderId, true, true);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to permanently delete folder');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("Are you sure you want to permanently delete all items in the trash? This cannot be undone.")) return;
    try {
      const { listFiles, listFolders, deleteFolder } = await import('../services/fileService');
      const trashFiles = await listFiles({ includeDeleted: true });
      const trashFolders = await listFolders({ includeDeleted: true });
      
      const deletedFiles = trashFiles.filter(f => f.deletedAt);
      const deletedFolders = trashFolders.filter(f => f.deletedAt);

      for (const f of deletedFiles) {
        await deleteFile(f.id, true);
      }
      for (const f of deletedFolders) {
        await deleteFolder(f.id, false, true);
      }
      
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to empty trash');
    }
  };

  // Delete execute
  const handleDeleteConfirm = async (deleteContents?: boolean) => {
    if (!deleteItem) return;
    if (deleteItem.isFolder) {
      await deleteFolder(deleteItem.id, deleteContents);
    } else {
      await deleteFile(deleteItem.id);
    }
    await loadData();
  };

  const hasItems = filteredAndSorted.folders.length > 0 || filteredAndSorted.files.length > 0;

  return (
    <PageWrapper className="flex flex-col h-full max-w-5xl mx-auto w-full p-0 sm:p-2 md:p-4">
      {/* Hidden file input for native file picking */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      <div
        className="flex flex-col h-full bg-white dark:bg-neutral-950 sm:rounded-2xl sm:border border-neutral-200 dark:border-neutral-800 sm:shadow-xs overflow-hidden relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag and drop overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 bg-neutral-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white border-2 border-dashed border-neutral-400 m-2 rounded-xl pointer-events-none">
            <UploadCloud className="h-12 w-12 mb-3 animate-bounce text-neutral-300" />
            <p className="text-base font-semibold">Drop files here to upload</p>
            <p className="text-xs text-neutral-400 mt-1">Files will be saved into {currentLocationName}</p>
          </div>
        )}

        {/* 1. Desktop & Mobile Top Bar */}
        <div className="p-4 sm:p-6 border-b border-neutral-100 dark:border-neutral-800/80 shrink-0 space-y-3">
          {/* Main Top Header Line */}
          <div className="flex items-center justify-between gap-3">
            {/* Page Title: Files */}
            <div className="flex items-center gap-2.5 shrink-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                Files
              </h1>
            </div>

            {/* Desktop Search Field */}
            <div className="hidden md:flex flex-1 max-w-xs relative items-center">
              <Search className="absolute left-3 h-4 w-4 text-neutral-400 pointer-events-none" />
              <input
                id="files-search-input-desktop"
                type="text"
                placeholder="Search files & folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-lg text-xs bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 transition-all"
              />
              {searchQuery && (
                <button
                  aria-label="Clear search"
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Actions & Storage Indicator */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Storage Indicator */}
              <FileStorageIndicator
                totalBytes={totalBytes}
                fileCount={metrics.fileCount}
                folderCount={allFolders.length}
                className="hidden lg:flex"
              />

              {/* Compact storage indicator for tablet */}
              <FileStorageIndicator
                totalBytes={totalBytes}
                fileCount={metrics.fileCount}
                folderCount={allFolders.length}
                compact
                className="hidden sm:flex lg:hidden"
              />

              {/* Upload Button */}
              <Button
                id="files-upload-btn"
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5"
                title="Upload files"
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </Button>

              {/* Contextual New Button */}
              {activeFilter === 'trash' && (
              <Button onClick={handleEmptyTrash} variant="danger" className="mr-2">
                Empty Trash
              </Button>
            )}
            <FileNewMenu
                onNewFolder={() => setIsNewFolderOpen(true)}
                onUploadFiles={() => fileInputRef.current?.click()}
              />
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-neutral-400 pointer-events-none" />
            <input
              id="files-search-input-mobile"
              type="text"
              placeholder="Search files & folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-8 rounded-lg text-sm bg-neutral-100/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            />
            {searchQuery && (
              <button
                  aria-label="Clear search"
                  type="button"
                  onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Controls Bar (Below Top Bar): Breadcrumb, View Controls, Sort Controls */}
        <div className="px-4 sm:px-6 py-2.5 bg-neutral-50/50 dark:bg-neutral-900/20 border-b border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Breadcrumb Navigation */}
          <FileBreadcrumbs
            currentFolderId={currentFolderId}
            path={folderPath}
            onNavigate={handleNavigateFolder}
            className="flex-1 min-w-[180px]"
          />

          {/* View and Sort Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort controls (Dropdown or toggler) */}
            <div className="flex items-center gap-1 text-xs">
              <span className="hidden sm:inline text-neutral-400 dark:text-neutral-500 font-medium mr-1">
                Sort:
              </span>
              <select
                id="files-sort-select"
                aria-label="Sort files by"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="h-8 pl-2 pr-6 rounded-md text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-400"
              >
                <option value="name">Name</option>
                <option value="modified">Modified</option>
                <option value="created">Created</option>
                <option value="size">Size</option>
                <option value="type">Type</option>
              </select>

              <button
                aria-label="Toggle sort direction"
                id="files-sort-direction-btn"
                type="button"
                onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="h-8 w-8 rounded-md flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                title={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
              >
                {sortDirection === 'asc' ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

                        {/* Filter Toggle */}
            <div className="relative">
              <button
                aria-label="Filter options"
                id="files-filter-btn"
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  "h-8 px-2.5 rounded-md flex items-center justify-center border transition-colors text-xs font-medium gap-1.5",
                  activeFilter !== 'all' 
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                )}
                title="Filter files"
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {activeFilter === 'all' ? 'Filter' : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
                </span>
              </button>

              {isFilterOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 sm:hidden" 
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <div 
                    className="fixed inset-0 z-40 hidden sm:block" 
                    onClick={() => setIsFilterOpen(false)}
                  />
                  
                  {/* Desktop Popover */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden hidden sm:block">
                    <div className="p-1">
                      {[
                        { id: 'all', label: 'All Files' },
                        { id: 'image', label: 'Images' },
                        { id: 'document', label: 'Documents' },
                        { id: 'video', label: 'Videos' },
                        { id: 'audio', label: 'Audio' },
                        { id: 'archive', label: 'Archives' },
                        { id: 'other', label: 'Other' },
                        { id: 'favorites', label: 'Favorites' },
                        { id: 'recent', label: 'Recent' },
                        { id: 'trash', label: 'Trash' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => handleFilterChange(f.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                            activeFilter === f.id
                              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium"
                              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-100"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile Bottom Sheet for Filters */}
                  <div className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-neutral-900 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)] sm:hidden transform transition-transform duration-300">
                    <div className="p-4 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800">
                      <h3 className="font-medium text-neutral-900 dark:text-neutral-100">Filter Files</h3>
                      <button aria-label="Close filters" onClick={() => setIsFilterOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="p-2 grid grid-cols-2 gap-2">
                      {[
                        { id: 'all', label: 'All Files' },
                        { id: 'image', label: 'Images' },
                        { id: 'document', label: 'Documents' },
                        { id: 'video', label: 'Videos' },
                        { id: 'audio', label: 'Audio' },
                        { id: 'archive', label: 'Archives' },
                        { id: 'other', label: 'Other' },
                        { id: 'favorites', label: 'Favorites' },
                        { id: 'recent', label: 'Recent' },
                        { id: 'trash', label: 'Trash' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => handleFilterChange(f.id)}
                          className={cn(
                            "text-left px-4 py-3 text-sm rounded-xl transition-colors font-medium",
                            activeFilter === f.id
                              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                              : "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 active:bg-neutral-100 dark:active:bg-neutral-800"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="h-6" />
                  </div>
                </>
              )}
            </div>

            {/* Separator */}
            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800 mx-0.5" />

            {/* View controls: Grid & List */}
            <div className="flex items-center p-0.5 rounded-lg bg-neutral-200/50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
              <button
                aria-label="Grid view"
                id="view-grid-btn"
                type="button"
                onClick={() => handleViewModeChange('grid')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === 'grid'
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                )}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                aria-label="List view"
                id="view-list-btn"
                type="button"
                onClick={() => handleViewModeChange('list')}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  viewMode === 'list'
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                )}
                title="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Main Content View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Loading Skeleton State */}
          {loading && !hasItems ? (
            <div id="files-loading-state" className="space-y-6 animate-pulse">
              <div className="space-y-2.5">
                <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-28 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 p-4"
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2.5 pt-4">
                <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="h-44 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 p-4"
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : error ? (
            /* Error State with clear recoverable message and Retry */
            <div
              id="files-error-state"
              className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20 max-w-md mx-auto my-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Unable to load files
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
                {error}
              </p>
              <Button
                id="files-retry-btn"
                variant="primary"
                size="sm"
                onClick={loadData}
                className="mt-5 flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </Button>
            </div>
          ) : !hasItems ? (
            /* Polished MATRIX Empty State */
            filteredAndSorted.isGlobal ? (
              <EmptyState
                icon={Search}
                title="No matching files found"
                description={searchQuery.trim() ? `No files or folders matched "${searchQuery}".` : `No files match the active filter.`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => { setSearchQuery(''); handleFilterChange('all'); }}>
                    Clear Search & Filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={HardDrive}
                title="No files in this location"
                description="Files and documents uploaded here are stored locally on your device with offline availability. Drag and drop files anywhere on this page to begin."
                action={
                  <div className="flex items-center gap-3">
                    <Button
                      id="empty-state-upload-btn"
                      variant="primary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1.5" /> Upload Files
                    </Button>
                    <Button
                      id="empty-state-new-folder-btn"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsNewFolderOpen(true)}
                    >
                      <FilePlus className="h-4 w-4 mr-1.5" /> New Folder
                    </Button>
                  </div>
                }
              />
            )
          ) : viewMode === 'grid' ? (
            <FileGridView
              folders={filteredAndSorted.folders}
              files={filteredAndSorted.files}
              folderItemCounts={folderItemCounts}
              onOpenFolder={(folder) => handleNavigateFolder(folder.id)}
              onOpenFile={(file) => {
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
              }}
              onPreviewFile={(file) => setPreviewFile(file)}
              onDownloadFile={handleDownloadFile}
              isTrashView={activeFilter === 'trash'}
              onRestoreFile={handleRestoreFile}
              onRestoreFolder={handleRestoreFolder}
              onPermanentDeleteFile={handlePermanentDeleteFile}
              onPermanentDeleteFolder={handlePermanentDeleteFolder}
              onRenameFolder={(folder) =>
                setRenameItem({ isFolder: true, id: folder.id, name: folder.name })
              }
              onRenameFile={(file) =>
                setRenameItem({ isFolder: false, id: file.id, name: file.name })
              }
              onMoveFolder={(folder) =>
                setMoveItem({
                  isFolder: true,
                  id: folder.id,
                  name: folder.name,
                  currentParentId: folder.parentFolderId,
                })
              }
              onMoveFile={(file) =>
                setMoveItem({
                  isFolder: false,
                  id: file.id,
                  name: file.name,
                  currentParentId: file.parentFolderId,
                })
              }
              onToggleFavorite={handleToggleFavorite}
              onToggleFavoriteFolder={handleToggleFavoriteFolder}
              onEditTags={(file) => setTagsFile(file)}
              onDeleteFolder={(folder) =>
                setDeleteItem({ isFolder: true, id: folder.id, name: folder.name })
              }
              onDeleteFile={(file) =>
                setDeleteItem({ isFolder: false, id: file.id, name: file.name })
              }
              onMobileOpenActions={(item) => setBottomSheetItem(item)}
              onGoToFolder={(f) => handleGoToFolder(f)}
            />
          ) : (
            <FileListView
              folders={filteredAndSorted.folders}
              files={filteredAndSorted.files}
              folderItemCounts={folderItemCounts}
              folderPathNames={folderPathNames}
              currentLocationName={currentLocationName}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              onOpenFolder={(folder) => handleNavigateFolder(folder.id)}
              onOpenFile={(file) => {
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
              }}
              onPreviewFile={(file) => setPreviewFile(file)}
              onDownloadFile={handleDownloadFile}
              isTrashView={activeFilter === 'trash'}
              onRestoreFile={handleRestoreFile}
              onRestoreFolder={handleRestoreFolder}
              onPermanentDeleteFile={handlePermanentDeleteFile}
              onPermanentDeleteFolder={handlePermanentDeleteFolder}
              onRenameFolder={(folder) =>
                setRenameItem({ isFolder: true, id: folder.id, name: folder.name })
              }
              onRenameFile={(file) =>
                setRenameItem({ isFolder: false, id: file.id, name: file.name })
              }
              onMoveFolder={(folder) =>
                setMoveItem({
                  isFolder: true,
                  id: folder.id,
                  name: folder.name,
                  currentParentId: folder.parentFolderId,
                })
              }
              onMoveFile={(file) =>
                setMoveItem({
                  isFolder: false,
                  id: file.id,
                  name: file.name,
                  currentParentId: file.parentFolderId,
                })
              }
              onToggleFavorite={handleToggleFavorite}
              onToggleFavoriteFolder={handleToggleFavoriteFolder}
              onEditTags={(file) => setTagsFile(file)}
              onDeleteFolder={(folder) =>
                setDeleteItem({ isFolder: true, id: folder.id, name: folder.name })
              }
              onDeleteFile={(file) =>
                setDeleteItem({ isFolder: false, id: file.id, name: file.name })
              }
              onMobileOpenActions={(item) => setBottomSheetItem(item)}
              onGoToFolder={(f) => handleGoToFolder(f)}
            />
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* 1. New Folder Modal */}
      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreate={handleCreateFolder}
        currentLocationName={currentLocationName}
        existingFolderNames={folders.map((f) => f.name)}
      />

      {/* 2. File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        onToggleFavorite={async (id) => {
          if (previewFile) await handleToggleFavorite(previewFile);
        }}
        onDownload={handleDownloadFile}
        onOpenRename={(file) => setRenameItem({ isFolder: false, id: file.id, name: file.name })}
        onOpenMove={(file) => setMoveItem({ isFolder: false, id: file.id, name: file.name })}
        onOpenTags={(file) => setTagsFile(file)}
        onNavigate={(direction) => {
          if (!previewFile) return;
          const idx = filteredAndSorted.files.findIndex(f => f.id === previewFile.id);
          if (idx === -1) return;
          if (direction === 'prev' && idx > 0) {
            setPreviewFile(filteredAndSorted.files[idx - 1]);
          } else if (direction === 'next' && idx < filteredAndSorted.files.length - 1) {
            setPreviewFile(filteredAndSorted.files[idx + 1]);
          }
        }}
        hasPrev={previewFile ? filteredAndSorted.files.findIndex(f => f.id === previewFile.id) > 0 : false}
        hasNext={previewFile ? filteredAndSorted.files.findIndex(f => f.id === previewFile.id) < filteredAndSorted.files.length - 1 : false}
      />

      {/* 3. Rename Modal */}
      <FileRenameModal
        isOpen={Boolean(renameItem)}
        onClose={() => setRenameItem(null)}
        currentName={renameItem?.name || ''}
        isFolder={renameItem?.isFolder}
        existingSiblingNames={renameItem?.isFolder ? folders.map((f) => f.name) : files.map((f) => f.name)}
        onRename={handleRenameConfirm}
      />

      {/* 4. Move Modal */}
      {moveItem && (
        <FileMoveModal
          isOpen={Boolean(moveItem)}
          onClose={() => setMoveItem(null)}
          entityName={moveItem.name}
          isFolder={moveItem.isFolder}
          entityId={moveItem.id}
          currentParentFolderId={moveItem.currentParentId}
          allFolders={allFolders}
          onMove={handleMoveConfirm}
        />
      )}

      {/* 5. Tags Modal */}
      {tagsFile && (
        <FileTagsModal
          isOpen={Boolean(tagsFile)}
          onClose={() => setTagsFile(null)}
          fileName={tagsFile.name}
          initialTags={tagsFile.tags || []}
          onSaveTags={handleSaveTags}
        />
      )}

      {/* 6. Delete Modal */}
      <FileDeleteModal
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        entityName={deleteItem?.name || ''}
        isFolder={deleteItem?.isFolder || false}
        entityId={deleteItem?.id}
        onConfirm={handleDeleteConfirm}
      />

      {/* 7. Mobile Bottom Sheet */}
      <FileBottomSheet
        isOpen={Boolean(bottomSheetItem)}
        onClose={() => setBottomSheetItem(null)}
        item={bottomSheetItem}
        onOpen={() => {
          if (!bottomSheetItem) return;
          if (bottomSheetItem.type === 'folder') {
            handleNavigateFolder(bottomSheetItem.data.id);
          } else {
            setPreviewFile(bottomSheetItem.data);
          }
        }}
        onPreview={
          bottomSheetItem?.type === 'file'
            ? () => setPreviewFile(bottomSheetItem.data)
            : undefined
        }
        onDownload={
          bottomSheetItem?.type === 'file'
            ? () => handleDownloadFile(bottomSheetItem.data)
            : undefined
        }
        onRename={() => {
          if (!bottomSheetItem) return;
          setRenameItem({
            isFolder: bottomSheetItem.type === 'folder',
            id: bottomSheetItem.data.id,
            name: bottomSheetItem.data.name,
          });
        }}
        onMove={() => {
          if (!bottomSheetItem) return;
          setMoveItem({
            isFolder: bottomSheetItem.type === 'folder',
            id: bottomSheetItem.data.id,
            name: bottomSheetItem.data.name,
            currentParentId: bottomSheetItem.data.parentFolderId,
          });
        }}
        onToggleFavorite={
          bottomSheetItem?.type === 'file'
            ? () => handleToggleFavorite(bottomSheetItem.data)
            : undefined
        }
        onEditTags={
          bottomSheetItem?.type === 'file'
            ? () => setTagsFile(bottomSheetItem.data)
            : undefined
        }
        onDelete={() => {
          if (!bottomSheetItem) return;
          setDeleteItem({
            isFolder: bottomSheetItem.type === 'folder',
            id: bottomSheetItem.data.id,
            name: bottomSheetItem.data.name,
          });
        }}
        onGoToFolder={() => bottomSheetItem && handleGoToFolder(bottomSheetItem.data.parentFolderId)}
      />

      {/* 8. Upload Queue Manager Panel */}
      <FileUploadQueue
        queue={uploadQueue.queue}
        isMinimized={uploadQueue.isMinimized}
        onToggleMinimize={() => uploadQueue.setIsMinimized(!uploadQueue.isMinimized)}
        onCancelUpload={uploadQueue.cancelUpload}
        onCancelAll={uploadQueue.cancelAll}
        onRetryUpload={uploadQueue.retryUpload}
        onRetryAllFailed={uploadQueue.retryAllFailed}
        onResolveConflict={uploadQueue.resolveConflict}
        onClearCompleted={uploadQueue.clearCompleted}
        onRemoveItem={uploadQueue.removeItem}
      />
    </PageWrapper>
  );
}
