import React from 'react';
import { RefreshCw, AlertCircle, WifiOff, UploadCloud, DownloadCloud, CheckCircle2 } from 'lucide-react';
import { FileSyncState } from '../../domain/types';

export function FileSyncIndicator({ state, className = '' }: { state?: FileSyncState, className?: string }) {
  if (!state || state === 'synced') return null;
  
  switch (state) {
    case 'uploading':
      return <UploadCloud className={`h-3.5 w-3.5 text-blue-500 animate-pulse ${className}`} title="Uploading" />;
    case 'downloading':
      return <DownloadCloud className={`h-3.5 w-3.5 text-blue-500 animate-pulse ${className}`} title="Downloading" />;
    case 'pending':
      return <RefreshCw className={`h-3.5 w-3.5 text-yellow-500 ${className}`} title="Pending Sync" />;
    case 'offline':
      return <WifiOff className={`h-3.5 w-3.5 text-neutral-400 ${className}`} title="Offline - Queued" />;
    case 'conflict':
      return <AlertCircle className={`h-3.5 w-3.5 text-red-500 ${className}`} title="Sync Conflict" />;
    case 'error':
      return <AlertCircle className={`h-3.5 w-3.5 text-red-600 ${className}`} title="Sync Error" />;
    default:
      return null;
  }
}
