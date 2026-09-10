import { Search, Plus, User } from 'lucide-react';
import { SyncIndicator } from '../ui/SyncIndicator';
import { Button } from '../ui/Button';
import { useAuth } from '../../store/AuthContext';

export function TopBar() {
  const { user } = useAuth();
  
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-neutral-200/80 bg-white/80 px-4 backdrop-blur-md dark:border-neutral-800/80 dark:bg-neutral-950/80 sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-x-4 self-stretch lg:gap-x-6">
        <button
          type="button"
          onClick={() => (window as any).toggleCommandPalette?.()}
          className="flex items-center gap-x-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 w-full max-w-md bg-neutral-100/50 dark:bg-neutral-900/50 h-10 px-3 rounded-lg transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium">Search anything...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-neutral-200/50 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-neutral-500 dark:text-neutral-400 ml-auto">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        <SyncIndicator />
        
        {/* Desktop Quick Action */}
        <div className="hidden lg:block">
          <Button size="icon" variant="primary" className="rounded-full h-9 w-9">
            <Plus className="h-4 w-4" />
            <span className="sr-only">New action</span>
          </Button>
        </div>

        <div className="hidden sm:block h-6 w-px bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />

        {/* Profile dropdown placeholder */}
        <div className="flex items-center">
          <button className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-950 transition-transform active:scale-95">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-neutral-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
