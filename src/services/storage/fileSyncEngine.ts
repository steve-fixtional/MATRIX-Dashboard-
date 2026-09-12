import { getDB } from '../db';
import { MatrixFile } from '../../domain/types';
import { getStorageProvider } from './storageRegistry';
import { cloudStorageProvider } from './cloudStorageProvider';
import { localStorageProvider } from './localStorageProvider';
import { calculateFileHash } from '../../utils/crypto';
import { crossTabSync } from '../crossTabSync';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export class FileSyncEngine {
  private isSyncing = false;

  async syncAll() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    try {
      const localDb = await getDB();
      const tx = localDb.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const allFiles = await store.getAll();
      await tx.done;

      const cloudFiles = allFiles.filter(f => f.storageProvider === 'cloud');

      for (const file of cloudFiles) {
        try {
          await this.syncFile(file);
        } catch (err) {
          console.error(`Failed to sync file ${file.id}:`, err);
          await this.updateFileState(file.id, { fileSyncState: 'error' });
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncFile(file: MatrixFile) {
    if (file.fileSyncState === 'conflict') {
      return; // Waiting for user resolution
    }

    const hasLocalBlob = !!(await localStorageProvider.getBlob(file.id));

    // Handle offline states
    if (!navigator.onLine) {
      if (file.fileSyncState === 'pending' || file.fileSyncState === 'uploading' || file.fileSyncState === 'downloading') {
         await this.updateFileState(file.id, { fileSyncState: 'offline' });
      }
      return;
    }

    // Recover from offline
    if (file.fileSyncState === 'offline') {
       if (!hasLocalBlob) {
          await this.updateFileState(file.id, { fileSyncState: 'downloading' });
       } else {
          await this.updateFileState(file.id, { fileSyncState: 'pending' });
       }
    }

    // 1. Conflict detection via metadata
    // If we have local pending changes AND remote has newer changes (reflected in file._conflicts)
    if (file._conflicts && file._conflicts.length > 0) {
      const conflictFile = file._conflicts.find((c: any) => c.id === file.id);
      if (conflictFile && hasLocalBlob && file.syncStatus !== 'synchronized') {
        // Genuine conflict: local is pending upload, but remote changed too
        await this.updateFileState(file.id, { fileSyncState: 'conflict' });
        return;
      }
    }

    // 2. Download missing cloud files (New cloud file -> download locally)
    if (!hasLocalBlob && !file.deletedAt) {
      await this.downloadFile(file);
      return;
    }

    // 3. Upload pending local modifications
    if (file.fileSyncState === 'pending' || file.syncStatus === 'pending_create' || file.syncStatus === 'pending_update') {
      // If we have a local blob, we upload it
      if (hasLocalBlob) {
        await this.uploadFile(file);
      }
    }
  }

  private async downloadFile(file: MatrixFile) {
    await this.updateFileState(file.id, { fileSyncState: 'downloading' });
    try {
      const blob = await cloudStorageProvider.getBlob(file.storageReference);
      if (blob) {
        // Save to local storage
        await localStorageProvider.upload(file.id, blob);
        const hash = await calculateFileHash(blob);
        await this.updateFileState(file.id, { 
          fileSyncState: 'synced',
          fileHash: hash,
          localModifiedAt: file.updatedAt
        });
      } else {
        await this.updateFileState(file.id, { fileSyncState: 'error' });
      }
    } catch (e) {
      console.error('Download error:', e);
      await this.updateFileState(file.id, { fileSyncState: 'error' });
    }
  }

  private async uploadFile(file: MatrixFile) {
    await this.updateFileState(file.id, { fileSyncState: 'uploading' });
    try {
      const blob = await localStorageProvider.getBlob(file.id);
      if (!blob) throw new Error('Local blob not found');
      
      const hash = await calculateFileHash(blob);
      if (hash === file.fileHash && file.storageReference) {
        // Hash matches, no need to upload binary, just metadata sync handled elsewhere
        await this.updateFileState(file.id, { fileSyncState: 'synced' });
        return;
      }

      // Upload binary
      const user = auth.currentUser;
      const uploadResult = await cloudStorageProvider.upload(file.id, blob, {
        path: file.storagePath,
        originalName: file.originalName,
        mimeType: file.mimeType,
        userId: user?.uid,
      });

      await this.updateFileState(file.id, { 
        fileSyncState: 'synced',
        storageReference: uploadResult.storageReference,
        storagePath: uploadResult.storagePath,
        fileHash: hash,
        remoteModifiedAt: Date.now(),
        localModifiedAt: Date.now()
      });
    } catch (e) {
      console.error('Upload error:', e);
      await this.updateFileState(file.id, { fileSyncState: 'error' });
    }
  }

  private async updateFileState(id: string, updates: Partial<MatrixFile>) {
    const localDb = await getDB();
    const tx = localDb.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const file = await store.get(id);
    if (file) {
      Object.assign(file, updates);
      await store.put(file);
    }
    await tx.done;
    crossTabSync.broadcastDataChange('files', id, 'update');
  }



    public async resolveConflict(file: MatrixFile, resolution: 'local' | 'cloud' | 'both'): Promise<void> {
    const localDb = await getDB();
    const tx = localDb.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    const dbFile = await store.get(file.id);
    
    if (!dbFile) {
      await tx.done;
      return;
    }

    if (resolution === 'local') {
      // Keep local: wipe conflicts and upload
      dbFile._conflicts = undefined;
      dbFile.fileSyncState = 'pending';
      await store.put(dbFile);
      await tx.done;
      // Trigger upload
      this.syncFile(dbFile);
    } else if (resolution === 'cloud') {
      // Keep cloud: wipe local blob, use remote, set as synced
      const remoteFile = dbFile._conflicts?.find((c: any) => c.id === file.id) || dbFile;
      const newFile = { ...remoteFile, _conflicts: undefined, fileSyncState: 'downloading' };
      await store.put(newFile);
      await tx.done;
      // Need to re-download the remote blob since we're keeping it
      await localStorageProvider.delete(file.id);
      this.syncFile(newFile);
    } else if (resolution === 'both') {
      // Keep both: we rename the local file and upload it as a new file.
      // Then we revert the original file ID to the cloud version and download it.
      
      const remoteFile = dbFile._conflicts?.find((c: any) => c.id === file.id) || dbFile;
      
      // 1. Create a copy of the local file
      const newId = crypto.randomUUID();
      const localBlob = await localStorageProvider.getBlob(file.id);
      if (localBlob) {
        await localStorageProvider.upload(newId, localBlob);
      }
      
      let conflictedName = file.name;
      if (file.name.includes('.')) {
         conflictedName = file.name.replace(/(\.[\w\d_-]+)$/i, ' (conflicted copy)$1');
      } else {
         conflictedName = `${file.name} (conflicted copy)`;
      }

      const copyFile: MatrixFile = {
        ...dbFile,
        id: newId,
        name: conflictedName,
        filename: conflictedName,
        _conflicts: undefined,
        fileSyncState: 'pending', // will be uploaded
        storageReference: newId,
        storagePath: `local://${newId}`
      };
      await store.put(copyFile);
      
      // 2. Revert the original file to cloud version
      const origFile = { ...remoteFile, _conflicts: undefined, fileSyncState: 'downloading' };
      await store.put(origFile);
      
      await tx.done;
      
      // Clean up original local blob since it's going to be replaced by the cloud download
      await localStorageProvider.delete(file.id);
      
      this.syncFile(copyFile);
      this.syncFile(origFile);
    }
  }

}

export const fileSyncEngine = new FileSyncEngine();
