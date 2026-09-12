const fs = require('fs');
let content = fs.readFileSync('src/pages/settings/StorageSettings.tsx', 'utf8');

if (!content.includes('Storage Indicator')) {
  content = content.replace(
    /<h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">Storage<\/h2>/,
    `<h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-6">Storage</h2>
      
      {/* Storage Indicator */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 mb-8 shadow-sm">
        <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">Storage Usage</h3>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">Used Local Storage</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Calculating...</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">Used Cloud Storage</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Calculating...</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">Available Storage</span>
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Unlimited (Cloud)</span>
          </div>
        </div>
      </div>`
  );

  fs.writeFileSync('src/pages/settings/StorageSettings.tsx', content, 'utf8');
}
