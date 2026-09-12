const fs = require('fs');

let content = fs.readFileSync('src/components/files/FilePreviewModal.tsx', 'utf8');

// Add mobile bottom bar at the very end of the modal body
content = content.replace(
  /<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\);/,
  `        </div>

        {/* Mobile Bottom Action Bar */}
        <div className="sm:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex gap-1.5">
            <button
              onClick={() => onToggleFavorite(file.id)}
              className="p-2.5 rounded-lg text-neutral-400 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
            >
              <Star className={\`h-5 w-5 \${file.favorite ? 'fill-amber-400 text-amber-400' : ''}\`} />
            </button>
            <button
              onClick={() => onDownload(file)}
              className="p-2.5 rounded-lg text-neutral-400 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
          
          {onNavigate && (
            <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
              <button
                disabled={!hasPrev}
                onClick={() => onNavigate('prev')}
                className="p-2.5 text-neutral-500 disabled:opacity-30 bg-neutral-50 dark:bg-neutral-900"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-800" />
              <button
                disabled={!hasNext}
                onClick={() => onNavigate('next')}
                className="p-2.5 text-neutral-500 disabled:opacity-30 bg-neutral-50 dark:bg-neutral-900"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );`
);

fs.writeFileSync('src/components/files/FilePreviewModal.tsx', content, 'utf8');
