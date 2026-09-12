import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, FileText, Calendar, Search, FolderKanban, HardDrive, Key, ClipboardList } from 'lucide-react';
import { cn } from '../../utils';

const MOBILE_NAV = [
  { name: 'Home', to: '/', icon: LayoutDashboard },
  { name: 'Files', to: '/files', icon: HardDrive },
  { name: 'Vault', to: '/passwords', icon: Key },
  { name: 'Notes', to: '/notes', icon: FileText },
  { name: 'Tasks', to: '/tasks', icon: CheckSquare },
  { name: 'Projects', to: '/projects', icon: FolderKanban },
  { name: 'Calendar', to: '/calendar', icon: Calendar },
  { name: 'Clipboard', to: '/clipboard', icon: ClipboardList },
  { name: 'Search', to: '/search', icon: Search },
];

export function BottomNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] border-t border-neutral-200 bg-white/90 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-950/90 z-50">
      <div className="flex items-center h-full px-1 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] touch-pan-x">
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center w-[72px] shrink-0 snap-start h-full space-y-1 transition-colors rounded-lg",
                isActive
                  ? "text-neutral-900 dark:text-neutral-50"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
              )
            }
          >
            <item.icon className={cn("h-5 w-5 mb-0.5", item.name === 'Search' ? 'h-6 w-6' : '')} />
            <span className="text-[10px] font-medium leading-none">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
