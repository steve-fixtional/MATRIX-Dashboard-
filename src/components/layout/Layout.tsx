import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CommandPalette } from '../ui/CommandPalette';

export function Layout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleFabClick = () => {
    if (location.pathname.startsWith('/tasks')) {
      navigate('/tasks?new=true');
    } else if (location.pathname.startsWith('/calendar')) {
      navigate('/calendar?new=true');
    } else {
      navigate('/notes?new=true');
    }
  };

  return (
    <div className="flex h-[100dvh] w-full bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 overflow-hidden font-sans selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <TopBar />
        
        {/* Scrollable Main Container */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="min-h-full p-4 sm:p-6 md:p-8 pb-32 md:pb-12 h-full">
            <div className="mx-auto max-w-5xl h-full">
              {children}
            </div>
          </div>
        </main>
        
        {/* Mobile Floating Action Button */}
        <div className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50">
           <button 
             onClick={handleFabClick}
             className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-xl hover:bg-neutral-800 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-neutral-200 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white dark:focus:ring-neutral-800"
             aria-label="New Item"
           >
             <Plus className="h-6 w-6" />
           </button>
        </div>
      </div>
      <BottomNav />
      <CommandPalette />
    </div>
  );
}
