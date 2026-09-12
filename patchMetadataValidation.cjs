const fs = require('fs');

let content = fs.readFileSync('src/services/fileService.ts', 'utf8');

const metadataValidation = `
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
`;

content = content.replace(
  /export function validateUploadFile\(file: File\): FileValidationResult \{/,
  metadataValidation
);

// Apply sanitizeMetadata to uploadFile options
content = content.replace(
  /metadata: options\?\.metadata/g,
  `metadata: sanitizeMetadata(options?.metadata)`
);

// And when assigning to fileRecord:
content = content.replace(
  /metadata: \{ \.\.\.options\?\.metadata, \.\.\.uploadResult\.metadata \}/g,
  `metadata: { ...sanitizeMetadata(options?.metadata), ...sanitizeMetadata(uploadResult.metadata) }`
);

content = content.replace(
  /metadata: \{ \.\.\.existing\.metadata, \.\.\.options\?\.metadata, \.\.\.uploadResult\.metadata \}/g,
  `metadata: { ...existing.metadata, ...sanitizeMetadata(options?.metadata), ...sanitizeMetadata(uploadResult.metadata) }`
);

fs.writeFileSync('src/services/fileService.ts', content, 'utf8');
