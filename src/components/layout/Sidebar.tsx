import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, FileText, Calendar, Settings, Search, HardDrive, Key, ClipboardList, LogOut, LogIn, FolderKanban } from 'lucide-react';
import { cn } from '../../utils';
import { useAuth } from '../../store/AuthContext';

const NAV = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Projects', to: '/projects', icon: FolderKanban },
  { name: 'Notes', to: '/notes', icon: FileText },
  { name: 'Tasks', to: '/tasks', icon: CheckSquare },
  { name: 'Calendar', to: '/calendar', icon: Calendar },
  { name: 'Clipboard', to: '/clipboard', icon: ClipboardList },
  { name: 'Files', to: '/files', icon: HardDrive },
  { name: 'Passwords', to: '/passwords', icon: Key },
  { name: 'Search', to: '/search', icon: Search },
];

export function Sidebar() {
  const { user, login, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="hidden md:flex flex-col h-full border-r border-neutral-200 bg-neutral-50/50 dark:border-neutral-800/50 dark:bg-neutral-900/20 transition-all duration-300 md:w-20 lg:w-64 shrink-0">
      <div className="flex h-16 items-center justify-center lg:justify-start lg:px-6">
        <div className="h-8 w-8 rounded bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center lg:mr-3 shrink-0">
           <span className="text-white dark:text-neutral-900 font-bold tracking-tighter">M</span>
        </div>
        <span className="text-lg font-semibold tracking-wide text-neutral-900 dark:text-neutral-100 hidden lg:block">MATRIX</span>
      </div>
      
      <nav className="flex-1 overflow-y-auto pt-[9px] pb-6 pl-[10px] pr-[11px] flex flex-col gap-1.5">
        {NAV.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center lg:justify-start gap-3 rounded-lg text-sm font-medium transition-colors md:h-12 md:w-12 lg:h-10 lg:w-full lg:px-3 lg:py-2",
                isActive
                  ? "bg-neutral-200/80 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
              )
            }
            title={item.name}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block truncate">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800/50 flex flex-col gap-1.5">
         <NavLink
            to="/settings"
            state={{ returnTo: location.pathname }}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center lg:justify-start gap-3 rounded-lg text-sm font-medium transition-colors md:h-12 md:w-12 lg:h-10 lg:w-full lg:px-3 lg:py-2",
                isActive
                  ? "bg-neutral-200/80 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
              )
            }
            title="Settings"
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block truncate">Settings</span>
          </NavLink>

        {user ? (
          <button 
            onClick={logout} 
            className="flex items-center justify-center lg:justify-start gap-3 rounded-lg text-sm font-medium transition-colors md:h-12 md:w-12 lg:h-10 lg:w-full lg:px-3 lg:py-2 text-neutral-600 hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-500"
            title="Sign out"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block truncate">Sign out</span>
          </button>
        ) : (
          <button 
            onClick={login} 
            className="flex items-center justify-center lg:justify-start gap-3 rounded-lg text-sm font-medium transition-colors md:h-12 md:w-12 lg:h-10 lg:w-full lg:px-3 lg:py-2 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white shadow-sm"
            title="Sign in"
          >
            <LogIn className="h-5 w-5 shrink-0" />
            <span className="hidden lg:block truncate">Sign in</span>
          </button>
        )}
      </div>
    </div>
  );
}
