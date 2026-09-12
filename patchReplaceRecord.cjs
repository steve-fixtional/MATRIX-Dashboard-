const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

const replacement = `
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
    fileSyncState: providerType === 'cloud' && (!isOnline || uploadResult.storagePath.startsWith('local://')) ? 'pending' : 'synced',
    version: ((existing.version as number) || 1) + 1,
    metadata: { ...existing.metadata, ...options?.metadata, ...uploadResult.metadata },
  };
`;

content = content.replace(
  /const updatedRecord = \{[\s\S]*?metadata: \{ \.\.\.existing\.metadata, \.\.\.options\?\.metadata, \.\.\.uploadResult\.metadata \},\s+\};/,
  replacement
);

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
