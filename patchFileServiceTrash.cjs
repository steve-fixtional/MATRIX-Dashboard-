const fs = require('fs');

let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

// Modifying deleteFolder to soft delete
content = content.replace(
  /export async function deleteFolder\(id: string, deleteContents = false\): Promise<void> \{[\s\S]*?crossTabSync.broadcastDataChange\('folders', id, 'delete'\);\n\}/,
  `export async function deleteFolder(id: string, deleteContents = false, permanent = false): Promise<void> {
  const folder = await folderRepository.read(id);
  if (!folder) return;
  if (!isUserAuthorized(folder.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  const allFolders = await getAllFolders(true); // Include deleted to find all descendants
  const allFiles = await listFiles({ includeDeleted: true });

  const findDescendants = (parentId: string): string[] => {
    const children = allFolders.filter(f => f.parentFolderId === parentId);
    let ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids = ids.concat(findDescendants(child.id));
    }
    return ids;
  };

  const descendantFolderIds = findDescendants(id);
  const targetFolderIds = new Set([id, ...descendantFolderIds]);

  if (permanent) {
    // Delete files inside all affected folders permanently
    const filesToDelete = allFiles.filter(f => f.parentFolderId && targetFolderIds.has(f.parentFolderId));
    for (const f of filesToDelete) {
      await deleteFile(f.id, true);
    }
    // Delete all descendant folders permanently
    for (const childId of descendantFolderIds) {
      await folderRepository.delete(childId); // Assuming hard delete or we just do it via DB
      const db = await getDB();
      await db.delete('folders', childId);
      crossTabSync.broadcastDataChange('folders', childId, 'delete');
    }
    const db = await getDB();
    await db.delete('folders', id);
    crossTabSync.broadcastDataChange('folders', id, 'delete');
  } else {
    // Soft Delete
    if (deleteContents) {
      // Soft delete files inside all affected folders
      const filesToDelete = allFiles.filter(f => f.parentFolderId && targetFolderIds.has(f.parentFolderId));
      for (const f of filesToDelete) {
        await deleteFile(f.id, false);
      }
      // Soft delete all descendant folders
      for (const childId of descendantFolderIds) {
        await folderRepository.delete(childId);
        crossTabSync.broadcastDataChange('folders', childId, 'delete');
      }
    } else {
      // Move direct child folders up to current folder's parent
      const directChildFolders = allFolders.filter(f => f.parentFolderId === id);
      for (const child of directChildFolders) {
        await folderRepository.update(child.id, { parentFolderId: folder.parentFolderId || null });
        crossTabSync.broadcastDataChange('folders', child.id, 'update');
      }
      // Move direct files up to current folder's parent
      const directFiles = allFiles.filter(f => f.parentFolderId === id);
      for (const f of directFiles) {
        await fileRepository.update(f.id, { parentFolderId: folder.parentFolderId || null });
        crossTabSync.broadcastDataChange('files', f.id, 'update');
      }
    }
    await folderRepository.delete(id);
    crossTabSync.broadcastDataChange('folders', id, 'delete');
  }
}`
);

// Add restoreFile, restoreFolder, emptyTrash
content += `\n
export async function restoreFile(id: string): Promise<void> {
  const file = await fileRepository.read(id);
  if (!file) return;
  if (!isUserAuthorized(file.userId)) throw new UnauthorizedFileAccessError();
  await fileRepository.update(id, { deletedAt: null });
  crossTabSync.broadcastDataChange('files', id, 'update');
}

export async function restoreFolder(id: string): Promise<void> {
  const folder = await folderRepository.read(id);
  if (!folder) return;
  if (!isUserAuthorized(folder.userId)) throw new UnauthorizedFileAccessError();
  await folderRepository.update(id, { deletedAt: null });
  crossTabSync.broadcastDataChange('folders', id, 'update');
}

export async function emptyTrash(): Promise<void> {
  const files = await listFiles({ includeDeleted: true });
  const folders = await getAllFolders(true);
  
  const deletedFiles = files.filter(f => f.deletedAt);
  const deletedFolders = folders.filter(f => f.deletedAt);
  
  for (const f of deletedFiles) {
    await deleteFile(f.id, true);
  }
  
  const db = await getDB();
  for (const f of deletedFolders) {
    await db.delete('folders', f.id);
    crossTabSync.broadcastDataChange('folders', f.id, 'delete');
  }
}
`;

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
