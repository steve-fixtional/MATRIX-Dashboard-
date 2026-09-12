import React from 'react';
import { X, AlertTriangle, HardDrive, Cloud, Copy } from 'lucide-react';
import { Button } from '../ui/Button';
import { MatrixFile } from '../../domain/types';
import { formatFileDate } from './fileUtils';

interface FileConflictModalProps {
  file: MatrixFile | null;
  onClose: () => void;
  onResolve: (file: MatrixFile, resolution: 'local' | 'cloud' | 'both') => void;
}

export function FileConflictModal({ file, onClose, onResolve }: FileConflictModalProps) {
  if (!file || !file._conflicts || file._conflicts.length === 0) return null;

  const remoteFile = file._conflicts.find((c: any) => c.id === file.id) || file; // fallback if somehow missing

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-base font-semibold">Sync Conflict Detected</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-5">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">
            The file <strong>{file.name}</strong> was modified both locally and in the cloud. How would you like to resolve this conflict?
          </p>

          <div className="grid gap-3 mb-6">
            <button
              onClick={() => onResolve(file, 'local')}
              className="flex items-start gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-colors"
            >
              <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Keep Local Version</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Modified: {formatFileDate(file.updatedAt)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Overwrite the cloud version with your local changes.
                </p>
              </div>
            </button>

            <button
              onClick={() => onResolve(file, 'cloud')}
              className="flex items-start gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-colors"
            >
              <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Keep Cloud Version</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Modified: {formatFileDate(remoteFile.updatedAt)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Discard your local changes and use the version from the cloud.
                </p>
              </div>
            </button>

            <button
              onClick={() => onResolve(file, 'both')}
              className="flex items-start gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-colors"
            >
              <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 shrink-0">
                <Copy className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Keep Both</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Save the local version as a separate file.
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  A new file named "{file.name.replace(/(\.[\w\d_-]+)$/i, ' (conflicted copy)$1')}" will be created.
                </p>
              </div>
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
