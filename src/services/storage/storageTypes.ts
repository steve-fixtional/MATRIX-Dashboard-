import { StorageProvider, MatrixFile, MatrixFolder } from '../../domain/types';

export interface StorageCapabilities {
  sync: boolean;
  sharing: boolean;
  versionHistory: boolean;
  thumbnails: boolean;
  trash: boolean;
  offlineFiles: boolean;
}

export interface StorageUploadOptions {
  path?: string;
  originalName?: string;
  mimeType?: string;
  userId?: string | null;
  metadata?: Record<string, any>;
  onProgress?: (loaded: number, total: number) => void;
  abortSignal?: AbortSignal;
}

export interface StorageUploadResult {
  storageReference: string;
  storagePath?: string;
  externalUrl?: string;
  thumbnailUrl?: string;
  size?: number;
  metadata?: Record<string, any>;
}

export interface IStorageProvider {
  /**
   * Identifies the storage provider (e.g. 'local', 'cloud', 'google_drive', etc.)
   */
  readonly providerType: StorageProvider;
  readonly name: string;
  readonly capabilities: StorageCapabilities;

  /**
   * File system operations
   */
  list?(parentFolderId: string | null, includeDeleted?: boolean): Promise<{ files: MatrixFile[], folders: MatrixFolder[] }>;
  createFolder?(name: string, parentFolderId: string | null): Promise<MatrixFolder>;
  renameFile?(file: MatrixFile, newName: string): Promise<MatrixFile>;
  renameFolder?(folder: MatrixFolder, newName: string): Promise<MatrixFolder>;
  moveFile?(file: MatrixFile, newParentId: string | null): Promise<MatrixFile>;
  moveFolder?(folder: MatrixFolder, newParentId: string | null): Promise<MatrixFolder>;
  search?(query: string): Promise<{ files: MatrixFile[], folders: MatrixFolder[] }>;
  updateMetadata?(file: MatrixFile, metadata: any): Promise<MatrixFile>;

  /**
   * Uploads binary file/blob data to the underlying storage mechanism.
   * For local storage, this persists into IndexedDB (never localStorage).
   * For cloud storage, this delegates to remote object storage.
   */
  upload(
    fileId: string,
    data: Blob | File,
    options?: StorageUploadOptions
  ): Promise<StorageUploadResult>;

  /**
   * Retrieves the raw Blob binary data for a file. (Download)
   */
  getBlob(storageReference: string, storagePath?: string): Promise<Blob | undefined>;

  /**
   * Retrieves a viewable or temporary URL for the file (e.g. object URL or signed URL).
   */
  getUrl(
    storageReference: string,
    storagePath?: string,
    mimeType?: string
  ): Promise<string | undefined>;

  /**
   * Deletes the physical binary storage reference.
   */
  delete(storageReference: string, storagePath?: string): Promise<void>;
}
