import { useState } from 'react';
import { Note } from '../../domain/types';
import { formatDistanceToNow } from 'date-fns';
import { Pin, Star, Search, Plus, Archive, Filter, FileText } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

type FilterType = 'all' | 'favorites' | 'pinned' | 'archived';

interface NoteListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function NoteList({ notes, selectedNoteId, onSelectNote, onNewNote, searchQuery, onSearchChange }: NoteListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredNotes = notes.filter(note => {
    if (activeFilter === 'favorites') return note.favorite;
    if (activeFilter === 'pinned') return note.pinned;
    if (activeFilter === 'archived') return note.archived;
    // 'all' view typically excludes archived unless searched
    if (activeFilter === 'all' && note.archived && !searchQuery) return false;
    return true;
  }).sort((a, b) => {
    // Always keep pinned on top in list view
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  const renderNoteItem = (note: Note) => {
    const isSelected = selectedNoteId === note.id;
    return (
      <div 
        key={note.id}
        onClick={() => onSelectNote(note.id)}
        className={`group p-4 cursor-pointer transition-colors border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 ${isSelected ? 'bg-neutral-100 dark:bg-neutral-900' : ''}`}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className={`font-medium truncate pr-2 ${isSelected ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-700 dark:text-neutral-300'}`}>
            {note.title || 'Untitled'}
          </h3>
          <div className="flex items-center gap-1 shrink-0 text-neutral-400">
            {note.pinned && <Pin className="h-3 w-3" />}
            {note.favorite && <Star className="h-3 w-3" />}
          </div>
        </div>
        <p className="text-sm text-neutral-500 line-clamp-2 leading-relaxed mb-2">
          {note.content || 'No additional text'}
        </p>
        <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
          {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Notes</h2>
          <Button size="sm" onClick={() => onNewNote()}>
            <Plus className="h-4 w-4 mr-1.5" /> New note
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input 
            className="pl-9 h-9 bg-neutral-100 dark:bg-neutral-900 border-transparent focus:bg-white dark:focus:bg-neutral-950 text-sm"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          <Button 
            variant={activeFilter === 'all' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-7 text-xs rounded-full shrink-0"
            onClick={() => setActiveFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={activeFilter === 'favorites' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-7 text-xs rounded-full shrink-0"
            onClick={() => setActiveFilter('favorites')}
          >
            <Star className="h-3 w-3 mr-1" /> Favorites
          </Button>
          <Button 
            variant={activeFilter === 'pinned' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-7 text-xs rounded-full shrink-0"
            onClick={() => setActiveFilter('pinned')}
          >
            <Pin className="h-3 w-3 mr-1" /> Pinned
          </Button>
          <Button 
            variant={activeFilter === 'archived' ? 'secondary' : 'ghost'} 
            size="sm" 
            className="h-7 text-xs rounded-full shrink-0"
            onClick={() => setActiveFilter('archived')}
          >
            <Archive className="h-3 w-3 mr-1" /> Archive
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 && !searchQuery ? (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="h-10 w-10 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-neutral-400" />
            </div>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">It's quiet here</h3>
            <p className="text-xs text-neutral-500 mb-4 max-w-[200px]">Create your first note to capture ideas, meeting minutes, or daily journals.</p>
            <Button size="sm" onClick={() => onNewNote()}>
              <Plus className="h-4 w-4 mr-1.5" /> Create note
            </Button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-sm flex flex-col items-center">
            {searchQuery ? "No notes found matching your search." : "No notes found in this view."}
          </div>
        ) : (
          filteredNotes.map(renderNoteItem)
        )}
      </div>
    </div>
  );
}
