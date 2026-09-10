import React from 'react';
import { File as FileIcon } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { DriveFile } from '../../../services/googleDriveService';

interface NoteEditorDriveSearchProps {
  driveSearch: string;
  isSearchingDrive: boolean;
  driveResults: DriveFile[];
  onSearchChange: (value: string) => void;
  onAttachFile: (file: DriveFile) => void;
}

export function NoteEditorDriveSearch({
  driveSearch,
  isSearchingDrive,
  driveResults,
  onSearchChange,
  onAttachFile
}: NoteEditorDriveSearchProps) {
  return (
    <div className="absolute top-12 left-2 z-10 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-96">
      <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
         <Input 
          value={driveSearch} 
          onChange={e => onSearchChange(e.target.value)} 
          placeholder="Search Google Drive..." 
          autoFocus
          className="h-8 text-sm"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {isSearchingDrive ? (
          <div className="p-4 text-center text-xs text-neutral-500">Searching...</div>
        ) : driveResults.length === 0 ? (
          <div className="p-4 text-center text-xs text-neutral-500">No files found</div>
        ) : (
          <div className="space-y-0.5">
            {driveResults.map(file => (
              <button
                key={file.id}
                onClick={() => onAttachFile(file)}
                className="w-full text-left px-2 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded flex items-center gap-2 text-sm"
              >
                {file.iconLink ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.iconLink} alt="" className="w-4 h-4" />
                ) : (
                  <FileIcon className="w-4 h-4 text-neutral-400" />
                )}
                <span className="truncate flex-1">{file.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
