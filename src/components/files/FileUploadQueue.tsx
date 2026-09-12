import React from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCw,
  Minus,
  Maximize2,
  AlertTriangle,
  Folder,
  Trash2,
} from 'lucide-react';
import { UploadQueueItem } from './useUploadQueue';
import { formatFileSize, getFileIcon } from './fileUtils';
import { ConflictStrategy } from '../../services/fileService';
import { cn } from '../../utils';

interface FileUploadQueueProps {
  queue: UploadQueueItem[];
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onCancelUpload: (itemId: string) => void;
  onCancelAll: () => void;
  onRetryUpload: (itemId: string) => void;
  onRetryAllFailed: () => void;
  onResolveConflict: (itemId: string, strategy: ConflictStrategy) => void;
  onClearCompleted: () => void;
  onRemoveItem: (itemId: string) => void;
}

export function FileUploadQueue({
  queue,
  isMinimized,
  onToggleMinimize,
  onCancelUpload,
  onCancelAll,
  onRetryUpload,
  onRetryAllFailed,
  onResolveConflict,
  onClearCompleted,
  onRemoveItem,
}: FileUploadQueueProps) {
  if (queue.length === 0) {
    return null;
  }

  const uploadingItems = queue.filter((q) => q.status === 'uploading');
  const queuedItems = queue.filter((q) => q.status === 'queued');
  const conflictItems = queue.filter((q) => q.status === 'conflict');
  const successItems = queue.filter((q) => q.status === 'success');
  const errorItems = queue.filter((q) => q.status === 'error');
  const cancelledItems = queue.filter((q) => q.status === 'cancelled');

  const activeCount = uploadingItems.length + queuedItems.length + conflictItems.length;
  const isFinished = activeCount === 0;

  // Calculate overall progress across all items
  const totalBytes = queue.reduce((sum, item) => sum + (item.totalBytes || item.size || 0), 0);
  const loadedBytes = queue.reduce((sum, item) => {
    if (item.status === 'success') return sum + (item.totalBytes || item.size || 0);
    return sum + (item.loadedBytes || 0);
  }, 0);
  const overallProgress = totalBytes > 0 ? Math.min(Math.round((loadedBytes / totalBytes) * 100), 100) : 0;

  // Minimized Floating Pill
  if (isMinimized) {
    return (
      <div
        id="file-upload-queue-minimized"
        className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
      >
        <button
          type="button"
          onClick={onToggleMinimize}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-neutral-900 text-white shadow-xl border border-neutral-800 hover:bg-neutral-800 transition-all text-xs font-medium cursor-pointer"
        >
          {activeCount > 0 ? (
            <>
              <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <UploadCloud className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span>
                Uploading {uploadingItems.length + queuedItems.length} file{uploadingItems.length + queuedItems.length !== 1 ? 's' : ''} ({overallProgress}%)
              </span>
            </>
          ) : errorItems.length > 0 ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              <span>{errorItems.length} upload{errorItems.length !== 1 ? 's' : ''} failed</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>{successItems.length} file{successItems.length !== 1 ? 's' : ''} uploaded</span>
            </>
          )}
          <Maximize2 className="h-3.5 w-3.5 text-neutral-400 ml-1" />
        </button>
      </div>
    );
  }

  // Expanded Floating Upload Manager
  return (
    <div
      id="file-upload-queue-panel"
      className="fixed bottom-0 sm:bottom-4 right-0 sm:right-4 z-50 w-full sm:w-[420px] max-h-[85vh] sm:max-h-[520px] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Overall Progress Line */}
      {activeCount > 0 && (
        <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1 overflow-hidden">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-full transition-all duration-200 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-950/60 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          {activeCount > 0 ? (
            <UploadCloud className="h-4 w-4 text-blue-500 animate-pulse" />
          ) : errorItems.length > 0 ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            {activeCount > 0
              ? `Uploading ${uploadingItems.length + queuedItems.length} of ${queue.length} file${queue.length !== 1 ? 's' : ''}`
              : isFinished && errorItems.length > 0
              ? `Upload completed with ${errorItems.length} error${errorItems.length !== 1 ? 's' : ''}`
              : `All ${successItems.length} upload${successItems.length !== 1 ? 's' : ''} completed`}
          </h3>
          {activeCount > 0 && (
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
              {overallProgress}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Retry all failed button */}
          {errorItems.length + cancelledItems.length > 0 && (
            <button
              id="upload-queue-retry-all"
              type="button"
              onClick={onRetryAllFailed}
              className="p-1 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 text-[11px] font-medium flex items-center gap-1 transition-colors"
              title="Retry failed uploads"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Retry</span>
            </button>
          )}

          {/* Cancel all active button */}
          {activeCount > 0 && (
            <button
              id="upload-queue-cancel-all"
              type="button"
              onClick={onCancelAll}
              className="px-2 py-1 rounded text-neutral-500 hover:text-red-500 text-[11px] font-medium transition-colors"
              title="Cancel all uploads"
            >
              Cancel All
            </button>
          )}

          {/* Clear completed button */}
          {(successItems.length > 0 || cancelledItems.length > 0) && activeCount === 0 && (
            <button
              id="upload-queue-clear-completed"
              type="button"
              onClick={onClearCompleted}
              className="p-1.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
              title="Clear completed"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Minimize button */}
          <button
            id="upload-queue-minimize-btn"
            type="button"
            onClick={onToggleMinimize}
            className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          {/* Close button (when finished) */}
          {activeCount === 0 && (
            <button
              id="upload-queue-close-btn"
              type="button"
              onClick={onClearCompleted}
              className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60 max-h-[360px] p-2 space-y-1">
        {queue.map((item) => {
          const Icon = getFileIcon(item.name, item.mimeType);

          return (
            <div
              key={item.id}
              className="p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-xs space-y-2"
            >
              {/* Item Info Top Line */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 shrink-0 mt-0.5">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-medium text-neutral-900 dark:text-neutral-100 truncate"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      <span>{formatFileSize(item.size)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate" title={item.parentFolderName}>
                        <Folder className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.parentFolderName}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Status Badge / Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.status === 'uploading' && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        {item.progress}%
                      </span>
                      <button
                        type="button"
                        onClick={() => onCancelUpload(item.id)}
                        className="p-1 rounded text-neutral-400 hover:text-red-500 transition-colors"
                        title="Cancel upload"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {item.status === 'queued' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        Queued
                      </span>
                      <button
                        type="button"
                        onClick={() => onCancelUpload(item.id)}
                        className="p-1 rounded text-neutral-400 hover:text-red-500 transition-colors"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {item.status === 'success' && (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-[11px] font-medium hidden sm:inline">Uploaded</span>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors ml-0.5"
                        title="Dismiss"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onRetryUpload(item.id)}
                        className="p-1 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1 text-[11px] font-medium"
                        title="Retry upload"
                      >
                        <RotateCw className="h-3.5 w-3.5 text-neutral-500" />
                        <span>Retry</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {item.status === 'cancelled' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-neutral-400 italic">Cancelled</span>
                      <button
                        type="button"
                        onClick={() => onRetryUpload(item.id)}
                        className="p-1 rounded text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        title="Retry upload"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploading Progress Bar */}
              {item.status === 'uploading' && (
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-150"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {/* Error Details */}
              {item.status === 'error' && item.error && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2.5 py-1.5 rounded-lg border border-red-100 dark:border-red-900/40">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate" title={item.error}>
                    {item.error}
                  </span>
                </div>
              )}

              {/* Conflict Action Choices */}
              {item.status === 'conflict' && (
                <div className="space-y-2 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>A file with this name already exists in this folder.</span>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => onResolveConflict(item.id, 'keep_both')}
                      className="px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium text-[11px] hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      Keep Both
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolveConflict(item.id, 'replace')}
                      className="px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] transition-colors"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolveConflict(item.id, 'cancel')}
                      className="px-2.5 py-1 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-[11px] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
