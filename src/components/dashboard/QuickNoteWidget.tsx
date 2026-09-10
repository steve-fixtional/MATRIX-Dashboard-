import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Zap, Check } from 'lucide-react';
import { saveNote } from '../../services/noteService';
import { Button } from '../ui/Button';

export function QuickNoteWidget() {
  const [quickNote, setQuickNote] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveQuickNote = async () => {
    if (!quickNote.trim()) return;
    await saveNote({
      title: 'Quick Note',
      content: quickNote,
      tags: [],
      pinned: false,
      archived: false,
      favorite: false
    });
    setQuickNote('');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <Card className="h-full shadow-sm flex flex-col">
      <CardHeader className="pb-2 pt-4 flex flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold text-neutral-500 tracking-wider uppercase flex items-center gap-2 m-0">
          <Zap className="h-4 w-4" /> Quick Note
        </CardTitle>
        <div className="h-7 flex items-center">
          {isSaved ? (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
              <Check className="h-3 w-3" /> Saved
            </span>
          ) : quickNote.trim() ? (
            <Button size="sm" variant="secondary" onClick={handleSaveQuickNote} className="h-7 text-xs">
              Save
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <textarea 
          className="w-full h-full min-h-[120px] bg-transparent border-0 focus:ring-0 resize-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700 outline-none text-base leading-relaxed p-0 m-0"
          placeholder="What's on your mind?"
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSaveQuickNote();
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
