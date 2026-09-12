const fs = require('fs');

let content = fs.readFileSync('src/pages/Files.tsx', 'utf8');

const newHandlers = `
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
`;

content = content.replace(/\s*\/\/ Delete execute\n/, '\n' + newHandlers);

fs.writeFileSync('src/pages/Files.tsx', content, 'utf8');
