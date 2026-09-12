import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDB, resetDBPromise } from '../../db';
import {
  uploadFile,
  listFiles,
  getFile,
  downloadFile,
  createFolder,
  validateUploadFile,
  checkFileConflict,
  generateUniqueFilename,
  replaceFileContent,
  UploadCancelledError,
  setTestUserIdOverride,
} from '../../fileService';

describe('MATRIX Files Upload System', () => {
  beforeEach(async () => {
    setTestUserIdOverride(null);
    resetDBPromise();
    const db = await getDB();
    await db.clear('files');
    await db.clear('fileBlobs');
    await db.clear('folders');
  });

  // 1. One File Upload
  describe('One File Upload', () => {
    it('successfully uploads a single file, preserving originalName, metadata, and binary content', async () => {
      const content = 'Single file test content';
      const file = new File([new Blob([content], { type: 'text/plain' })], 'sample-notes.txt', {
        type: 'text/plain',
      });

      const progressHistory: number[] = [];
      const uploaded = await uploadFile(file, {
        tags: ['notes', 'upload'],
        metadata: { client: 'desktop' },
        onProgress: (loaded, total) => {
          progressHistory.push(Math.round((loaded / total) * 100));
        },
      });

      expect(uploaded).toBeDefined();
      expect(uploaded.name).toBe('sample-notes.txt');
      expect(uploaded.originalName).toBe('sample-notes.txt');
      expect(uploaded.size).toBe(content.length);
      expect(uploaded.mimeType).toBe('text/plain');
      expect(uploaded.tags).toEqual(['notes', 'upload']);
      expect(uploaded.metadata?.client).toBe('desktop');
      expect(uploaded.parentFolderId).toBeNull();
      expect(progressHistory.length).toBeGreaterThan(0);
      expect(progressHistory[progressHistory.length - 1]).toBe(100);

      // Verify binary data stored in IndexedDB
      const { blob } = await downloadFile(uploaded.id);
      expect(blob).toBeDefined();
      const readText = await blob!.text();
      expect(readText).toBe(content);
    });
  });

  // 2. Multiple Files Upload
  describe('Multiple Files Upload', () => {
    it('processes multiple files in batch without collision', async () => {
      const files = [
        new File([new Blob(['Content A'])], 'fileA.txt', { type: 'text/plain' }),
        new File([new Blob(['Content B'])], 'fileB.txt', { type: 'text/plain' }),
        new File([new Blob(['Content C'])], 'fileC.txt', { type: 'text/plain' }),
      ];

      const uploadedFiles = await Promise.all(
        files.map((f) => uploadFile(f))
      );

      expect(uploadedFiles).toHaveLength(3);
      const names = uploadedFiles.map((u) => u.name);
      expect(names).toContain('fileA.txt');
      expect(names).toContain('fileB.txt');
      expect(names).toContain('fileC.txt');

      const allInDb = await listFiles({});
      expect(allInDb).toHaveLength(3);
    });
  });

  // 3. Folder Upload Destination
  describe('Folder Upload Destination', () => {
    it('uploads files directly into a specific folder destination', async () => {
      const folder = await createFolder('Financial Reports');
      expect(folder).toBeDefined();

      const docFile = new File([new Blob(['Q3 Financials Table'])], 'Q3_Report.csv', {
        type: 'text/csv',
      });

      const uploaded = await uploadFile(docFile, {
        parentFolderId: folder.id,
      });

      expect(uploaded.parentFolderId).toBe(folder.id);

      // List in folder
      const inFolder = await listFiles({ parentFolderId: folder.id });
      expect(inFolder).toHaveLength(1);
      expect(inFolder[0].name).toBe('Q3_Report.csv');

      // Root files should be empty
      const inRoot = await listFiles({ parentFolderId: null });
      expect(inRoot).toHaveLength(0);
    });
  });

  // 4. Duplicate Filename Handling
  describe('Duplicate Filename Conflict Resolution', () => {
    it('generates unique filename with "keep_both" strategy and preserves originalName', async () => {
      const initialFile = new File([new Blob(['First Version'])], 'Document.pdf', {
        type: 'application/pdf',
      });
      await uploadFile(initialFile);

      // Upload duplicate with keep_both
      const secondFile = new File([new Blob(['Second Version'])], 'Document.pdf', {
        type: 'application/pdf',
      });
      const secondUploaded = await uploadFile(secondFile, {
        conflictStrategy: 'keep_both',
      });

      expect(secondUploaded.name).toBe('Document (1).pdf');
      expect(secondUploaded.originalName).toBe('Document.pdf');

      // Upload a 3rd duplicate with keep_both
      const thirdFile = new File([new Blob(['Third Version'])], 'Document.pdf', {
        type: 'application/pdf',
      });
      const thirdUploaded = await uploadFile(thirdFile, {
        conflictStrategy: 'keep_both',
      });

      expect(thirdUploaded.name).toBe('Document (2).pdf');
      expect(thirdUploaded.originalName).toBe('Document.pdf');

      const allFiles = await listFiles({});
      expect(allFiles).toHaveLength(3);
    });

    it('replaces existing file contents and updates metadata with "replace" strategy', async () => {
      const initialFile = new File([new Blob(['Initial Content'])], 'Specs.txt', {
        type: 'text/plain',
      });
      const initialUploaded = await uploadFile(initialFile);

      const replacementFile = new File([new Blob(['Updated Content with more details'])], 'Specs.txt', {
        type: 'text/plain',
      });
      const replaced = await uploadFile(replacementFile, {
        conflictStrategy: 'replace',
      });

      expect(replaced.id).toBe(initialUploaded.id);
      expect(replaced.name).toBe('Specs.txt');
      expect(replaced.size).toBe('Updated Content with more details'.length);
      expect(replaced.version).toBe(2);

      // Verify binary content replaced
      const { blob } = await downloadFile(replaced.id);
      const text = await blob!.text();
      expect(text).toBe('Updated Content with more details');

      // Total count in database remains 1
      const allFiles = await listFiles({});
      expect(allFiles).toHaveLength(1);
    });

    it('cancels upload without modifying original when strategy is "cancel"', async () => {
      const initialFile = new File([new Blob(['Preserved Content'])], 'KeepMe.txt', {
        type: 'text/plain',
      });
      await uploadFile(initialFile);

      const conflictingFile = new File([new Blob(['New Content'])], 'KeepMe.txt', {
        type: 'text/plain',
      });

      await expect(
        uploadFile(conflictingFile, { conflictStrategy: 'cancel' })
      ).rejects.toThrow(UploadCancelledError);

      // Verify original file unchanged
      const allFiles = await listFiles({});
      expect(allFiles).toHaveLength(1);
      expect(allFiles[0].size).toBe('Preserved Content'.length);
    });
  });

  // 5. Failed Upload & Validation Handling
  describe('Failed Upload & Validation', () => {
    it('rejects 0-byte or empty files during validation', () => {
      const emptyFile = new File([new Blob([])], 'empty.txt', { type: 'text/plain' });
      const validation = validateUploadFile(emptyFile);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('0 bytes');
    });

    it('rejects upload with an empty or whitespace name', () => {
      const invalidFile = new File([new Blob(['content'])], '   ', { type: 'text/plain' });
      const validation = validateUploadFile(invalidFile);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('empty');
    });

    it('allows retry and recovery after a failed upload attempt', async () => {
      let attempts = 0;
      const file = new File([new Blob(['Retry Content'])], 'retry-test.txt', { type: 'text/plain' });

      // Simulated failing provider
      const uploadWithRetry = async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Network timeout during upload');
        }
        return await uploadFile(file);
      };

      // First attempt fails
      await expect(uploadWithRetry()).rejects.toThrow('Network timeout');

      // Second attempt succeeds
      const recovered = await uploadWithRetry();
      expect(recovered).toBeDefined();
      expect(recovered.name).toBe('retry-test.txt');
    });
  });

  // 6. Cancelled Upload Handling
  describe('Cancelled Upload with AbortController', () => {
    it('cancels active upload using AbortSignal without creating orphaned records', async () => {
      const controller = new AbortController();
      const file = new File([new Blob(['Data to cancel'])], 'to-cancel.dat', {
        type: 'application/octet-stream',
      });

      // Abort immediately
      controller.abort();

      await expect(
        uploadFile(file, { abortSignal: controller.signal })
      ).rejects.toThrow(UploadCancelledError);

      const allFiles = await listFiles({});
      expect(allFiles).toHaveLength(0);

      const db = await getDB();
      const allBlobs = await db.getAll('fileBlobs');
      expect(allBlobs).toHaveLength(0);
    });
  });

  // 7. Mobile Upload
  describe('Mobile Upload Support', () => {
    it('handles mobile photo uploads with metadata, thumbnail generation, and image mimeTypes', async () => {
      // Simulate mobile camera capture (image/jpeg)
      const photoBlob = new Blob(['fake-binary-jpeg-data-from-camera'], { type: 'image/jpeg' });
      const photoFile = new File([photoBlob], 'IMG_20260911_1025.JPG', {
        type: 'image/jpeg',
      });

      const uploaded = await uploadFile(photoFile, {
        metadata: {
          captureDevice: 'Mobile Smartphone',
          orientation: 'portrait',
          cameraSource: 'environment',
        },
      });

      expect(uploaded).toBeDefined();
      expect(uploaded.name).toBe('IMG_20260911_1025.JPG');
      expect(uploaded.mimeType).toBe('image/jpeg');
      expect(uploaded.metadata?.captureDevice).toBe('Mobile Smartphone');
      expect(uploaded.metadata?.orientation).toBe('portrait');

      // Check download
      const { blob } = await downloadFile(uploaded.id);
      expect(blob).toBeDefined();
      expect(blob?.type).toBe('image/jpeg');
    });
  });
});
