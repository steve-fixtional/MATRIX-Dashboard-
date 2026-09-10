import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { FileText } from 'lucide-react';
import { getNotes } from '../../services/noteService';
import { Note } from '../../domain/types';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function RecentNotesWidget() {
  const navigate = useNavigate();
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);

  const loadNotes = useCallback(async () => {
    const allNotes = await getNotes();
    setRecentNotes(allNotes.slice(0, 4));
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return (
    <Card 
      className="h-full shadow-sm flex flex-col cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
      onClick={() => navigate('/notes')}
    >
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xs font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-2 m-0">
          <FileText className="h-4 w-4" /> Recent Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-1 pb-4">
        {recentNotes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm font-medium">
            No notes yet.
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {recentNotes.map(note => (
              <div key={note.id} className="group relative flex flex-col p-2 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {note.title || 'Untitled'}
                </div>
                <div className="text-xs text-neutral-500 mt-1 truncate">
                  {note.content.replace(/\n/g, ' ') || 'No content'}
                </div>
                <div className="text-[10px] text-neutral-400 mt-1 uppercase font-medium tracking-wide">
                  {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
