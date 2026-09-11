import React from 'react';
import { BaseEntity } from '../../domain/types';
import { Cloud, CloudOff, RefreshCw, AlertCircle, HardDrive } from 'lucide-react';

interface ItemSyncStatusProps {
  item: BaseEntity & { provider?: 'local' | 'google', syncStatus?: string, syncError?: string };
}

export function ItemSyncStatus({ item }: ItemSyncStatusProps) {
  const isGoogle = item.provider === 'google' || item.id.startsWith('gcal-');
  
  if (isGoogle) {
    return (
      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">
        <Cloud className="w-3 h-3" />
        <span>Google Event</span>
      </div>
    );
  }

  // Local item syncing
  if (!item.syncStatus || item.syncStatus === 'synchronized') {
    return (
      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-800/50">
        <HardDrive className="w-3 h-3" />
        <span>Saved Locally & Synced</span>
      </div>
    );
  }

  if (item.syncStatus.startsWith('pending_')) {
    return (
      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800/50">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Pending Sync...</span>
      </div>
    );
  }

  if (item.syncStatus === 'sync_error' || (item.syncStatus as string) === 'sync_failed') {
    return (
      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-red-600 dark:text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-800/50" title={item.syncError}>
        <AlertCircle className="w-3 h-3" />
        <span>Sync Failed</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
      <HardDrive className="w-3 h-3" />
      <span>Local Only</span>
    </div>
  );
}
