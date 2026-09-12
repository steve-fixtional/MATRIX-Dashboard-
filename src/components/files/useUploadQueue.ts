import { useState, useCallback, useRef, useEffect } from 'react';
import { MatrixFile } from '../../domain/types';
import {
  uploadFile,
  checkFileConflict,
  validateUploadFile,
  ConflictStrategy,
  UploadCancelledError,
} from '../../services/fileService';
import { crossTabSync } from '../../services/crossTabSync';
import { getAppSettings } from '../../services/settingsService';

export type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'conflict'
  | 'success'
  | 'error'
  | 'cancelled';

export interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  parentFolderId: string | null;
  parentFolderName: string;
  progress: number; // 0 to 100
  loadedBytes: number;
  totalBytes: number;
  status: UploadStatus;
  error?: string;
  abortController?: AbortController;
  conflictingFile?: MatrixFile | null;
  conflictStrategy?: ConflictStrategy;
  uploadedFile?: MatrixFile;
  createdAt: number;
}

export function useUploadQueue(onUploadComplete?: () => void) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const queueRef = useRef<UploadQueueItem[]>([]);
  queueRef.current = queue;

  // Track currently uploading count to limit concurrent uploads
  const activeUploadsCountRef = useRef(0);
  const MAX_CONCURRENT_UPLOADS = 2;

  // Add files to the upload queue
  const addFiles = useCallback(
    async (
      incomingFiles: FileList | File[],
      parentFolderId: string | null,
      parentFolderName: string
    ) => {
      const fileArray = Array.from(incomingFiles);
      if (fileArray.length === 0) return;

      const newItems: UploadQueueItem[] = [];

      for (const file of fileArray) {
        // Prevent accidental exact duplicate already in queue
        const isDuplicateInQueue = queueRef.current.some(
          (q) =>
            (q.status === 'uploading' || q.status === 'queued') &&
            q.parentFolderId === parentFolderId &&
            q.name.toLowerCase() === file.name.toLowerCase() &&
            q.size === file.size
        );
        if (isDuplicateInQueue) {
          continue;
        }

        const itemId = crypto.randomUUID();

        // Check file validity
        const validation = validateUploadFile(file);
        if (!validation.valid) {
          newItems.push({
            id: itemId,
            file,
            name: file.name,
            originalName: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            parentFolderId,
            parentFolderName,
            progress: 0,
            loadedBytes: 0,
            totalBytes: file.size,
            status: 'error',
            error: validation.error || 'Invalid file',
            createdAt: Date.now(),
          });
          continue;
        }

        // Check storage quota estimate if available
        let storageError: string | undefined;
        if (
          typeof navigator !== 'undefined' &&
          navigator.storage &&
          typeof navigator.storage.estimate === 'function'
        ) {
          try {
            const estimate = await navigator.storage.estimate();
            if (estimate.quota !== undefined && estimate.usage !== undefined) {
              const available = estimate.quota - estimate.usage;
              if (file.size > available) {
                storageError = 'Insufficient storage quota on this device.';
              }
            }
          } catch {
            // ignore estimate error
          }
        }

        if (storageError) {
          newItems.push({
            id: itemId,
            file,
            name: file.name,
            originalName: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
            parentFolderId,
            parentFolderName,
            progress: 0,
            loadedBytes: 0,
            totalBytes: file.size,
            status: 'error',
            error: storageError,
            createdAt: Date.now(),
          });
          continue;
        }

        // Check for existing file conflict in destination folder
        let conflicting: MatrixFile | null = null;
        try {
          conflicting = await checkFileConflict(file.name, parentFolderId);
        } catch {
          // ignore
        }

        newItems.push({
          id: itemId,
          file,
          name: file.name,
          originalName: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          parentFolderId,
          parentFolderName,
          progress: 0,
          loadedBytes: 0,
          totalBytes: file.size,
          status: conflicting ? 'conflict' : 'queued',
          conflictingFile: conflicting,
          createdAt: Date.now(),
        });
      }

      if (newItems.length > 0) {
        setQueue((prev) => [...prev, ...newItems]);
        setIsMinimized(false);
      }
    },
    []
  );

  // Process a single item
  const processItem = useCallback(
    async (item: UploadQueueItem) => {
      const abortController = new AbortController();

      // Update state to uploading
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status: 'uploading',
                abortController,
                progress: 0,
                loadedBytes: 0,
                error: undefined,
              }
            : q
        )
      );

      activeUploadsCountRef.current += 1;

      try {
        const settings = await getAppSettings();
        const providerType = settings?.defaultStorageProvider || 'local';
        const uploaded = await uploadFile(item.file, {
          storageProvider: providerType,
          parentFolderId: item.parentFolderId,
          conflictStrategy: item.conflictStrategy || 'keep_both',
          abortSignal: abortController.signal,
          onProgress: (loaded, total) => {
            const pct = total > 0 ? Math.min(Math.round((loaded / total) * 100), 100) : 0;
            setQueue((prev) =>
              prev.map((q) =>
                q.id === item.id
                  ? {
                      ...q,
                      progress: pct,
                      loadedBytes: loaded,
                      totalBytes: total,
                    }
                  : q
              )
            );
          },
        });

        // Mark success
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'success',
                  progress: 100,
                  loadedBytes: item.size,
                  uploadedFile: uploaded,
                  name: uploaded.name,
                  abortController: undefined,
                }
              : q
          )
        );

        onUploadComplete?.();
      } catch (err: any) {
        if (
          err instanceof UploadCancelledError ||
          err?.name === 'AbortError' ||
          abortController.signal.aborted
        ) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'cancelled',
                    abortController: undefined,
                    error: 'Upload cancelled by user',
                  }
                : q
            )
          );
        } else {
          let errorMessage = err?.message || 'Upload failed';
          if (err?.name === 'QuotaExceededError' || errorMessage.toLowerCase().includes('quota')) {
            errorMessage = 'Insufficient storage quota on this device.';
          }
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    status: 'error',
                    abortController: undefined,
                    error: errorMessage,
                  }
                : q
            )
          );
        }
      } finally {
        activeUploadsCountRef.current = Math.max(0, activeUploadsCountRef.current - 1);
      }
    },
    [onUploadComplete]
  );

  // Queue runner effect
  useEffect(() => {
    if (activeUploadsCountRef.current >= MAX_CONCURRENT_UPLOADS) {
      return;
    }

    const nextItem = queue.find((q) => q.status === 'queued');
    if (nextItem) {
      processItem(nextItem);
    }
  }, [queue, processItem]);

  // Cancel an individual upload
  const cancelUpload = useCallback((itemId: string) => {
    setQueue((prev) =>
      prev.map((q) => {
        if (q.id === itemId) {
          if (q.status === 'uploading' && q.abortController) {
            q.abortController.abort();
          }
          return {
            ...q,
            status: 'cancelled',
            abortController: undefined,
            error: 'Upload cancelled by user',
          };
        }
        return q;
      })
    );
  }, []);

  // Cancel all active and queued uploads
  const cancelAll = useCallback(() => {
    setQueue((prev) =>
      prev.map((q) => {
        if (q.status === 'uploading' && q.abortController) {
          q.abortController.abort();
        }
        if (q.status === 'queued' || q.status === 'uploading' || q.status === 'conflict') {
          return {
            ...q,
            status: 'cancelled',
            abortController: undefined,
            error: 'Upload cancelled by user',
          };
        }
        return q;
      })
    );
  }, []);

  // Retry an individual upload
  const retryUpload = useCallback((itemId: string) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.id === itemId
          ? {
              ...q,
              status: 'queued',
              progress: 0,
              loadedBytes: 0,
              error: undefined,
            }
          : q
      )
    );
  }, []);

  // Retry all failed/cancelled uploads
  const retryAllFailed = useCallback(() => {
    setQueue((prev) =>
      prev.map((q) =>
        q.status === 'error' || q.status === 'cancelled'
          ? {
              ...q,
              status: 'queued',
              progress: 0,
              loadedBytes: 0,
              error: undefined,
            }
          : q
      )
    );
  }, []);

  // Resolve conflict on an item
  const resolveConflict = useCallback(
    (itemId: string, strategy: ConflictStrategy) => {
      setQueue((prev) =>
        prev.map((q) => {
          if (q.id === itemId) {
            if (strategy === 'cancel') {
              return {
                ...q,
                status: 'cancelled',
                conflictStrategy: 'cancel',
                error: 'Upload cancelled due to file conflict',
              };
            }
            return {
              ...q,
              status: 'queued',
              conflictStrategy: strategy,
              error: undefined,
            };
          }
          return q;
        })
      );
    },
    []
  );

  // Clear completed and cancelled items
  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((q) => q.status === 'uploading' || q.status === 'queued' || q.status === 'conflict'));
  }, []);

  // Remove a single item from the queue
  const removeItem = useCallback((itemId: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === itemId);
      if (item?.status === 'uploading' && item.abortController) {
        item.abortController.abort();
      }
      return prev.filter((q) => q.id !== itemId);
    });
  }, []);

  return {
    queue,
    isMinimized,
    setIsMinimized,
    addFiles,
    cancelUpload,
    cancelAll,
    retryUpload,
    retryAllFailed,
    resolveConflict,
    clearCompleted,
    removeItem,
  };
}
