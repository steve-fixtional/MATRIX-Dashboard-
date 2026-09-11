import { Repository } from './repository';
import { MatrixFile } from '../domain/types';
import { getDB } from './db';
import { syncEngine } from './sync';

const fileRepository = new Repository('files');

export async function getFiles(includeDeleted = false): Promise<MatrixFile[]> {
  return fileRepository.list(includeDeleted);
}

export async function getFile(id: string): Promise<MatrixFile | undefined> {
  return fileRepository.read(id);
}

export async function getFilesForEntity(entityId: string): Promise<MatrixFile[]> {
  const db = await getDB();
  const all = (await db.getAllFromIndex('files', 'by-relatedEntityIds' as any, entityId as any)) as MatrixFile[];
  return all.filter(f => !f.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function attachFileToEntity(fileId: string, entityId: string): Promise<void> {
  const file = await fileRepository.read(fileId);
  if (!file) return;
  if (!file.relatedEntityIds.includes(entityId)) {
    const newEntityIds = [...file.relatedEntityIds, entityId];
    await fileRepository.update(fileId, { relatedEntityIds: newEntityIds });
  }
}

export async function detachFileFromEntity(fileId: string, entityId: string): Promise<void> {
  const file = await fileRepository.read(fileId);
  if (!file) return;
  const newEntityIds = file.relatedEntityIds.filter(id => id !== entityId);
  
  if (newEntityIds.length === 0) {
    // If it's no longer attached to anything, we could delete it, but let's just detach for now.
    await fileRepository.update(fileId, { relatedEntityIds: newEntityIds });
  } else {
    await fileRepository.update(fileId, { relatedEntityIds: newEntityIds });
  }
}

export async function saveFileMetadata(data: Partial<Omit<MatrixFile, 'id'>> & { id?: string }): Promise<MatrixFile> {
  let file: MatrixFile;
  if (data.id) {
    const existing = await fileRepository.read(data.id);
    if (existing) {
      file = await fileRepository.update(data.id, data);
    } else {
      file = await fileRepository.create(data as any);
    }
  } else {
    file = await fileRepository.create(data as any);
  }
  return file;
}

export async function saveGoogleDriveFileReference(driveFile: any, relatedEntityId?: string): Promise<MatrixFile> {
  const id = `gdrive-${driveFile.id}`;
  
  const fileRecord: any = {
    id,
    filename: driveFile.name,
    mimeType: driveFile.mimeType,
    size: 0,
    storageProvider: 'google_drive',
    storageReference: driveFile.id,
    externalUrl: driveFile.webViewLink,
    iconUrl: driveFile.iconLink,
    isAvailableOffline: false,
    relatedEntityIds: relatedEntityId ? [relatedEntityId] : [],
  };
  
  const existing = await fileRepository.read(id);
  if (existing) {
    if (relatedEntityId && !existing.relatedEntityIds.includes(relatedEntityId)) {
      const newIds = [...existing.relatedEntityIds, relatedEntityId];
      return fileRepository.update(id, { relatedEntityIds: newIds });
    }
    return existing;
  }

  return saveFileMetadata(fileRecord);
}

export async function saveLocalFile(file: File, relatedEntityId?: string): Promise<MatrixFile> {
  const id = crypto.randomUUID();
  const fileRecord: any = {
    id,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    storageProvider: 'local',
    storageReference: id,
    isAvailableOffline: true,
    relatedEntityIds: relatedEntityId ? [relatedEntityId] : [],
  };
  
  // Save blob
  const db = await getDB();
  await db.put('fileBlobs', { id, data: file });
  
  // Save metadata
  return saveFileMetadata(fileRecord);
}

export async function getLocalFileBlob(fileId: string): Promise<Blob | undefined> {
  const db = await getDB();
  const blobRecord = await db.get('fileBlobs', fileId);
  return blobRecord?.data;
}

export async function deleteFile(id: string): Promise<void> {
  await fileRepository.delete(id);
  const db = await getDB();
  await db.delete('fileBlobs', id); // Optionally keep blob if we want undo, but probably better to free space
}
