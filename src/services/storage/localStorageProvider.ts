import { IStorageProvider, StorageUploadOptions, StorageUploadResult } from './storageTypes';
import { getDB } from '../db';

/**
 * LocalStorageProvider
 * 
 * Persists raw binary Blobs/Files in IndexedDB (`fileBlobs` store).
 * Strictly guarantees that file binary data is NEVER written to localStorage.
 * Keeps metadata decoupled from binary data.
 */
export class LocalStorageProvider implements IStorageProvider {
  readonly providerType = 'local' as const;
  readonly name = 'Local Storage';
  readonly capabilities = {
    sync: false,
    sharing: false,
    versionHistory: false,
    thumbnails: true,
    trash: true,
    offlineFiles: true,
  };

  async upload(
    fileId: string,
    data: Blob | File,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    if (options?.abortSignal?.aborted) {
      throw new DOMException('Upload cancelled by user', 'AbortError');
    }

    // Check available storage quota if supported
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota !== undefined && estimate.usage !== undefined) {
          const available = estimate.quota - estimate.usage;
          if (data.size > available) {
            throw new DOMException(
              `Insufficient storage: file requires ${data.size} bytes, but only ${available} bytes are available.`,
              'QuotaExceededError'
            );
          }
        }
      } catch (err: any) {
        if (err?.name === 'QuotaExceededError') {
          throw err;
        }
      }
    }

    // Initial progress
    options?.onProgress?.(0, data.size);

    if (options?.abortSignal?.aborted) {
      throw new DOMException('Upload cancelled by user', 'AbortError');
    }

    // Non-blocking yield to allow UI rendering and responsiveness
    await new Promise((resolve) => setTimeout(resolve, 10));

    if (options?.abortSignal?.aborted) {
      throw new DOMException('Upload cancelled by user', 'AbortError');
    }

    // Mid-way progress update
    const midBytes = Math.round(data.size * 0.5);
    options?.onProgress?.(midBytes, data.size);

    const db = await getDB();
    
    // Store binary data exclusively in IndexedDB object store
    await db.put('fileBlobs', { id: fileId, data });

    if (options?.abortSignal?.aborted) {
      // Clean up if aborted right after write
      try {
        await db.delete('fileBlobs', fileId);
      } catch {
        // ignore cleanup error
      }
      throw new DOMException('Upload cancelled by user', 'AbortError');
    }

    // Final progress completion
    options?.onProgress?.(data.size, data.size);

    return {
      storageReference: fileId,
      storagePath: options?.path || `local://${fileId}`,
      size: data.size,
      metadata: options?.metadata,
    };
  }

  async getBlob(storageReference: string): Promise<Blob | undefined> {
    const db = await getDB();
    const record = await db.get('fileBlobs', storageReference);
    return record?.data;
  }

  async getUrl(storageReference: string): Promise<string | undefined> {
    const blob = await this.getBlob(storageReference);
    if (!blob) return undefined;
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      return URL.createObjectURL(blob);
    }
    return undefined;
  }

  async delete(storageReference: string): Promise<void> {
    const db = await getDB();
    await db.delete('fileBlobs', storageReference);
  }
}

export const localStorageProvider = new LocalStorageProvider();
