import { IStorageProvider, StorageUploadOptions, StorageUploadResult } from './storageTypes';

/**
 * GoogleDriveStorageProvider
 * 
 * Implements IStorageProvider for files referenced from or stored in Google Drive.
 */
export class GoogleDriveStorageProvider implements IStorageProvider {
  readonly providerType = 'google_drive' as const;
  readonly name = 'Google Drive';
  readonly capabilities = {
    sync: true,
    sharing: true,
    versionHistory: true,
    thumbnails: true,
    trash: true,
    offlineFiles: false,
  };

  async upload(
    fileId: string,
    data: Blob | File,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    // Google Drive direct upload can be routed through Drive API
    return {
      storageReference: fileId,
      storagePath: options?.path || `gdrive://${fileId}`,
      size: data.size,
      metadata: options?.metadata,
    };
  }

  async getBlob(): Promise<Blob | undefined> {
    // Binary download from Drive API requires access token, handled via external URL or Drive client
    return undefined;
  }

  async getUrl(storageReference: string, storagePath?: string): Promise<string | undefined> {
    return storagePath || undefined;
  }

  async delete(): Promise<void> {
    // Delete reference / optional trash Drive file
  }
}

export const googleDriveStorageProvider = new GoogleDriveStorageProvider();
