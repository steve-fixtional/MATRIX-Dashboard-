const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

const replacement = `
  const fileId = crypto.randomUUID();
  let uploadResult;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  try {
    // ALWAYS save a local blob cache for offline availability and fast reads
    await getStorageProvider('local').upload(fileId, file);
    
    if (providerType === 'cloud' && isOnline) {
      // If online and cloud provider, upload directly to show immediate progress
      uploadResult = await provider.upload(fileId, file, {
        path: options?.storagePath,
        originalName: file.name,
        mimeType: file.type,
        userId: currentUserId,
        metadata: options?.metadata,
        onProgress: options?.onProgress,
        abortSignal: options?.abortSignal,
      });
    } else {
      // If offline or provider is local, we just use the local result
      uploadResult = {
        storageReference: fileId,
        storagePath: \`local://\${fileId}\`,
        size: file.size,
        metadata: options?.metadata,
      };
      // Manually trigger progress for UI
      options?.onProgress?.(file.size, file.size);
    }
  } catch (e) {
    if (options?.abortSignal?.aborted) {
      throw new UploadCancelledError();
    }
    // If upload fails but it's a cloud file, we still have the local blob.
    // We can fall back to queuing it for sync.
    console.warn('Cloud upload failed, queuing for sync', e);
    uploadResult = {
      storageReference: fileId,
      storagePath: \`local://\${fileId}\`,
      size: file.size,
      metadata: options?.metadata,
    };
  }
`;

content = content.replace(
  /const uploadResult = await provider\.upload[\s\S]*?abortSignal: options\?\.abortSignal,\s+\}\);/,
  replacement
);

// We need to also modify the created MatrixFile record to include fileSyncState
const recordReplacement = `
  const fileRecord: any = {
    id: fileId,
    filename: finalName,
    name: finalName,
    originalName: file.name,
    mimeType: file.type || 'application/octet-stream',
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
    metadata: { ...options?.metadata, ...uploadResult.metadata },
    userId: currentUserId,
    modifiedAt: now,
    localModifiedAt: now,
    fileSyncState: providerType === 'cloud' && (!isOnline || uploadResult.storagePath.startsWith('local://')) ? 'pending' : 'synced',
  };
`;

content = content.replace(
  /const fileRecord: any = \{[\s\S]*?modifiedAt: now,\s+\};/,
  recordReplacement
);

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
