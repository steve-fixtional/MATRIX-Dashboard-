import { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from '../../../domain/types';
import { DriveFile, searchDriveFiles, getDriveFilesByIds } from '../../../services/googleDriveService';
import { isGoogleAuthed } from '../../../services/googleCalendarService';
import { saveNote, deleteNote as dbDeleteNote } from '../../../services/noteService';

export function useNote({
  note: initialNote,
  onChange,
  onDelete
}: {
  note: Note;
  onChange: (updates: Partial<Note>) => void;
  onDelete: (id: string) => void;
}) {
  const [localTitle, setLocalTitle] = useState(initialNote.title);
  const [localContent, setLocalContent] = useState(initialNote.content);
  const [isAttaching, setIsAttaching] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [driveResults, setDriveResults] = useState<DriveFile[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<DriveFile[]>([]);
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalTitle(initialNote.title);
    setLocalContent(initialNote.content);
    loadAttachedFiles(initialNote.driveFileIds || []);
  }, [initialNote.id, initialNote.title, initialNote.content, initialNote.driveFileIds]);

  const loadAttachedFiles = async (fileIds: string[]) => {
    if (!fileIds.length || !isGoogleAuthed()) {
      setAttachedFiles([]);
      return;
    }
    try {
      const files = await getDriveFilesByIds(fileIds);
      setAttachedFiles(files);
    } catch (e) {
      console.error(e);
    }
  };

  const updateNote = useCallback(async (updates: Partial<Note>) => {
    // 1. Notify parent for optimistic UI update (list view)
    onChange(updates);
    
    // 2. Perform actual persistence
    try {
      const updatedNote = { ...initialNote, ...updates };
      await saveNote(updatedNote);
    } catch (err) {
      console.error("Failed to save note:", err);
    }
  }, [initialNote, onChange]);

  const handleTitleChange = (newTitle: string) => {
    setLocalTitle(newTitle);
    updateNote({ title: newTitle });
  };

  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent);
    updateNote({ content: newContent });
  };

  const handleDelete = useCallback(async () => {
    try {
      onDelete(initialNote.id);
      await dbDeleteNote(initialNote.id);
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  }, [initialNote.id, onDelete]);

  const toggleFavorite = () => updateNote({ favorite: !initialNote.favorite });
  const togglePin = () => updateNote({ pinned: !initialNote.pinned });
  const toggleArchive = () => updateNote({ archived: !initialNote.archived });

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
    const newFileIds = [...(initialNote.driveFileIds || []), file.id];
    updateNote({ driveFileIds: newFileIds });
    setIsAttaching(false);
    setDriveSearch('');
  };

  const removeFile = (fileId: string) => {
    const newFileIds = (initialNote.driveFileIds || []).filter(id => id !== fileId);
    updateNote({ driveFileIds: newFileIds });
  };

  // Keyboard shortcut to prevent default save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    note: initialNote,
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
  };
}
