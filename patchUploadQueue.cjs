const fs = require('fs');

let content = fs.readFileSync('src/components/files/useUploadQueue.ts', 'utf8');

if (!content.includes('getAppSettings')) {
  content = content.replace(
    /import \{ crossTabSync \} from '\.\.\/\.\.\/services\/crossTabSync';/,
    "import { crossTabSync } from '../../services/crossTabSync';\nimport { getAppSettings } from '../../services/settingsService';"
  );
  
  content = content.replace(
    /const uploaded = await uploadFile\(item\.file, \{/,
    `const settings = await getAppSettings();
        const providerType = settings?.defaultStorageProvider || 'local';
        const uploaded = await uploadFile(item.file, {
          storageProvider: providerType,`
  );

  fs.writeFileSync('src/components/files/useUploadQueue.ts', content, 'utf8');
}
