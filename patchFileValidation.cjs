const fs = require('fs');

let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

const validationLogic = `
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed_file';
  // Strip control characters, null bytes, and path traversal sequences
  let safe = filename.replace(/[\\x00-\\x1F\\x7F/\\\\?%*:|"<>]/g, '_');
  // Strip relative paths
  safe = safe.replace(/^\\.+/, '_');
  // Max length
  if (safe.length > 255) {
    safe = safe.substring(0, 255);
  }
  return safe;
}

export function sanitizeMimeType(mimeType: string, filename: string): string {
  // If no mime type provided, sniff extension or default
  if (!mimeType) return 'application/octet-stream';
  
  const lowerMime = mimeType.toLowerCase();
  
  // Danger types fallback to plain text or octet-stream
  if (lowerMime.includes('html') || lowerMime.includes('javascript') || lowerMime.includes('xml')) {
    return 'text/plain'; // Prevent HTML execution
  }
  
  if (lowerMime === 'image/svg+xml') {
    return 'image/svg+xml'; // SVG is safe if rendered in <img> tag, but if accessed directly can execute. We'll rely on frontend rendering.
  }

  return lowerMime;
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
`;

content = content.replace(
  /export function validateUploadFile[\s\S]*?return \{ valid: true \};\s+\}/,
  validationLogic
);

// We need to use `sanitizeFilename` and `sanitizeMimeType` in `uploadFile` and `replaceFileContent`.
// In `uploadFile`:
const uploadUploadPatch = `
  const validation = validateUploadFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const safeFilename = sanitizeFilename(file.name);
  const safeMimeType = sanitizeMimeType(file.type, safeFilename);
  const filenameToUse = options?.customFilename ? sanitizeFilename(options.customFilename) : safeFilename;
`;

content = content.replace(
  /  const validation = validateUploadFile\(file\);\s+if \(\!validation\.valid\) \{\s+throw new Error\(validation\.error \|\| 'Invalid file'\);\s+\}\s+const currentUserId = options\?\.userId \?\? getActiveUserId\(\);\s+const providerType = options\?\.storageProvider \|\| 'local';\s+const provider = getStorageProvider\(providerType\);\s+if \(options\?\.parentFolderId\) \{\s+const parentFolder = await folderRepository\.read\(options\.parentFolderId\);\s+if \(\!parentFolder \|\| parentFolder\.deletedAt\) \{\s+throw new Error\(\`Parent folder \$\{options\.parentFolderId\} not found\`\);\s+\}\s+if \(\!isUserAuthorized\(parentFolder\.userId\)\) \{\s+throw new UnauthorizedFileAccessError\('Parent folder belongs to another user'\);\s+\}\s+\}\s+\/\/ Handle conflicts\s+const targetFolderId = options\?\.parentFolderId \|\| null;\s+const existingFiles = await listFiles\(\{ parentFolderId: targetFolderId, includeDeleted: false \}\);\s+const filenameToUse = options\?\.customFilename \|\| file\.name;/,
  `  const validation = validateUploadFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }
  const currentUserId = options?.userId ?? getActiveUserId();
  const providerType = options?.storageProvider || 'local';
  const provider = getStorageProvider(providerType);

  if (options?.parentFolderId) {
    const parentFolder = await folderRepository.read(options.parentFolderId);
    if (!parentFolder || parentFolder.deletedAt) {
      throw new Error(\`Parent folder \${options.parentFolderId} not found\`);
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
  const existingFiles = await listFiles({ parentFolderId: targetFolderId, includeDeleted: false });`
);

// We need to pass safe parameters to the upload options:
content = content.replace(
  /originalName: file\.name,\s+mimeType: file\.type,/g,
  `originalName: safeOriginalName,\n        mimeType: safeMimeType,`
);

// And replace in the fileRecord
content = content.replace(
  /originalName: file\.name,\s+mimeType: file\.type \|\| 'application\/octet-stream',/g,
  `originalName: safeOriginalName,\n    mimeType: safeMimeType,`
);

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
