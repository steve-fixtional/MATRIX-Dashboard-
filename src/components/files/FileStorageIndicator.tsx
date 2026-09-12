import { useEffect, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { formatFileSize } from './fileUtils';
import { cn } from '../../utils';

interface FileStorageIndicatorProps {
  totalBytes: number;
  fileCount: number;
  folderCount: number;
  className?: string;
  compact?: boolean;
}

export function FileStorageIndicator({
  totalBytes,
  fileCount,
  folderCount,
  className,
  compact = false,
}: FileStorageIndicatorProps) {
  const [quota, setQuota] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkEstimate() {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        try {
          const estimate = await navigator.storage.estimate();
          if (isMounted && estimate.quota) {
            setQuota(estimate.quota);
          }
        } catch {
          // ignore error
        }
      }
    }
    checkEstimate();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute percentage if quota is known, default to a sensible scale
  const effectiveQuota = quota || 1024 * 1024 * 1024; // 1 GB fallback
  const percentUsed = Math.min(100, Math.max(1, Math.round((totalBytes / effectiveQuota) * 100)));

  if (compact) {
    return (
      <div
        id="storage-indicator-compact"
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/60",
          className
        )}
        title={`${fileCount} files, ${folderCount} folders • ${formatFileSize(totalBytes)} used`}
      >
        <HardDrive className="h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
        <span>{formatFileSize(totalBytes)}</span>
      </div>
    );
  }

  return (
    <div
      id="storage-indicator"
      className={cn(
        "flex items-center gap-3 px-3 py-1.5 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 text-xs",
        className
      )}
      title={`${fileCount} files in ${folderCount} folders. Storage is stored privately on this device.`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shrink-0">
          <HardDrive className="h-3.5 w-3.5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-medium text-neutral-800 dark:text-neutral-200">
            <span>{formatFileSize(totalBytes)}</span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">used</span>
          </div>
          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-normal">
            {fileCount} {fileCount === 1 ? 'file' : 'files'}
          </div>
        </div>
      </div>

      <div className="hidden xl:flex flex-col w-20 gap-1 ml-1">
        <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          <div
            className="h-full bg-neutral-900 dark:bg-neutral-100 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(4, percentUsed)}%` }}
          />
        </div>
        <span className="text-[9px] text-neutral-400 dark:text-neutral-500 self-end font-mono">
          {quota ? `${percentUsed}%` : 'Local'}
        </span>
      </div>
    </div>
  );
}
