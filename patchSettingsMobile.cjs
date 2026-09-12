const fs = require('fs');

let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

// I will add an `X` (Close) button to the mobile header
const match = /<NavLink to="\/settings" state=\{\{ returnTo \}\} replace className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors h-11 px-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">\n\s*<ChevronLeft className="h-5 w-5 -ml-1" \/>\n\s*Back to Settings\n\s*<\/NavLink>/;

content = content.replace(match, (m) => {
  return m + `
              <div className="flex-1" />
              <button 
                onClick={handleBack}
                className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 focus:outline-none"
                title="Close Settings"
              >
                <X className="h-5 w-5" />
              </button>`;
});

fs.writeFileSync('src/pages/Settings.tsx', content, 'utf8');
