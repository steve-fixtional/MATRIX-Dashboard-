import { Repository } from './repository';
import { MatrixFile, MatrixFolder, StorageProvider } from '../domain/types';
import { getDB } from './db';
import { auth } from './firebase';
import { crossTabSync } from './crossTabSync';
import { getStorageProvider } from './storage/storageRegistry';

export class UnauthorizedFileAccessError extends Error {
  constructor(message = 'Unauthorized: File or folder belongs to another user account.') {
    super(message);
    this.name = 'UnauthorizedFileAccessError';
  }
}

export class UploadCancelledError extends Error {
  constructor(message = 'Upload was cancelled') {
    super(message);
    this.name = 'UploadCancelledError';
  }
}

export type ConflictStrategy = 'keep_both' | 'replace' | 'cancel';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

/**
 * Validates a file before upload.
 */

export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed_file';
  // Strip control characters, null bytes, and path traversal sequences
  let safe = filename.replace(/[\x00-\x1F\x7F/\\?%*:|"<>]/g, '_');
  // Strip relative paths
  safe = safe.replace(/^\.+/, '_');
  // Max length
  if (safe.length > 255) {
    safe = safe.substring(0, 255);
  }
  return safe;
}

export function sanitizeMimeType(mimeType: string, filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  // If the extension is dangerous, forcefully override the MIME type
  if (['html', 'htm', 'js', 'mjs', 'php', 'exe', 'sh', 'bat', 'cmd'].includes(ext)) {
    return 'text/plain'; // Prevent execution
  }

  // If no mime type provided, sniff extension or default
  if (!mimeType) return 'application/octet-stream';
  
  const lowerMime = mimeType.toLowerCase();
  
  // Danger types fallback to plain text or octet-stream
  if (lowerMime.includes('html') || lowerMime.includes('javascript') || lowerMime.includes('xml')) {
    return 'text/plain'; // Prevent execution
  }
  
  if (lowerMime === 'image/svg+xml') {
    return 'image/svg+xml';
  }

  return lowerMime;
}


export function sanitizeMetadata(metadata?: Record<string, any>): Record<string, string> | undefined {
  if (!metadata) return undefined;
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    // Limit keys and values to reasonable string sizes
    if (typeof key === 'string' && key.length <= 255) {
      safe[key] = String(value).substring(0, 1024);
    }
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}

export function validateUploadFile(file: File): FileValidationResult {

  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  if (!file.name || !file.name.trim()) {
    return { valid: false, error: 'Filename cannot be empty' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'File is empty (0 bytes) or cannot be read' };
  }
  // Max size could be enforced here if needed
  return { valid: true };
}


/**
 * Generates a unique filename if conflicts exist in destination, e.g. "report (1).pdf".
 */
export function generateUniqueFilename(originalName: string, existingNames: string[]): string {
  const existingSet = new Set(existingNames.map((n) => n.toLowerCase()));
  if (!existingSet.has(originalName.toLowerCase())) {
    return originalName;
  }

  const lastDotIndex = originalName.lastIndexOf('.');
  const hasExt = lastDotIndex > 0;
  const baseName = hasExt ? originalName.slice(0, lastDotIndex) : originalName;
  const ext = hasExt ? originalName.slice(lastDotIndex) : '';

  let counter = 1;
  let candidate = `${baseName} (${counter})${ext}`;
  while (existingSet.has(candidate.toLowerCase())) {
    counter++;
    candidate = `${baseName} (${counter})${ext}`;
  }

  return candidate;
}

const fileRepository = new Repository('files');
const folderRepository = new Repository('folders');

// Testing hook to mock active user in unit tests without a live Firebase Auth server
let testUserIdOverride: string | null | undefined = undefined;

export function setTestUserIdOverride(userId: string | null | undefined): void {
  testUserIdOverride = userId;
}

/**
 * Returns the active user ID:
 * - If Firebase Auth user is logged in, returns user.uid.
 * - If in unauthenticated or local guest mode, returns 'local-user'.
 */
export function getActiveUserId(): string {
  if (testUserIdOverride !== undefined) {
    return testUserIdOverride || 'local-user';
  }
  if (auth?.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  return 'local-user';
}

/**
 * Validates whether the active user is authorized to access an entity owned by entityUserId.
 * - A logged-in user can only access entities with matching userId.
 * - A local/guest user can only access unassigned or 'local-user' entities.
 * - Never exposes another user's files.
 */
export function isUserAuthorized(entityUserId?: string | null): boolean {
  const currentUserId = getActiveUserId();
  if (currentUserId === 'local-user') {
    return !entityUserId || entityUserId === 'local-user';
  }
  return entityUserId === currentUserId;
}

// ---------------------------------------------------------------------------
// Thumbnail Generation Utility (Canvas / Browser-safe)
// ---------------------------------------------------------------------------
async function generateThumbnail(file: File): Promise<{ url: string; width: number; height: number } | undefined> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return undefined;
  }
  if (!file.type || !file.type.startsWith('image/')) {
    return undefined;
  }
  // Cap at 20MB for thumbnail generation to protect memory
  if (file.size > 20 * 1024 * 1024) {
    return undefined;
  }

  return new Promise((resolve) => {
    try {
      if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
        return resolve(undefined);
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 160;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const thumbUrl = canvas.toDataURL('image/jpeg', 0.7);
            URL.revokeObjectURL(url);
            return resolve({ url: thumbUrl, width, height });
          }
        } catch {
          // ignore error
        }
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(undefined);
      };
      img.src = url;
    } catch {
      resolve(undefined);
    }
  });
}

