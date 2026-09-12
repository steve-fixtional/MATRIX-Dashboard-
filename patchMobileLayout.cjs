const fs = require('fs');

let content = fs.readFileSync('src/components/files/FilePreviewModal.tsx', 'utf8');

// Backdrop
content = content.replace(
  /className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black\/70 backdrop-blur-sm"/,
  'className="fixed inset-0 z-50 flex items-center justify-center sm:p-6 bg-black/90 sm:bg-black/70 backdrop-blur-sm"'
);

// Modal container
content = content.replace(
  /className="w-full max-w-4xl max-h-\[90vh\] flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"/,
  'className="w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] flex flex-col sm:rounded-2xl bg-white dark:bg-neutral-900 sm:border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in sm:zoom-in-95 duration-150"'
);

// Header padding
content = content.replace(
  /className="flex items-center justify-between px-4 sm:px-6 py-3\.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0"/,
  'className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0"'
);

// Header title container
content = content.replace(
  /className="flex items-center gap-3 min-w-0 pr-4"/,
  'className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2 sm:pr-4"'
);

// Close button in title (for mobile)
content = content.replace(
  /<div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2 sm:pr-4">\n\s*<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">/,
  `<div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2 sm:pr-4">
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 -ml-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">`
);

// Top right actions: Hide on mobile, since we want bottom controls
content = content.replace(
  /className="flex items-center gap-1\.5 shrink-0"/,
  'className="hidden sm:flex items-center gap-1.5 shrink-0"'
);

// Make the preview area fill mobile
content = content.replace(
  /className="flex-1 min-h-\[260px\] sm:min-h-\[360px\] flex items-center justify-center p-4 sm:p-6 bg-neutral-50\/60 dark:bg-neutral-950\/40 relative overflow-hidden"/,
  'className="flex-1 h-full sm:min-h-[360px] flex items-center justify-center p-4 sm:p-6 bg-neutral-950 sm:bg-neutral-50/60 dark:bg-neutral-950/40 relative overflow-hidden"'
);

// Adjust image size
content = content.replace(
  /className="max-h-\[60vh\] max-w-full object-contain rounded-lg shadow-sm"/,
  'className="max-h-[80vh] sm:max-h-[60vh] max-w-full object-contain sm:rounded-lg sm:shadow-sm"'
);

// Hide sidebar on mobile
content = content.replace(
  /className="w-full lg:w-72 shrink-0 p-5 space-y-5 bg-white dark:bg-neutral-900 text-xs"/,
  'className="hidden sm:block w-full lg:w-72 shrink-0 p-5 space-y-5 bg-white dark:bg-neutral-900 text-xs"'
);

fs.writeFileSync('src/components/files/FilePreviewModal.tsx', content, 'utf8');
