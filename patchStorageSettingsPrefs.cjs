const fs = require('fs');

let content = fs.readFileSync('src/pages/settings/StorageSettings.tsx', 'utf8');

const replacement = `import React, { useState, useEffect } from 'react';
import { Database, Cloud, HardDrive, Check, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getAllStorageProviders } from '../../services/storage/storageRegistry';
import { getAllFiles } from '../../services/fileService';
import { useSettings } from '../../hooks/useSettings';
import { getAppSettings, saveAppSettings } from '../../services/settingsService';

export function StorageSettings() {
  const { settings, updateSettings } = useSettings();
  const defaultStorage = settings?.defaultStorageProvider || 'local';
  
  const [localSize, setLocalSize] = useState(0);
  const [cloudSize, setCloudSize] = useState(0);
  const providers = getAllStorageProviders();

  useEffect(() => {
    async function calcStorage() {
      try {
        const files = await getAllFiles();
        let local = 0;
        let cloud = 0;
        files.forEach(f => {
          if (f.storageProvider === 'cloud') cloud += f.size || 0;
          else local += f.size || 0;
        });
        setLocalSize(local);
        setCloudSize(cloud);
      } catch (e) {
        console.error('Failed to calculate storage size', e);
      }
    }
    calcStorage();
  }, []);

  const handleSetDefault = (providerType: string) => {
    updateSettings({ defaultStorageProvider: providerType });
  };
`;

content = content.replace(/import React, \{ useState, useEffect \} from 'react';[\s\S]*?const providers = getAllStorageProviders\(\);/, replacement);
content = content.replace(/onClick=\{.*?setDefaultStorage.*?\}/g, "onClick={() => handleSetDefault(provider.providerType)}");

fs.writeFileSync('src/pages/settings/StorageSettings.tsx', content, 'utf8');
