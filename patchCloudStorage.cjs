const fs = require('fs');

let content = fs.readFileSync('src/services/storage/cloudStorageProvider.ts', 'utf8');

const pathValidation = `
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Must be logged in to upload to cloud storage.');
    }

    const safeFileId = fileId.replace(/[^a-zA-Z0-9_-]/g, '');
    let remotePath = options?.path || \`users/\${user.uid}/files/\${safeFileId}\`;
    
    // Security: Prevent path traversal and enforce user namespace
    if (remotePath.includes('../') || remotePath.includes('..\\\\')) {
      throw new Error('Invalid path: path traversal detected.');
    }
    if (!remotePath.startsWith(\`users/\${user.uid}/\`)) {
      remotePath = \`users/\${user.uid}/files/\${safeFileId}\`;
    }
`;

content = content.replace(
  /    const user = auth\.currentUser;\s+if \(\!user\) \{\s+throw new Error\('Must be logged in to upload to cloud storage\.'\);\s+\}\s+\/\/[^\n]*\s+\/\/[^\n]*\s+const remotePath = options\?\.path \|\| `users\/\$\{user\.uid\}\/files\/\$\{fileId\}`;/,
  pathValidation
);

const getBlobValidation = `
  async getBlob(storageReference: string, storagePath?: string): Promise<Blob | undefined> {
    if (!this.isCloudStorageConfigured() || !storagePath) return undefined;
    const user = auth.currentUser;
    if (!user || !storagePath.startsWith(\`users/\${user.uid}/\`)) {
      console.warn('[Security] Blocked attempt to access blob outside user namespace or unauthenticated');
      return undefined;
    }
    const storageRef = ref(storage, storagePath);
`;
content = content.replace(
  /  async getBlob\(storageReference: string, storagePath\?: string\): Promise<Blob \| undefined> \{\s+if \(\!this\.isCloudStorageConfigured\(\) \|\| \!storagePath\) return undefined;\s+const storageRef = ref\(storage, storagePath\);/,
  getBlobValidation
);

const getUrlValidation = `
  async getUrl(
    storageReference: string,
    storagePath?: string
  ): Promise<string | undefined> {
    if (!this.isCloudStorageConfigured() || !storagePath) return undefined;
    const user = auth.currentUser;
    if (!user || !storagePath.startsWith(\`users/\${user.uid}/\`)) {
      console.warn('[Security] Blocked attempt to access URL outside user namespace or unauthenticated');
      return undefined;
    }
    const storageRef = ref(storage, storagePath);
`;
content = content.replace(
  /  async getUrl\(\s+storageReference: string,\s+storagePath\?: string\s+\): Promise<string \| undefined> \{\s+if \(\!this\.isCloudStorageConfigured\(\) \|\| \!storagePath\) return undefined;\s+const storageRef = ref\(storage, storagePath\);/,
  getUrlValidation
);

const deleteValidation = `
  async delete(storageReference: string, storagePath?: string): Promise<void> {
    if (!this.isCloudStorageConfigured() || !storagePath) return;
    const user = auth.currentUser;
    if (!user || !storagePath.startsWith(\`users/\${user.uid}/\`)) {
      console.warn('[Security] Blocked attempt to delete object outside user namespace or unauthenticated');
      return;
    }
    const storageRef = ref(storage, storagePath);
`;
content = content.replace(
  /  async delete\(storageReference: string, storagePath\?: string\): Promise<void> \{\s+if \(\!this\.isCloudStorageConfigured\(\) \|\| \!storagePath\) return;\s+const storageRef = ref\(storage, storagePath\);/,
  deleteValidation
);

fs.writeFileSync('src/services/storage/cloudStorageProvider.ts', content, 'utf8');
