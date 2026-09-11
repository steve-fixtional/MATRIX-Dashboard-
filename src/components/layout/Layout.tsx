import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { CommandPalette } from '../ui/CommandPalette';
import { useNotificationPoller } from '../../hooks/useNotificationPoller';

export function Layout({ children }: { children: ReactNode }) {
  useNotificationPoller();
  
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
      </div>
      <BottomNav />
      <CommandPalette />
    </div>
  );
}
