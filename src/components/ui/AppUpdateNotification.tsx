import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';

export function AppUpdateNotification() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      // Periodically check for updates
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000); // every hour
      }
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 flex flex-col gap-3 animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-medium">
          <Download className="w-5 h-5 text-blue-500" />
          Update Available
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        A new version of MATRIX is available. Update now to get the latest features and bug fixes.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 py-1.5 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
        >
          Update & Reload
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="py-1.5 px-3 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 rounded-md text-sm font-medium transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
