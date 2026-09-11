import { useEffect, useState, useMemo, useCallback } from 'react';
import { Note } from '../domain/types';
import { getNotes, saveNote, deleteNote } from '../services/noteService';
import { PageWrapper } from '../components/layout/PageWrapper';
import { NoteList } from './notes/NoteList';
import { NoteEditor } from './notes/NoteEditor';
import { FileText } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    const loadedNotes = await getNotes();
    setNotes(loadedNotes);
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Check URL params for "new" trigger or "id" selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('projectId');
    if (pid) setProjectId(pid);

    if (params.get('new') === 'true') {
      handleNewNote(pid);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const id = params.get('id');
      if (id) {
        setSelectedNoteId(id);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleNewNote = async (overrideProjectId?: string | null) => {
    const pId = overrideProjectId !== undefined ? overrideProjectId : projectId;
    const newNote = await saveNote({
      title: '',
      content: '',
      tags: [],
      pinned: false,
      archived: false,
      favorite: false,
      projectId: pId
    });
    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(newNote.id);
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    const currentNote = notes.find(n => n.id === id);
    if (!currentNote) return;
    
    // Optimistic update
    const updatedNote = { ...currentNote, ...updates, updatedAt: Date.now() };
    setNotes(prev => prev.map(n => n.id === id ? updatedNote : n).sort((a, b) => {
      // Keep pinned on top if we want, or just by updatedAt
      return b.updatedAt - a.updatedAt;
    }));
  };

  const handleDeleteNote = (id: string) => {
    // Optimistic delete
    setNotes(prev => prev.filter(n => n.id !== id));
    setSelectedNoteId(null);
  };

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const lowerQ = searchQuery.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(lowerQ) || 
      n.content.toLowerCase().includes(lowerQ)
    );
  }, [notes, searchQuery]);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  return (
    <PageWrapper className="h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] p-0 md:p-4 overflow-hidden">
      <div className="flex h-full bg-white dark:bg-neutral-950 md:rounded-2xl md:border border-neutral-200 dark:border-neutral-800 md:shadow-sm overflow-hidden">
        
        {/* Left Pane: List */}
        <div className={`w-full md:w-80 shrink-0 h-full ${selectedNoteId ? 'hidden md:flex' : 'flex'}`}>
          <NoteList 
            notes={filteredNotes} 
            selectedNoteId={selectedNoteId} 
            onSelectNote={setSelectedNoteId}
            onNewNote={handleNewNote}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Right Pane: Editor / Empty State */}
        <div className={`flex-1 h-full min-w-0 ${selectedNoteId ? 'flex' : 'hidden md:flex'} bg-white dark:bg-neutral-950`}>
          {selectedNote ? (
            <div className="w-full h-full">
              <NoteEditor 
                note={selectedNote}
                onChange={(updates) => handleUpdateNote(selectedNote.id, updates)}
                onDelete={handleDeleteNote}
                onClose={() => setSelectedNoteId(null)}
                isMobile={true} // The editor handles CSS hiding for the button
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-neutral-50/50 dark:bg-neutral-900/20">
              <EmptyState 
                icon={FileText} 
                title="Your Digital Notebook" 
                description="Select a note from the list, or create a new one. Notes are securely stored on your device and will sync automatically when connected to the cloud."
              />
            </div>
          )}
        </div>
        
      </div>
    </PageWrapper>
  );
}
