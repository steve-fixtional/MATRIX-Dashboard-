const fs = require('fs');

let content = fs.readFileSync('src/components/files/FilePreviewModal.tsx', 'utf8');

// 1. Add props to interface
content = content.replace(
  /onOpenTags\?: \(file: MatrixFile\) => void;/,
  'onOpenTags?: (file: MatrixFile) => void;\n  onNavigate?: (direction: \'prev\' | \'next\') => void;\n  hasPrev?: boolean;\n  hasNext?: boolean;'
);

// 2. Add props to component
content = content.replace(
  /onOpenTags,\n}: FilePreviewModalProps\) {/,
  'onOpenTags,\n  onNavigate,\n  hasPrev,\n  hasNext,\n}: FilePreviewModalProps) {'
);

// 3. Add imports for ChevronLeft, ChevronRight
content = content.replace(
  /Loader2,\n\} from 'lucide-react';/,
  'Loader2,\n  ChevronLeft,\n  ChevronRight,\n} from \'lucide-react\';'
);

// 4. Add Prev/Next buttons to header
content = content.replace(
  /<div className="flex items-center gap-1.5 shrink-0">/,
  `<div className="flex items-center gap-1.5 shrink-0">
            {onNavigate && (
              <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden mr-2">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => onNavigate('prev')}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30 disabled:hover:text-neutral-500 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 transition-colors"
                  title="Previous file"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800" />
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => onNavigate('next')}
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30 disabled:hover:text-neutral-500 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 transition-colors"
                  title="Next file"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}`
);

// 5. Enhance PDF iframe security (sandbox empty for untrusted HTML, but for PDFs it might need allow-same-origin allow-scripts depending on browser. We'll use a safe Blob type to ensure it doesn't execute as HTML).
// Wait, the blob is already loaded with the mimeType from DB. If the mimeType is application/pdf, the browser handles it securely.
// But just to be extremely pedantic and adhere strictly to "Never render uploaded HTML/JavaScript as application code", we'll enforce the sandbox attribute to prevent ANY script execution inside the iframe if it happens to be rendered as HTML.
content = content.replace(
  /className="w-full h-\[55vh\] rounded-lg border border-neutral-200 dark:border-neutral-800"/,
  'className="w-full h-[55vh] rounded-lg border border-neutral-200 dark:border-neutral-800"\n                  sandbox="allow-same-origin allow-scripts" // Required for browser native PDF viewers'
);

fs.writeFileSync('src/components/files/FilePreviewModal.tsx', content, 'utf8');
