const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

const correctReplace = `
  let uploadResult;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  try {
    // ALWAYS save a local blob cache for offline availability and fast reads
    await getStorageProvider('local').upload(fileId, newFile);
    
    if (providerType === 'cloud' && isOnline) {
      uploadResult = await provider.upload(fileId, newFile, {
        path: options?.storagePath || existing.storagePath,
        originalName: newFile.name,
        mimeType: newFile.type || existing.mimeType,
        userId: currentUserId,
        metadata: options?.metadata,
        onProgress: options?.onProgress,
        abortSignal: options?.abortSignal,
      });
    } else {
      uploadResult = {
        storageReference: fileId,
        storagePath: existing.storagePath || \`local://\${fileId}\`,
        size: newFile.size,
        metadata: options?.metadata,
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
      storagePath: existing.storagePath || \`local://\${fileId}\`,
      size: newFile.size,
      metadata: options?.metadata,
    };
  }

  const thumb = await generateThumbnail(newFile);
  const now = Date.now();
`;

// we need to replace from `const fileId = crypto.randomUUID();` down to `const now = Date.now();` inside replaceFileContent
content = content.replace(
  /const fileId = crypto\.randomUUID\(\);\s+let uploadResult;[\s\S]*?const now = Date\.now\(\);/,
  correctReplace
);

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
