import React from 'react';
import { Note } from '../../domain/types';
import { useNote } from './hooks/useNote';
import { NoteEditorToolbar } from './components/NoteEditorToolbar';
import { DriveSearchDropdown } from '../../components/ui/DriveSearchDropdown';
import { NoteEditorAttachments } from './components/NoteEditorAttachments';
import { FileAttachments } from '../../components/ui/FileAttachments';
import { ItemSyncStatus } from '../../components/ui/ItemSyncStatus';

interface NoteEditorProps {
  note: Note;
  onChange: (updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  isMobile: boolean;
}

export function NoteEditor({ note: initialNote, onChange, onDelete, onClose, isMobile }: NoteEditorProps) {
  const {
    note,
    localTitle,
    localContent,
    isAttaching,
    setIsAttaching,
    driveSearch,
    setDriveSearch,
    driveResults,
    attachedFiles,
    isSearchingDrive,
    textareaRef,
    handleTitleChange,
    handleContentChange,
    handleDelete,
    toggleFavorite,
    togglePin,
    toggleArchive,
    attachFile,
    removeFile,
    resolveConflict,
  } = useNote({ note: initialNote, onChange, onDelete });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 relative">
      <NoteEditorToolbar 
        note={note}
        isMobile={isMobile}
        isAttaching={isAttaching}
        onClose={onClose}
        onToggleFavorite={toggleFavorite}
        onTogglePin={togglePin}
        onToggleArchive={toggleArchive}
        onToggleAttach={() => setIsAttaching(!isAttaching)}
        onDelete={handleDelete}
      />

      {isAttaching && (
        <DriveSearchDropdown 
          driveSearch={driveSearch}
          isSearchingDrive={isSearchingDrive}
          driveResults={driveResults}
          onSearchChange={setDriveSearch}
          onAttachFile={attachFile}
          onClose={() => setIsAttaching(false)}
        />
      )}

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto flex flex-col w-full max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-10">
        
        <NoteEditorAttachments 
          attachedFiles={attachedFiles}
          onRemoveFile={removeFile}
        />

        {note._conflicts && note._conflicts.length > 0 && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 sm:p-4 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
            <div>
              <p className="font-semibold mb-0.5">A conflict was detected and automatically resolved.</p>
              <p className="opacity-80">We kept the most recently edited version. You can review the older version if needed.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => resolveConflict(note._conflicts![0])}
                className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 rounded-md transition-colors font-medium text-xs"
              >
                Restore Older Version
              </button>
              <button
                onClick={() => resolveConflict(note)} // Just clears conflicts array
                className="px-3 py-1.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 rounded-md transition-colors font-medium text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 mb-6">
          <input
            type="text"
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Note Title"
            className="text-3xl md:text-4xl font-bold bg-transparent border-0 focus:ring-0 p-0 outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
          />
          <div className="flex items-center">
            <ItemSyncStatus item={note} />
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start typing..."
          className="flex-1 w-full bg-transparent border-0 focus:ring-0 p-0 text-base md:text-lg leading-relaxed outline-none resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-neutral-800 dark:text-neutral-200 min-h-[150px]"
        />
        
        <div className="mt-8 border-t border-neutral-100 dark:border-neutral-800 pt-6">
          <FileAttachments entityId={note.id} />
        </div>
      </div>
    </div>
  );
}
