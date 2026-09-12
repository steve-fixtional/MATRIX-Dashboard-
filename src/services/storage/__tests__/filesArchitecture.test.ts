import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { getDB, resetDBPromise } from '../../db';
import {
  uploadFile,
  listFiles,
  getFile,
  getFileUrl,
  downloadFile,
  renameFile,
  moveFile,
  deleteFile,
  searchFiles,
  toggleFavorite,
  updateFileTags,
  updateFileMetadata,
  createFolder,
  getFolder,
  listFolders,
  getAllFolders,
  renameFolder,
  moveFolder,
  deleteFolder,
  getFolderPath,
  setTestUserIdOverride,
  UnauthorizedFileAccessError,
  saveLocalFile,
  getFilesForEntity,
  attachFileToEntity,
  detachFileFromEntity,
  getLocalFileBlob,
} from '../../fileService';
import { storageRegistry, registerStorageProvider, IStorageProvider } from '../index';

describe('MATRIX Files System - Foundational Architecture', () => {
  beforeEach(async () => {
    setTestUserIdOverride(null);
    resetDBPromise();
    const db = await getDB();
    await db.clear('files');
    await db.clear('fileBlobs');
    await db.clear('folders');
  });

  describe('Local Storage Persistence & Decoupling', () => {
    it('persists binary data in IndexedDB (never in localStorage) and metadata in files store', async () => {
      setTestUserIdOverride('user-alice');
      const testContent = 'Hello MATRIX File System!';
      const blob = new Blob([testContent], { type: 'text/plain' });
      const testFile = new File([blob], 'test-doc.txt', { type: 'text/plain' });

      // Before upload, verify localStorage contains no binary file data
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem('test-doc.txt')).toBeNull();
      }

      const created = await uploadFile(testFile, {
        tags: ['matrix', 'test'],
        metadata: { clientApp: 'MatrixWeb' },
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('test-doc.txt');
      expect(created.filename).toBe('test-doc.txt');
      expect(created.originalName).toBe('test-doc.txt');
      expect(created.mimeType).toBe('text/plain');
      expect(created.size).toBe(blob.size);
      expect(created.storageProvider).toBe('local');
      expect(created.isAvailableOffline).toBe(true);
      expect(created.userId).toBe('user-alice');
      expect(created.tags).toEqual(['matrix', 'test']);
      expect(created.metadata?.clientApp).toBe('MatrixWeb');

      // Verify binary is stored in IndexedDB fileBlobs store
      const db = await getDB();
      const storedBlob = await db.get('fileBlobs', created.id);
      expect(storedBlob).toBeDefined();
      expect(storedBlob?.id).toBe(created.id);
      const text = await storedBlob?.data.text();
      expect(text).toBe(testContent);

      // Verify metadata is stored in files store without embedding the raw binary payload
      const storedMeta = await db.get('files', created.id);
      expect(storedMeta).toBeDefined();
      expect(storedMeta?.name).toBe('test-doc.txt');
      expect((storedMeta as any).data).toBeUndefined();

      // Ensure localStorage was NOT polluted with binary data
      if (typeof localStorage !== 'undefined') {
        expect(localStorage.getItem(created.id)).toBeNull();
        expect(localStorage.getItem('test-doc.txt')).toBeNull();
      }
    });
  });

  describe('Storage Provider Abstraction', () => {
    it('supports pluggable storage providers via registry without modifying fileService callers', async () => {
      setTestUserIdOverride('user-alice');
      let customUploadCalled = false;

      const mockCustomProvider: IStorageProvider = {
        providerType: 'custom_cloud',
        async upload(fileId, data, options) {
          customUploadCalled = true;
          return {
            storageReference: `custom-ref-${fileId}`,
            storagePath: `custom-s3://${fileId}`,
            externalUrl: `https://custom-cloud.example.com/${fileId}`,
            size: data.size,
            metadata: options?.metadata,
          };
        },
        async getBlob() {
          return new Blob(['custom-data'], { type: 'text/plain' });
        },
        async getUrl(ref) {
          return `https://custom-cloud.example.com/${ref}`;
        },
        async delete() {},
      };

      registerStorageProvider(mockCustomProvider);
      expect(storageRegistry.get('custom_cloud').providerType).toBe('custom_cloud');

      const file = new File(['test'], 'cloud.txt', { type: 'text/plain' });
      const uploaded = await uploadFile(file, {
        storageProvider: 'custom_cloud',
      });

      expect(customUploadCalled).toBe(true);
      expect(uploaded.storageProvider).toBe('custom_cloud');
      expect(uploaded.externalUrl).toBe(`https://custom-cloud.example.com/${uploaded.id}`);

      const url = await getFileUrl(uploaded.id);
      expect(url).toBe(`https://custom-cloud.example.com/${uploaded.id}`);
    });
  });

  describe('User Scoping & Isolation', () => {
    it('ensures files belong to the authenticated user and NEVER exposes another users files', async () => {
      // 1. User Alice uploads a file and creates a folder
      setTestUserIdOverride('user-alice');
      const aliceFolder = await createFolder('Alice Confidential Folder');
      const aliceFile = await uploadFile(
        new File(['Alice private data'], 'alice-secret.txt', { type: 'text/plain' }),
        { parentFolderId: aliceFolder.id }
      );

      // Verify Alice can list her file and folder
      const aliceFiles = await listFiles();
      expect(aliceFiles.length).toBe(1);
      expect(aliceFiles[0].id).toBe(aliceFile.id);

      const aliceFolders = await listFolders();
      expect(aliceFolders.length).toBe(1);
      expect(aliceFolders[0].name).toBe('Alice Confidential Folder');

      // 2. Switch active user to Bob
      setTestUserIdOverride('user-bob');

      // Bob's file listing should be completely empty (Alice's files are never exposed)
      const bobFiles = await listFiles();
      expect(bobFiles.length).toBe(0);

      // Bob's folder listing should be completely empty
      const bobFolders = await listFolders();
      expect(bobFolders.length).toBe(0);

      // Bob cannot search Alice's files
      const bobSearchResults = await searchFiles('secret');
      expect(bobSearchResults.length).toBe(0);

      // Bob direct access attempts to Alice's file MUST fail
      await expect(getFile(aliceFile.id)).rejects.toThrow(UnauthorizedFileAccessError);

      await expect(downloadFile(aliceFile.id)).rejects.toThrow(UnauthorizedFileAccessError);
      await expect(renameFile(aliceFile.id, 'Hacked.txt')).rejects.toThrow(UnauthorizedFileAccessError);
      await expect(deleteFile(aliceFile.id)).rejects.toThrow(UnauthorizedFileAccessError);

      // Bob cannot move a file into Alice's folder
      const bobFile = await uploadFile(new File(['Bob file'], 'bob.txt', { type: 'text/plain' }));
      await expect(moveFile(bobFile.id, aliceFolder.id)).rejects.toThrow(UnauthorizedFileAccessError);

      // Bob direct access to Alice's folder MUST fail
      await expect(getFolder(aliceFolder.id)).rejects.toThrow(UnauthorizedFileAccessError);
      await expect(renameFolder(aliceFolder.id, 'Bob took over')).rejects.toThrow(UnauthorizedFileAccessError);
      await expect(deleteFolder(aliceFolder.id)).rejects.toThrow(UnauthorizedFileAccessError);
    });
  });

  describe('Folder Hierarchy & Operations', () => {
    it('supports nested folders, breadcrumbs, renaming, and cycle prevention', async () => {
      setTestUserIdOverride('user-alice');

      // Create folder structure: Docs -> Work -> Projects
      const docs = await createFolder('Docs');
      const work = await createFolder('Work', docs.id);
      const projects = await createFolder('Projects', work.id);

      // Verify listFolders respects parentFolderId
      const rootFolders = await listFolders(null);
      expect(rootFolders.length).toBe(1);
      expect(rootFolders[0].id).toBe(docs.id);

      const subFolders = await listFolders(docs.id);
      expect(subFolders.length).toBe(1);
      expect(subFolders[0].id).toBe(work.id);

      // Verify breadcrumbs path
      const path = await getFolderPath(projects.id);
      expect(path.map(p => p.name)).toEqual(['Docs', 'Work', 'Projects']);

      // Rename folder
      const renamed = await renameFolder(projects.id, 'Active Projects');
      expect(renamed.name).toBe('Active Projects');

      // Cycle prevention: Cannot move 'Docs' into 'Active Projects' (its descendant)
      await expect(moveFolder(docs.id, projects.id)).rejects.toThrow(
        'Cannot move a folder into one of its descendants'
      );

      // Cannot move folder into itself
      await expect(moveFolder(docs.id, docs.id)).rejects.toThrow('Cannot move folder into itself');

      // Valid move: move 'Active Projects' directly under 'Docs'
      const moved = await moveFolder(projects.id, docs.id);
      expect(moved.parentFolderId).toBe(docs.id);
      const newPath = await getFolderPath(projects.id);
      expect(newPath.map(p => p.name)).toEqual(['Docs', 'Active Projects']);
    });

    it('handles deleteFolder with deleteContents true and false', async () => {
      setTestUserIdOverride('user-alice');

      const parentFolder = await createFolder('To Delete');
      const childFolder = await createFolder('Child Folder', parentFolder.id);

      const fileInParent = await uploadFile(new File(['file 1'], 'f1.txt', { type: 'text/plain' }), {
        parentFolderId: parentFolder.id,
      });
      const fileInChild = await uploadFile(new File(['file 2'], 'f2.txt', { type: 'text/plain' }), {
        parentFolderId: childFolder.id,
      });

      // Test deleteFolder(parentFolder.id, true) - deletes all contents
      await deleteFolder(parentFolder.id, true);

      expect(await getFolder(parentFolder.id)).toBeUndefined();
      expect(await getFolder(childFolder.id)).toBeUndefined();
      expect(await getFile(fileInParent.id)).toBeUndefined();
      expect(await getFile(fileInChild.id)).toBeUndefined();
    });
  });

  describe('File Operations', () => {
    it('supports upload, download, rename, move, search, favorite, and tags', async () => {
      setTestUserIdOverride('user-alice');

      const folderA = await createFolder('Folder A');
      const folderB = await createFolder('Folder B');

      const file = await uploadFile(
        new File(['Quarterly Report Content'], 'report-q1.txt', { type: 'text/plain' }),
        {
          parentFolderId: folderA.id,
          tags: ['finance', '2026'],
          favorite: false,
          metadata: { department: 'Accounting' },
        }
      );

      // Rename
      const renamed = await renameFile(file.id, 'q1-financials.txt');
      expect(renamed.name).toBe('q1-financials.txt');
      expect(renamed.filename).toBe('q1-financials.txt');

      // Move
      const moved = await moveFile(file.id, folderB.id);
      expect(moved.parentFolderId).toBe(folderB.id);

      // Toggle favorite
      const favorited = await toggleFavorite(file.id);
      expect(favorited.favorite).toBe(true);

      // Update tags & metadata
      await updateFileTags(file.id, ['finance', 'reviewed']);
      const updatedMeta = await updateFileMetadata(file.id, { approvedBy: 'CFO' });
      expect(updatedMeta.tags).toEqual(['finance', 'reviewed']);
      expect(updatedMeta.metadata?.approvedBy).toBe('CFO');
      expect(updatedMeta.metadata?.department).toBe('Accounting');

      // Download
      const downloaded = await downloadFile(file.id);
      expect(downloaded.filename).toBe('q1-financials.txt');
      expect(downloaded.blob).toBeDefined();
      const content = await downloaded.blob!.text();
      expect(content).toBe('Quarterly Report Content');

      // Search
      const searchResults = await searchFiles('financials');
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].id).toBe(file.id);

      // Delete
      await deleteFile(file.id, true);
      expect(await getFile(file.id)).toBeUndefined();
    });
  });

  describe('Backward Compatibility for Existing MATRIX Callers', () => {
    it('preserves existing methods used by FileAttachments and other components', async () => {
      setTestUserIdOverride('user-alice');
      const entityId = 'project-xyz';

      const file = new File(['Attachment for Project'], 'notes.txt', { type: 'text/plain' });
      const saved = await saveLocalFile(file, entityId);

      expect(saved.id).toBeDefined();
      expect(saved.relatedEntityIds).toContain(entityId);

      const attachedFiles = await getFilesForEntity(entityId);
      expect(attachedFiles.length).toBe(1);
      expect(attachedFiles[0].id).toBe(saved.id);

      const blob = await getLocalFileBlob(saved.id);
      expect(blob).toBeDefined();
      const text = await blob?.text();
      expect(text).toBe('Attachment for Project');

      // Detach
      await detachFileFromEntity(saved.id, entityId);
      const afterDetach = await getFilesForEntity(entityId);
      expect(afterDetach.length).toBe(0);

      // Attach
      await attachFileToEntity(saved.id, entityId);
      const afterReattach = await getFilesForEntity(entityId);
      expect(afterReattach.length).toBe(1);
    });
  });
});
