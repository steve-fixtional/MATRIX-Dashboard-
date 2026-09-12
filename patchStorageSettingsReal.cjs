const fs = require('fs');
let content = fs.readFileSync('src/pages/settings/StorageSettings.tsx', 'utf8');

const replacement = `import React, { useState, useEffect } from 'react';
import { Database, Cloud, HardDrive, Check, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getAllStorageProviders } from '../../services/storage/storageRegistry';
import { getAllFiles } from '../../services/fileService';

export function StorageSettings() {
  const [defaultStorage, setDefaultStorage] = useState('local');
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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Storage
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage local and cloud storage providers.
        </p>
      </div>
      
      {/* Storage Indicator */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-8 shadow-sm">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">Storage Usage</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">Used Local Storage</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatSize(localSize)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">Used Cloud Storage</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatSize(cloudSize)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-neutral-600 dark:text-neutral-400">Available Storage</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Unlimited (Cloud)</span>
          </div>
        </div>
      </div>
`;

content = content.replace(/import React, \{ useState \} from 'react';\nimport \{ Database, Cloud, HardDrive, Check, RefreshCw \} from 'lucide-react';\nimport \{ Button \} from '\.\.\/\.\.\/components\/ui\/Button';\nimport \{ getAllStorageProviders \} from '\.\.\/\.\.\/services\/storage\/storageRegistry';\n\nexport function StorageSettings\(\) \{\n  const \[defaultStorage, setDefaultStorage\] = useState\('local'\);\n  const providers = getAllStorageProviders\(\);\n\n  return \(\n    <div className="space-y-6">\n      <div>\n        <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">\n          Storage\n        <\/h2>\n        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">\n          Manage local and cloud storage providers\.\n        <\/p>\n      <\/div>/, replacement);

fs.writeFileSync('src/pages/settings/StorageSettings.tsx', content, 'utf8');
