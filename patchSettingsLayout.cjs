const fs = require('fs');

let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// I will add an `X` (Close) button to the sidebar navigation and mobile header, or just near the top right of the whole settings view.
if (!content.includes('Close className=')) {
  content = content.replace(/import \{.*\} from 'lucide-react';/, (match) => {
    return match.replace('}', ', X }');
  });

  // Top header in sidebar
  content = content.replace(
    /<h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Settings<\/h1>/,
    `<h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex-1">Settings</h1>
            <button 
              onClick={handleBack}
              className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 focus:outline-none"
              title="Close Settings"
            >
              <X className="h-5 w-5" />
            </button>`
  );

  fs.writeFileSync('src/pages/Settings.tsx', content, 'utf8');
}
