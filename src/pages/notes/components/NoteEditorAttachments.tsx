import React from 'react';
import { Link as LinkIcon, X } from 'lucide-react';
import { DriveFile } from '../../../services/googleDriveService';

interface NoteEditorAttachmentsProps {
  attachedFiles: DriveFile[];
  onRemoveFile: (fileId: string) => void;
}

export function NoteEditorAttachments({ attachedFiles, onRemoveFile }: NoteEditorAttachmentsProps) {
  if (attachedFiles.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {attachedFiles.map(file => (
        <div key={file.id} className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg pr-1 pl-2 py-1 text-sm group">
          <a 
            href={file.webViewLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:underline decoration-neutral-400"
          >
            {file.iconLink ? (
               // eslint-disable-next-line @next/next/no-img-element
               <img src={file.iconLink} alt="" className="w-4 h-4" />
            ) : (
              <LinkIcon className="h-3 w-3 text-neutral-500" />
            )}
            <span className="truncate max-w-[150px] font-medium">{file.name}</span>
          </a>
          <button 
            onClick={() => onRemoveFile(file.id)}
            className="p-0.5 text-neutral-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
