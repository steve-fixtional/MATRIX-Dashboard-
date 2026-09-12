const fs = require('fs');
let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

// Also update replaceFileContent
content = content.replace(
  /export async function replaceFileContent\(\s+fileId: string,\s+newFile: File,\s+options\?: UploadFileOptions\s+\): Promise<MatrixFile> \{[\s\S]*?const currentUserId = options\?\.userId \?\? getActiveUserId\(\);/,
  `export async function replaceFileContent(
  fileId: string,
  newFile: File,
  options?: UploadFileOptions
): Promise<MatrixFile> {
  const existing = await fileRepository.read(fileId);
  if (!existing || existing.deletedAt) {
    throw new Error(\`File \${fileId} not found\`);
  }
  if (!isUserAuthorized(existing.userId)) {
    throw new UnauthorizedFileAccessError();
  }

  if (options?.abortSignal?.aborted) {
    throw new UploadCancelledError();
  }

  const safeOriginalName = sanitizeFilename(newFile.name);
  const safeMimeType = sanitizeMimeType(newFile.type, safeOriginalName);

  const currentUserId = options?.userId ?? getActiveUserId();`
);

content = content.replace(
  /originalName: newFile\.name,\s+mimeType: newFile\.type \|\| existing\.mimeType,/g,
  `originalName: safeOriginalName,\n        mimeType: safeMimeType || existing.mimeType,`
);

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
