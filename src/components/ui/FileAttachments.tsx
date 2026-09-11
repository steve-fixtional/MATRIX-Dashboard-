import React, { useState, useEffect, useRef } from 'react';
import { MatrixFile } from '../../domain/types';
import { getFilesForEntity, saveLocalFile, deleteFile, detachFileFromEntity, getLocalFileBlob, saveGoogleDriveFileReference } from '../../services/fileService';
import { Paperclip, Download, X, File, Loader2, HardDrive } from 'lucide-react';
import { isGoogleAuthed, getAccessToken } from '../../services/googleCalendarService';
import { searchDriveFiles, DriveFile } from '../../services/googleDriveService';
import { DriveSearchDropdown } from './DriveSearchDropdown';

interface FileAttachmentsProps {
  entityId: string;
}

export function FileAttachments({ entityId }: FileAttachmentsProps) {
  const [files, setFiles] = useState<MatrixFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showDriveSearch, setShowDriveSearch] = useState(false);
  const [driveSearchQuery, setDriveSearchQuery] = useState('');
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);
  const [driveResults, setDriveResults] = useState<DriveFile[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    loadFiles();
  }, [entityId]);

  useEffect(() => {
    if (showDriveSearch) {
      handleDriveSearch(driveSearchQuery);
    } else {
      setDriveSearchQuery('');
      setDriveResults([]);
    }
  }, [showDriveSearch]);

  const handleDriveSearch = async (query: string) => {
    if (!isGoogleAuthed()) return;
    setIsSearchingDrive(true);
    try {
      const results = await searchDriveFiles(query);
      setDriveResults(results);
    } catch (e) {
      console.error(e);
      setDriveResults([]);
    } finally {
      setIsSearchingDrive(false);
    }
  };

  const handleDriveSearchChange = (value: string) => {
    setDriveSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      handleDriveSearch(value);
    }, 500);
  };

  const handleAttachDriveFile = async (driveFile: DriveFile) => {
    setShowDriveSearch(false);
    setIsUploading(true);
    try {
      await saveGoogleDriveFileReference(driveFile, entityId);
      await loadFiles();
    } catch (e) {
      console.error("Error attaching drive file", e);
    } finally {
      setIsUploading(false);
    }
  };

  const loadFiles = async () => {
    const attached = await getFilesForEntity(entityId);
    setFiles(attached);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < e.target.files.length; i++) {
        await saveLocalFile(e.target.files[i], entityId);
      }
      await loadFiles();
    } catch (err) {
      console.error('Error uploading file', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (file: MatrixFile) => {
    if (file.storageProvider === 'local') {
      const blob = await getLocalFileBlob(file.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else if (file.externalUrl) {
      window.open(file.externalUrl, '_blank');
    } else {
      alert("Remote file downloading is handled via the provider's API.");
    }
  };

  const handleRemove = async (file: MatrixFile) => {
    if (file.storageProvider === 'local') {
      // For local files tied strictly to this, we can detach or delete. Let's delete if we want simple management.
      if (file.relatedEntityIds.length <= 1) {
        await deleteFile(file.id);
      } else {
        await detachFileFromEntity(file.id, entityId);
      }
    } else {
      await detachFileFromEntity(file.id, entityId);
    }
    await loadFiles();
  };

  return (
    <div className="space-y-3 relative">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments
        </h3>
        <div className="flex items-center gap-3">
          {isGoogleAuthed() && (
            <button
              onClick={() => setShowDriveSearch(!showDriveSearch)}
              className="text-sm text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-1"
            >
              <HardDrive className="h-3 w-3" />
              <span>+ Drive File</span>
            </button>
          )}
          <label className="cursor-pointer text-sm text-amber-600 dark:text-amber-500 hover:underline flex items-center gap-1">
            {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>+ Local File</span>}
            <input type="file" className="hidden" multiple onChange={handleFileChange} disabled={isUploading} />
          </label>
        </div>
      </div>
      
      {showDriveSearch && (
        <DriveSearchDropdown
          driveSearch={driveSearchQuery}
          isSearchingDrive={isSearchingDrive}
          driveResults={driveResults}
          onSearchChange={handleDriveSearchChange}
          onAttachFile={handleAttachDriveFile}
          onClose={() => setShowDriveSearch(false)}
        />
      )}
      
      {files.length > 0 ? (
        <div className="flex flex-col gap-2">
          {files.map(file => (
            <div key={file.id} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => handleDownload(file)}>
                {file.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.iconUrl} alt="" className="w-5 h-5 shrink-0" />
                ) : (
                  <File className="h-5 w-5 text-neutral-400 shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{file.filename}</span>
                  <span className="text-xs text-neutral-500 truncate flex items-center gap-1">
                    {file.size > 0 && <span>{(file.size / 1024).toFixed(1)} KB • </span>}
                    {file.storageProvider === 'google_drive' ? 'Google Drive' : 'Local'} 
                    {file.isAvailableOffline ? ' • Offline' : ' • Online Only'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleDownload(file)} className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors" title="Download / Open">
                  <Download className="h-4 w-4" />
                </button>
                <button onClick={() => handleRemove(file)} className="p-1.5 text-neutral-500 hover:text-red-500 transition-colors" title="Remove">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-neutral-400 italic px-1">
          No attachments yet.
        </div>
      )}
    </div>
  );
}
