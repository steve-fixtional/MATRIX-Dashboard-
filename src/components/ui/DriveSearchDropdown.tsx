import React from 'react';
import { File as FileIcon } from 'lucide-react';
import { Input } from './Input';
import { DriveFile } from '../../services/googleDriveService';

interface DriveSearchDropdownProps {
  driveSearch: string;
  isSearchingDrive: boolean;
  driveResults: DriveFile[];
  onSearchChange: (value: string) => void;
  onAttachFile: (file: DriveFile) => void;
  onClose?: () => void;
}

export function DriveSearchDropdown({
  driveSearch,
  isSearchingDrive,
  driveResults,
  onSearchChange,
  onAttachFile,
  onClose
}: DriveSearchDropdownProps) {
  return (
    <div className="absolute top-8 right-0 z-50 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-96">
      <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
         <Input 
          value={driveSearch} 
          onChange={e => onSearchChange(e.target.value)} 
          placeholder="Search Google Drive..." 
          autoFocus
          className="h-8 text-sm flex-1"
        />
        {onClose && (
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100">
             <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
              <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
            </svg>
          </button>
        )}
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
