import React from 'react';
import { Star, Pin, Archive, Trash2, HardDrive } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Note } from '../../../domain/types';
import { isGoogleAuthed } from '../../../services/googleCalendarService';

interface NoteEditorToolbarProps {
  note: Note;
  isMobile: boolean;
  isAttaching: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onToggleAttach: () => void;
  onDelete: () => void;
}

export function NoteEditorToolbar({
  note,
  isMobile,
  isAttaching,
  onClose,
  onToggleFavorite,
  onTogglePin,
  onToggleArchive,
  onToggleAttach,
  onDelete
}: NoteEditorToolbarProps) {
  return (
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
          onClick={onToggleFavorite}
          className={note.favorite ? "text-yellow-500 hover:text-yellow-600" : "text-neutral-400"}
          title="Favorite"
        >
          <Star className={`h-4 w-4 ${note.favorite ? "fill-current" : ""}`} />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onTogglePin}
          className={note.pinned ? "text-blue-500 hover:text-blue-600" : "text-neutral-400"}
          title="Pin"
        >
          <Pin className={`h-4 w-4 ${note.pinned ? "fill-current" : ""}`} />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleArchive}
          className={note.archived ? "text-orange-500 hover:text-orange-600" : "text-neutral-400"}
          title="Archive"
        >
          <Archive className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleAttach}
          className={`${isAttaching ? 'bg-neutral-100 dark:bg-neutral-800' : ''} text-neutral-500`}
          title="Attach Drive File"
          disabled={!isGoogleAuthed()}
        >
          <HardDrive className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
