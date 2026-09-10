import React from 'react';
import { Note } from '../../domain/types';
import { useNote } from './hooks/useNote';
import { NoteEditorToolbar } from './components/NoteEditorToolbar';
import { NoteEditorDriveSearch } from './components/NoteEditorDriveSearch';
import { NoteEditorAttachments } from './components/NoteEditorAttachments';

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
        <NoteEditorDriveSearch 
          driveSearch={driveSearch}
          isSearchingDrive={isSearchingDrive}
          driveResults={driveResults}
          onSearchChange={setDriveSearch}
          onAttachFile={attachFile}
        />
      )}

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto flex flex-col w-full max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-10">
        
        <NoteEditorAttachments 
          attachedFiles={attachedFiles}
          onRemoveFile={removeFile}
        />

        <input
          type="text"
          value={localTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note Title"
          className="text-3xl md:text-4xl font-bold bg-transparent border-0 focus:ring-0 p-0 mb-6 outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700"
        />
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start typing..."
          className="flex-1 w-full bg-transparent border-0 focus:ring-0 p-0 text-base md:text-lg leading-relaxed outline-none resize-none placeholder:text-neutral-400 dark:placeholder:text-neutral-600 text-neutral-800 dark:text-neutral-200"
        />
      </div>
    </div>
  );
}
