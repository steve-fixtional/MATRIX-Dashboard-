import { ChevronRight, HardDrive, Folder as FolderIcon } from 'lucide-react';
import { MatrixFolder } from '../../domain/types';
import { cn } from '../../utils';

interface FileBreadcrumbsProps {
  currentFolderId: string | null;
  path: MatrixFolder[];
  onNavigate: (folderId: string | null) => void;
  className?: string;
}

export function FileBreadcrumbs({
  currentFolderId,
  path,
  onNavigate,
  className,
}: FileBreadcrumbsProps) {
  const isRoot = currentFolderId === null;

  return (
    <nav
      id="files-breadcrumb-nav"
      aria-label="File Breadcrumb"
      className={cn("flex items-center gap-1.5 text-sm font-medium overflow-x-auto no-scrollbar py-1", className)}
    >
      <button
        id="breadcrumb-root-btn"
        type="button"
        onClick={() => onNavigate(null)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors shrink-0",
          isRoot
            ? "text-neutral-900 dark:text-neutral-100 font-semibold bg-neutral-100 dark:bg-neutral-800/60"
            : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
        )}
      >
        <HardDrive className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
        <span>Files</span>
      </button>

      {path.map((folder, index) => {
        const isLast = index === path.length - 1;
        return (
          <div key={folder.id} className="flex items-center gap-1.5 shrink-0">
            <ChevronRight className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-600 shrink-0" />
            <button
              id={`breadcrumb-folder-${folder.id}`}
              type="button"
              onClick={() => onNavigate(folder.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors truncate max-w-[140px] sm:max-w-[200px]",
                isLast
                  ? "text-neutral-900 dark:text-neutral-100 font-semibold bg-neutral-100 dark:bg-neutral-800/60"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
              )}
              title={folder.name}
            >
              <FolderIcon className="h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
              <span className="truncate">{folder.name}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
