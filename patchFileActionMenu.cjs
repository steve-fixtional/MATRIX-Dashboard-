const fs = require('fs');
let content = fs.readFileSync('src/components/files/FileActionMenu.tsx', 'utf8');

// Add isTrash to props
content = content.replace(
  /onGoToFolder\?: \(\) => void;\n\}/,
  'onGoToFolder?: () => void;\n  isTrash?: boolean;\n  onRestore?: () => void;\n  onPermanentDelete?: () => void;\n}'
);

content = content.replace(
  /onGoToFolder,\n}: FileActionMenuProps\) \{/,
  'onGoToFolder,\n  isTrash,\n  onRestore,\n  onPermanentDelete,\n}: FileActionMenuProps) {'
);

// If isTrash is true, show Restore and Permanent Delete instead of other actions
const replacement = `if (isTrash) {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-neutral-400 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all data-[state=open]:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onRestore} className="py-2.5">
            <RefreshCw className="h-4 w-4 mr-2" />
            Restore
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onPermanentDelete} className="py-2.5 text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-950/50 dark:focus:text-red-400">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (`;

content = content.replace(/return \(/, replacement);

fs.writeFileSync('src/components/files/FileActionMenu.tsx', content, 'utf8');
