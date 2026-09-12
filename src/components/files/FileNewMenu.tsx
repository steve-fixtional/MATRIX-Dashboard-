import { useState, useRef, useEffect } from 'react';
import { Plus, FolderPlus, UploadCloud, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils';

interface FileNewMenuProps {
  onNewFolder: () => void;
  onUploadFiles: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function FileNewMenu({
  onNewFolder,
  onUploadFiles,
  className,
  size = 'sm',
}: FileNewMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (fn: () => void) => {
    setIsOpen(false);
    fn();
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={menuRef}>
      <Button
        id="files-new-btn"
        size={size}
        variant="primary"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5"
      >
        <Plus className="h-4 w-4" />
        <span>New</span>
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-70 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div
          id="files-new-dropdown"
          className="absolute right-0 sm:left-0 sm:right-auto mt-1.5 w-44 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl py-1.5 z-40 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            id="files-new-folder-action"
            type="button"
            onClick={() => handleSelect(onNewFolder)}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
          >
            <FolderPlus className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <span>New Folder</span>
          </button>

          <button
            id="files-upload-files-action"
            type="button"
            onClick={() => handleSelect(onUploadFiles)}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
          >
            <UploadCloud className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <span>Upload Files</span>
          </button>
        </div>
      )}
    </div>
  );
}
