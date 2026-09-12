const fs = require('fs');

let cloudContent = fs.readFileSync('src/services/storage/cloudStorageProvider.ts', 'utf8');
const cloudCapabilities = `  readonly name = 'Cloud Storage';
  readonly capabilities = {
    sync: true,
    sharing: true,
    versionHistory: false,
    thumbnails: true,
    trash: true,
    offlineFiles: false,
  };`;
cloudContent = cloudContent.replace(/readonly providerType = 'cloud' as const;/, "readonly providerType = 'cloud' as const;\n" + cloudCapabilities);
fs.writeFileSync('src/services/storage/cloudStorageProvider.ts', cloudContent, 'utf8');

let gdriveContent = fs.readFileSync('src/services/storage/googleDriveStorageProvider.ts', 'utf8');
const gdriveCapabilities = `  readonly name = 'Google Drive';
  readonly capabilities = {
    sync: true,
    sharing: true,
    versionHistory: true,
    thumbnails: true,
    trash: true,
    offlineFiles: false,
  };`;
gdriveContent = gdriveContent.replace(/readonly providerType = 'google_drive' as const;/, "readonly providerType = 'google_drive' as const;\n" + gdriveCapabilities);
fs.writeFileSync('src/services/storage/googleDriveStorageProvider.ts', gdriveContent, 'utf8');

