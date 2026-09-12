import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDB, resetDBPromise } from '../../db';
import {
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  getFolder,
  listFolders,
  getAllFolders,
  getFolderPath,
  getFolderDescendantStats,
  validateFolderName,
  uploadFile,
  listFiles,
  setTestUserIdOverride,
  MAX_FOLDER_NAME_LENGTH,
} from '../../fileService';

describe('MATRIX Folder System', () => {
  beforeEach(async () => {
    setTestUserIdOverride(null);
    resetDBPromise();
    const db = await getDB();
    await db.clear('files');
    await db.clear('fileBlobs');
    await db.clear('folders');
  });

  // 1. Folder Creation & Validation
  describe('Folder Creation & Validation', () => {
    it('creates a root folder with valid name and optional color', async () => {
      const folder = await createFolder('Documents', null, { color: '#3b82f6' });
      expect(folder).toBeDefined();
      expect(folder.name).toBe('Documents');
      expect(folder.parentFolderId).toBeNull();
      expect(folder.color).toBe('#3b82f6');
    });

    it('rejects empty and whitespace-only folder names', async () => {
      await expect(createFolder('')).rejects.toThrow('Folder name cannot be empty');
      await expect(createFolder('   ')).rejects.toThrow('Folder name cannot be empty');
      expect(validateFolderName('').valid).toBe(false);
      expect(validateFolderName('   ').error).toBe('Folder name cannot be empty');
    });

    it('rejects duplicate folder names in the same location (case-insensitive)', async () => {
      await createFolder('Projects');
      await expect(createFolder('Projects')).rejects.toThrow(
        'A folder named "Projects" already exists in this location'
      );
      await expect(createFolder('projects')).rejects.toThrow(
        'A folder named "projects" already exists in this location'
      );
    });

    it('allows identical folder names in different parent folders', async () => {
      const parentA = await createFolder('Folder A');
      const parentB = await createFolder('Folder B');

      const childA = await createFolder('SharedName', parentA.id);
      const childB = await createFolder('SharedName', parentB.id);

      expect(childA.name).toBe('SharedName');
      expect(childB.name).toBe('SharedName');
      expect(childA.parentFolderId).toBe(parentA.id);
      expect(childB.parentFolderId).toBe(parentB.id);
    });

    it('rejects invalid names with forbidden characters or dot notations', async () => {
      const invalidNames = ['Test/Folder', 'Test\\Folder', 'Folder:1', 'Folder*2', 'Folder?3', 'Folder"4', 'Folder<5', 'Folder>6', 'Folder|7'];
      for (const name of invalidNames) {
        await expect(createFolder(name)).rejects.toThrow(/Folder name cannot contain/);
        expect(validateFolderName(name).valid).toBe(false);
      }

      await expect(createFolder('.')).rejects.toThrow('Folder name cannot be "." or ".."');
      await expect(createFolder('..')).rejects.toThrow('Folder name cannot be "." or ".."');
    });

    it('rejects excessively long folder names exceeding 255 characters', async () => {
      const longName = 'a'.repeat(MAX_FOLDER_NAME_LENGTH + 1);
      await expect(createFolder(longName)).rejects.toThrow(/Folder name cannot exceed/);
      expect(validateFolderName(longName).valid).toBe(false);
    });
  });

  // 2. Nested Folders & Breadcrumbs Navigation
  describe('Nested Folders & Breadcrumbs', () => {
    it('supports deep nesting: Files → Documents → Work → Projects → MATRIX', async () => {
      const docs = await createFolder('Documents', null);
      const work = await createFolder('Work', docs.id);
      const projects = await createFolder('Projects', work.id);
      const matrix = await createFolder('MATRIX', projects.id);

      // Verify direct children listings at each level
      const rootFolders = await listFolders(null);
      expect(rootFolders.map((f) => f.name)).toEqual(['Documents']);

      const docsChildren = await listFolders(docs.id);
      expect(docsChildren.map((f) => f.name)).toEqual(['Work']);

      const workChildren = await listFolders(work.id);
      expect(workChildren.map((f) => f.name)).toEqual(['Projects']);

      const projectsChildren = await listFolders(projects.id);
      expect(projectsChildren.map((f) => f.name)).toEqual(['MATRIX']);

      const matrixChildren = await listFolders(matrix.id);
      expect(matrixChildren).toHaveLength(0);

      // Verify breadcrumbs path generation
      const path = await getFolderPath(matrix.id);
      expect(path).toHaveLength(4);
      expect(path.map((f) => f.name)).toEqual(['Documents', 'Work', 'Projects', 'MATRIX']);
    });

    it('returns empty path for root (null folderId)', async () => {
      const path = await getFolderPath(null);
      expect(path).toEqual([]);
    });
  });

  // 3. Rename Folder
  describe('Rename Folder', () => {
    it('renames a folder and trims whitespace', async () => {
      const folder = await createFolder('Original Name');
      const renamed = await renameFolder(folder.id, '  Updated Name  ');
      expect(renamed.name).toBe('Updated Name');

      const fetched = await getFolder(folder.id);
      expect(fetched?.name).toBe('Updated Name');
    });

    it('rejects empty or invalid names on rename', async () => {
      const folder = await createFolder('Valid Folder');
      await expect(renameFolder(folder.id, '')).rejects.toThrow('Folder name cannot be empty');
      await expect(renameFolder(folder.id, 'Invalid/Folder')).rejects.toThrow(/Folder name cannot contain/);
    });

    it('rejects renaming to a name that duplicates another sibling in the same folder', async () => {
      const parent = await createFolder('Parent');
      await createFolder('Child 1', parent.id);
      const child2 = await createFolder('Child 2', parent.id);

      await expect(renameFolder(child2.id, 'Child 1')).rejects.toThrow(
        'A folder named "Child 1" already exists in this location'
      );
    });
  });

  // 4. Move Folder & Circular Descent Prevention
  describe('Move Folder & Circular Descent Prevention', () => {
    it('moves a folder to another parent folder', async () => {
      const folderA = await createFolder('Folder A');
      const folderB = await createFolder('Folder B');
      const item = await createFolder('Item', folderA.id);

      expect(item.parentFolderId).toBe(folderA.id);

      const moved = await moveFolder(item.id, folderB.id);
      expect(moved.parentFolderId).toBe(folderB.id);

      const inB = await listFolders(folderB.id);
      expect(inB.map((f) => f.name)).toContain('Item');

      const inA = await listFolders(folderA.id);
      expect(inA.map((f) => f.name)).not.toContain('Item');
    });

    it('moves a nested folder back to root', async () => {
      const parent = await createFolder('Parent');
      const child = await createFolder('Child', parent.id);

      const moved = await moveFolder(child.id, null);
      expect(moved.parentFolderId).toBeNull();

      const root = await listFolders(null);
      expect(root.map((f) => f.name)).toContain('Child');
    });

    it('prevents moving a folder into itself', async () => {
      const folder = await createFolder('Self Folder');
      await expect(moveFolder(folder.id, folder.id)).rejects.toThrow('Cannot move folder into itself');
    });

    it('prevents moving a folder into its direct child', async () => {
      const parent = await createFolder('Parent');
      const child = await createFolder('Child', parent.id);

      await expect(moveFolder(parent.id, child.id)).rejects.toThrow(
        'Cannot move a folder into itself or one of its descendants'
      );
    });

    it('prevents moving a folder into a deeply nested descendant', async () => {
      const level1 = await createFolder('Level 1');
      const level2 = await createFolder('Level 2', level1.id);
      const level3 = await createFolder('Level 3', level2.id);
      const level4 = await createFolder('Level 4', level3.id);

      await expect(moveFolder(level1.id, level4.id)).rejects.toThrow(
        'Cannot move a folder into itself or one of its descendants'
      );
      await expect(moveFolder(level2.id, level4.id)).rejects.toThrow(
        'Cannot move a folder into itself or one of its descendants'
      );
    });

    it('prevents moving if target folder already contains a folder with the same name', async () => {
      const target = await createFolder('Target');
      await createFolder('DuplicateName', target.id);

      const source = await createFolder('DuplicateName', null);

      await expect(moveFolder(source.id, target.id)).rejects.toThrow(
        'A folder named "DuplicateName" already exists in the destination folder'
      );
    });
  });

  // 5. Delete Folder & Content Safety
  describe('Delete Folder & Content Safety', () => {
    it('calculates accurate descendant stats for files and subfolders', async () => {
      const root = await createFolder('Root');
      const sub = await createFolder('Sub', root.id);

      const dummyFile1 = new File(['12345'], 'file1.txt');
      const dummyFile2 = new File(['1234567890'], 'file2.txt');
      await uploadFile(dummyFile1, { parentFolderId: root.id });
      await uploadFile(dummyFile2, { parentFolderId: sub.id });

      const stats = await getFolderDescendantStats(root.id);
      expect(stats.directFiles).toBe(1);
      expect(stats.directFolders).toBe(1);
      expect(stats.totalFiles).toBe(2);
      expect(stats.totalFolders).toBe(1);
      expect(stats.totalBytes).toBe(15);
    });

    it('permanently deletes folder and all nested files and subfolders when deleteContents=true', async () => {
      const folder = await createFolder('To Delete');
      const sub = await createFolder('Sub', folder.id);
      const file = new File(['content'], 'nested.txt');
      const uploaded = await uploadFile(file, { parentFolderId: sub.id });

      await deleteFolder(folder.id, true);

      expect(await getFolder(folder.id)).toBeUndefined();
      expect(await getFolder(sub.id)).toBeUndefined();

      const remainingFiles = await listFiles({ includeDeleted: false });
      expect(remainingFiles.find((f) => f.id === uploaded.id)).toBeUndefined();
    });

    it('deletes folder but preserves and re-parents nested items when deleteContents=false', async () => {
      const parent = await createFolder('Parent');
      const middle = await createFolder('Middle', parent.id);
      const childSub = await createFolder('ChildSub', middle.id);
      const file = new File(['content'], 'file.txt');
      const uploaded = await uploadFile(file, { parentFolderId: middle.id });

      // Delete middle folder with deleteContents=false
      await deleteFolder(middle.id, false);

      expect(await getFolder(middle.id)).toBeUndefined();

      // Verify child folder re-parented to 'Parent'
      const updatedChildSub = await getFolder(childSub.id);
      expect(updatedChildSub?.parentFolderId).toBe(parent.id);

      // Verify file re-parented to 'Parent'
      const allFiles = await listFiles({ includeDeleted: false });
      const preservedFile = allFiles.find((f) => f.id === uploaded.id);
      expect(preservedFile?.parentFolderId).toBe(parent.id);
    });
  });
});