// ---------------------------------------------------------------------------
// Folder Operations & Validation
// ---------------------------------------------------------------------------

export const MAX_FOLDER_NAME_LENGTH = 255;
export const INVALID_FOLDER_NAME_CHARS = /[\/\\:*?"<>|]/;

export interface FolderValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates folder name for empty value, length, illegal characters, and duplicate names.
 */
export function validateFolderName(
  name: string,
  existingNames: string[] = []
): FolderValidationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'Folder name cannot be empty' };
  }
  if (trimmed.length > MAX_FOLDER_NAME_LENGTH) {
    return {
      valid: false,
      error: `Folder name cannot exceed ${MAX_FOLDER_NAME_LENGTH} characters`,
    };
  }
  if (trimmed === '.' || trimmed === '..') {
    return { valid: false, error: 'Folder name cannot be "." or ".."' };
  }
  if (INVALID_FOLDER_NAME_CHARS.test(trimmed)) {
    return {
      valid: false,
      error: 'Folder name cannot contain any of the following characters: / \\ : * ? " < > |',
    };
  }
  const lower = trimmed.toLowerCase();
  if (existingNames.some((n) => n.toLowerCase() === lower)) {
    return {
      valid: false,
      error: `A folder named "${trimmed}" already exists in this location`,
    };
  }
  return { valid: true };
}

export interface CreateFolderOptions {
  color?: string;
  icon?: string;
  userId?: string | null;
}

export async function createFolder(
  name: string,
  parentFolderId: string | null = null,
  options?: CreateFolderOptions
): Promise<MatrixFolder> {
  const currentUserId = options?.userId ?? getActiveUserId();

  if (parentFolderId) {
    const parent = await folderRepository.read(parentFolderId);
    if (!parent || parent.deletedAt) {
      throw new Error(`Parent folder ${parentFolderId} not found`);
    }
    if (!isUserAuthorized(parent.userId)) {
      throw new UnauthorizedFileAccessError('Parent folder belongs to another user');
    }
  }

  // Check sibling folders for name duplication and validation
  const siblings = await listFolders(parentFolderId);
  const validation = validateFolderName(name, siblings.map((s) => s.name));
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const trimmed = name.trim();
  const folderId = crypto.randomUUID();
  const now = Date.now();
  const folderRecord: any = {
    id: folderId,
    name: trimmed,
    parentFolderId: parentFolderId || null,
    userId: currentUserId,
    color: options?.color,
    icon: options?.icon,
    modifiedAt: now,
  };

  const created = await folderRepository.create(folderRecord);
  crossTabSync.broadcastDataChange('folders', folderId, 'create');
  return created;
}

export async function getFolder(id: string): Promise<MatrixFolder | undefined> {
  const folder = await folderRepository.read(id);
  if (!folder || folder.deletedAt) return undefined;
  if (!isUserAuthorized(folder.userId)) {
    throw new UnauthorizedFileAccessError();
  }
  return folder;
}

