import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note } from '../../domain/types';
import { Star, Pin, Archive, Trash2, Link as LinkIcon, File as FileIcon, X, HardDrive } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DriveFile, searchDriveFiles } from '../../services/googleDriveService';
import { isGoogleAuthed } from '../../services/googleCalendarService';
import { Input } from '../../components/ui/Input';

interface NoteEditorProps {
  note: Note;
  onChange: (updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isMobile: boolean;
}

export function NoteEditor({ note, onChange, onDelete, onClose, isMobile }: NoteEditorProps) {
  const [localTitle, setLocalTitle] = useState(note.title);
  const [localContent, setLocalContent] = useState(note.content);
  const [isAttaching, setIsAttaching] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [driveResults, setDriveResults] = useState<DriveFile[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<DriveFile[]>([]);
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync prop changes to local state if the note id changes
  useEffect(() => {
    setLocalTitle(note.title);
    setLocalContent(note.content);
    loadAttachedFiles(note.driveFileIds || []);
  }, [note.id, note.title, note.content, note.driveFileIds]); // We depend on the note changing

  const loadAttachedFiles = async (fileIds: string[]) => {
    if (!fileIds.length || !isGoogleAuthed()) {
      setAttachedFiles([]);
      return;
    }
    try {
      const { getDriveFilesByIds } = await import('../../services/googleDriveService');
      const files = await getDriveFilesByIds(fileIds);
      setAttachedFiles(files);
    } catch (e) {
      console.error(e);
    }
  };

  // Debounced save
  const debouncedOnChange = useCallback(
    (updates: Partial<Note>) => {
      onChange(updates);
    },
    [onChange]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    debouncedOnChange({ title: newTitle });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    debouncedOnChange({ content: newContent });
  };

  const toggleFavorite = () => onChange({ favorite: !note.favorite });
  const togglePin = () => onChange({ pinned: !note.pinned });
  const toggleArchive = () => onChange({ archived: !note.archived });

  const handleDriveSearch = useCallback(async () => {
    if (!isGoogleAuthed()) return;
    setIsSearchingDrive(true);
    try {
      const results = await searchDriveFiles(driveSearch);
      setDriveResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingDrive(false);
    }
  }, [driveSearch]);

  useEffect(() => {
    if (isAttaching && isGoogleAuthed()) {
      const timer = setTimeout(() => {
        handleDriveSearch();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAttaching, handleDriveSearch]);

  const attachFile = (file: DriveFile) => {
    const newFileIds = [...(note.driveFileIds || []), file.id];
    debouncedOnChange({ driveFileIds: newFileIds });
    setIsAttaching(false);
    setDriveSearch('');
  };

  const removeFile = (fileId: string) => {
    const newFileIds = (note.driveFileIds || []).filter(id => id !== fileId);
    debouncedOnChange({ driveFileIds: newFileIds });
  };

  // Handle keyboard shortcuts (Cmd+S to avoid default save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div className="flex items-center gap-1">
          {isMobile && (
            <Button variant="ghost" size="sm" onClick={onClose} className="mr-2 md:hidden">
              Back
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFavorite}
            className={note.favorite ? "text-yellow-500 hover:text-yellow-600" : "text-neutral-400"}
            title="Favorite"
          >
            <Star className={`h-4 w-4 ${note.favorite ? "fill-current" : ""}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={togglePin}
            className={note.pinned ? "text-blue-500 hover:text-blue-600" : "text-neutral-400"}
            title="Pin"
          >
            <Pin className={`h-4 w-4 ${note.pinned ? "fill-current" : ""}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleArchive}
            className={note.archived ? "text-orange-500 hover:text-orange-600" : "text-neutral-400"}
            title="Archive"
          >
            <Archive className="h-4 w-4" />
          </Button>
          
          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsAttaching(!isAttaching)}
            className={`${isAttaching ? 'bg-neutral-100 dark:bg-neutral-800' : ''} text-neutral-500`}
            title="Attach Drive File"
            disabled={!isGoogleAuthed()}
          >
            <HardDrive className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isAttaching && (
        <div className="absolute top-12 left-2 z-10 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-96">
          <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
             <Input 
              value={driveSearch} 
              onChange={e => setDriveSearch(e.target.value)} 
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
                    onClick={() => attachFile(file)}
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
      )}

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto flex flex-col w-full max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-10">
        
        {attachedFiles.length > 0 && (
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
                  onClick={() => removeFile(file.id)}
                  className="p-0.5 text-neutral-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          type="text"
          value={localTitle}
          onChange={handleTitleChange}
          placeholder="Note Title"
          className="text-3xl md:text-4xl font-bold bg-transparent border-0 focus:ring-0 p-0 mb-6 outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
        />
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={handleContentChange}
          placeholder="Start typing..."
          className="flex-1 w-full bg-transparent border-0 focus:ring-0 p-0 text-base md:text-lg leading-relaxed outline-none resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-neutral-800 dark:text-neutral-200"
        />
      </div>
    </div>
  );
}
