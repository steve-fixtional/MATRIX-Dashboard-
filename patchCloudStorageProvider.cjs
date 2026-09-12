const fs = require('fs');

const content = `import { IStorageProvider, StorageUploadOptions, StorageUploadResult } from './storageTypes';
import { storage, auth } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL, getBlob as getFbBlob, deleteObject } from 'firebase/storage';

export class CloudStorageProvider implements IStorageProvider {
  readonly providerType = 'cloud' as const;
  readonly name = 'MATRIX Cloud Storage';
  readonly capabilities = {
    sync: true,
    sharing: true,
    versionHistory: false,
    thumbnails: true,
    trash: true,
    offlineFiles: false,
  };

  private isCloudStorageConfigured(): boolean {
    return !!storage;
  }

  async upload(
    fileId: string,
    data: Blob | File,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    if (!this.isCloudStorageConfigured()) {
      throw new Error('Cloud storage provider is not configured.');
    }
    
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Must be logged in to upload to cloud storage.');
    }

    // 1. Isolated namespace per user
    // Path: users/{userId}/files/{fileId}
    const remotePath = options?.path || \`users/\${user.uid}/files/\${fileId}\`;
    const storageRef = ref(storage, remotePath);

    const uploadTask = uploadBytesResumable(storageRef, data, {
      contentType: options?.mimeType || data.type,
      customMetadata: options?.metadata as any,
    });

    return new Promise((resolve, reject) => {
      if (options?.abortSignal) {
        options.abortSignal.addEventListener('abort', () => {
          uploadTask.cancel();
          reject(new DOMException('Upload cancelled', 'AbortError'));
        });
      }

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          options?.onProgress?.(snapshot.bytesTransferred, snapshot.totalBytes);
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              storageReference: fileId,
              storagePath: remotePath,
              externalUrl: url,
              size: data.size,
              metadata: options?.metadata,
            });
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  async getBlob(storageReference: string, storagePath?: string): Promise<Blob | undefined> {
    if (!this.isCloudStorageConfigured() || !storagePath) return undefined;
    const storageRef = ref(storage, storagePath);
    try {
      return await getFbBlob(storageRef);
    } catch (e) {
      console.error('[CloudStorageProvider] Failed to get blob:', e);
      return undefined;
    }
  }

  async getUrl(
    storageReference: string,
    storagePath?: string
  ): Promise<string | undefined> {
    if (!this.isCloudStorageConfigured() || !storagePath) return undefined;
    const storageRef = ref(storage, storagePath);
    try {
      return await getDownloadURL(storageRef);
    } catch (e) {
      console.error('[CloudStorageProvider] Failed to get URL:', e);
      return undefined;
    }
  }

  async delete(storageReference: string, storagePath?: string): Promise<void> {
    if (!this.isCloudStorageConfigured() || !storagePath) return;
    const storageRef = ref(storage, storagePath);
    try {
      await deleteObject(storageRef);
    } catch (e) {
      console.error('[CloudStorageProvider] Failed to delete object:', e);
    }
  }
}

export const cloudStorageProvider = new CloudStorageProvider();
`;

fs.writeFileSync('src/services/storage/cloudStorageProvider.ts', content, 'utf8');