export async function listFolders(parentFolderId: string | null = null, includeDeleted = false): Promise<MatrixFolder[]> {
  const all = await folderRepository.list(includeDeleted);
  return all
    .filter(f => isUserAuthorized(f.userId) && (f.parentFolderId || null) === (parentFolderId || null))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllFolders(includeDeleted = false): Promise<MatrixFolder[]> {
  const all = await folderRepository.list(includeDeleted);
  return all
    .filter(f => isUserAuthorized(f.userId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function renameFolder(id: string, newName: string): Promise<MatrixFolder> {
  const folder = await folderRepository.read(id);
  if (!folder || folder.deletedAt) {
    throw new Error(`Folder ${id} not found`);
  }
  if (!isUserAuthorized(folder.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  const siblings = await listFolders(folder.parentFolderId);
  const otherSiblings = siblings.filter((s) => s.id !== id).map((s) => s.name);
  const validation = validateFolderName(newName, otherSiblings);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const trimmed = newName.trim();
  const updated = await folderRepository.update(id, {
    name: trimmed,
    modifiedAt: Date.now(),
  });
  crossTabSync.broadcastDataChange('folders', id, 'update');
  return updated;
}

export async function moveFolder(id: string, targetParentFolderId: string | null): Promise<MatrixFolder> {
  if (id === targetParentFolderId) {
    throw new Error('Cannot move folder into itself');
  }
  const folder = await folderRepository.read(id);
  if (!folder || folder.deletedAt) {
    throw new Error(`Folder ${id} not found`);
  }
  if (!isUserAuthorized(folder.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  const allFolders = await getAllFolders();

  if (targetParentFolderId) {
    const targetFolder = allFolders.find(f => f.id === targetParentFolderId);
    if (!targetFolder) {
      throw new Error(`Target folder ${targetParentFolderId} not found`);
    }
    if (!isUserAuthorized(targetFolder.userId)) {
      throw new UnauthorizedFileAccessError('Target folder belongs to another user');
    }

    // Check if target is folder itself or any descendant of folder
    let current: MatrixFolder | undefined = targetFolder;
    while (current) {
      if (current.id === id || current.parentFolderId === id) {
        throw new Error('Cannot move a folder into itself or one of its descendants');
      }
      current = current.parentFolderId
        ? allFolders.find(f => f.id === current!.parentFolderId)
        : undefined;
    }

    // Duplicate folder name check in target location
    const targetSiblings = allFolders.filter(
      (f) => (f.parentFolderId || null) === targetParentFolderId && f.id !== id
    );
    if (targetSiblings.some((s) => s.name.toLowerCase() === folder.name.toLowerCase())) {
      throw new Error(`A folder named "${folder.name}" already exists in the destination folder`);
    }
  } else {
    // Moving to root: check duplicate folder name in root
    const rootSiblings = allFolders.filter((f) => f.parentFolderId === null && f.id !== id);
    if (rootSiblings.some((s) => s.name.toLowerCase() === folder.name.toLowerCase())) {
      throw new Error(`A folder named "${folder.name}" already exists in the root folder`);
    }
  }

  const updated = await folderRepository.update(id, {
    parentFolderId: targetParentFolderId || null,
    modifiedAt: Date.now(),
  });
  crossTabSync.broadcastDataChange('folders', id, 'update');
  return updated;
}

export interface FolderDescendantStats {
  directFiles: number;
  directFolders: number;
  totalFiles: number;
  totalFolders: number;
  totalBytes: number;
}

export async function getFolderDescendantStats(folderId: string): Promise<FolderDescendantStats> {
  const allFolders = await getAllFolders();
  const allFiles = await listFiles({ includeDeleted: false });

  const findDescendants = (parentId: string): string[] => {
    const children = allFolders.filter((f) => f.parentFolderId === parentId);
    let ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids = ids.concat(findDescendants(child.id));
    }
    return ids;
  };

  const descendantFolderIds = findDescendants(folderId);
  const targetFolderIds = new Set([folderId, ...descendantFolderIds]);

  const directFiles = allFiles.filter((f) => f.parentFolderId === folderId);
  const directFolders = allFolders.filter((f) => f.parentFolderId === folderId);

  const affectedFiles = allFiles.filter((f) => f.parentFolderId && targetFolderIds.has(f.parentFolderId));
  const totalBytes = affectedFiles.reduce((sum, f) => sum + (f.size || 0), 0);

  return {
    directFiles: directFiles.length,
    directFolders: directFolders.length,
    totalFiles: affectedFiles.length,
    totalFolders: descendantFolderIds.length,
    totalBytes,
  };
}

export async function deleteFolder(id: string, deleteContents = false, permanent = false): Promise<void> {
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
}

export async function getFolderPath(folderId: string | null): Promise<MatrixFolder[]> {
  if (!folderId) return [];
  const allFolders = await getAllFolders();
  const path: MatrixFolder[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder = allFolders.find(f => f.id === currentId);
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentFolderId;
  }
  return path;
}

// ---------------------------------------------------------------------------
// File Operations
// ---------------------------------------------------------------------------

export interface UploadFileOptions {
  parentFolderId?: string | null;
  storageProvider?: StorageProvider;
  storagePath?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  favorite?: boolean;
  relatedEntityIds?: string[];
  userId?: string | null;
  conflictStrategy?: ConflictStrategy;
  customFilename?: string;
  onProgress?: (loaded: number, total: number) => void;
  abortSignal?: AbortSignal;
}

/**
 * Checks if a file with the given name exists in the specified parent folder.
 */
export async function checkFileConflict(
  filename: string,
  parentFolderId: string | null = null
): Promise<MatrixFile | null> {
  const existingFiles = await listFiles({ parentFolderId, includeDeleted: false });
  const trimmed = filename.trim().toLowerCase();
  const match = existingFiles.find((f) => f.name.toLowerCase() === trimmed);
  return match || null;
}

/**
 * Replaces the binary contents and metadata of an existing file.
 */
export async function replaceFileContent(
  fileId: string,
  newFile: File,
  options?: UploadFileOptions
): Promise<MatrixFile> {
  const existing = await fileRepository.read(fileId);
  if (!existing || existing.deletedAt) {
    throw new Error(`File ${fileId} not found`);
  }
  if (!isUserAuthorized(existing.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  if (options?.abortSignal?.aborted) {
    throw new UploadCancelledError();
  }

  const safeOriginalName = sanitizeFilename(newFile.name);
  const safeMimeType = sanitizeMimeType(newFile.type, safeOriginalName);

  const currentUserId = options?.userId ?? getActiveUserId();
  const providerType = options?.storageProvider || existing.storageProvider || 'local';
  const provider = getStorageProvider(providerType);

  
  
  let uploadResult;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  try {
    // ALWAYS save a local blob cache for offline availability and fast reads
    await getStorageProvider('local').upload(fileId, newFile);
    
    if (providerType === 'cloud' && isOnline) {
      uploadResult = await provider.upload(fileId, newFile, {
        path: options?.storagePath || existing.storagePath,
        originalName: safeOriginalName,
        mimeType: safeMimeType || existing.mimeType,
        userId: currentUserId,
        metadata: sanitizeMetadata(options?.metadata),
        onProgress: options?.onProgress,
        abortSignal: options?.abortSignal,
      });
    } else {
      uploadResult = {
        storageReference: fileId,
        storagePath: existing.storagePath || `local://${fileId}`,
        size: newFile.size,
        metadata: sanitizeMetadata(options?.metadata),
      };
      options?.onProgress?.(newFile.size, newFile.size);
    }
  } catch (e) {
    if (options?.abortSignal?.aborted) {
      throw new UploadCancelledError();
    }
    console.warn('Cloud upload failed, queuing for sync', e);
    uploadResult = {
      storageReference: fileId,
      storagePath: existing.storagePath || `local://${fileId}`,
      size: newFile.size,
      metadata: sanitizeMetadata(options?.metadata),
    };
  }

  const thumb = await generateThumbnail(newFile);
  const now = Date.now();


  
  const updatedRecord = {
    ...existing,
    originalName: newFile.name,
    size: newFile.size,
    mimeType: newFile.type || existing.mimeType,
    storageReference: uploadResult.storageReference,
    storagePath: uploadResult.storagePath || existing.storagePath,
    thumbnailUrl: thumb?.url || uploadResult.thumbnailUrl || existing.thumbnailUrl,
    thumbnail: thumb
      ? {
          url: thumb.url,
          width: thumb.width,
          height: thumb.height,
          mimeType: 'image/jpeg',
        }
      : existing.thumbnail,
    modifiedAt: now,
    updatedAt: now,
    localModifiedAt: now,
    fileSyncState: providerType === 'cloud' && (!isOnline || uploadResult.storagePath.startsWith('local://')) ? 'pending' : 'synced' as import('../domain/types').FileSyncState,
    version: ((existing.version as number) || 1) + 1,
    metadata: { ...existing.metadata, ...sanitizeMetadata(options?.metadata), ...sanitizeMetadata(uploadResult.metadata) },
  };


  const updated = await fileRepository.update(fileId, updatedRecord);
  crossTabSync.broadcastDataChange('files', fileId, 'update');
  return updated;
}

export async function uploadFile(
  file: File,
  options?: UploadFileOptions
): Promise<MatrixFile> {
  if (options?.abortSignal?.aborted) {
    throw new UploadCancelledError();
  }

  // Validate file
  const validation = validateUploadFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }
  const currentUserId = options?.userId ?? getActiveUserId();
  const providerType = options?.storageProvider || 'local';
  const provider = getStorageProvider(providerType);

  if (options?.parentFolderId) {
    const parentFolder = await folderRepository.read(options.parentFolderId);
    if (!parentFolder || parentFolder.deletedAt) {
      throw new Error(`Parent folder ${options.parentFolderId} not found`);
    }
    if (!isUserAuthorized(parentFolder.userId)) {
      throw new UnauthorizedFileAccessError('Parent folder belongs to another user');
    }
  }

  const safeOriginalName = sanitizeFilename(file.name);
  const safeMimeType = sanitizeMimeType(file.type, safeOriginalName);
  const filenameToUse = options?.customFilename ? sanitizeFilename(options.customFilename) : safeOriginalName;

  // Handle conflicts
  const targetFolderId = options?.parentFolderId || null;
  const existingFiles = await listFiles({ parentFolderId: targetFolderId, includeDeleted: false });

  const conflictingFile = existingFiles.find(
    (f) => f.name.toLowerCase() === filenameToUse.toLowerCase()
  );

  let finalName = filenameToUse;
  if (conflictingFile) {
    const strategy = options?.conflictStrategy || 'keep_both';
    if (strategy === 'cancel') {
      throw new UploadCancelledError(`Upload cancelled due to file conflict with "${conflictingFile.name}"`);
    }
    if (strategy === 'replace') {
      return await replaceFileContent(conflictingFile.id, file, options);
    }
    // 'keep_both': generate unique filename
    finalName = generateUniqueFilename(filenameToUse, existingFiles.map((f) => f.name));
  }

  if (options?.abortSignal?.aborted) {
    throw new UploadCancelledError();
  }

  const fileId = crypto.randomUUID();

  // Upload binary data through storage provider abstraction (IndexedDB for local, never localStorage)
  const uploadResult = await provider.upload(fileId, file, {
    path: options?.storagePath,
    originalName: safeOriginalName,
        mimeType: safeMimeType,
    userId: currentUserId,
    metadata: sanitizeMetadata(options?.metadata),
    onProgress: options?.onProgress,
    abortSignal: options?.abortSignal,
  });

  if (options?.abortSignal?.aborted) {
    try {
      await provider.delete(uploadResult.storageReference, uploadResult.storagePath);
    } catch {
      // ignore cleanup error
    }
    throw new UploadCancelledError();
  }

  // Attempt thumbnail creation for images
  const thumb = await generateThumbnail(file);

  const now = Date.now();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  
  const fileRecord: any = {
    id: fileId,
    filename: finalName,
    name: finalName,
    originalName: safeOriginalName,
    mimeType: safeMimeType,
    size: file.size,
    storageProvider: providerType,
    storageReference: uploadResult.storageReference,
    storagePath: uploadResult.storagePath,
    parentFolderId: targetFolderId,
    externalUrl: uploadResult.externalUrl,
    thumbnailUrl: thumb?.url || uploadResult.thumbnailUrl,
    thumbnail: thumb ? {
      url: thumb.url,
      width: thumb.width,
      height: thumb.height,
      mimeType: 'image/jpeg',
    } : undefined,
    isAvailableOffline: true, // We always save a local copy now
    relatedEntityIds: options?.relatedEntityIds || [],
    favorite: Boolean(options?.favorite),
    tags: options?.tags || [],
    metadata: { ...sanitizeMetadata(options?.metadata), ...sanitizeMetadata(uploadResult.metadata) },
    userId: currentUserId,
    modifiedAt: now,
    localModifiedAt: now,
    fileSyncState: providerType === 'cloud' && (!isOnline || uploadResult.storagePath.startsWith('local://')) ? 'pending' : 'synced' as import('../domain/types').FileSyncState,
  };


  const created = await fileRepository.create(fileRecord);
  crossTabSync.broadcastDataChange('files', fileId, 'create');
  return created;
}

export interface ListFilesOptions {
  parentFolderId?: string | null;
  storageProvider?: StorageProvider;
  tags?: string[];
  favorite?: boolean;
  search?: string;
  includeDeleted?: boolean;
  sortBy?: 'name' | 'updatedAt' | 'size';
  sortDirection?: 'asc' | 'desc';
}

export async function listFiles(options?: ListFilesOptions): Promise<MatrixFile[]> {
  const all = await fileRepository.list(options?.includeDeleted ?? false);
  
  // Strict user isolation filter
  let files = all.filter(f => isUserAuthorized(f.userId));

  if (options?.parentFolderId !== undefined) {
    files = files.filter(f => (f.parentFolderId || null) === (options.parentFolderId || null));
  }

  if (options?.storageProvider) {
    files = files.filter(f => f.storageProvider === options.storageProvider);
  }

  if (options?.favorite !== undefined) {
    files = files.filter(f => Boolean(f.favorite) === options.favorite);
  }

  if (options?.tags && options.tags.length > 0) {
    files = files.filter(f => options.tags!.every(t => f.tags && f.tags.includes(t)));
  }

  if (options?.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    files = files.filter(f =>
      (f.name && f.name.toLowerCase().includes(q)) ||
      (f.filename && f.filename.toLowerCase().includes(q)) ||
      (f.originalName && f.originalName.toLowerCase().includes(q)) ||
      (f.tags && f.tags.some(t => t.toLowerCase().includes(q))) ||
      (f.mimeType && f.mimeType.toLowerCase().includes(q))
    );
  }

  const sortBy = options?.sortBy || 'updatedAt';
  const sortDir = options?.sortDirection || 'desc';
  files.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') {
      cmp = (a.name || a.filename).localeCompare(b.name || b.filename);
    } else if (sortBy === 'size') {
      cmp = (a.size || 0) - (b.size || 0);
    } else {
      cmp = (a.updatedAt || a.modifiedAt || 0) - (b.updatedAt || b.modifiedAt || 0);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return files;
}

export async function getFile(id: string): Promise<MatrixFile | undefined> {
  const file = await fileRepository.read(id);
  if (!file || file.deletedAt) return undefined;
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }
  return file;
}

export async function getFileUrl(id: string): Promise<string | undefined> {
  const file = await fileRepository.read(id);
  if (!file || file.deletedAt) return undefined;
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  if (file.externalUrl) return file.externalUrl;
  
  const provider = getStorageProvider(file.storageProvider);
  return provider.getUrl(file.storageReference, file.storagePath, file.mimeType);
}

export async function downloadFile(id: string): Promise<{
  blob?: Blob;
  externalUrl?: string;
  filename: string;
  mimeType: string;
}> {
  const file = await fileRepository.read(id);
  if (!file || file.deletedAt) {
    throw new Error(`File not found: ${id}`);
  }
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  const filename = file.name || file.filename;
  const mimeType = file.mimeType;
  const provider = getStorageProvider(file.storageProvider);

  const blob = await provider.getBlob(file.storageReference, file.storagePath);
  if (blob) {
    return { blob, filename, mimeType };
  }

  if (file.externalUrl) {
    return { externalUrl: file.externalUrl, filename, mimeType };
  }

  const url = await provider.getUrl(file.storageReference, file.storagePath, mimeType);
  if (url) {
    return { externalUrl: url, filename, mimeType };
  }

  throw new Error(`Binary data not available for file ${id}`);
}

export async function renameFile(id: string, newName: string): Promise<MatrixFile> {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error('File name cannot be empty');
  }
  const file = await fileRepository.read(id);
  if (!file || file.deletedAt) {
    throw new Error(`File not found: ${id}`);
  }
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  const updated = await fileRepository.update(id, {
    name: trimmed,
    filename: trimmed,
    modifiedAt: Date.now(),
  });
  crossTabSync.broadcastDataChange('files', id, 'update');
  return updated;
}

export async function moveFile(id: string, targetFolderId: string | null): Promise<MatrixFile> {
  const file = await fileRepository.read(id);
  if (!file || file.deletedAt) {
    throw new Error(`File not found: ${id}`);
  }
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  if (targetFolderId) {
    const targetFolder = await folderRepository.read(targetFolderId);
    if (!targetFolder || targetFolder.deletedAt) {
      throw new Error(`Destination folder ${targetFolderId} not found`);
    }
    if (!isUserAuthorized(targetFolder.userId)) {
      throw new UnauthorizedFileAccessError('Destination folder belongs to another user');
    }
  }

  const updated = await fileRepository.update(id, {
    parentFolderId: targetFolderId || null,
    modifiedAt: Date.now(),
  });
  crossTabSync.broadcastDataChange('files', id, 'update');
  return updated;
}

export async function deleteFile(id: string, permanent = false): Promise<void> {
  const file = await fileRepository.read(id);
  if (!file) return;
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  if (permanent) {
    try {
      const provider = getStorageProvider(file.storageProvider);
      await provider.delete(file.storageReference, file.storagePath);
    } catch (e) {
      console.warn(`[FileService] Failed to delete physical blob for ${id}:`, e);
    }
    // Also clear from local IndexedDB fileBlobs if referenced
    const db = await getDB();
    await db.delete('fileBlobs', id);
    await fileRepository.delete(id);
    crossTabSync.broadcastDataChange('files', id, 'delete');
  } else {
    // Soft delete preserves sync/undo capabilities
    await fileRepository.delete(id);
    crossTabSync.broadcastDataChange('files', id, 'delete');
  }
}

export interface SearchFilesOptions {
  parentFolderId?: string | null;
  favorite?: boolean;
}

export async function searchFiles(query: string, options?: SearchFilesOptions): Promise<MatrixFile[]> {
  return listFiles({
    search: query,
    parentFolderId: options?.parentFolderId,
    favorite: options?.favorite,
  });
}

export async function toggleFavorite(id: string): Promise<MatrixFile> {
  const file = await fileRepository.read(id);
  if (!file || file.deletedAt) {
    throw new Error(`File not found: ${id}`);
  }
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  const updated = await fileRepository.update(id, {
    favorite: !file.favorite,
    modifiedAt: Date.now(),
  });
  crossTabSync.broadcastDataChange('files', id, 'update');
  return updated;
}

export async function updateFileTags(id: string, tags: string[]): Promise<MatrixFile> {
  const file = await fileRepository.read(id);
  if (!file || file.deletedAt) {
    throw new Error(`File not found: ${id}`);
  }
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  const updated = await fileRepository.update(id, {
    tags,
    modifiedAt: Date.now(),
  });
  crossTabSync.broadcastDataChange('files', id, 'update');
  return updated;
}

export async function updateFileMetadata(id: string, metadata: Record<string, any>): Promise<MatrixFile> {
  const file = await fileRepository.read(id);
  if (!file || file.deletedAt) {
    throw new Error(`File not found: ${id}`);
  }
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  const merged = { ...(file.metadata || {}), ...metadata };
  const updated = await fileRepository.update(id, {
    metadata: merged,
    modifiedAt: Date.now(),
  });
  crossTabSync.broadcastDataChange('files', id, 'update');
  return updated;
}

// ---------------------------------------------------------------------------
// Backward-Compatibility Functions (Preserves existing MATRIX callers)
// ---------------------------------------------------------------------------

export async function getFiles(includeDeleted = false): Promise<MatrixFile[]> {
  const all = await fileRepository.list(includeDeleted);
  return all.filter(f => isUserAuthorized(f.userId));
}

export async function getFilesForEntity(entityId: string): Promise<MatrixFile[]> {
  const db = await getDB();
  const all = (await db.getAllFromIndex('files', 'by-relatedEntityIds' as any, entityId as any)) as MatrixFile[];
  return all
    .filter(f => !f.deletedAt && isUserAuthorized(f.userId))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function attachFileToEntity(fileId: string, entityId: string): Promise<void> {
  const file = await fileRepository.read(fileId);
  if (!file) return;
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }
  if (!file.relatedEntityIds.includes(entityId)) {
    const newEntityIds = [...file.relatedEntityIds, entityId];
    await fileRepository.update(fileId, { relatedEntityIds: newEntityIds, modifiedAt: Date.now() });
    crossTabSync.broadcastDataChange('files', fileId, 'update');
  }
}

export async function detachFileFromEntity(fileId: string, entityId: string): Promise<void> {
  const file = await fileRepository.read(fileId);
  if (!file) return;
  if (!isUserAuthorized(file.userId)) {
    throw new UnauthorizedFileAccessError();
  }
  const newEntityIds = file.relatedEntityIds.filter(id => id !== entityId);
  await fileRepository.update(fileId, { relatedEntityIds: newEntityIds, modifiedAt: Date.now() });
  crossTabSync.broadcastDataChange('files', fileId, 'update');
}

export async function saveFileMetadata(data: Partial<Omit<MatrixFile, 'id'>> & { id?: string }): Promise<MatrixFile> {
  let file: MatrixFile;
  const currentUserId = data.userId ?? getActiveUserId();
  const normalizedData: any = {
    ...data,
    name: data.name || data.filename || 'Untitled',
    filename: data.filename || data.name || 'Untitled',
    originalName: data.originalName || data.name || data.filename || 'Untitled',
    parentFolderId: data.parentFolderId || null,
    favorite: data.favorite ?? false,
    tags: data.tags ?? [],
    userId: currentUserId,
    modifiedAt: Date.now(),
  };

  if (data.id) {
    const existing = await fileRepository.read(data.id);
    if (existing) {
      if (!isUserAuthorized(existing.userId)) {
        throw new UnauthorizedFileAccessError();
      }
      file = await fileRepository.update(data.id, normalizedData);
    } else {
      file = await fileRepository.create(normalizedData);
    }
  } else {
    file = await fileRepository.create(normalizedData);
  }
  crossTabSync.broadcastDataChange('files', file.id, data.id ? 'update' : 'create');
  return file;
}

export async function saveGoogleDriveFileReference(driveFile: any, relatedEntityId?: string): Promise<MatrixFile> {
  const id = `gdrive-${driveFile.id}`;
  const currentUserId = getActiveUserId();
  
  const fileRecord: any = {
    id,
    filename: driveFile.name,
    name: driveFile.name,
    originalName: driveFile.name,
    mimeType: driveFile.mimeType,
    size: 0,
    storageProvider: 'google_drive',
    storageReference: driveFile.id,
    externalUrl: driveFile.webViewLink,
    iconUrl: driveFile.iconLink,
    thumbnailUrl: driveFile.thumbnailLink,
    isAvailableOffline: false,
    relatedEntityIds: relatedEntityId ? [relatedEntityId] : [],
    favorite: false,
    tags: [],
    parentFolderId: null,
    userId: currentUserId,
  };
  
  const existing = await fileRepository.read(id);
  if (existing) {
    if (relatedEntityId && !existing.relatedEntityIds.includes(relatedEntityId)) {
      const newIds = [...existing.relatedEntityIds, relatedEntityId];
      return fileRepository.update(id, { relatedEntityIds: newIds, modifiedAt: Date.now() });
    }
    return existing;
  }

  return saveFileMetadata(fileRecord);
}

export async function saveLocalFile(file: File, relatedEntityId?: string): Promise<MatrixFile> {
  return uploadFile(file, {
    storageProvider: 'local',
    relatedEntityIds: relatedEntityId ? [relatedEntityId] : [],
  });
}

export async function getLocalFileBlob(fileId: string): Promise<Blob | undefined> {
  const provider = getStorageProvider('local');
  return provider.getBlob(fileId);
}


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

export async function updateFolder(id: string, data: Partial<MatrixFolder>): Promise<MatrixFolder> {
  const folder = await folderRepository.read(id);
  if (!folder) throw new Error('Folder not found');
  if (!isUserAuthorized(folder.userId)) throw new UnauthorizedFileAccessError();
  const updated = await folderRepository.update(id, { ...data, modifiedAt: Date.now() });
  crossTabSync.broadcastDataChange('folders', id, 'update');
  return updated;
}



export async function getStorageMetricsOptimized(): Promise<{ totalBytes: number; fileCount: number; folderCount: number }> {
  const { getDB } = await import('./db');
  const db = await getDB();
  const tx = db.transaction(['files', 'folders'], 'readonly');
  
  let totalBytes = 0;
  let fileCount = 0;
  let folderCount = 0;

  let fileCursor = await tx.objectStore('files').openCursor();
  while (fileCursor) {
    if (!fileCursor.value.deletedAt && isUserAuthorized(fileCursor.value.userId)) {
      fileCount++;
      totalBytes += (fileCursor.value.size || 0);
    }
    fileCursor = await fileCursor.continue();
  }

  let folderCursor = await tx.objectStore('folders').openCursor();
  while (folderCursor) {
    if (!folderCursor.value.deletedAt && isUserAuthorized(folderCursor.value.userId)) {
      folderCount++;
    }
    folderCursor = await folderCursor.continue();
  }

  return { totalBytes, fileCount, folderCount };
}

export async function getFolderItemCountsOptimized(): Promise<Record<string, number>> {
  const { getDB } = await import('./db');
  const db = await getDB();
  const tx = db.transaction(['files', 'folders'], 'readonly');
  const counts: Record<string, number> = {};

  let fileCursor = await tx.objectStore('files').openCursor();
  while (fileCursor) {
    if (!fileCursor.value.deletedAt && isUserAuthorized(fileCursor.value.userId) && fileCursor.value.parentFolderId) {
       counts[fileCursor.value.parentFolderId] = (counts[fileCursor.value.parentFolderId] || 0) + 1;
    }
    fileCursor = await fileCursor.continue();
  }

  let folderCursor = await tx.objectStore('folders').openCursor();
  while (folderCursor) {
    if (!folderCursor.value.deletedAt && isUserAuthorized(folderCursor.value.userId) && folderCursor.value.parentFolderId) {
       counts[folderCursor.value.parentFolderId] = (counts[folderCursor.value.parentFolderId] || 0) + 1;
    }
    folderCursor = await folderCursor.continue();
  }

  return counts;
}



export async function searchFilesOptimized(query: string): Promise<MatrixFile[]> {
  const { getDB } = await import('./db');
  const db = await getDB();
  const tx = db.transaction('files', 'readonly');
  
  const results: MatrixFile[] = [];
  const lowerQuery = query.toLowerCase();

  let fileCursor = await tx.objectStore('files').openCursor();
  while (fileCursor) {
    const f = fileCursor.value;
    if (!f.deletedAt && isUserAuthorized(f.userId)) {
      if (
        (f.name && f.name.toLowerCase().includes(lowerQuery)) ||
        (f.tags && f.tags.some((t: string) => t.toLowerCase().includes(lowerQuery)))
      ) {
        results.push(f);
      }
    }
    fileCursor = await fileCursor.continue();
  }

  return results;
}
